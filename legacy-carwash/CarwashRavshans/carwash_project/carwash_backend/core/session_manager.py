from typing import Dict, Optional
import asyncio
import json
import logging
import datetime
from datetime import datetime as dt, time
from sqlalchemy.ext.asyncio import AsyncSession

from carwash_backend.api.v1.websocket_manager import websocket_manager
from carwash_backend.db import models, repository, schemas
from carwash_backend.db.database import async_session
from carwash_backend.db.repository import retry_db_operation
from carwash_backend.core.loyalty_manager import loyalty_manager
from carwash_backend.core.hardware_commands import generate_relay_bits

logger = logging.getLogger(__name__)

class ActiveSession:
    pass
    def __init__(self, post_id: int, db_session_model: models.WashSession):
        self.post_id = post_id
        self.db_session_model = db_session_model

        self.total_balance = db_session_model.total_balance or 0.0
        self.cash_balance = db_session_model.cash_balance or 0.0
        self.online_balance = db_session_model.online_balance or 0.0
        self.card_initial_balance = db_session_model.card_initial_balance or 0.0

        self.active_service_id: Optional[int] = None
        self.running = True
        self.paused = False
        self.inactivity_timer = 10 * 60

    async def _send_command(self, command_str: str):
        logger.info(f"Пост {self.post_id}: команда {command_str}")
        await websocket_manager.send_command_to_controller(self.post_id, command_str)

    async def update_and_broadcast_state(self):
        remaining_time = 0
        if self.active_service_id:
            async with async_session() as db:
                service = await repository.get_service(db, self.active_service_id)
                if service and service.price_per_minute > 0:
                    service_price_per_second = service.price_per_minute / 60.0
                    remaining_time = int(self.total_balance / service_price_per_second)

        state = {
            "type": "session_state",
            "total_balance": self.total_balance,
            "cash_balance": self.cash_balance,
            "online_balance": self.online_balance,
            "card_initial_balance": self.card_initial_balance,
            "active_service_id": self.active_service_id,
            "is_paused": self.paused,
            "remaining_time": remaining_time
        }

        await websocket_manager.send_to_post(self.post_id, json.dumps(state))

    async def add_balance(self, amount: float, balance_type: str = "cash"):
        if balance_type == "cash":
            self.cash_balance += amount
        elif balance_type == "online":
            self.online_balance += amount

        self.total_balance = self.cash_balance + self.online_balance + self.card_initial_balance

        async with async_session() as db:
            session_in_db = await db.get(models.WashSession, self.db_session_model.id)
            if session_in_db:
                session_in_db.cash_balance = self.cash_balance
                session_in_db.online_balance = self.online_balance
                session_in_db.total_balance = self.total_balance
                await retry_db_operation(db.commit)

        await self.update_and_broadcast_state()
        self.inactivity_timer = 10 * 60

    async def spend_from_card(self, card: models.RfidCard, amount: float, db: AsyncSession):
        self.card_initial_balance = amount
        self.total_balance = self.cash_balance + self.online_balance + self.card_initial_balance

        db_session_in_db = await db.get(models.WashSession, self.db_session_model.id)
        if db_session_in_db:
            db_session_in_db.rfid_card_id = card.id
            db_session_in_db.card_initial_balance = self.card_initial_balance
            db_session_in_db.total_balance = self.total_balance

        card.balance = 0
        db.add(card)
        await retry_db_operation(db.commit)
        self.inactivity_timer = 10 * 60

    async def set_active_service(self, service_id: Optional[int]):
        self.active_service_id = service_id
        command_to_send = ""

        if service_id is None:
            self.paused = True
            command_to_send = "EXECUTE_PAUSE_PROCEDURE"
        else:
            self.paused = False
            async with async_session() as db:
                service = await repository.get_service(db, service_id)
                if service and service.is_active:

                    command_to_send = f"<relay_bits={service.relay_bits}>"
                else:
                    command_to_send = "STOP_ALL"
        await self._send_command(command_to_send)
        await self.update_and_broadcast_state()

    async def run(self):
        while self.running and self.total_balance > 0:
            await asyncio.sleep(1)

            if self.paused:
                continue

            async with async_session() as db:
                if self.active_service_id:
                    service = await repository.get_service(db, self.active_service_id)
                    service_price_per_second = 0.0
                    if service and service.price_per_minute > 0:
                        service_price_per_second = service.price_per_minute / 60.0

                    if service_price_per_second and service_price_per_second > 0:
                        is_rfid_payment = self.card_initial_balance > 0
                        final_price = await loyalty_manager.calculate_service_price_with_discounts(
                            service_price_per_second, is_rfid_payment, db
                        )

                        self.total_balance -= final_price
                        self.inactivity_timer = 10 * 60

                        logger.debug(f"Пост {self.post_id}: списано {final_price} сум/сек, остаток: {self.total_balance}")
                else:
                    self.inactivity_timer -= 1

                if self.total_balance <= 0 or self.inactivity_timer <= 0:
                    self.running = False

                session_in_db = await db.get(models.WashSession, self.db_session_model.id)
                if session_in_db:
                    session_in_db.total_balance = self.total_balance
                    await retry_db_operation(db.commit)

            await self.update_and_broadcast_state()

        async with async_session() as db:
            await session_manager.stop_session_for_post(self.post_id, db, is_timeout=True)

    def stop(self):
        self.running = False

    def broadcast_cash_inserted(self, amount: float):
        asyncio.create_task(websocket_manager.broadcast_cash_inserted({
            "amount": amount,
            "timestamp": datetime.now().isoformat()
        }))

    def broadcast_rfid_scanned(self, rfid_card_id: int, balance: float):
        asyncio.create_task(websocket_manager.broadcast_rfid_scan({
            "rfid_card_id": rfid_card_id,
            "balance": balance,
            "timestamp": datetime.now().isoformat()
        }))

