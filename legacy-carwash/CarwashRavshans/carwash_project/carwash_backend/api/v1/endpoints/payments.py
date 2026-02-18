from fastapi import APIRouter, Depends, HTTPException, Request, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
import logging
from datetime import datetime

from carwash_backend.db import schemas, repository, models
from carwash_backend.db.database import get_db
from carwash_backend.api.v1.dependencies import get_current_admin
from carwash_backend.core.payment_gateways.click_handler import click_handler
from carwash_backend.core.payment_gateways.payme_handler import payme_handler
from carwash_backend.core.payment_gateways.uzum_handler import uzum_handler
from carwash_backend.core.loyalty_manager import loyalty_manager

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/click/prepare", summary="Click Prepare Request Handler")
async def click_prepare(
    request: Request,
    db: AsyncSession = Depends(get_db)
):

    try:

        form_data = await request.form()
        params = dict(form_data)

        logger.info(f"Click prepare request: {params}")

        result = await click_handler.prepare_payment(params)

        logger.info(f"Click prepare response: {result}")
        return result

    except Exception as e:
        logger.error(f"Ошибка в click_prepare: {e}")
        return {
            "error": -8,
            "error_note": "Error in request from click"
        }

@router.post("/click/complete", summary="Click Complete Request Handler")
async def click_complete(
    request: Request,
    db: AsyncSession = Depends(get_db)
):

    try:

        form_data = await request.form()
        params = dict(form_data)

        logger.info(f"Click complete request: {params}")

        result = await click_handler.complete_payment(params)

        logger.info(f"Click complete response: {result}")
        return result

    except Exception as e:
        logger.error(f"Ошибка в click_complete: {e}")
        return {
            "error": -8,
            "error_note": "Error in request from click"
        }

@router.get("/click/redirect/{kiosk_id}", summary="Redirect to Click Payment Page")
async def redirect_to_click(
    kiosk_id: str,
    amount: Optional[int] = Query(None, description="Сумма в сумах"),
    db: AsyncSession = Depends(get_db)
):

    try:

        raw_kiosk_id = kiosk_id.strip()
        if raw_kiosk_id.isdigit():
            normalized_kiosk_id = f"kiosk{int(raw_kiosk_id):03d}"
        else:
            normalized_kiosk_id = raw_kiosk_id.lower()
            if not normalized_kiosk_id.startswith("kiosk"):
                normalized_kiosk_id = f"kiosk{normalized_kiosk_id}"

        try:
            post_id = int(normalized_kiosk_id.replace('kiosk', '').lstrip('0') or '0')
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid kiosk ID")

        post = await repository.get_post(db, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Kiosk not found")

        click_url = "https://my.click.uz/services/pay"

        final_amount = amount if amount and amount >= 1000 else 1000
        params = f"?service_id={click_handler.service_id}&merchant_id={click_handler.merchant_id}&transaction_param={normalized_kiosk_id}&amount={final_amount}"

        redirect_url = click_url + params

        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=redirect_url, status_code=302)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка redirect: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/click/generate-qr", summary="Generate QR Code Data for Kiosk")
