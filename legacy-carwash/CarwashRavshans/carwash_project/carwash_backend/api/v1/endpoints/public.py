import base64
from carwash_backend.core.payment_gateways.payme_handler import PAYME_MERCHANT_ID
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional, List
import json
import logging
import asyncio
from carwash_backend.db.schemas import PostCreate, PostOut
from carwash_backend.db.database import get_db
from carwash_backend.db import repository, models, schemas
from carwash_backend.core.session_manager import session_manager
from carwash_backend.core.loyalty_manager import loyalty_manager

router = APIRouter()

logger = logging.getLogger(__name__)

@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED, summary="Create Post (public, for test)")
async def create_post_public(post: PostCreate, db: AsyncSession = Depends(get_db)):

    created_post = await repository.create_post(db=db, post=post)
    return created_post

post_websockets: Dict[int, List[WebSocket]] = {}

class PostConnectionManager:

    pass
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, post_id: int):
        await websocket.accept()
        if post_id not in self.active_connections:
            self.active_connections[post_id] = []
        self.active_connections[post_id].append(websocket)
        logger.info(f"WebSocket подключен к посту {post_id}")

    def disconnect(self, websocket: WebSocket, post_id: int):
        if post_id in self.active_connections:
            self.active_connections[post_id].remove(websocket)
            if not self.active_connections[post_id]:
                del self.active_connections[post_id]
        logger.info(f"WebSocket отключен от поста {post_id}")

    async def send_to_post(self, post_id: int, message: str):

        if post_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[post_id]:
                try:
                    await connection.send_text(message)
                except:
                    disconnected.append(connection)

            for conn in disconnected:
                self.active_connections[post_id].remove(conn)

post_manager = PostConnectionManager()
@router.post("/payments/create-invoice", summary="Создать инвойс и получить ссылку на оплату")
async def create_payment_invoice(
    invoice_data: dict,
    db: AsyncSession = Depends(get_db)
):

    post_id = invoice_data.get("post_id")
    amount_sum = invoice_data.get("amount")

    if not all([post_id, amount_sum]):
        raise HTTPException(status_code=400, detail="Необходимо указать post_id и amount.")

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if amount_sum < 1000:
        raise HTTPException(status_code=400, detail="Минимальная сумма платежа - 1000 сум.")

    amount_in_tiyin = amount_sum * 100

    new_invoice = await repository.create_payment_transaction(db, schemas.PaymentTransactionCreate(
        post_id=post_id,
        amount=amount_in_tiyin
    ))

    order_id = new_invoice.id
    params = f"m={PAYME_MERCHANT_ID};ac.order_id={order_id};a={amount_in_tiyin}"
    encoded_params = base64.b64encode(params.encode()).decode()
    payment_url = f"https://checkout.paycom.uz/{encoded_params}"

    return {
        "order_id": order_id,
        "post_id": post_id,
        "amount_sum": amount_sum,
        "payment_url": payment_url
    }

@router.websocket("/ws/{post_id}")
async def websocket_endpoint(websocket: WebSocket, post_id: int):

    await post_manager.connect(websocket, post_id)
    try:

        await send_post_state(post_id)

        while True:

            data = await websocket.receive_text()
            message = json.loads(data)
            await handle_post_message(post_id, message)

    except WebSocketDisconnect:
        post_manager.disconnect(websocket, post_id)

async def send_post_state(post_id: int):

    try:
        async with session_manager.get_session() as db:
            post = await repository.get_post(db, post_id)
            if not post:
                return

            active_session = session_manager.get_active_session(post_id)

            state = {
                "type": "post_state",
                "post_id": post_id,
                "post_name": post.name,
                "status": post.status.value,
                "available_services": [],
                "current_balance": 0.0,
                "remaining_time": 0,
                "active_service_id": None,
                "is_paused": False
            }

            if active_session:
                state.update({
                    "current_balance": active_session.total_balance,
                    "active_service_id": active_session.active_service_id,
                    "is_paused": active_session.paused
                })

                if active_session.active_service_id:
                    service = await repository.get_service(db, active_session.active_service_id)
                    if service and service.price_per_minute > 0:
                        service_price_per_second = service.price_per_minute / 60.0
                        state["remaining_time"] = int(active_session.total_balance / service_price_per_second)
            if post and post.is_active:

                services = []
                if hasattr(post, 'available_services') and post.available_services:
                    services = post.available_services
                else:

                    services = await repository.get_active_services(db)

                state["available_services"] = [
                    {
                        "id": service.id,
                        "name": service.name,
                        "price_per_second": service.price_per_minute / 60.0 if service.price_per_minute else 0.0
                    }
                    for service in services
                ]

            await post_manager.send_to_post(post_id, json.dumps(state))

    except Exception as e:
        logger.error(f"Ошибка отправки состояния поста {post_id}: {e}")