class SessionManager:
    pass
    def __init__(self):
        self.active_sessions: Dict[int, ActiveSession] = {}

    async def get_session_for_post(self, post_id: int, db: AsyncSession) -> Optional[ActiveSession]:
        if post_id in self.active_sessions:
            return self.active_sessions[post_id]
        active_db_session = await repository.get_active_session_for_post(db, post_id)
        if active_db_session:
            session = ActiveSession(post_id, active_db_session)
            self.active_sessions[post_id] = session
            return session

        return None

    async def start_session_for_post(self, post_id: int, db: AsyncSession) -> ActiveSession:

        await self.stop_session_for_post(post_id, db)

        session_data = {
            "post_id": post_id,
            "started_at": dt.now(),
            "total_balance": 0.0,
            "cash_balance": 0.0,
            "online_balance": 0.0,
            "card_initial_balance": 0.0,
            "status": "active"
        }

        db_session = await repository.create_wash_session(db, session_data)

        active_session = ActiveSession(post_id, db_session)
        self.active_sessions[post_id] = active_session

        asyncio.create_task(active_session.run())

        return active_session

    async def stop_session_for_post(self, post_id: int, db: AsyncSession, is_timeout: bool = False):
        if post_id in self.active_sessions:
            session = self.active_sessions[post_id]
            session.stop()

            final_balance = session.total_balance
            db_session_model = await db.get(models.WashSession, session.db_session_model.id)

            if not db_session_model:
                logger.error(f"Не удалось найти сессию {session.db_session_model.id} в БД при завершении.")
                del self.active_sessions[post_id]
                return

            if db_session_model.rfid_card_id:
                card = await db.get(models.RfidCard, db_session_model.rfid_card_id)
                if card:
                    initial_card_balance_in_session = db_session_model.card_initial_balance or 0.0
                    spent_amount = initial_card_balance_in_session - final_balance
                    refund_amount = final_balance

                    if spent_amount > 0:
                        await repository.create_transaction(db, {
                            "rfid_card_id": card.id,
                            "session_id": db_session_model.id,
                            "type": models.TransactionTypeEnum.rfid_wash,
                            "amount": spent_amount,
                            "description": f"Оплата мойки с карты на посту {post_id}"
                        })
                        logger.info(f"Зафиксирована оплата мойки с карты {card.uid} на сумму {spent_amount:.2f} сум.")

                    if refund_amount > 0:
                        card.balance += refund_amount
                        db.add(card)
                        logger.info(f"Возвращено {refund_amount:.2f} сум на карту {card.uid}. Новый баланс: {card.balance:.2f}")

            if db_session_model.cash_balance > 0:
                await repository.create_transaction(db, {
                    "session_id": db_session_model.id,
                    "type": models.TransactionTypeEnum.cash,
                    "amount": db_session_model.cash_balance,
                    "description": f"Оплата наличными на посту {post_id}"
                })
                logger.info(f"Зафиксирована оплата наличными на сумму {db_session_model.cash_balance:.2f} сум на посту {post_id}.")

            if db_session_model.online_balance > 0:
                await repository.create_transaction(db, {
                    "session_id": db_session_model.id,
                    "type": models.TransactionTypeEnum.online,
                    "amount": db_session_model.online_balance,
                    "description": f"Онлайн оплата на посту {post_id}"
                })
                logger.info(f"Зафиксирована онлайн оплата на сумму {db_session_model.online_balance:.2f} сум на посту {post_id}.")

            db_session_model.status = models.SessionStatusEnum.finished
            db_session_model.finished_at = dt.now()
            db_session_model.total_balance = final_balance

            await db.commit()

            del self.active_sessions[post_id]
            logger.info(f"Сессия для поста {post_id} корректно завершена, транзакции записаны.")

    async def add_cash_to_session(self, post_id: int, amount: float, db: AsyncSession) -> bool:
        session = await self.get_session_for_post(post_id, db)
        if session:
            await session.add_balance(amount, "cash")
            return True
        return False

    async def add_online_payment_to_session(self, post_id: int, amount: float, db: AsyncSession) -> bool:
        session = await self.get_session_for_post(post_id, db)
        if session:
            await session.add_balance(amount, "online")
            return True
        return False

    async def spend_from_card_to_session(self, post_id: int, card: models.RfidCard, amount: float, db: AsyncSession) -> bool:
        session = await self.get_session_for_post(post_id, db)
        if session:
            await session.spend_from_card(card, amount, db)
            return True
        return False

    async def set_service_for_session(self, post_id: int, service_id: Optional[int], db: AsyncSession) -> bool:
        session = await self.get_session_for_post(post_id, db)
        if session:
            await session.set_active_service(service_id)
            return True
        return False

    async def set_active_service_for_post(self, post_id: int, service_id: Optional[int], db: AsyncSession = None) -> bool:

        if db is None:
            from carwash_backend.db.database import async_session
            async with async_session() as session:
                return await self.set_service_for_session(post_id, service_id, session)
        else:
            return await self.set_service_for_session(post_id, service_id, db)

session_manager = SessionManager()
