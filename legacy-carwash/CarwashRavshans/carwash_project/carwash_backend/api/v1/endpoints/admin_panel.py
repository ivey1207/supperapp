from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime
import logging
import json

from carwash_backend.db import schemas, repository, models
from carwash_backend.db.database import get_db
from carwash_backend.api.v1.dependencies import get_current_admin
from carwash_backend.core.session_manager import session_manager
from carwash_backend.core.loyalty_manager import loyalty_manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/me", response_model=schemas.AdminOut, summary="Get Current Admin Info")
async def read_admin_me(current_admin: models.Admin = Depends(get_current_admin)):
    return current_admin

@router.put("/me", response_model=schemas.AdminOut, summary="Update Current Admin Info")
async def update_admin_me(
    admin_update: schemas.AdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    if admin_update.username:
        existing_admin = await repository.get_admin_by_username(db, username=admin_update.username)
        if existing_admin and existing_admin.id != current_admin.id:
            raise HTTPException(status_code=400, detail="This username is already taken.")

    return await repository.update_admin(db, admin_id=current_admin.id, admin_update=admin_update)

@router.post("/posts/", status_code=status.HTTP_201_CREATED, summary="Create New Post")
async def create_new_post(post: schemas.PostCreate, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    created_post = await repository.create_post(db=db, post=post)
    return await repository.get_post_with_controller_info(db, created_post.id)

@router.get("/posts/", summary="Read All Posts")
async def read_all_posts(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    return await repository.get_posts_with_controller_info(db, skip=skip, limit=limit)

@router.get("/posts/{post_id}", summary="Read a Single Post")
async def read_single_post(post_id: int, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    db_post = await repository.get_post_with_controller_info(db, post_id)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return db_post

@router.put("/posts/{post_id}", summary="Update a Post")
async def update_existing_post(post_id: int, post_update: schemas.PostUpdate, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    db_post = await repository.update_post(db, post_id=post_id, post_update=post_update)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return await repository.get_post_with_controller_info(db, post_id)

@router.delete("/posts/{post_id}", summary="Delete a Post")
async def delete_single_post(post_id: int, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    db_post = await repository.delete_post(db, post_id=post_id)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": f"Post {post_id} deleted successfully", "deleted_post": {"id": db_post.id, "name": db_post.name}}

@router.post("/rfid-cards/", response_model=schemas.RfidCardOut, status_code=status.HTTP_201_CREATED, summary="Register New RFID Card")
async def register_new_rfid_card(card: schemas.RfidCardCreate, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    existing_card = await repository.get_rfid_card_by_uid(db, uid=card.uid)
    if existing_card:
        raise HTTPException(status_code=400, detail=f"Card with UID {card.uid} already registered")
    return await repository.create_rfid_card(db=db, card_data=card.dict())

@router.get("/rfid-cards/", response_model=List[schemas.RfidCardOut], summary="Read All RFID Cards")
async def read_all_rfid_cards(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    cards = await repository.get_rfid_cards(db, skip=skip, limit=limit)
    return cards

@router.get("/rfid-cards/uid/{card_uid}", response_model=schemas.RfidCardOut, summary="Read RFID Card by UID")
async def read_rfid_card_by_uid(card_uid: str, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):

    db_card = await repository.get_rfid_card_by_uid(db, uid=card_uid)
    if db_card is None:
        raise HTTPException(status_code=404, detail="RFID Card not found")
    return db_card

@router.get("/rfid-cards/{card_id}", response_model=schemas.RfidCardOut, summary="Read a Single RFID Card")
async def read_single_rfid_card(card_id: int, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    db_card = await repository.get_rfid_card(db, card_id=card_id)
    if db_card is None:
        raise HTTPException(status_code=404, detail="RFID Card not found")
    return db_card

@router.put("/rfid-cards/{card_id}", response_model=schemas.RfidCardOut, summary="Update an RFID Card")
async def update_existing_rfid_card(card_id: int, card_update: schemas.RfidCardUpdate, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    db_card = await repository.update_rfid_card(db, card_id=card_id, card_update=card_update)
    if db_card is None:
        raise HTTPException(status_code=404, detail="RFID Card not found")
    return db_card

@router.post("/rfid-cards/{card_id}/top-up", response_model=schemas.RfidCardOut, summary="Top-up Card Balance")
async def top_up_card_balance(card_id: int, top_up: schemas.RfidCardTopup, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    if top_up.amount <= 0:
        raise HTTPException(status_code=400, detail="Top-up amount must be positive")

    bonus_tiers = await repository.get_bonus_tiers(db)
    bonus_to_add = 0.0
    active_tier = None
    for tier in bonus_tiers:
        if tier.is_active and tier.min_amount <= top_up.amount <= tier.max_amount:
            bonus_to_add = top_up.amount * (tier.bonus_percent / 100)
            active_tier = tier
            break

    total_amount = top_up.amount + bonus_to_add

    db_card = await repository.top_up_rfid_card_balance(db, card_id=card_id, amount=total_amount)
    if db_card is None:
        raise HTTPException(status_code=404, detail="RFID Card not found")

    await repository.create_transaction(db, amount=top_up.amount, transaction_type=models.TransactionTypeEnum.rfid_top_up, rfid_card_id=card_id, description="Admin top-up")
    if bonus_to_add > 0 and active_tier:
        await repository.create_transaction(db, amount=bonus_to_add, transaction_type=models.TransactionTypeEnum.bonus, rfid_card_id=card_id, description=f"{active_tier.bonus_percent}% bonus")

    return db_card

@router.get("/bonus-tiers/", response_model=List[schemas.BonusTierOut], summary="Get All Bonus Tiers")
async def get_bonus_tiers(
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    return await repository.get_bonus_tiers(db)

@router.post("/bonus-tiers/", response_model=schemas.BonusTierOut, status_code=status.HTTP_201_CREATED)
async def create_bonus_tier(
    bonus_tier: schemas.BonusTierCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    return await repository.create_bonus_tier(db, bonus_tier)

@router.put("/bonus-tiers/{tier_id}")
async def update_bonus_tier(
    tier_id: int,
    bonus_tier_update: schemas.BonusTierUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    db_tier = await repository.update_bonus_tier(db, tier_id, bonus_tier_update)
    if not db_tier:
        raise HTTPException(status_code=404, detail="Bonus tier not found")
    return db_tier

@router.delete("/bonus-tiers/{tier_id}")
async def delete_bonus_tier(
    tier_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    success = await repository.delete_bonus_tier(db, tier_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bonus tier not found")
    return {"message": "Bonus tier deleted successfully"}

@router.get("/time-discounts/", response_model=List[schemas.TimeDiscountOut])
async def get_time_discounts(
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    return await repository.get_time_discounts(db)

@router.post("/time-discounts/", response_model=schemas.TimeDiscountOut, status_code=status.HTTP_201_CREATED)
async def create_time_discount(
    time_discount: schemas.TimeDiscountCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    return await repository.create_time_discount(db, time_discount)

@router.put("/time-discounts/{discount_id}")
async def update_time_discount(
    discount_id: int,
    time_discount_update: schemas.TimeDiscountUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    db_discount = await repository.update_time_discount(db, discount_id, time_discount_update)
    if not db_discount:
        raise HTTPException(status_code=404, detail="Time discount not found")
    return db_discount

@router.delete("/time-discounts/{discount_id}")
async def delete_time_discount(
    discount_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    success = await repository.delete_time_discount(db, discount_id)
    if not success:
        raise HTTPException(status_code=404, detail="Time discount not found")
    return {"message": "Time discount deleted successfully"}

@router.post("/posts/{post_id}/start-session", summary="[TEST] Start a wash session", include_in_schema=False)
async def test_start_session(post_id: int, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    db_post = await repository.get_post(db, post_id=post_id)
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")

    await session_manager.start_session_for_post(post_id)
    return {"status": "ok", "message": f"Session starting for post {post_id}"}

@router.post("/posts/{post_id}/stop-session", summary="[TEST] Stop a wash session", include_in_schema=False)
async def test_stop_session(post_id: int, db: AsyncSession = Depends(get_db), current_admin: models.Admin = Depends(get_current_admin)):
    db_post = await repository.get_post(db, post_id=post_id)
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")

    await session_manager.stop_session_for_post(post_id, db)
    return {"status": "ok", "message": f"Session stopping for post {post_id}"}

@router.post("/rfid-cards/register")
async def register_rfid_card(
    card_data: schemas.RfidCardCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    result = await loyalty_manager.register_new_card(
        uid=card_data.uid,
        holder_name=card_data.holder_name,
        phone_number=card_data.phone_number,
        initial_balance=card_data.balance or 0.0,
        db=db
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))

    return {"message": "Card registered successfully", "card_id": result["card_id"]}

@router.post("/rfid-cards/register-manual-uid")
async def register_rfid_card_manual_uid(
    card_data: dict,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    manual_uid = card_data.get("manual_uid", "").strip()
    holder_name = card_data.get("holder_name", "").strip()
    phone_number = card_data.get("phone_number", "").strip()
    initial_balance = float(card_data.get("initial_balance", 0.0))

    if not manual_uid:
        raise HTTPException(status_code=400, detail="Manual UID is required")

    if not holder_name:
        raise HTTPException(status_code=400, detail="Holder name is required")

    existing_card = await repository.get_rfid_card_by_uid(db, manual_uid)
    if existing_card:
        raise HTTPException(status_code=400, detail=f"Card with UID {manual_uid} already exists")

    result = await loyalty_manager.register_new_card(
        uid=manual_uid,
        holder_name=holder_name,
        phone_number=phone_number if phone_number else None,
        initial_balance=initial_balance,
        db=db
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))

    return {
        "message": "Card registered successfully with manual UID",
        "card_id": result["card_id"],
        "uid": manual_uid,
        "holder_name": holder_name,
        "initial_balance": initial_balance
    }

@router.post("/rfid-cards/{card_uid}/topup")
async def topup_rfid_card(
    card_uid: str,
    topup_data: schemas.RfidCardTopup,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    result = await loyalty_manager.topup_card(
        uid=card_uid,
        amount=topup_data.amount,
        db=db,
        admin_id=current_admin.id
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))

    return {
        "message": "Card topped up successfully",
        "new_balance": result["new_balance"],
        "bonus_amount": result["bonus_amount"]
    }

@router.get("/rfid-cards/", response_model=List[schemas.RfidCardOut])
async def get_rfid_cards(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    return await repository.get_rfid_cards(db, skip=skip, limit=limit)

@router.put("/rfid-cards/{card_uid}/status")
async def update_card_status(
    card_uid: str,
    status_update: schemas.RfidCardStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    card = await repository.get_rfid_card_by_uid(db, card_uid)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    card.is_active = status_update.is_active
    await db.commit()

    return {"message": f"Card {'activated' if status_update.is_active else 'deactivated'} successfully"}

@router.delete("/rfid-cards/{card_uid}")
async def delete_rfid_card(
    card_uid: str,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    card = await repository.get_rfid_card_by_uid(db, card_uid)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    if card.balance > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete card with positive balance: {card.balance} sum. Please withdraw funds first."
        )

    await db.delete(card)
    await db.commit()

    return {"message": "Card deleted successfully"}

@router.post("/services/", response_model=schemas.ServiceOut, status_code=status.HTTP_201_CREATED)
async def create_service(
    service: schemas.ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    from carwash_backend.core.hardware_commands import get_predefined_service_config

    if service.name in ["Вода", "Турбо-вода", "Активная химия", "Нано-шампунь", "Воск", "Осмос", "Тёплая вода"]:
        predefined = get_predefined_service_config(service.name)
        service.relay_bits = predefined["relay_bits"]

    return await repository.create_service(db=db, service=service)

@router.get("/services/", response_model=List[schemas.ServiceOut])
async def get_services(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    return await repository.get_services(db, skip=skip, limit=limit)

@router.get("/services/{service_id}", response_model=schemas.ServiceOut)
async def get_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    service = await repository.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@router.put("/services/{service_id}", response_model=schemas.ServiceOut)
async def update_service(
    service_id: int,
    service_update: schemas.ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    from carwash_backend.core.hardware_commands import get_predefined_service_config

    current_service = await repository.get_service(db, service_id=service_id)
    if not current_service:
        raise HTTPException(status_code=404, detail="Service not found")

    new_name = service_update.name or current_service.name
    if new_name in ["Вода", "Турбо-вода", "Активная химия", "Нано-шампунь", "Воск", "Осмос", "Тёплая вода"]:
        if service_update.relay_bits is None or service_update.relay_bits == "00000000":
            predefined = get_predefined_service_config(new_name)
            service_update.relay_bits = predefined["relay_bits"]

    service = await repository.update_service(db, service_id=service_id, service_update=service_update)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

@router.delete("/services/{service_id}")
async def delete_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    success = await repository.delete_service(db, service_id=service_id)
    if not success:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted successfully"}

@router.get("/kiosks/", response_model=List[schemas.KioskOut], summary="Get All Kiosks")
async def get_all_kiosks(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    return await repository.get_kiosks(db, skip=skip, limit=limit)

@router.post("/kiosks/", response_model=schemas.KioskOut, status_code=status.HTTP_201_CREATED, summary="Create New Kiosk")
async def create_new_kiosk(
    kiosk: schemas.KioskCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    return await repository.create_kiosk(db, kiosk_data=kiosk)

@router.get("/kiosks/{kiosk_id}", response_model=schemas.KioskOut, summary="Get Single Kiosk")
async def get_single_kiosk(
    kiosk_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    kiosk = await repository.get_kiosk(db, kiosk_id=kiosk_id)
    if not kiosk:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    return kiosk

@router.put("/kiosks/{kiosk_id}", response_model=schemas.KioskOut, summary="Update Kiosk")
async def update_kiosk_info(
    kiosk_id: int,
    kiosk_update: schemas.KioskUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    kiosk = await repository.update_kiosk(db, kiosk_id=kiosk_id, kiosk_update=kiosk_update)
    if not kiosk:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    return kiosk

@router.post("/kiosks/{kiosk_id}/topup", summary="Topup Kiosk Cash")
async def topup_kiosk_cash_balance(
    kiosk_id: int,
    topup_data: schemas.KioskTopup,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    kiosk = await repository.topup_kiosk_cash(db, kiosk_id=kiosk_id, amount=topup_data.amount)
    if not kiosk:
        raise HTTPException(status_code=404, detail="Kiosk not found")

    post = await repository.get_post(db, kiosk.post_id)
    if post and post.controller_id:
        from carwash_backend.core.command_queue import command_queue
        import json

        kiosk_topup_data = {
            "type": "kiosk_topup",
            "kiosk_id": kiosk_id,
            "kiosk_name": kiosk.name,
            "amount": topup_data.amount,
            "post_id": post.id,
            "cash_from_admin": topup_data.amount,
            "admin_id": current_admin.id,
            "timestamp": datetime.now().isoformat()
        }

        try:
            await command_queue.create_command(
                db=db,
                controller_id=post.controller_id,
                command_type="kiosk_topup",
                command_str=json.dumps(kiosk_topup_data),
                priority=5
            )

        except Exception as e:
            logger.warning(f"Не удалось отправить kiosk topup в polling: {e}")

    return {
        "message": f"Киоск {kiosk.name} пополнен на {topup_data.amount}",
        "new_cash_balance": kiosk.cash_balance,
        "kiosk_id": kiosk_id,
        "polling_sent": bool(post and post.controller_id)
    }

@router.delete("/kiosks/{kiosk_id}", summary="Delete Kiosk")
async def delete_kiosk_by_id(
    kiosk_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    success = await repository.delete_kiosk(db, kiosk_id=kiosk_id)
    if not success:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    return {"message": "Kiosk deleted successfully"}

@router.put("/kiosks/{kiosk_id}/services", summary="Update Kiosk Services")
async def update_kiosk_services(
    kiosk_id: int,
    service_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    kiosk = await repository.get_kiosk(db, kiosk_id)
    if not kiosk:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    
    success = await repository.update_kiosk_services(db, kiosk_id, service_ids)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update kiosk services")
    
    return {"message": f"Services updated for kiosk {kiosk_id}", "service_ids": service_ids}

@router.get("/kiosks/{kiosk_id}/services", summary="Get Kiosk Services")
async def get_kiosk_services(
    kiosk_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    kiosk = await repository.get_kiosk(db, kiosk_id)
    if not kiosk:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    
    services = await repository.get_services_for_kiosk(db, kiosk_id)
    
    return {
        "kiosk_id": kiosk_id,
        "kiosk_name": kiosk.name,
        "services": [
            {
                "service_id": s.id,
                "name": s.name,
                "price_per_minute": s.price_per_minute,
                "is_active": s.is_active
            } for s in services
        ]
    }

@router.get("/services/{service_id}/hardware-command", summary="Get Hardware Command")
async def get_service_hardware_command(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    service = await repository.get_service(db, service_id=service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    from carwash_backend.core.hardware_commands import service_to_hardware_command
    hw_command = service_to_hardware_command(service)

    return {
        "bits": hw_command.bits,
        "d1": hw_command.d1,
        "d2": hw_command.d2,
        "d3": hw_command.d3,
        "d4": hw_command.d4,
        "freq": hw_command.freq,
        "flag": hw_command.flag,
        "command_str": hw_command.to_command_string()
    }

@router.get("/hardware-commands/pause", summary="Get Pause Command")
async def get_pause_command_endpoint(
    current_admin: models.Admin = Depends(get_current_admin)
):

    from carwash_backend.core.hardware_commands import get_pause_command
    hw_command = get_pause_command()

    return {
        "bits": hw_command.bits,
        "d1": hw_command.d1,
        "d2": hw_command.d2,
        "d3": hw_command.d3,
        "d4": hw_command.d4,
        "freq": hw_command.freq,
        "flag": hw_command.flag,
        "command_str": hw_command.to_command_string()
    }

@router.get("/hardware-commands/stop", response_model=schemas.HardwareCommand, summary="Get Stop Command")
async def get_stop_command_endpoint(
    current_admin: models.Admin = Depends(get_current_admin)
):

    from carwash_backend.core.hardware_commands import get_stop_command
    return get_stop_command()

@router.get("/controllers/", response_model=List[schemas.ControllerOut], summary="Get All Controllers")
async def get_controllers(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    return await repository.get_controllers(db, skip=skip, limit=limit)

@router.get("/controllers/select", summary="Get Controllers for Select")
async def get_controllers_for_select(
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    controllers = await repository.get_controllers(db, skip=0, limit=1000)
    return [
        {"value": ctrl.controller_id, "label": f"{ctrl.name} ({ctrl.controller_id})"}
        for ctrl in controllers
    ]

@router.post("/controllers/", response_model=schemas.ControllerOut, status_code=status.HTTP_201_CREATED, summary="Create Controller")
async def create_controller(
    controller: schemas.ControllerCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    existing_controller = await repository.get_controller(db, controller.controller_id)
    if existing_controller:
        raise HTTPException(status_code=400, detail=f"Controller with ID {controller.controller_id} already exists")

    return await repository.create_controller(db, controller)

@router.get("/controllers/{controller_id}", response_model=schemas.ControllerOut, summary="Get Controller")
async def get_controller(
    controller_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    controller = await repository.get_controller(db, controller_id)
    if not controller:
        raise HTTPException(status_code=404, detail="Controller not found")
    return controller

@router.get("/controllers/{controller_id}/dependencies", summary="Get Controller Dependencies")
async def get_controller_dependencies(
    controller_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    controller = await repository.get_controller(db, controller_id)
    if not controller:
        raise HTTPException(status_code=404, detail="Controller not found")

    dependencies = await repository.get_controller_dependencies(db, controller_id)

    return {
        "controller_id": controller_id,
        "controller_name": controller.name,
        "dependencies": dependencies,
        "can_delete": dependencies["posts_count"] == 0 and dependencies["commands_count"] == 0,
        "warning": "Удаление контроллера отвяжет его от постов и удалит все команды" if dependencies["posts_count"] > 0 or dependencies["commands_count"] > 0 else None
    }

@router.put("/controllers/{controller_id}", response_model=schemas.ControllerOut, summary="Update Controller")
async def update_controller(
    controller_id: str,
    controller_update: schemas.ControllerUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    controller = await repository.update_controller(db, controller_id, controller_update)
    if not controller:
        raise HTTPException(status_code=404, detail="Controller not found")
    return controller

@router.delete("/controllers/{controller_id}", summary="Delete Controller")
async def delete_controller(
    controller_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    try:
        success = await repository.delete_controller(db, controller_id)
        if not success:
            raise HTTPException(status_code=404, detail="Controller not found")
        return {"message": "Controller deleted successfully"}
    except Exception as e:

        import logging
        logging.error(f"Error deleting controller {controller_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting controller: {str(e)}"
        )

@router.post("/controllers/{controller_id}/ping", summary="Ping Controller")
async def ping_controller(
    controller_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    success = await repository.ping_controller(db, controller_id)
    if not success:
        raise HTTPException(status_code=404, detail="Controller not found")
    return {"message": "Controller ping updated"}

@router.post("/posts/", status_code=status.HTTP_201_CREATED, summary="Create New Post with Services")
async def create_new_post_with_services(
    post: schemas.PostCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    if post.available_service_ids:
        for service_id in post.available_service_ids:
            service = await repository.get_service(db, service_id)
            if not service:
                raise HTTPException(
                    status_code=400,
                    detail=f"Service with ID {service_id} not found"
                )

    created_post = await repository.create_post(db=db, post=post)

    if post.available_service_ids:
        await repository.add_services_to_post(db, created_post.id, post.available_service_ids)

    return await repository.get_post_with_controller_info(db, created_post.id)

@router.get("/posts/{post_id}/services", summary="Get Services for Post (Location)")
async def get_post_services(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    services = await repository.get_services_for_post(db, post_id)

    return {
        "post_id": post_id,
        "post_name": post.name,
        "available_services": services
    }

@router.put("/posts/{post_id}/services", summary="Update Services for Post")
async def update_post_services(
    post_id: int,
    service_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    for service_id in service_ids:
        service = await repository.get_service(db, service_id)
        if not service:
            raise HTTPException(
                status_code=400,
                detail=f"Service with ID {service_id} not found"
            )

    await repository.update_post_services(db, post_id, service_ids)

    return {"message": f"Services updated for post {post_id}", "service_ids": service_ids}

@router.get("/posts/{post_id}/kiosks", summary="Get Kiosks for Location")
async def get_kiosks_for_location(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    kiosks = await repository.get_kiosks_by_post_id(db, post_id)

    return {
        "post_id": post_id,
        "post_name": post.name,
        "kiosks": kiosks
    }

@router.post("/posts/{post_id}/kiosks", response_model=schemas.KioskOut, status_code=status.HTTP_201_CREATED)
async def create_kiosk_for_location(
    post_id: int,
    kiosk_data: schemas.KioskCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    kiosk_data.post_id = post_id

    return await repository.create_kiosk(db, kiosk_data)

@router.post("/desktop/login", summary="Desktop Login with Location")
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

    kiosks = await repository.get_kiosks_by_post_id(db, post_id)

    services = await repository.get_services_for_post(db, post_id)

    return {
        "success": True,
        "location": {
            "post_id": post.id,
            "post_name": post.name,
            "status": post.status.value,
            "is_active": post.is_active
        },
        "kiosks": kiosks,
        "available_services": services,
        "message": f"Desktop logged in to {post.name} location"
    }

@router.post("/kiosks/{kiosk_id}/service-event", summary="Send Service Event from Kiosk")
async def send_service_event_from_kiosk(
    kiosk_id: int,
    event_data: dict,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    kiosk = await repository.get_kiosk(db, kiosk_id)
    if not kiosk:
        raise HTTPException(status_code=404, detail="Kiosk not found")

    event_type = event_data.get("event_type")
    service_id = event_data.get("service_id")
    post_id = kiosk.post_id

    if not event_type or not service_id:
        raise HTTPException(
            status_code=400,
            detail="event_type and service_id are required"
        )

    service = await repository.get_service(db, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    available_services = await repository.get_services_for_post(db, post_id)
    service_ids = [s.id for s in available_services]

    if service_id not in service_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Service {service_id} is not available for location {post_id}"
        )

    from carwash_backend.api.v1.endpoints.controller import receive_controller_event
    from carwash_backend.db.schemas import ControllerEvent, RfidScanData

    controller_event = ControllerEvent(
        event_type="service_requested",
        post_id=post_id,
        data=RfidScanData(
            uid="",
            service_id=service_id,
            selection_time="",
            duration="",
            finish_time="",
            reason=""
        )
    )

    try:
        await receive_controller_event(controller_event, db)

        return {
            "success": True,
            "message": f"Service {service.name} requested from kiosk",
            "kiosk_id": kiosk_id,
            "post_id": post_id,
            "service_id": service_id,
            "service_name": service.name
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process service event: {str(e)}"
        )
