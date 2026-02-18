import logging
import base64
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
from carwash_backend.db.database import async_session
from carwash_backend.db import repository, schemas
from carwash_backend.core.command_queue import command_queue

logger = logging.getLogger(__name__)

class UzumHandler:

    pass
    def __init__(self):

        try:
            from uzum_config import get_uzum_config
            config = get_uzum_config()

            self.service_id = config.get("service_id", 111)
            self.secret_key = str(config.get("secret_key", "310676238"))
            self.merchant_id = config.get("merchant_id", "your_uzum_merchant_id")
            self.merchant_service_user_id = config.get("merchant_service_user_id", "your_user_id")

            logger.info(f"UzumHandler инициализирован с service_id={self.service_id}")

        except ImportError:
            logger.warning("uzum_config.py не найден, используем значения по умолчанию")
            self.service_id = 111
            self.secret_key = "310676238"
            self.merchant_id = "your_uzum_merchant_id"
            self.merchant_service_user_id = "your_user_id"

    def verify_webhook_auth(self, auth_header: str) -> bool:

        try:
            if not auth_header or not auth_header.startswith("Basic "):
                logger.error("Отсутствует или неверный формат Authorization header")
                return False

            encoded_credentials = auth_header[6:]

            decoded_bytes = base64.b64decode(encoded_credentials)
            decoded_str = decoded_bytes.decode('utf-8')

            if ':' not in decoded_str:
                logger.error("Неверный формат Basic Auth")
                return False

            username, password = decoded_str.split(':', 1)

            expected_username = str(self.service_id)
            expected_password = str(self.secret_key)

            if username == expected_username and password == expected_password:
                logger.info("Basic Auth успешно проверен")
                return True
            else:
                logger.error(f"Неверные учетные данные: {username}:{password}")
                return False

        except Exception as e:
            logger.error(f"Ошибка проверки Basic Auth: {e}")
            return False

    async def webhook_check(self, data: Dict[str, Any]) -> Dict[str, Any]:

        try:

            service_id = data.get("serviceId")
            params = data.get("params", {})
            account = params.get("account")

            if service_id != self.service_id:
                return {
                    "serviceId": self.service_id,
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "status": "ERROR",
                    "error": {
                        "code": "INVALID_SERVICE_ID",
                        "message": f"Неверный service_id. Ожидается {self.service_id}"
                    }
                }

            if not account:
                return {
                    "serviceId": self.service_id,
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "status": "ERROR",
                    "error": {
                        "code": "INVALID_ACCOUNT",
                        "message": "Не указан номер лицевого счёта"
                    }
                }

            async with async_session() as db:
                try:
                    account_id = int(account)

                    kiosk = await repository.get_kiosk(db, account_id)
                    if kiosk:
                        return {
                            "serviceId": self.service_id,
                            "timestamp": int(datetime.now().timestamp() * 1000),
                            "status": "OK",
                            "data": {
                                "account": account,
                                "accountName": f"Киоск #{account_id}",
                                "accountType": "kiosk"
                            }
                        }

                    post = await repository.get_post(db, account_id)
                    if post:
                        return {
                            "serviceId": self.service_id,
                            "timestamp": int(datetime.now().timestamp() * 1000),
                            "status": "OK",
                            "data": {
                                "account": account,
                                "accountName": f"Пост #{account_id} - {post.name}",
                                "accountType": "post"
                            }
                        }

                    return {
                        "serviceId": self.service_id,
                        "timestamp": int(datetime.now().timestamp() * 1000),
                        "status": "ERROR",
                        "error": {
                            "code": "ACCOUNT_NOT_FOUND",
                            "message": f"Лицевой счёт {account} не найден"
                        }
                    }

                except ValueError:
                    return {
                        "serviceId": self.service_id,
                        "timestamp": int(datetime.now().timestamp() * 1000),
                        "status": "ERROR",
                        "error": {
                            "code": "INVALID_ACCOUNT_FORMAT",
                            "message": "Неверный формат номера лицевого счёта"
                        }
                    }

        except Exception as e:
            logger.error(f"Ошибка в webhook_check: {e}")
            return {
                "serviceId": self.service_id,
                "timestamp": int(datetime.now().timestamp() * 1000),
                "status": "ERROR",
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Внутренняя ошибка сервера"
                }
            }

    async def webhook_create(self, data: Dict[str, Any]) -> Dict[str, Any]:

        try:
            service_id = data.get("serviceId")
            trans_id = data.get("transId")
            params = data.get("params", {})
            account = params.get("account")
            amount = data.get("amount")

            if service_id != self.service_id:
                return {
                    "serviceId": self.service_id,
                    "transId": trans_id,
                    "status": "FAILED",
                    "error": {"code": "INVALID_SERVICE_ID", "message": "Неверный service_id"}
                }

            if not trans_id:
                return {
                    "serviceId": self.service_id,
                    "transId": None,
                    "status": "FAILED",
                    "error": {"code": "INVALID_TRANS_ID", "message": "Не указан transId"}
                }

            if not account or not amount:
                return {
                    "serviceId": self.service_id,
                    "transId": trans_id,
                    "status": "FAILED",
                    "error": {"code": "INVALID_PARAMS", "message": "Неверные параметры"}
                }

            async with async_session() as db:
                try:
                    account_id = int(account)
                    amount_tiyin = int(amount)

                    transaction_data = schemas.PaymentTransactionCreate(
                        post_id=account_id,
                        amount=amount_tiyin,
                        payment_type="uzum",
                        transaction_id=trans_id
                    )

                    transaction = await repository.create_payment_transaction(db, transaction_data)
                    await db.commit()

                    logger.info(f"Создана Uzum транзакция: {trans_id} для счёта {account} на сумму {amount_tiyin}")

                    return {
                        "serviceId": self.service_id,
                        "transId": trans_id,
                        "status": "CREATED"
                    }

                except Exception as e:
                    logger.error(f"Ошибка создания транзакции: {e}")
                    return {
                        "serviceId": self.service_id,
                        "transId": trans_id,
                        "status": "FAILED",
                        "error": {"code": "CREATE_ERROR", "message": str(e)}
                    }

        except Exception as e:
            logger.error(f"Ошибка в webhook_create: {e}")
            return {
                "serviceId": self.service_id,
                "transId": data.get("transId"),
                "status": "FAILED",
                "error": {"code": "INTERNAL_ERROR", "message": "Внутренняя ошибка сервера"}
            }

    async def webhook_confirm(self, data: Dict[str, Any]) -> Dict[str, Any]:

        try:
            service_id = data.get("serviceId")
            trans_id = data.get("transId")
            payment_source = data.get("paymentSource")

            if service_id != self.service_id:
                return {
                    "serviceId": self.service_id,
                    "transId": trans_id,
                    "status": "FAILED",
                    "error": {"code": "INVALID_SERVICE_ID", "message": "Неверный service_id"}
                }

            if not trans_id:
                return {
                    "serviceId": self.service_id,
                    "transId": None,
                    "status": "FAILED",
                    "error": {"code": "INVALID_TRANS_ID", "message": "Не указан transId"}
                }

            async with async_session() as db:
                try:

                    transaction = await repository.get_payment_transaction_by_transaction_id(db, trans_id)
                    if not transaction:
                        return {
                            "serviceId": self.service_id,
                            "transId": trans_id,
                            "status": "FAILED",
                            "error": {"code": "TRANSACTION_NOT_FOUND", "message": "Транзакция не найдена"}
                        }

                    transaction.status = "confirmed"
                    transaction.confirmed_at = datetime.now()
                    await db.commit()

                    if transaction.post_id:
                        try:
                            await repository.topup_kiosk_cash(
                                db,
                                transaction.post_id,
                                transaction.amount,
                                f"Uzum Bank платёж {trans_id}"
                            )

                            await command_queue.add_payment_notification(
                                transaction.post_id,
                                transaction.amount,
                                "uzum"
                            )

                            logger.info(f"Киоск {transaction.post_id} пополнен на {transaction.amount} тийин через Uzum")

                        except Exception as e:
                            logger.error(f"Ошибка пополнения киоска: {e}")

                    return {
                        "serviceId": self.service_id,
                        "transId": trans_id,
                        "status": "CONFIRMED"
                    }

                except Exception as e:
                    logger.error(f"Ошибка подтверждения транзакции: {e}")
                    return {
                        "serviceId": self.service_id,
                        "transId": trans_id,
                        "status": "FAILED",
                        "error": {"code": "CONFIRM_ERROR", "message": str(e)}
                    }

        except Exception as e:
            logger.error(f"Ошибка в webhook_confirm: {e}")
            return {
                "serviceId": self.service_id,
                "transId": data.get("transId"),
                "status": "FAILED",
                "error": {"code": "INTERNAL_ERROR", "message": "Внутренняя ошибка сервера"}
            }

    async def webhook_reverse(self, data: Dict[str, Any]) -> Dict[str, Any]:

        try:
            service_id = data.get("serviceId")
            trans_id = data.get("transId")

            if service_id != self.service_id:
                return {
                    "serviceId": self.service_id,
                    "transId": trans_id,
                    "status": "FAILED",
                    "error": {"code": "INVALID_SERVICE_ID", "message": "Неверный service_id"}
                }

            if not trans_id:
                return {
                    "serviceId": self.service_id,
                    "transId": None,
                    "status": "FAILED",
                    "error": {"code": "INVALID_TRANS_ID", "message": "Не указан transId"}
                }

            async with async_session() as db:
                try:
                    transaction = await repository.get_payment_transaction_by_transaction_id(db, trans_id)
                    if not transaction:
                        return {
                            "serviceId": self.service_id,
                            "transId": trans_id,
                            "status": "FAILED",
                            "error": {"code": "TRANSACTION_NOT_FOUND", "message": "Транзакция не найдена"}
                        }

                    transaction.status = "reversed"
                    transaction.cancelled_at = datetime.now()
                    await db.commit()

                    logger.info(f"Транзакция Uzum {trans_id} отменена")

                    return {
                        "serviceId": self.service_id,
                        "transId": trans_id,
                        "status": "REVERSED"
                    }

                except Exception as e:
                    logger.error(f"Ошибка отмены транзакции: {e}")
                    return {
                        "serviceId": self.service_id,
                        "transId": trans_id,
                        "status": "FAILED",
                        "error": {"code": "REVERSE_ERROR", "message": str(e)}
                    }

        except Exception as e:
            logger.error(f"Ошибка в webhook_reverse: {e}")
            return {
                "serviceId": self.service_id,
                "transId": data.get("transId"),
                "status": "FAILED",
                "error": {"code": "INTERNAL_ERROR", "message": "Внутренняя ошибка сервера"}
            }

    async def webhook_status(self, data: Dict[str, Any]) -> Dict[str, Any]:

        try:
            service_id = data.get("serviceId")
            trans_id = data.get("transId")

            if service_id != self.service_id:
                return {
                    "serviceId": self.service_id,
                    "transId": trans_id,
                    "status": "ERROR",
                    "error": {"code": "INVALID_SERVICE_ID", "message": "Неверный service_id"}
                }

            if not trans_id:
                return {
                    "serviceId": self.service_id,
                    "transId": None,
                    "status": "ERROR",
                    "error": {"code": "INVALID_TRANS_ID", "message": "Не указан transId"}
                }

            async with async_session() as db:
                try:
                    transaction = await repository.get_payment_transaction_by_transaction_id(db, trans_id)
                    if not transaction:
                        return {
                            "serviceId": self.service_id,
                            "transId": trans_id,
                            "status": "ERROR",
                            "error": {"code": "TRANSACTION_NOT_FOUND", "message": "Транзакция не найдена"}
                        }

                    status_mapping = {
                        "pending": "CREATED",
                        "confirmed": "CONFIRMED",
                        "failed": "FAILED",
                        "reversed": "REVERSED"
                    }

                    uzum_status = status_mapping.get(transaction.status, "UNKNOWN")

                    response = {
                        "serviceId": self.service_id,
                        "transId": trans_id,
                        "status": uzum_status
                    }

                    if transaction.status == "confirmed":
                        response["confirmedAt"] = int(transaction.confirmed_at.timestamp() * 1000) if transaction.confirmed_at else None
                    elif transaction.status == "reversed":
                        response["reversedAt"] = int(transaction.cancelled_at.timestamp() * 1000) if transaction.cancelled_at else None

                    return response

                except Exception as e:
                    logger.error(f"Ошибка проверки статуса: {e}")
                    return {
                        "serviceId": self.service_id,
                        "transId": trans_id,
                        "status": "ERROR",
                        "error": {"code": "STATUS_ERROR", "message": str(e)}
                    }

        except Exception as e:
            logger.error(f"Ошибка в webhook_status: {e}")
            return {
                "serviceId": self.service_id,
                "transId": data.get("transId"),
                "status": "ERROR",
                "error": {"code": "INTERNAL_ERROR", "message": "Внутренняя ошибка сервера"}
            }

    async def process_webhook(self, webhook_type: str, data: Dict[str, Any], auth_header: str = None) -> Dict[str, Any]:

        try:

            if auth_header and not self.verify_webhook_auth(auth_header):
                return {
                    "serviceId": self.service_id,
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "status": "ERROR",
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Неверная авторизация"
                    }
                }

            if webhook_type == "check":
                return await self.webhook_check(data)
            elif webhook_type == "create":
                return await self.webhook_create(data)
            elif webhook_type == "confirm":
                return await self.webhook_confirm(data)
            elif webhook_type == "reverse":
                return await self.webhook_reverse(data)
            elif webhook_type == "status":
                return await self.webhook_status(data)
            else:
                return {
                    "serviceId": self.service_id,
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "status": "ERROR",
                    "error": {
                        "code": "UNKNOWN_WEBHOOK_TYPE",
                        "message": f"Неизвестный тип вебхука: {webhook_type}"
                    }
                }

        except Exception as e:
            logger.error(f"Критическая ошибка в process_webhook: {e}")
            return {
                "serviceId": self.service_id,
                "timestamp": int(datetime.now().timestamp() * 1000),
                "status": "ERROR",
                "error": {
                    "code": "CRITICAL_ERROR",
                    "message": "Критическая ошибка сервера"
                }
            }

uzum_handler = UzumHandler()
