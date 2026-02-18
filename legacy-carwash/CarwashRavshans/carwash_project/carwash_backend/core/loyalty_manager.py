import datetime
from typing import Optional, List, Dict, Any
import yaml
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from carwash_backend.db import models, repository

logger = logging.getLogger(__name__)

class LoyaltyManager:

    pass
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)

    def _load_config(self, config_path: str) -> Dict[str, Any]:

        try:
            with open(config_path, 'r', encoding='utf-8') as file:
                return yaml.safe_load(file)
        except Exception as e:
            logger.error(f"Ошибка загрузки конфигурации: {e}")
            return {}

    async def calculate_bonus_for_topup(self, amount: float, db: AsyncSession) -> float:

        try:

            result = await db.execute(
                select(models.BonusTier)
                .where(models.BonusTier.is_active == True)
                .where(models.BonusTier.min_amount <= amount)
                .where(models.BonusTier.max_amount >= amount)
            )
            bonus_tier = result.scalars().first()

            if bonus_tier:
                bonus_amount = amount * (bonus_tier.bonus_percent / 100)
                logger.info(f"Бонус рассчитан: {bonus_amount} ({bonus_tier.bonus_percent}% от {amount})")
                return bonus_amount

            return 0.0

        except Exception as e:
            logger.error(f"Ошибка расчета бонуса: {e}")
            return 0.0

    async def calculate_time_discount(self, amount: float, db: AsyncSession) -> float:

        try:
            current_time = datetime.datetime.now().strftime("%H:%M")

            result = await db.execute(
                select(models.TimeDiscount)
                .where(models.TimeDiscount.is_active == True)
            )
            time_discounts = result.scalars().all()

            for discount in time_discounts:
                if self._is_time_in_range(current_time, discount.start_time, discount.end_time):
                    discount_amount = amount * (discount.discount_percent / 100)
                    logger.info(f"Применена временная скидка: {discount_amount} ({discount.discount_percent}%)")
                    return discount_amount

            return 0.0

        except Exception as e:
            logger.error(f"Ошибка расчета временной скидки: {e}")
            return 0.0

    def _is_time_in_range(self, current_time: str, start_time: str, end_time: str) -> bool:

        try:
            current = datetime.datetime.strptime(current_time, "%H:%M").time()
            start = datetime.datetime.strptime(start_time, "%H:%M").time()
            end = datetime.datetime.strptime(end_time, "%H:%M").time()

            if start <= end:
                return start <= current <= end
            else:
                return current >= start or current <= end

        except Exception as e:
            logger.error(f"Ошибка проверки времени: {e}")
            return False

    async def topup_card(self, uid: str, amount: float, db: AsyncSession,
                        admin_id: Optional[int] = None) -> Dict[str, Any]:

        try:

            card = await repository.get_rfid_card_by_uid(db, uid)
            if not card:
                return {"success": False, "message": "Карта не найдена"}

            bonus_amount = await self.calculate_bonus_for_topup(amount, db)
            total_amount = amount + bonus_amount

            max_credit = self.config.get('loyalty', {}).get('max_credit', 1000000)
            if card.balance + total_amount > max_credit:
                return {
                    "success": False,
                    "message": f"Превышен максимальный лимит карты ({max_credit})"
                }

            card.balance += total_amount

            transaction = models.Transaction(
                rfid_card_id=card.id,
                type=models.TransactionTypeEnum.rfid_top_up,
                amount=amount,
                description=f"Пополнение карты (бонус: {bonus_amount})"
            )
            db.add(transaction)

            if bonus_amount > 0:
                bonus_transaction = models.Transaction(
                    rfid_card_id=card.id,
                    type=models.TransactionTypeEnum.bonus,
                    amount=bonus_amount,
                    description=f"Бонус при пополнении {amount}"
                )
                db.add(bonus_transaction)

            await db.commit()

            logger.info(f"Карта {uid} пополнена на {amount}, бонус: {bonus_amount}, новый баланс: {card.balance}")

            return {
                "success": True,
                "new_balance": card.balance,
                "bonus_amount": bonus_amount,
                "total_added": total_amount
            }

        except Exception as e:
            await db.rollback()
            logger.error(f"Ошибка пополнения карты {uid}: {e}")
            return {"success": False, "message": str(e)}

    async def calculate_service_price_with_discounts(self,
                                                   service_price_per_second: float,
                                                   is_rfid_payment: bool,
                                                   db: AsyncSession) -> float:

        try:
            final_price = service_price_per_second

            if is_rfid_payment:
                time_discount = await self.calculate_time_discount(service_price_per_second, db)
                final_price -= time_discount

            return max(final_price, 0.0)

        except Exception as e:
            logger.error(f"Ошибка расчета цены с скидками: {e}")
            return service_price_per_second

    async def register_new_card(self, uid: str, holder_name: str,
                              phone_number: Optional[str],
                              initial_balance: float,
                              db: AsyncSession) -> Dict[str, Any]:

        try:

            existing_card = await repository.get_rfid_card_by_uid(db, uid)
            if existing_card:
                return {"success": False, "message": "Карта уже зарегистрирована"}

            card_data = {
                "uid": uid,
                "holder_name": holder_name,
                "phone_number": phone_number,
                "balance": initial_balance
            }

            card = await repository.create_rfid_card(db, card_data)

            if initial_balance > 0:
                transaction = models.Transaction(
                    rfid_card_id=card.id,
                    type=models.TransactionTypeEnum.rfid_top_up,
                    amount=initial_balance,
                    description="Начальное пополнение при регистрации"
                )
                db.add(transaction)
                await db.commit()

            logger.info(f"Зарегистрирована новая карта: {uid}, владелец: {holder_name}")

            return {
                "success": True,
                "card_id": card.id,
                "message": "Карта успешно зарегистрирована"
            }

        except Exception as e:
            await db.rollback()
            logger.error(f"Ошибка регистрации карты {uid}: {e}")
            return {"success": False, "message": str(e)}

loyalty_manager = LoyaltyManager()