async def generate_click_qr(
    kiosk_id: str,
    amount: Optional[int] = Query(None, description="Предустановленная сумма в сумах (опционально)"),
    use_redirect: bool = Query(False, description="Использовать redirect для обхода блокировщиков"),
    db: AsyncSession = Depends(get_db)
):

    try:

        raw_kiosk_id = (kiosk_id or "").strip()
        if raw_kiosk_id.isdigit():
            kiosk_id = f"kiosk{int(raw_kiosk_id):03d}"
        else:
            normalized = raw_kiosk_id.lower()
            if normalized.startswith("kiosk"):

                numeric_part = normalized.replace("kiosk", "", 1)
                if numeric_part.isdigit():
                    kiosk_id = f"kiosk{int(numeric_part):03d}"
                else:
                    kiosk_id = normalized
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid kiosk ID format. Use format: kiosk001, kiosk005, etc."
                )

        try:
            post_id = int(kiosk_id.replace('kiosk', '').lstrip('0') or '0')
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid kiosk ID format")

        post = await repository.get_post(db, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Kiosk not found")

        if amount and amount >= 1000:
            final_amount = amount
        else:
            final_amount = 1000

        amount_param = f"&amount={final_amount}"

        if use_redirect:

            from carwash_backend.core.config import settings
            base_domain = getattr(settings, 'base_url', 'https://your-domain.com')
            qr_url = f"{base_domain}/api/v1/payments/click/redirect/{post_id}"
            if amount and amount >= 1000:
                qr_url += f"?amount={amount}"
            qr_text = f"Киоск {kiosk_id} - GARAGE CAR WASH (Redirect)"
        else:

            base_url = "https://my.click.uz/services/pay"
            qr_url = f"{base_url}?service_id={click_handler.service_id}&merchant_id={click_handler.merchant_id}&transaction_param={kiosk_id}{amount_param}"
            qr_text = f"Киоск {kiosk_id} - GARAGE CAR WASH"

        if use_redirect:
                instructions = [
                "1. Отсканируйте QR код в любом QR-сканере или браузере",
                "2. Вы будете перенаправлены в приложение Click",
                "3. ID киоска будет автоматически заполнен: " + kiosk_id,
                f"4. Сумма предзаполнена: {final_amount} сум (МОЖНО ИЗМЕНИТЬ на любую сумму)",
                "5. Измените сумму на желаемую (минимум 1000 сум)",
                "6. Подтвердите платеж",
                "7. После успешной оплаты киоск активируется автоматически"
                ]
        else:
            instructions = [
                "1. Отсканируйте QR код в приложении Click",
                "2. ID киоска должен быть заполнен: " + kiosk_id,
                f"3. Сумма предзаполнена: {final_amount} сум (МОЖНО ИЗМЕНИТЬ на любую сумму)",
                "4. Измените сумму на желаемую (минимум 1000 сум)",
                "5. Подтвердите платеж",
                "6. После успешной оплаты киоск активируется автоматически"
                ]

        qr_data = {
            "kiosk_id": kiosk_id,
            "post_id": post_id,
            "service_id": click_handler.service_id,
            "merchant_id": click_handler.merchant_id,
            "qr_url": qr_url,
            "qr_text": qr_text,
            "instructions": instructions,
            "min_amount": 1000,
            "currency": "UZS",
            "preset_amount": final_amount,
            "original_amount": amount,
            "amount_editable": True,
            "uses_redirect": use_redirect,
            "qr_type": "redirect" if use_redirect else "direct",
            "transaction_param": kiosk_id
        }

        return qr_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка генерации QR кода: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/click/create-flexible-qr", summary="Create Flexible Click QR with Custom Amount")
async def create_flexible_click_qr(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):

    try:
        kiosk_id = payload.get("kiosk_id")
        amount = payload.get("amount")
        editable = payload.get("editable", True)

        if not kiosk_id:
            raise HTTPException(status_code=400, detail="kiosk_id обязателен")

        if amount is not None:
            try:
                amount = int(amount)
                if amount < 1000:
                    raise HTTPException(status_code=400, detail="Минимальная сумма 1000 сум")
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="Неверный формат суммы")

        raw_kiosk_id = str(kiosk_id).strip()
        if raw_kiosk_id.isdigit():
            normalized_kiosk_id = f"kiosk{int(raw_kiosk_id):03d}"
        else:
            normalized = raw_kiosk_id.lower()
            if normalized.startswith("kiosk"):
                numeric_part = normalized.replace("kiosk", "", 1)
                if numeric_part.isdigit():
                    normalized_kiosk_id = f"kiosk{int(numeric_part):03d}"
                else:
                    normalized_kiosk_id = normalized
            else:
                raise HTTPException(status_code=400, detail="Неверный формат kiosk_id")

        post_id = int(normalized_kiosk_id.replace('kiosk', '').lstrip('0') or '0')
        post = await repository.get_post(db, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Киоск не найден")

        base_url = "https://my.click.uz/services/pay"
        amount_param = f"&amount={amount}" if amount else ""

        if editable:

            qr_url = f"{base_url}?service_id={click_handler.service_id}&merchant_id={click_handler.merchant_id}&user_id={normalized_kiosk_id}{amount_param}"
        else:

            qr_url = f"{base_url}?service_id={click_handler.service_id}&merchant_id={click_handler.merchant_id}&user_id={normalized_kiosk_id}{amount_param}"

        return {
            "success": True,
            "kiosk_id": normalized_kiosk_id,
            "post_id": post_id,
            "qr_url": qr_url,
            "qr_text": f"Киоск {normalized_kiosk_id} - GARAGE CAR WASH",
            "amount": amount,
            "amount_editable": True,
            "min_amount": 1000,
            "currency": "UZS",
            "instructions": [
                "1. Отсканируйте QR код в приложении Click",
                f"2. ID киоска: {normalized_kiosk_id}",
                f"3. {'Сумма предзаполнена: ' + str(amount) + ' сум' if amount else 'Введите желаемую сумму'} (минимум 1000 сум)",
                "4. Подтвердите платеж",
                "5. Киоск активируется автоматически после оплаты"
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка создания гибкого QR кода: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/click/create-payment")
async def create_click_payment_legacy(
    card_uid: str,
    amount: float,
    phone_number: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):

    try:

        card = await repository.get_rfid_card_by_uid(db, card_uid)
        if not card:
            raise HTTPException(status_code=404, detail="Карта не найдена")

        return {
            "message": "Legacy endpoint. Use QR code integration instead.",
            "card_uid": card_uid,
            "amount": amount,
            "recommendation": "Use /click/generate-qr endpoint for QR code integration"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка создания платежа Click: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payme/create-invoice", summary="Create Payme Invoice and QR Code")
async def create_payme_invoice(
    post_id: int,
    amount: int,
    db: AsyncSession = Depends(get_db)
):

    try:

        post = await repository.get_post(db, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        if amount < 100000:
            raise HTTPException(status_code=400, detail="Минимальная сумма 1000 сум")

        transaction_data = schemas.PaymentTransactionCreate(
            post_id=post_id,
            amount=amount
        )

        transaction = await repository.create_payment_transaction(db, transaction_data)

        payme_url = f"https://checkout.paycom.uz/{payme_handler.merchant_id}"
        params = f"?amount={amount}&account[order_id]={transaction.id}"
        full_url = payme_url + params

        return {
            "transaction_id": transaction.id,
            "post_id": post_id,
            "amount": amount,
            "amount_sum": amount / 100,
            "payme_url": full_url,
            "qr_url": full_url,
            "qr_text": f"Пост #{post_id} - GARAGE CAR WASH - {amount/100} сум",
            "instructions": [
                "1. Отсканируйте QR код в приложении Payme",
                "2. Проверьте сумму и детали платежа",
                "3. Подтвердите платеж",
                "4. После успешной оплаты пост активируется автоматически"
            ],
            "status": "pending",
            "currency": "UZS"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка создания Payme инвойса: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-invoice", summary="Create Invoice (alias for Payme) with JSON body", tags=["Payments"])
async def create_invoice_alias(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):

    try:
        post_id = int(payload.get("post_id"))
        amount_sums = float(payload.get("amount"))
    except Exception:
        raise HTTPException(status_code=400, detail="Неверное тело запроса. Требуется post_id (int) и amount (число, сум)")

    if amount_sums < 1000:
        raise HTTPException(status_code=400, detail="Минимальная сумма 1000 сум")

    amount_tiyin = int(round(amount_sums * 100))

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    transaction_data = schemas.PaymentTransactionCreate(post_id=post_id, amount=amount_tiyin)
    transaction = await repository.create_payment_transaction(db, transaction_data)

    payme_url = f"https://checkout.paycom.uz/{payme_handler.merchant_id}"
    params = f"?amount={amount_tiyin}&account[order_id]={transaction.id}"
    full_url = payme_url + params

    return {
        "transaction_id": transaction.id,
        "post_id": post_id,
        "amount": amount_tiyin,
        "amount_sum": amount_sums,
        "payme_url": full_url,
        "qr_url": full_url,
        "status": "pending",
        "currency": "UZS"
    }

@router.get("/payme/generate-qr", summary="Generate Payme QR Code Data")
async def generate_payme_qr(
    post_id: int,
    amount: int,
    db: AsyncSession = Depends(get_db)
):

    try:

        post = await repository.get_post(db, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        if amount < 100000:
            raise HTTPException(status_code=400, detail="Минимальная сумма 1000 сум")

        payme_url = f"https://checkout.paycom.uz/{payme_handler.merchant_id}"
        params = f"?amount={amount}&account[post_id]={post_id}"
        full_url = payme_url + params

        return {
            "post_id": post_id,
            "amount": amount,
            "amount_sum": amount / 100,
            "qr_url": full_url,
            "qr_text": f"Пост #{post_id} - GARAGE CAR WASH",
            "min_amount": 100000,
            "currency": "UZS",
            "payment_system": "payme"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка генерации Payme QR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payme/perform-transaction")
async def payme_perform_transaction(request: Request):

    try:
        body = await request.json()
        result = await payme_handler.handle_request(body)
        return result
    except Exception as e:
        logger.error(f"Payme transaction error: {e}")
        return {"error": {"code": -32700, "message": "Parse error"}}

@router.post("/payme/check-perform-transaction")
async def payme_check_perform_transaction(request: Request):

    try:
        body = await request.json()
        result = await payme_handler.handle_request(body)
        return result
    except Exception as e:
        logger.error(f"Payme check transaction error: {e}")
        return {"error": {"code": -32700, "message": "Parse error"}}

@router.post("/uzum/check", summary="Uzum Bank Webhook: Check Transaction")
async def uzum_check_webhook(request: Request, db: AsyncSession = Depends(get_db)):

    try:
        auth_header = request.headers.get("Authorization")
        data = await request.json()
        logger.info(f"Uzum check webhook: {data}")
        result = await uzum_handler.process_webhook("check", data, auth_header)
        logger.info(f"Uzum check response: {result}")
        return result
    except Exception as e:
        logger.error(f"Ошибка в uzum_check_webhook: {e}")
        return {
            "serviceId": 111,
            "timestamp": int(datetime.now().timestamp() * 1000),
            "status": "ERROR",
            "error": {"code": "INTERNAL_ERROR", "message": "Внутренняя ошибка сервера"}
        }

@router.post("/uzum/create", summary="Uzum Bank Webhook: Create Transaction")
async def uzum_create_webhook(request: Request, db: AsyncSession = Depends(get_db)):

    try:
        auth_header = request.headers.get("Authorization")
        data = await request.json()
        logger.info(f"Uzum create webhook: {data}")
        result = await uzum_handler.process_webhook("create", data, auth_header)
        logger.info(f"Uzum create response: {result}")
        return result
    except Exception as e:
        logger.error(f"Ошибка в uzum_create_webhook: {e}")
        return {
            "serviceId": 111, "transId": None, "status": "FAILED",
            "error": {"code": "INTERNAL_ERROR", "message": "Внутренняя ошибка сервера"}
        }

@router.post("/uzum/confirm", summary="Uzum Bank Webhook: Confirm Transaction")
async def uzum_confirm_webhook(request: Request, db: AsyncSession = Depends(get_db)):

    try:
        auth_header = request.headers.get("Authorization")
        data = await request.json()
        logger.info(f"Uzum confirm webhook: {data}")
        result = await uzum_handler.process_webhook("confirm", data, auth_header)
        logger.info(f"Uzum confirm response: {result}")
        return result
    except Exception as e:
        logger.error(f"Ошибка в uzum_confirm_webhook: {e}")
        return {
            "serviceId": 111, "transId": None, "status": "FAILED",
            "error": {"code": "INTERNAL_ERROR", "message": "Внутренняя ошибка сервера"}
        }

@router.post("/uzum/reverse", summary="Uzum Bank Webhook: Reverse Transaction")
async def uzum_reverse_webhook(request: Request, db: AsyncSession = Depends(get_db)):

    try:
        auth_header = request.headers.get("Authorization")
        data = await request.json()
        logger.info(f"Uzum reverse webhook: {data}")
        result = await uzum_handler.process_webhook("reverse", data, auth_header)
        logger.info(f"Uzum reverse response: {result}")
        return result
    except Exception as e:
        logger.error(f"Ошибка в uzum_reverse_webhook: {e}")
        return {
            "serviceId": 111, "transId": None, "status": "FAILED",
            "error": {"code": "INTERNAL_ERROR", "message": "Внутренняя ошибка сервера"}
        }

@router.post("/uzum/status", summary="Uzum Bank Webhook: Check Transaction Status")
async def uzum_status_webhook(request: Request, db: AsyncSession = Depends(get_db)):

    try:
        auth_header = request.headers.get("Authorization")
        data = await request.json()
        logger.info(f"Uzum status webhook: {data}")
        result = await uzum_handler.process_webhook("status", data, auth_header)
        logger.info(f"Uzum status response: {result}")
        return result
    except Exception as e:
        logger.error(f"Ошибка в uzum_status_webhook: {e}")
        return {
            "serviceId": 111, "transId": None, "status": "FAILED",
            "error": {"code": "INTERNAL_ERROR", "message": "Внутренняя ошибка сервера"}
        }

@router.get("/uzum/config", summary="Get Uzum Bank Configuration")
async def get_uzum_config():

    try:
        from uzum_config import get_uzum_config
        config = get_uzum_config()
        safe_config = config.copy()
        if "secret_key" in safe_config:
            safe_config["secret_key"] = "*" * len(str(safe_config["secret_key"]))
        is_ready = (
            config.get("merchant_id") != "your_uzum_merchant_id" and
            config.get("merchant_service_user_id") != "your_user_id"
        )
        return {
            "config": safe_config, "is_ready": is_ready,
            "webhook_endpoints": [
                "/api/v1/payments/uzum/check", "/api/v1/payments/uzum/create",
                "/api/v1/payments/uzum/confirm", "/api/v1/payments/uzum/reverse",
                "/api/v1/payments/uzum/status"
            ]
        }
    except ImportError:
        return {"error": "uzum_config.py не найден", "config": {}, "is_ready": False}
    except Exception as e:
        logger.error(f"Ошибка получения конфигурации Uzum: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/uzum/test-webhook", summary="Test Uzum Bank Webhook Integration")
async def test_uzum_webhook(
    webhook_type: str = Query(..., description="Тип вебхука: check, create, confirm, reverse, status"),
    account: int = Query(1, description="Номер лицевого счёта (kiosk_id или post_id)"),
    amount: int = Query(250000, description="Сумма в тийинах (2500 сум = 250000 тийин)"),
    db: AsyncSession = Depends(get_db)
):

    try:
        import uuid
        base_data = {
            "serviceId": 111,
            "timestamp": int(datetime.now().timestamp() * 1000)
        }

        if webhook_type == "check":
            test_data = {**base_data, "params": {"account": account}}
        elif webhook_type == "create":
            test_data = {**base_data, "transId": str(uuid.uuid4()), "params": {"account": account}, "amount": amount}
        elif webhook_type in ["confirm", "reverse", "status"]:
            test_data = {**base_data, "transId": str(uuid.uuid4())}
            if webhook_type == "confirm":
                test_data.update({
                    "paymentSource": "UZCARD", "tariff": None,
                    "processingReferenceNumber": "000", "phone": "998901234567"
                })
        else:
            raise HTTPException(status_code=400, detail=f"Неизвестный тип вебхука: {webhook_type}")

        result = await uzum_handler.process_webhook(webhook_type, test_data)
        return {
            "test_type": webhook_type, "test_data": test_data, "result": result,
            "success": "ERROR" not in result.get("status", ""),
            "message": f"Тест вебхука {webhook_type} выполнен"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка тестирования Uzum webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/uzum/webhook")
async def uzum_webhook_legacy(request: Request):

    logger.warning("Используется устаревший endpoint /uzum/webhook")
    return {
        "status": "deprecated",
        "message": "Use specific endpoints: /uzum/check, /uzum/create, /uzum/confirm, /uzum/reverse, /uzum/status"
    }

@router.get("/payment-methods")
async def get_payment_methods():
    return {
        "methods": [
            {
                "id": "click",
                "name": "Click",
                "enabled": True,
                "logo": "/static/images/click-logo.png"
            },
            {
                "id": "payme",
                "name": "Payme",
                "enabled": False,
                "logo": "/static/images/payme-logo.png"
            },
            {
                "id": "uzum",
                "name": "Uzum",
                "enabled": False,
                "logo": "/static/images/uzum-logo.png"
            }
        ]
    }

@router.post("/click/test-prepare", summary="Click Test Prepare (No Signature Check)")
async def click_test_prepare(
    request: Request,
    db: AsyncSession = Depends(get_db)
):

    try:

        form_data = await request.form()
        params = dict(form_data)

        logger.info("=" * 50)
        logger.info("CLICK TEST PREPARE REQUEST RECEIVED!")
        logger.info(f"Request headers: {dict(request.headers)}")
        logger.info(f"Form data: {params}")
        logger.info("=" * 50)

        result = {
            "error": 0,
            "error_note": "Success - Test Mode",
            "click_trans_id": params.get('click_trans_id'),
            "merchant_trans_id": params.get('merchant_trans_id'),
            "merchant_prepare_id": int(datetime.now().timestamp()),
            "test_mode": True,
            "message": "Request received successfully! Signature check disabled for testing."
        }

        logger.info(f"Test response: {result}")
        return result

    except Exception as e:
        logger.error(f"Ошибка в click_test_prepare: {e}")
        return {
            "error": -8,
            "error_note": f"Error in test request: {str(e)}",
            "test_mode": True
        }

@router.post("/click/test-complete", summary="Click Test Complete (No Signature Check)")
async def click_test_complete(
    request: Request,
    db: AsyncSession = Depends(get_db)
):

    try:

        form_data = await request.form()
        params = dict(form_data)

        logger.info("=" * 50)
        logger.info("CLICK TEST COMPLETE REQUEST RECEIVED!")
        logger.info(f"Request headers: {dict(request.headers)}")
        logger.info(f"Form data: {params}")
        logger.info("=" * 50)

        result = {
            "error": 0,
            "error_note": "Success - Test Mode",
            "click_trans_id": params.get('click_trans_id'),
            "merchant_trans_id": params.get('merchant_trans_id'),
            "merchant_confirm_id": int(datetime.now().timestamp()),
            "test_mode": True,
            "message": "Request received successfully! Signature check disabled for testing."
        }

        logger.info(f"Test response: {result}")
        return result

    except Exception as e:
        logger.error(f"Ошибка в click_test_complete: {e}")
        return {
            "error": -8,
            "error_note": f"Error in test request: {str(e)}",
            "test_mode": True
    }

@router.post("/click/flexible-qr", summary="Создание гибкого QR кода Click")
async def create_flexible_click_qr(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):

    try:
        kiosk_id = payload.get("kiosk_id")
        amount = payload.get("amount")
        editable = payload.get("editable", True)

        if not kiosk_id:
            raise HTTPException(status_code=400, detail="kiosk_id обязателен")

        if amount is not None:
            try:
                amount = int(amount)
                if amount < 1000:
                    raise HTTPException(status_code=400, detail="Минимальная сумма 1000 сум")
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="Неверный формат суммы")

        raw_kiosk_id = str(kiosk_id).strip()
        if raw_kiosk_id.isdigit():
            normalized_kiosk_id = f"kiosk{int(raw_kiosk_id):03d}"
        else:
            normalized = raw_kiosk_id.lower()
            if normalized.startswith("kiosk"):
                numeric_part = normalized.replace("kiosk", "", 1)
                if numeric_part.isdigit():
                    normalized_kiosk_id = f"kiosk{int(numeric_part):03d}"
                else:
                    normalized_kiosk_id = normalized
            else:
                raise HTTPException(status_code=400, detail="Неверный формат kiosk_id")

        post_id = int(normalized_kiosk_id.replace('kiosk', '').lstrip('0') or '0')
        post = await repository.get_post(db, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Киоск не найден")

        base_url = "https://my.click.uz/services/pay"
        amount_param = f"&amount={amount}" if amount else ""

        if editable:

            qr_url = f"{base_url}?service_id={click_handler.service_id}&merchant_id={click_handler.merchant_id}&transaction_param={normalized_kiosk_id}{amount_param}"
        else:

            qr_url = f"{base_url}?service_id={click_handler.service_id}&merchant_id={click_handler.merchant_id}&transaction_param={normalized_kiosk_id}{amount_param}"

        return {
            "success": True,
            "kiosk_id": normalized_kiosk_id,
            "post_id": post_id,
            "qr_url": qr_url,
            "qr_text": f"Киоск {normalized_kiosk_id} - GARAGE CAR WASH",
            "amount": amount,
            "amount_editable": True,
            "min_amount": 1000,
            "currency": "UZS",
            "instructions": [
                "1. Отсканируйте QR код в приложении Click",
                f"2. ID киоска: {normalized_kiosk_id}",
                f"3. {'Сумма предзаполнена: ' + str(amount) + ' сум' if amount else 'Введите желаемую сумму'} (минимум 1000 сум)",
                "4. Подтвердите платеж",
                "5. Киоск активируется автоматически после оплаты"
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка создания гибкого QR кода: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/click/create-payment")
async def create_click_payment_legacy(
    card_uid: str,
    amount: float,
    phone_number: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):

    try:

        card = await repository.get_rfid_card_by_uid(db, card_uid)
        if not card:
            raise HTTPException(status_code=404, detail="Карта не найдена")

        return {
            "message": "Legacy endpoint. Use QR code integration instead.",
            "card_uid": card_uid,
            "amount": amount,
            "recommendation": "Use /click/generate-qr endpoint for QR code integration"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка создания платежа Click: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payme/create-invoice", summary="Create Payme Invoice and QR Code")
async def create_payme_invoice(
    post_id: int,
    amount: int,
    db: AsyncSession = Depends(get_db)
):

    try:

        post = await repository.get_post(db, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        if amount < 100000:
            raise HTTPException(status_code=400, detail="Минимальная сумма 1000 сум")

        transaction_data = schemas.PaymentTransactionCreate(
            post_id=post_id,
            amount=amount
        )

        transaction = await repository.create_payment_transaction(db, transaction_data)

        payme_url = f"https://checkout.paycom.uz/{payme_handler.merchant_id}"
        params = f"?amount={amount}&account[order_id]={transaction.id}"
        full_url = payme_url + params

        return {
            "transaction_id": transaction.id,
            "post_id": post_id,
            "amount": amount,
            "amount_sum": amount / 100,
            "payme_url": full_url,
            "qr_url": full_url,
            "qr_text": f"Пост #{post_id} - GARAGE CAR WASH - {amount/100} сум",
            "instructions": [
                "1. Отсканируйте QR код в приложении Payme",
                "2. Проверьте сумму и детали платежа",
                "3. Подтвердите платеж",
                "4. После успешной оплаты пост активируется автоматически"
            ],
            "status": "pending",
            "currency": "UZS"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка создания Payme инвойса: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-invoice", summary="Create Invoice (alias for Payme) with JSON body", tags=["Payments"])
async def create_invoice_alias(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):

    try:
        post_id = int(payload.get("post_id"))
        amount_sums = float(payload.get("amount"))
    except Exception:
        raise HTTPException(status_code=400, detail="Неверное тело запроса. Требуется post_id (int) и amount (число, сум)")

    if amount_sums < 1000:
        raise HTTPException(status_code=400, detail="Минимальная сумма 1000 сум")

    amount_tiyin = int(round(amount_sums * 100))

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    transaction_data = schemas.PaymentTransactionCreate(post_id=post_id, amount=amount_tiyin)
    transaction = await repository.create_payment_transaction(db, transaction_data)

    payme_url = f"https://checkout.paycom.uz/{payme_handler.merchant_id}"
    params = f"?amount={amount_tiyin}&account[order_id]={transaction.id}"
    full_url = payme_url + params

    return {
        "transaction_id": transaction.id,
        "post_id": post_id,
        "amount": amount_tiyin,
        "amount_sum": amount_sums,
        "payme_url": full_url,
        "qr_url": full_url,
        "status": "pending",
        "currency": "UZS"
    }

@router.get("/payme/generate-qr", summary="Generate Payme QR Code Data")
async def generate_payme_qr(
    post_id: int,
    amount: int,
    db: AsyncSession = Depends(get_db)
):

    try:

        post = await repository.get_post(db, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        if amount < 100000:
            raise HTTPException(status_code=400, detail="Минимальная сумма 1000 сум")

        payme_url = f"https://checkout.paycom.uz/{payme_handler.merchant_id}"
        params = f"?amount={amount}&account[post_id]={post_id}"
        full_url = payme_url + params

        return {
            "post_id": post_id,
            "amount": amount,
            "amount_sum": amount / 100,
            "qr_url": full_url,
            "qr_text": f"Пост #{post_id} - GARAGE CAR WASH",
            "min_amount": 100000,
            "currency": "UZS",
            "payment_system": "payme"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка генерации Payme QR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payme/perform-transaction")
async def payme_perform_transaction(request: Request):

    try:
        body = await request.json()
        result = await payme_handler.handle_request(body)
        return result
    except Exception as e:
        logger.error(f"Payme transaction error: {e}")
        return {"error": {"code": -32700, "message": "Parse error"}}
