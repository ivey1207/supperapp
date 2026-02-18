import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import base64
import os
import json

from sqlalchemy.ext.asyncio import AsyncSession
from carwash_backend.db import repository
from carwash_backend.core.session_manager import session_manager

logger = logging.getLogger(__name__)

class PaymeHandler:
    pass
    def __init__(self, merchant_id: str, secret_key: str):
        self.merchant_id = merchant_id
        self.secret_key = secret_key
        logger.info(f"PaymeHandler инициализирован для Merchant ID: {self.merchant_id}")

    def verify_authorization(self, auth_header: str) -> bool:
        if not auth_header or not auth_header.startswith('Basic '):
            return False
        try:
            user, pwd = base64.b64decode(auth_header[6:]).decode().split(':')
            return user == "Paycom" and pwd == self.secret_key
        except Exception:
            return False

    async def handle_request(self, request_data: Dict, db: AsyncSession) -> Dict:
        method = request_data.get('method')
        params = request_data.get('params', {})
        request_id = request_data.get('id')
        logger.info(f"Payme << method: {method}, params: {params}")

        handler = getattr(self, f"_{method.lower()}", None)
        if not handler:
            return self._error_response(request_id, -32601, "Method not found", method)
        try:
            response = await handler(params, request_id, db)
            logger.info(f"Payme >> response: {response}")
            return response
        except Exception as e:
            logger.exception(f"Критическая ошибка в методе {method}: {e}")
            return self._error_response(request_id, -32400, "Internal system error")

    async def _checkperformtransaction(self, params: Dict, request_id: str, db: AsyncSession) -> Dict:
        amount = params.get('amount')
        order_id = params.get('account', {}).get('order_id')

        try:
            order_id_int = int(order_id)
        except (ValueError, TypeError, KeyError):
             return self._error_response(request_id, -31050, "Неверный или отсутствующий 'order_id'", "order_id")

        trans = await repository.get_payment_transaction_by_internal_id(db, order_id_int)
        if not trans:
            return self._error_response(request_id, -31050, f"Заказ с ID {order_id} не найден.", "order_id")
        if trans.amount != amount:
            return self._error_response(request_id, -31001, "Неверная сумма.")
        if trans.status != 'pending' or trans.payme_state is not None:
            return self._error_response(request_id, -31008, "Статус заказа не позволяет создать транзакцию.")

        detail = {
            "receipt_type": 0,
            "items": [{
                "title": f"Услуги по чистке автомобилей (Пост #{trans.post_id}, Заказ #{trans.id})",
                "price": amount,
                "count": 1,
                "code": "11302999006000000",
                "vat_percent": 0,
                "package_code": "1478229"
            }]
        }
        return {"result": {"allow": True, "detail": detail}, "id": request_id}

    async def _createtransaction(self, params: Dict, request_id: str, db: AsyncSession) -> Dict:
        payme_trans_id, payme_time, amount = params.get('id'), params.get('time'), params.get('amount')
        order_id = params.get('account', {}).get('order_id')

        try:
            order_id_int = int(order_id)
        except (ValueError, TypeError, KeyError):
             return self._error_response(request_id, -31050, "Неверный или отсутствующий 'order_id'", "order_id")

        trans = await repository.get_payment_transaction_by_internal_id(db, order_id_int)
        if not trans:
            return self._error_response(request_id, -31050, "Заказ не найден.", "order_id")
        if trans.amount != amount:
            return self._error_response(request_id, -31001, "Неверная сумма.")

        if trans.status != 'pending' and trans.payme_state is None:
            return self._error_response(request_id, -31008, "Невозможно выполнить операцию для этого заказа.")

        if trans.payme_state == 1:
            if trans.transaction_id != payme_trans_id:
                return self._error_response(request_id, -31050, "Для данного заказа уже существует другая транзакция.", "order_id")

            db_create_time = trans.payme_create_time
            if db_create_time.tzinfo is None:
                db_create_time = db_create_time.replace(tzinfo=timezone.utc)

            return {"result": {"create_time": int(db_create_time.timestamp()*1000), "transaction": str(trans.id), "state": 1}, "id": request_id}

        trans.transaction_id = payme_trans_id
        trans.payme_state = 1
        trans.payme_create_time = datetime.fromtimestamp(payme_time / 1000, tz=timezone.utc)
        await db.commit()
        await db.refresh(trans)

        return {"result": {"create_time": payme_time, "transaction": str(trans.id), "state": 1}, "id": request_id}

    async def _performtransaction(self, params: Dict, request_id: str, db: AsyncSession) -> Dict:
        payme_trans_id = params.get('id')
        trans = await repository.get_payment_transaction_by_payme_id(db, payme_trans_id)
        if not trans:
            return self._error_response(request_id, -31003, "Транзакция не найдена.")

        if trans.payme_state == 2:
            perform_time_ms = int(trans.payme_perform_time.replace(tzinfo=timezone.utc).timestamp() * 1000)
            return {"result": {"transaction": str(trans.id), "perform_time": perform_time_ms, "state": 2}, "id": request_id}

        if trans.payme_state != 1:
            return self._error_response(request_id, -31008, "Невозможно выполнить операцию: неверный статус транзакции.")

        if (datetime.now(timezone.utc) - trans.payme_create_time.replace(tzinfo=timezone.utc)).total_seconds() > 12 * 3600:
            trans.payme_state = -1; trans.status = "cancelled"; trans.payme_reason = "4"; trans.payme_cancel_time = datetime.now(timezone.utc)
            await db.commit()
            return self._error_response(request_id, -31008, "Невозможно выполнить операцию: истек срок оплаты.")

        try:
            perform_time_dt = datetime.now(timezone.utc)
            trans.status = "completed"
            trans.payme_state = 2
            trans.payme_perform_time = perform_time_dt
            trans.completed_at = perform_time_dt
            await db.commit()
            await db.refresh(trans)
        except Exception as e:
            logger.exception(f"ОШИБКА БАЗЫ ДАННЫХ при подтверждении транзакции {payme_trans_id}: {e}")
            return self._error_response(request_id, -31008, "Внутренняя ошибка при сохранении транзакции.")

        try:
            from carwash_backend.core.command_queue import command_queue
            post = await repository.get_post(db, trans.post_id)
            if post and post.controller_id:
                online_payment_data = {
                    "type": "online_payment_received",
                    "payment_type": "payme",
                    "post_id": trans.post_id,
                    "amount": trans.amount / 100,
                    "service_name": "Онлайн оплата Payme",
                    "service_cost": trans.amount / 100,
                    "transaction_id": trans.transaction_id,
                    "timestamp": perform_time_dt.isoformat()
                }

                await command_queue.create_command(
                    db=db,
                    controller_id=post.controller_id,
                    command_type="payment_received",
                    command_str=json.dumps(online_payment_data),
                    priority=10
                )
                logger.info(f"Payme: команда online payment отправлена для post_id={trans.post_id}")

        except Exception as e:
            logger.critical(f"КРИТИЧЕСКАЯ ОШИБКА БИЗНЕС-ЛОГИКИ: Деньги списаны (транзакция {payme_trans_id}), но не зачислены на пост {trans.post_id}. Ошибка: {e}")

        perform_time_ms = int(perform_time_dt.timestamp() * 1000)
        return {"result": {"transaction": str(trans.id), "perform_time": perform_time_ms, "state": 2}, "id": request_id}

    async def _canceltransaction(self, params: Dict, request_id: str, db: AsyncSession) -> Dict:
        payme_trans_id, reason = params.get('id'), params.get('reason')
        trans = await repository.get_payment_transaction_by_payme_id(db, payme_trans_id)
        if not trans:
            return self._error_response(request_id, -31003, "Транзакция не найдена.")

        cancel_time = datetime.now(timezone.utc)
        if trans.payme_state in [-1, -2]:
            cancel_time_ms = int(trans.payme_cancel_time.replace(tzinfo=timezone.utc).timestamp() * 1000)
            return {"result": {"transaction": str(trans.id), "cancel_time": cancel_time_ms, "state": trans.payme_state}, "id": request_id}

        if trans.payme_state == 1: trans.payme_state = -1
        elif trans.payme_state == 2: trans.payme_state = -2

        trans.status = "cancelled"; trans.payme_cancel_time = cancel_time
        trans.cancelled_at = cancel_time; trans.payme_reason = str(reason)
        await db.commit()
        return {"result": {"transaction": str(trans.id), "cancel_time": int(cancel_time.timestamp()*1000), "state": trans.payme_state}, "id": request_id}

    async def _checktransaction(self, params: Dict, request_id: str, db: AsyncSession) -> Dict:
        payme_trans_id = params.get('id')
        trans = await repository.get_payment_transaction_by_payme_id(db, payme_trans_id)
        if not trans:
            return self._error_response(request_id, -31003, "Транзакция не найдена.")

        def to_ms(dt: Optional[datetime]) -> int:
            if not dt: return 0
            if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
            return int(dt.timestamp() * 1000)

        return {"result": {"create_time": to_ms(trans.payme_create_time), "perform_time": to_ms(trans.payme_perform_time), "cancel_time": to_ms(trans.payme_cancel_time), "transaction": str(trans.id), "state": trans.payme_state, "reason": int(trans.payme_reason) if trans.payme_reason else None}, "id": request_id}

    async def _getstatement(self, params: Dict, request_id: str, db: AsyncSession) -> Dict:
        from_dt = datetime.fromtimestamp(params['from']/1000, tz=timezone.utc)
        to_dt = datetime.fromtimestamp(params['to']/1000, tz=timezone.utc)
        transactions = await repository.get_payment_transactions_for_statement(db, from_dt, to_dt)

        def to_ms(dt: Optional[datetime]) -> int:
            if not dt: return 0
            if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
            return int(dt.timestamp() * 1000)

        statement = [{"id": tr.transaction_id, "time": to_ms(tr.payme_create_time), "amount": tr.amount, "account": {"order_id": str(tr.id)}, "create_time": to_ms(tr.payme_create_time), "perform_time": to_ms(tr.payme_perform_time), "cancel_time": to_ms(tr.payme_cancel_time), "transaction": str(tr.id), "state": tr.payme_state, "reason": int(tr.payme_reason) if tr.payme_reason else None} for tr in transactions]
        return {"result": {"transactions": statement}, "id": request_id}

    def _error_response(self, request_id: Optional[str], code: int, msg: str, data: Optional[str] = None) -> Dict:
        error = {"code": code, "message": {"ru": msg, "uz": "Xatolik", "en": "Error"}}
        if data: error["data"] = data
        return {"error": error, "id": request_id}

PAYME_MERCHANT_ID = os.environ.get("PAYME_MERCHANT_ID", "687a11ccbe22dfc945998999")
PAYME_SECRET_KEY = os.environ.get("PAYME_SECRET_KEY_TEST", "HfihstJDFCR1nhEYqOZpUJybgMXTecEUAVBZ")

payme_handler = PaymeHandler(merchant_id=PAYME_MERCHANT_ID, secret_key=PAYME_SECRET_KEY)
