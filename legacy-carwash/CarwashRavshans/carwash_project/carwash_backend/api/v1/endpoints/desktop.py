from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from datetime import datetime
import json

from carwash_backend.db import schemas, repository, models
from carwash_backend.db.database import get_db
from carwash_backend.api.v1.dependencies import verify_desktop_credentials
from carwash_backend.core.session_manager import session_manager

router = APIRouter()

@router.get("/services/", response_model=List[schemas.ServiceOut], summary="Get All Services for Desktop")
async def get_services_desktop(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):
    return await repository.get_services(db, skip=skip, limit=limit)

@router.get("/posts/", summary="Get All Posts for Desktop")
async def get_posts_desktop(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):
    return await repository.get_posts_with_controller_info(db, skip=skip, limit=limit)

@router.get("/posts/{post_id}", summary="Get Single Post for Desktop")
async def get_single_post_desktop(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):
    db_post = await repository.get_post_with_controller_info(db, post_id)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return db_post

@router.put("/posts/{post_id}", summary="Update Post for Desktop")
async def update_post_desktop(
    post_id: int,
    post_update: schemas.PostUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):
    db_post = await repository.update_post(db, post_id=post_id, post_update=post_update)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return await repository.get_post_with_controller_info(db, post_id)

@router.post("/posts/{post_id}/status", summary="Update Post Status for Desktop")
async def update_post_status_desktop(
    post_id: int,
    status_update: schemas.PostStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):
    post_update = schemas.PostUpdate(status=status_update.status)
    db_post = await repository.update_post(db, post_id=post_id, post_update=post_update)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": f"Post {post_id} status updated to {status_update.status}"}

@router.get("/controllers/", response_model=List[schemas.ControllerOut], summary="Get All Controllers for Desktop")
async def get_controllers_desktop(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):
    return await repository.get_controllers(db, skip=skip, limit=limit)

@router.post("/controllers/", response_model=schemas.ControllerOut, status_code=status.HTTP_201_CREATED, summary="Create Controller for Desktop")
async def create_controller_desktop(
    controller: schemas.ControllerCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):
    existing_controller = await repository.get_controller(db, controller.controller_id)
    if existing_controller:
        raise HTTPException(status_code=400, detail=f"Controller with ID {controller.controller_id} already exists")

    return await repository.create_controller(db, controller)

@router.get("/health", summary="Desktop Health Check")
async def desktop_health_check(_: str = Depends(verify_desktop_credentials)):
    return {"status": "ok", "message": "Desktop API is working"}

