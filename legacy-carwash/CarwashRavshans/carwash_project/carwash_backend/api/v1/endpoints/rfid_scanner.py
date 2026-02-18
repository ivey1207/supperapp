from fastapi import HTTPException
from carwash_backend.db.repository import topup_rfid_card
from carwash_backend.db.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import datetime

from carwash_backend.db import schemas, repository
from carwash_backend.db.database import get_db
from carwash_backend.api.v1.dependencies import get_current_admin, verify_desktop_credentials, verify_controller_api_key
from carwash_backend.api.v1.websocket_manager import websocket_manager

router = APIRouter()

last_scanned_uid: Optional[str] = None
last_scan_time: Optional[datetime.datetime] = None

@router.get("/last-uid", response_model=schemas.RfidScanResult, summary="Get Last Scanned RFID UID")
async def get_last_scanned_uid():

    global last_scanned_uid, last_scan_time

    if last_scanned_uid and last_scan_time:
        time_diff = datetime.datetime.now() - last_scan_time
        if time_diff.total_seconds() <= 30:
            return schemas.RfidScanResult(
                uid=last_scanned_uid,
                timestamp=last_scan_time.isoformat(),
                success=True,
                message="UID получен успешно"
            )

    return schemas.RfidScanResult(
        uid=None,
        timestamp=datetime.datetime.now().isoformat(),
        success=False,
        message="Нет недавно отсканированных карт. Приложите карту к считывателю."
    )

from fastapi import Body

@router.post("/topup", summary="Пополнение RFID карты")
async def rfid_topup(
    card_id: int = Body(...),
    amount: float = Body(...),
    post_id: int = Body(...),
    db: AsyncSession = Depends(get_db)
):
    card = await topup_rfid_card(db, card_id, amount, post_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return {"status": "ok", "card_id": card.id, "new_balance": card.balance}

@router.get("/balance/{uid}", summary="Get RFID Card Balance by UID")
async def get_rfid_card_balance_by_uid(
    uid: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        rfid_card = await repository.get_rfid_card_by_uid(db, uid)
        if not rfid_card:
            raise HTTPException(status_code=404, detail=f"RFID card with UID {uid} not found")

        if not rfid_card.is_active:
            raise HTTPException(status_code=400, detail=f"RFID card {uid} is blocked")

        return {
            "status": "ok",
            "uid": uid,
            "balance": rfid_card.balance,
            "card_status": "active" if rfid_card.is_active else "blocked"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get RFID balance: {str(e)}")

@router.post("/scan-for-balance", summary="Scan RFID Card for Balance")
async def scan_rfid_for_balance(
    scan_data: schemas.RfidScanRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        set_scanned_uid(scan_data.uid)
        rfid_card = await repository.get_rfid_card_by_uid(db, scan_data.uid)

        if not rfid_card:
            await websocket_manager.broadcast_rfid_scan({
                "uid": scan_data.uid,
                "status": "card_not_found",
                "balance": 0,
                "message": f"RFID card {scan_data.uid} not found"
            })

            raise HTTPException(status_code=404, detail=f"RFID card {scan_data.uid} not found")

        if not rfid_card.is_active:
            await websocket_manager.broadcast_rfid_scan({
                "uid": scan_data.uid,
                "status": "card_blocked",
                "balance": rfid_card.balance,
                "message": f"RFID card {scan_data.uid} is blocked"
            })

            raise HTTPException(status_code=400, detail=f"RFID card {scan_data.uid} is blocked")

        await websocket_manager.broadcast_rfid_scan({
            "uid": scan_data.uid,
            "status": "success",
            "balance": rfid_card.balance,
            "message": f"RFID card {scan_data.uid} scanned successfully"
        })

        return {
            "status": "ok",
            "uid": scan_data.uid,
            "balance": rfid_card.balance,
            "card_status": "active",
            "message": "RFID card scanned successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan RFID card: {str(e)}")

@router.post("/simulate-scan", summary="Simulate RFID Scan for Testing")
async def simulate_rfid_scan(
    uid: str = Body(..., description="UID для симуляции"),
    current_admin = Depends(get_current_admin)
):

    global last_scanned_uid, last_scan_time

    last_scanned_uid = uid
    last_scan_time = datetime.datetime.now()

    return {
        "status": "success",
        "message": f"Симуляция сканирования UID {uid} выполнена",
        "uid": uid,
        "timestamp": last_scan_time.isoformat()
    }

@router.post("/clear-last-uid", summary="Clear Last Scanned UID")
async def clear_last_scanned_uid(
    current_admin = Depends(get_current_admin)
):
    global last_scanned_uid, last_scan_time

    last_scanned_uid = None
    last_scan_time = None

    return {"message": "Последний UID очищен"}

def set_scanned_uid(uid: str):

    global last_scanned_uid, last_scan_time

    last_scanned_uid = uid
    last_scan_time = datetime.datetime.now()

@router.post("/scan", summary="RFID Scan Endpoint for Hardware")
async def rfid_scan_hardware(
    scan_data: dict,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(verify_controller_api_key)
):
    try:
        card_uid = scan_data.get("card_uid")
        controller_id = scan_data.get("controller_id")
        post_id = scan_data.get("post_id", 1)

        if not card_uid:
            raise HTTPException(status_code=400, detail="card_uid is required")

        print(f"🔍 Hardware RFID scan: UID={card_uid}, Controller={controller_id}, Post={post_id}")

        set_scanned_uid(card_uid)

        rfid_card = await repository.get_rfid_card_by_uid(db, card_uid)

        if not rfid_card:
            await websocket_manager.broadcast_rfid_scan({
                "uid": card_uid,
                "status": "card_not_found",
                "balance": 0,
                "message": f"RFID card {card_uid} not found",
                "post_id": post_id
            })

            return {
                "status": "error",
                "message": f"RFID card {card_uid} not found",
                "uid": card_uid,
                "balance": 0
            }

        if not rfid_card.is_active:

            await websocket_manager.broadcast_rfid_scan({
                "uid": card_uid,
                "status": "card_blocked",
                "balance": rfid_card.balance,
                "message": f"RFID card {card_uid} is blocked",
                "post_id": post_id
            })

            return {
                "status": "error",
                "message": f"RFID card {card_uid} is blocked",
                "uid": card_uid,
                "balance": rfid_card.balance
            }

        await websocket_manager.broadcast_rfid_scan({
            "uid": card_uid,
            "status": "success",
            "balance": rfid_card.balance,
            "message": f"RFID card {card_uid} scanned successfully",
            "post_id": post_id
        })

        from carwash_backend.core.session_manager import session_manager

        session = await session_manager.get_session_for_post(post_id, db)
        if not session:
            session = await session_manager.start_session_for_post(post_id, db)

        return {
            "status": "success",
            "message": f"RFID card {card_uid} scanned successfully",
            "uid": card_uid,
            "balance": rfid_card.balance,
            "card_status": "active"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка сканирования RFID: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to scan RFID card: {str(e)}")
