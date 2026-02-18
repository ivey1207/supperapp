from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import json

from carwash_backend.db.database import get_db
from carwash_backend.core.payment_gateways.payme_handler import payme_handler

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/payme/webhook", summary="Универсальный Webhook для Payme Merchant API")
async def payme_universal_webhook(request: Request, db: AsyncSession = Depends(get_db)):

    request_data = {}
    try:

        request_data = await request.json()
    except json.JSONDecodeError:

        pass

    request_id = request_data.get("id")

    auth_header = request.headers.get('Authorization')
    if not payme_handler.verify_authorization(auth_header):
        logger.warning("Payme: Неудачная попытка авторизации.")

        return JSONResponse(
            status_code=200,
            content={
                "id": request_id,
                "error": {
                    "code": -32504,
                    "message": "Недостаточно прав для выполнения метода"
                }
            }
        )

    response = await payme_handler.handle_request(request_data, db)
    return JSONResponse(content=response)