@router.get("/rfid-balance/{rfid_card_id}", summary="Get RFID Card Balance")
async def get_rfid_card_balance(
    rfid_card_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):
    try:
        rfid_card = await repository.get_rfid_card(db, rfid_card_id)
        if not rfid_card:
            raise HTTPException(status_code=404, detail=f"RFID card {rfid_card_id} not found")

        return {
            "status": "ok",
            "rfid_card_id": rfid_card_id,
            "balance": rfid_card.balance,
            "card_status": rfid_card.status
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get RFID balance: {str(e)}")

@router.post("/statistics", response_model=schemas.DesktopStatisticsResponse, summary="Receive Desktop Statistics")
async def receive_desktop_statistics(
    stats: schemas.DesktopStatistics,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):
    try:
        stats_data = {
            "active_sessions": stats.active_sessions,
            "total_cash_today": stats.total_cash_today,
            "total_online_payments_today": stats.total_online_payments_today,
            "total_rfid_payments_today": stats.total_rfid_payments_today,
            "rfid_cards_scanned_today": stats.rfid_cards_scanned_today,
            "bill_acceptor_status": stats.bill_acceptor_status,
            "online_payment_status": stats.online_payment_status,
            "rfid_scanner_status": stats.rfid_scanner_status,
            "last_cash_insert": stats.last_cash_insert,
            "last_online_payment": stats.last_online_payment,
            "last_rfid_scan": stats.last_rfid_scan,
            "system_uptime": stats.system_uptime,
            "errors_count": stats.errors_count,
            "warnings_count": stats.warnings_count,
            "hardware_status": stats.hardware_status
        }

        from carwash_backend.api.v1.websocket_manager import websocket_manager
        await websocket_manager.broadcast_message({
            "type": "desktop_statistics",
            "data": stats_data,
            "timestamp": datetime.now().isoformat()
        })

        return schemas.DesktopStatisticsResponse(
            status="ok",
            message="Statistics received and processed successfully",
            data=stats_data
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process statistics: {str(e)}")

@router.post("/cash-received", summary="Record Cash Received from Bill Acceptor")
async def record_cash_received(
    cash_event: dict,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):

    try:
        post_id = cash_event.get("post_id")
        amount = cash_event.get("amount")
        timestamp = cash_event.get("timestamp")
        bill_denomination = cash_event.get("bill_denomination")

        if not all([post_id, amount]):
            raise HTTPException(status_code=400, detail="post_id and amount are required")

        transaction_data = {
            "type": models.TransactionTypeEnum.cash,
            "amount": amount,
            "description": f"Получено наличными от купюроприемника на посту {post_id}",
            "timestamp": datetime.fromisoformat(timestamp) if timestamp else datetime.utcnow()
        }

        await repository.create_transaction(db, transaction_data)

        cash_event_data = {
            "post_id": post_id,
            "event_type": "bill_inserted",
            "amount": amount,
            "bill_denomination": bill_denomination,
            "timestamp": transaction_data["timestamp"]
        }

        await repository.create_cash_event(db, cash_event_data)

        return {
            "status": "ok",
            "message": f"Cash received recorded: {amount} sum",
            "post_id": post_id,
            "amount": amount
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record cash received: {str(e)}")

@router.post("/online-payment-received", summary="Record Online Payment Received")
async def record_online_payment_received(
    payment_event: dict,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):

    try:
        post_id = payment_event.get("post_id")
        amount = payment_event.get("amount")
        timestamp = payment_event.get("timestamp")
        payment_method = payment_event.get("payment_method", "online")
        transaction_id = payment_event.get("transaction_id")

        if not all([post_id, amount]):
            raise HTTPException(status_code=400, detail="post_id and amount are required")

        print(f"💳 Онлайн платеж подтвержден: {amount} сум через {payment_method} на посту {post_id}")

        if transaction_id:
            existing_payment = await repository.get_payment_transaction_by_transaction_id(db, transaction_id)
            if existing_payment:
                print(f"✅ Транзакция {transaction_id} уже существует в payment_transactions")
            else:
                print(f"⚠️ Транзакция {transaction_id} НЕ найдена в payment_transactions")

        return {
            "status": "ok",
            "message": f"Online payment confirmed: {amount} sum via {payment_method}",
            "post_id": post_id,
            "amount": amount,
            "payment_method": payment_method,
            "transaction_id": transaction_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to confirm online payment: {str(e)}")

@router.post("/session-finished", summary="Record Session Finish")
async def record_session_finished(
    finish_event: dict,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):

    try:
        post_id = finish_event.get("post_id")
        session_id = finish_event.get("session_id")
        total_spent = finish_event.get("total_spent", 0)
        timestamp = finish_event.get("timestamp")

        if not post_id:
            raise HTTPException(status_code=400, detail="post_id is required")

        return {
            "status": "ok",
            "message": f"Session finish recorded for post {post_id}",
            "post_id": post_id,
            "total_spent": total_spent
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record session finish: {str(e)}")

@router.get("/locations/", summary="Get Available Locations for Desktop Selection")
async def get_available_locations(
    db: AsyncSession = Depends(get_db)
):

    locations = await repository.get_posts_for_desktop_selection(db)
    return {
        "success": True,
        "locations": locations,
        "message": "Available locations retrieved successfully"
    }

@router.post("/login-location/", summary="Desktop Login with Location Selection")
async def desktop_login_with_location(
    login_data: dict,
    db: AsyncSession = Depends(get_db)
):

    username = login_data.get("username")
    password = login_data.get("password")
    post_id = login_data.get("post_id")

    if username != "desktop_client" or password != "carwash_desktop_2024!":
        raise HTTPException(
            status_code=401,
            detail="Invalid desktop credentials"
        )

    if not post_id:
        raise HTTPException(
            status_code=400,
            detail="post_id is required for desktop login"
        )

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Location (Post) not found")

    if not post.is_active:
        raise HTTPException(status_code=400, detail="Location is not active")

    kiosks = await repository.get_kiosks_by_post_id(db, post_id)

    services = await repository.get_services_for_post(db, post_id)

    return {
        "success": True,
        "session_token": f"desktop_session_{post_id}_{username}",
        "location": {
            "post_id": post.id,
            "post_name": post.name,
            "status": post.status.value,
            "is_active": post.is_active,
            "controller_id": post.controller_id
        },
        "kiosks": [
            {
                "kiosk_id": k.id,
                "name": k.name,
                "cash_balance": k.cash_balance,
                "is_active": k.is_active,
                "last_maintenance": k.last_maintenance.isoformat() if k.last_maintenance else None
            } for k in kiosks
        ],
        "available_services": [
            {
                "service_id": s.id,
                "name": s.name,
                "price_per_minute": s.price_per_minute,
                "is_active": s.is_active,
                "command_str": s.command_str
            } for s in services
        ],
        "message": f"Desktop logged in to {post.name} location"
    }

@router.get("/location/{post_id}/kiosks/", summary="Get Kiosks for Current Location")
async def get_location_kiosks(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Location not found")

    kiosks = await repository.get_kiosks_by_post_id(db, post_id)

    return {
        "post_id": post_id,
        "post_name": post.name,
        "kiosks": [
            {
                "kiosk_id": k.id,
                "name": k.name,
                "cash_balance": k.cash_balance,
                "is_active": k.is_active,
                "last_maintenance": k.last_maintenance.isoformat() if k.last_maintenance else None
            } for k in kiosks
        ]
    }

@router.get("/location/{post_id}/services/", summary="Get Services for Current Location")
async def get_location_services(
    post_id: int,
    kiosk_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Location not found")

    if kiosk_id:
        kiosk = await repository.get_kiosk(db, kiosk_id)
        if not kiosk or kiosk.post_id != post_id:
            raise HTTPException(status_code=404, detail="Kiosk not found in this location")
        services = await repository.get_services_for_kiosk(db, kiosk_id)
    else:
        services = await repository.get_services_for_post(db, post_id)

    return {
        "post_id": post_id,
        "post_name": post.name,
        "available_services": [
            {
                "service_id": s.id,
                "name": s.name,
                "price_per_minute": s.price_per_minute,
                "is_active": s.is_active,
                "command_str": s.command_str,
                "relay_bits": s.relay_bits,
                "pump1_power": s.pump1_power,
                "pump2_power": s.pump2_power,
                "pump3_power": s.pump3_power,
                "pump4_power": s.pump4_power,
                "motor_frequency": s.motor_frequency,
                "motor_flag": s.motor_flag
            } for s in services
        ]
    }

@router.get("/kiosk/{kiosk_id}/services/", summary="Get Services for Specific Kiosk")
async def get_kiosk_services(
    kiosk_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):
    kiosk = await repository.get_kiosk(db, kiosk_id)
    if not kiosk:
        raise HTTPException(status_code=404, detail="Kiosk not found")

    services = await repository.get_services_for_kiosk(db, kiosk_id)

    return {
        "kiosk_id": kiosk_id,
        "kiosk_name": kiosk.name,
        "post_id": kiosk.post_id,
        "available_services": [
            {
                "service_id": s.id,
                "name": s.name,
                "price_per_minute": s.price_per_minute,
                "is_active": s.is_active,
                "command_str": s.command_str
            } for s in services
        ]
    }

@router.put("/kiosk/{kiosk_id}/services/", summary="Update Services for Specific Kiosk")
async def update_kiosk_services_desktop(
    kiosk_id: int,
    service_ids: List[int],
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):
    kiosk = await repository.get_kiosk(db, kiosk_id)
    if not kiosk:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    
    success = await repository.update_kiosk_services(db, kiosk_id, service_ids)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update kiosk services")
    
    return {"message": f"Services updated for kiosk {kiosk_id}", "service_ids": service_ids}

@router.post("/location/{post_id}/service-request/", summary="Request Service from Desktop")
async def request_service_from_desktop(
    post_id: int,
    service_request: dict,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):

    service_id = service_request.get("service_id")
    event_type = service_request.get("event_type", "service_requested")

    if not service_id:
        raise HTTPException(status_code=400, detail="service_id is required")

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Location not found")

    is_valid = await repository.validate_service_for_post(db, post_id, service_id)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Service {service_id} is not available for location {post_id}"
        )

    service = await repository.get_service(db, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    from carwash_backend.api.v1.endpoints.controller import receive_controller_event
    from carwash_backend.db.schemas import ControllerEvent, ControllerEventData

    controller_event = ControllerEvent(
        event_type=event_type,
        post_id=post_id,
        data=ControllerEventData(
            service_id=service_id,
            selection_time=datetime.now().isoformat(),
            reason="Desktop service request"
        )
    )

    await repository.create_service_event_log(db, {
        "uid": "DESKTOP_REQUEST",
        "post_id": post_id,
        "event_type": event_type,
        "additional_data": {
            "service_id": service_id,
            "service_name": service.name,
            "source": "desktop"
        }
    })

    try:

        await receive_controller_event(controller_event, db)

        return {
            "success": True,
            "message": f"Service '{service.name}' requested successfully",
            "post_id": post_id,
            "service_id": service_id,
            "service_name": service.name,
            "event_type": event_type
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process service request: {str(e)}"
        )

@router.get("/location/{post_id}/status/", summary="Get Location Status")
async def get_location_status(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(verify_desktop_credentials)
):

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Location not found")

    active_session = await repository.get_active_session_for_post(db, post_id)

    controller_status = "unknown"
    if post.controller_id:
        controller_status = await repository.get_controller_status(db, post.controller_id)

    return {
        "post_id": post_id,
        "post_name": post.name,
        "post_status": post.status.value,
        "is_active": post.is_active,
        "controller_id": post.controller_id,
        "controller_status": controller_status,
        "active_session": {
            "session_id": active_session.id,
            "started_at": active_session.started_at.isoformat(),
            "status": active_session.status.value,
            "rfid_card_id": active_session.rfid_card_id
        } if active_session else None
    }