async def handle_post_message(post_id: int, message: Dict[str, Any]):

    try:
        message_type = message.get("type")

        if message_type == "start_service":
            service_id = message.get("service_id")
            await session_manager.set_active_service_for_post(post_id, service_id)

        elif message_type == "pause_session":
            await session_manager.set_active_service_for_post(post_id, None)

        elif message_type == "stop_session":
            async with session_manager.get_session() as db:
                await session_manager.stop_session_for_post(post_id, db)

        elif message_type == "return_to_card":

            async with session_manager.get_session() as db:
                await handle_return_to_card(post_id, db)

        elif message_type == "rfid_scanned":

            uid = message.get("uid")
            if uid:
                async with session_manager.get_session() as db:
                    await handle_rfid_scan(post_id, uid, db)

        await send_post_state(post_id)

    except Exception as e:
        logger.error(f"Ошибка обработки сообщения поста {post_id}: {e}")

async def handle_rfid_scan(post_id: int, uid: str, db: AsyncSession):

    try:

        card = await repository.get_rfid_card_by_uid(db, uid)
        if not card:
            await post_manager.send_to_post(post_id, json.dumps({
                "type": "error",
                "message": "Карта не зарегистрирована в системе"
            }))
            return

        if not card.is_active:
            await post_manager.send_to_post(post_id, json.dumps({
                "type": "error",
                "message": "Карта заблокирована"
            }))
            return

        if card.balance <= 0:
            await post_manager.send_to_post(post_id, json.dumps({
                "type": "error",
                "message": "На карте недостаточно средств"
            }))
            return

        await session_manager.start_session_with_rfid(post_id, uid, db)

        await post_manager.send_to_post(post_id, json.dumps({
            "type": "rfid_success",
            "balance": card.balance,
            "holder_name": card.holder_name
        }))

    except Exception as e:
        logger.error(f"Ошибка обработки RFID на посту {post_id}: {e}")
        await post_manager.send_to_post(post_id, json.dumps({
            "type": "error",
            "message": "Ошибка обработки карты"
        }))

async def handle_return_to_card(post_id: int, db: AsyncSession):

    try:
        active_session = session_manager.get_active_session(post_id)
        if not active_session or not active_session.db_session_model.rfid_card_id:
            return

        card = await db.get(models.RfidCard, active_session.db_session_model.rfid_card_id)
        if not card:
            return

        return_amount = min(
            active_session.total_balance,
            active_session.card_initial_balance
        )

        if return_amount > 0:
            card.balance = return_amount
            active_session.total_balance -= return_amount

            session_in_db = await db.get(models.WashSession, active_session.db_session_model.id)
            if session_in_db:
                session_in_db.total_balance = active_session.total_balance

            await db.commit()

            logger.info(f"Возвращено {return_amount} сум на карту {card.uid}")

            await post_manager.send_to_post(post_id, json.dumps({
                "type": "return_success",
                "returned_amount": return_amount
            }))

    except Exception as e:
        logger.error(f"Ошибка возврата средств на карту: {e}")

@router.get("/posts", response_model=List[schemas.PostOut], summary="Get All Posts")
async def get_posts(db: AsyncSession = Depends(get_db)):

    posts = await repository.get_all_posts(db)
    return posts

@router.get("/posts/{post_id}/services")
async def get_post_services(post_id: int, db: AsyncSession = Depends(get_db)):

    try:

        post = await repository.get_post(db, post_id)
        if not post or not post.is_active:
            raise HTTPException(status_code=404, detail="Пост не найден или неактивен")

        services_list = await repository.get_active_services(db)
        services = [
            {
                "id": service.id,
                "name": service.name,
                "price_per_second": service.price_per_minute / 60.0 if service.price_per_minute else 0.0,
                "price_per_minute": service.price_per_minute or 0.0
            }
            for service in services_list
        ]

        return {"services": services}

    except Exception as e:
        logger.error(f"Ошибка получения услуг поста {post_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/posts/{post_id}/status")
async def get_post_status(post_id: int, db: AsyncSession = Depends(get_db)):

    try:
        post = await repository.get_post(db, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Пост не найден")

        active_session = session_manager.get_active_session(post_id)

        status = {
            "post_id": post_id,
            "name": post.name,
            "status": post.status.value,
            "is_active": post.is_active,
            "has_active_session": active_session is not None,
            "current_balance": 0.0,
            "active_service_id": None,
            "is_paused": False
        }

        if active_session:
            status.update({
                "current_balance": active_session.total_balance,
                "active_service_id": active_session.active_service_id,
                "is_paused": active_session.paused
            })

        return status

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка получения статуса поста {post_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/posts/{post_id}/cash-inserted")
async def cash_inserted(
    post_id: int,
    amount: float,
    db: AsyncSession = Depends(get_db)
):

    try:
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Сумма должна быть положительной")

        await session_manager.add_money_to_post(
            post_id=post_id,
            amount=amount,
            payment_type="cash",
            db=db
        )

        await send_post_state(post_id)

        return {"message": "Деньги успешно добавлены", "amount": amount}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка добавления денег в пост {post_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
