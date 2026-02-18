import hashlib
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import yaml

logger = logging.getLogger(__name__)

class ClickPaymentHandler:
    pass
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.click_config = self.config.get('payment_gateways', {}).get('click', {})

        self.service_id = self.click_config.get('service_id', '71897')
        self.merchant_id = self.click_config.get('merchant_id', '21771')
        self.secret_key = self.click_config.get('secret_key', '2hBzIC6uuG')
        self.merchant_user_id = self.click_config.get('merchant_user_id', '55009')

        logger.info(f"Click handler инициализирован: service_id={self.service_id}")

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        try:
            with open(config_path, 'r', encoding='utf-8') as file:
                return yaml.safe_load(file)
        except Exception as e:
            logger.error(f"Ошибка загрузки конфигурации: {e}")
            return {}

    def _generate_signature(self, params: Dict[str, Any], action: int) -> str:
        if action == 0:
            sign_string = (
                str(params.get('click_trans_id', '')) +
                str(params.get('service_id', '')) +
                str(self.secret_key) +
                str(params.get('merchant_trans_id', '')) +
                str(params.get('amount', '')) +
                str(action) +
                str(params.get('sign_time', ''))
            )
        else:
            sign_string = (
                str(params.get('click_trans_id', '')) +
                str(params.get('service_id', '')) +
                str(self.secret_key) +
                str(params.get('merchant_trans_id', '')) +
                str(params.get('merchant_prepare_id', '')) +
                str(params.get('amount', '')) +
                str(action) +
                str(params.get('sign_time', ''))
            )

        signature = hashlib.md5(sign_string.encode('utf-8')).hexdigest()
        logger.debug(f"Signature generated for action {action}: {signature}")
        return signature

    def _verify_signature(self, params: Dict[str, Any], action: int) -> bool:
        received_sign = params.get('sign_string', '')
        expected_sign = self._generate_signature(params, action)

        logger.info(f"Click signature verification:")
        logger.info(f"  Action: {action}")
        logger.info(f"  Received signature: {received_sign}")
        logger.info(f"  Expected signature: {expected_sign}")
        logger.info(f"  Parameters: {dict(params)}")

        if action == 0:
            sign_string = (
                str(params.get('click_trans_id', '')) +
                str(params.get('service_id', '')) +
                str(self.secret_key) +
                str(params.get('merchant_trans_id', '')) +
                str(params.get('amount', '')) +
                str(action) +
                str(params.get('sign_time', ''))
            )
        else:
            sign_string = (
                str(params.get('click_trans_id', '')) +
                str(params.get('service_id', '')) +
                str(self.secret_key) +
                str(params.get('merchant_trans_id', '')) +
                str(params.get('merchant_prepare_id', '')) +
                str(params.get('amount', '')) +
                str(action) +
                str(params.get('sign_time', ''))
            )

        logger.info(f"  Sign string: {sign_string}")

        is_valid = received_sign == expected_sign
        if not is_valid:
            logger.warning(f"Signature verification failed!")
        else:
            logger.info(f"Signature verification successful!")

        return is_valid

    async def prepare_payment(self, params: Dict[str, Any]) -> Dict[str, Any]:
        try:
            logger.info(f"Click Prepare request: {params}")
            if not self._verify_signature(params, 0):
                return {
                    "error": -1,
                    "error_note": "SIGN CHECK FAILED!",
                    "click_trans_id": params.get('click_trans_id'),
                    "merchant_trans_id": params.get('merchant_trans_id')
                }
            merchant_trans_id = params.get('merchant_trans_id')
            amount = float(params.get('amount', 0))
            logger.info(f"Click Prepare: merchant_trans_id (transaction_param) = '{merchant_trans_id}', amount = {amount}")

            if not merchant_trans_id:
                return {
                    "error": -5,
                    "error_note": "User does not exist",
                    "click_trans_id": params.get('click_trans_id'),
                    "merchant_trans_id": merchant_trans_id
                }

            if not merchant_trans_id.startswith('kiosk'):
                return {
                    "error": -5,
                    "error_note": "Invalid kiosk ID format",
                    "click_trans_id": params.get('click_trans_id'),
                    "merchant_trans_id": merchant_trans_id
                }

            try:
                post_id = int(merchant_trans_id.replace('kiosk', '').lstrip('0') or '0')
            except ValueError:
                return {
                    "error": -5,
                    "error_note": "Invalid kiosk ID format",
                    "click_trans_id": params.get('click_trans_id'),
                    "merchant_trans_id": merchant_trans_id
                }

            if amount < 1000:
                return {
                    "error": -2,
                    "error_note": "Incorrect parameter amount",
                    "click_trans_id": params.get('click_trans_id'),
                    "merchant_trans_id": merchant_trans_id
                }

            from carwash_backend.db.database import async_session
            from carwash_backend.db import repository

            async with async_session() as db:
                post = await repository.get_post(db, post_id)
                if not post:
                    return {
                        "error": -5,
                        "error_note": "Kiosk does not exist",
                        "click_trans_id": params.get('click_trans_id'),
                        "merchant_trans_id": merchant_trans_id
                    }

            merchant_prepare_id = int(datetime.now().timestamp())

            logger.info(f"Click Prepare successful for kiosk {merchant_trans_id}, amount {amount}")

            return {
                "error": 0,
                "error_note": "Success",
                "click_trans_id": params.get('click_trans_id'),
                "merchant_trans_id": merchant_trans_id,
                "merchant_prepare_id": merchant_prepare_id
            }

        except Exception as e:
            logger.error(f"Ошибка в prepare_payment: {e}")
            return {
                "error": -8,
                "error_note": "Error in request from click",
                "click_trans_id": params.get('click_trans_id'),
                "merchant_trans_id": params.get('merchant_trans_id')
            }

    async def complete_payment(self, params: Dict[str, Any]) -> Dict[str, Any]:

        try:
            logger.info(f"Click Complete request: {params}")

            if not self._verify_signature(params, 1):
                return {
                    "error": -1,
                    "error_note": "SIGN CHECK FAILED!",
                    "click_trans_id": params.get('click_trans_id'),
                    "merchant_trans_id": params.get('merchant_trans_id')
                }

            merchant_trans_id = params.get('merchant_trans_id')
            amount = float(params.get('amount', 0))
            error_code = int(params.get('error', 0))

            logger.info(f"Click Complete: merchant_trans_id (transaction_param) = '{merchant_trans_id}', amount = {amount}, error = {error_code}")

            if error_code != 0:
                logger.warning(f"Click payment cancelled: error={error_code}, merchant_trans_id={merchant_trans_id}")
                return {
                    "error": -9,
                    "error_note": "Transaction cancelled",
                    "click_trans_id": params.get('click_trans_id'),
                    "merchant_trans_id": merchant_trans_id
                }

            try:
                post_id = int(merchant_trans_id.replace('kiosk', '').lstrip('0') or '0')
            except ValueError:
                return {
                    "error": -5,
                    "error_note": "Invalid kiosk ID format",
                    "click_trans_id": params.get('click_trans_id'),
                    "merchant_trans_id": merchant_trans_id
                }

            try:
                from carwash_backend.core.command_queue import command_queue
                from carwash_backend.db.database import async_session
                from carwash_backend.db import repository

                async with async_session() as db:

                    post = await repository.get_post(db, post_id)
                    if not post:
                        return {
                            "error": -5,
                            "error_note": "Kiosk does not exist",
                            "click_trans_id": params.get('click_trans_id'),
                            "merchant_trans_id": merchant_trans_id
                        }

                    online_payment_data = {
                        "type": "online_payment_received",
                        "payment_type": "click",
                        "post_id": post_id,
                        "amount": amount,
                        "service_name": "Онлайн оплата Click",
                        "service_cost": amount,
                        "transaction_id": params.get('click_trans_id'),
                        "merchant_trans_id": merchant_trans_id,
                        "timestamp": datetime.now().isoformat()
                    }

                    await command_queue.create_command(
                        db=db,
                        controller_id=post.controller_id,
                        command_type="payment_received",
                        command_str=json.dumps(online_payment_data),
                        priority=10
                    )

                    from carwash_backend.db import schemas
                    payment_transaction_data = schemas.PaymentTransactionCreate(
                        post_id=post_id,
                        amount=int(amount * 100),
                        payment_type="click"
                    )

                    payment_transaction = await repository.create_payment_transaction(db, payment_transaction_data)

                    payment_transaction.status = "completed"
                    payment_transaction.transaction_id = params.get('click_trans_id')
                    payment_transaction.completed_at = datetime.now()
                    payment_transaction.description = f"Click оплата для киоска {merchant_trans_id}"

                    await db.commit()

                    logger.info(f"Click: команда online payment отправлена для post_id={post_id}, amount={amount}")
                    logger.info(f"Click: создана PaymentTransaction id={payment_transaction.id} для статистики")

            except Exception as e:
                logger.error(f"Click: ошибка отправки команды polling: {e}")
                return {
                    "error": -7,
                    "error_note": "Failed to update user",
                    "click_trans_id": params.get('click_trans_id'),
                    "merchant_trans_id": merchant_trans_id
                }

            merchant_confirm_id = int(datetime.now().timestamp())

            logger.info(f"Click Complete successful for {merchant_trans_id}, amount {amount}")

            return {
                "error": 0,
                "error_note": "Success",
                "click_trans_id": params.get('click_trans_id'),
                "merchant_trans_id": merchant_trans_id,
                "merchant_confirm_id": merchant_confirm_id
            }

        except Exception as e:
            logger.error(f"Ошибка в complete_payment: {e}")
            return {
                "error": -8,
                "error_note": "Error in request from click",
                "click_trans_id": params.get('click_trans_id'),
                "merchant_trans_id": params.get('merchant_trans_id')
            }

click_handler = ClickPaymentHandler()
