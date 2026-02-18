from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from carwash_backend.db import schemas, repository, models
from carwash_backend.db.database import get_db
from carwash_backend.api.v1.dependencies import get_current_admin
from carwash_backend.core.loyalty_manager import loyalty_manager

router = APIRouter()

@router.get("/bonus-tiers/", response_model=List[schemas.BonusTierOut], summary="Get All Bonus Tiers")
async def get_bonus_tiers(
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    return await repository.get_bonus_tiers(db)

@router.post("/bonus-tiers/", response_model=schemas.BonusTierOut, status_code=status.HTTP_201_CREATED, summary="Create Bonus Tier")
async def create_bonus_tier(
    bonus_tier: schemas.BonusTierCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    if bonus_tier.min_amount >= bonus_tier.max_amount:
        raise HTTPException(
            status_code=400,
            detail="Минимальная сумма должна быть меньше максимальной"
        )

    return await repository.create_bonus_tier(db, bonus_tier)

@router.put("/bonus-tiers/{tier_id}", response_model=schemas.BonusTierOut, summary="Update Bonus Tier")
async def update_bonus_tier(
    tier_id: int,
    bonus_tier_update: schemas.BonusTierUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    tier = await repository.update_bonus_tier(db, tier_id, bonus_tier_update)
    if not tier:
        raise HTTPException(status_code=404, detail="Бонусный уровень не найден")
    return tier

@router.delete("/bonus-tiers/{tier_id}", summary="Delete Bonus Tier")
async def delete_bonus_tier(
    tier_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    success = await repository.delete_bonus_tier(db, tier_id)
    if not success:
        raise HTTPException(status_code=404, detail="Бонусный уровень не найден")
    return {"message": "Бонусный уровень удален"}

@router.get("/time-discounts/", response_model=List[schemas.TimeDiscountOut], summary="Get All Time Discounts")
async def get_time_discounts(
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    return await repository.get_time_discounts(db)

@router.post("/time-discounts/", response_model=schemas.TimeDiscountOut, status_code=status.HTTP_201_CREATED, summary="Create Time Discount")
async def create_time_discount(
    time_discount: schemas.TimeDiscountCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    try:
        from datetime import datetime
        datetime.strptime(time_discount.start_time, "%H:%M")
        datetime.strptime(time_discount.end_time, "%H:%M")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Неправильный формат времени. Используйте HH:MM"
        )

    return await repository.create_time_discount(db, time_discount)

@router.put("/time-discounts/{discount_id}", response_model=schemas.TimeDiscountOut, summary="Update Time Discount")
async def update_time_discount(
    discount_id: int,
    time_discount_update: schemas.TimeDiscountUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    if time_discount_update.start_time:
        try:
            from datetime import datetime
            datetime.strptime(time_discount_update.start_time, "%H:%M")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Неправильный формат времени начала. Используйте HH:MM"
            )

    if time_discount_update.end_time:
        try:
            from datetime import datetime
            datetime.strptime(time_discount_update.end_time, "%H:%M")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Неправильный формат времени окончания. Используйте HH:MM"
            )

    discount = await repository.update_time_discount(db, discount_id, time_discount_update)
    if not discount:
        raise HTTPException(status_code=404, detail="Временная скидка не найдена")
    return discount

@router.delete("/time-discounts/{discount_id}", summary="Delete Time Discount")
async def delete_time_discount(
    discount_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):
    success = await repository.delete_time_discount(db, discount_id)
    if not success:
        raise HTTPException(status_code=404, detail="Временная скидка не найдена")
    return {"message": "Временная скидка удалена"}

@router.post("/topup-card/", response_model=schemas.LoyaltyTopupResponse, summary="Topup RFID Card Balance")
async def topup_rfid_card(
    topup_request: schemas.LoyaltyTopupRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    result = await loyalty_manager.topup_card(
        uid=topup_request.uid,
        amount=topup_request.amount,
        db=db,
        admin_id=current_admin.id
    )

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return schemas.LoyaltyTopupResponse(**result)

@router.post("/register-card/", response_model=schemas.RfidCardOut, status_code=status.HTTP_201_CREATED, summary="Register New RFID Card")
async def register_rfid_card(
    card_data: schemas.RfidCardCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: models.Admin = Depends(get_current_admin)
):

    result = await loyalty_manager.register_new_card(
        uid=card_data.uid,
        holder_name=card_data.holder_name,
        phone_number=card_data.phone_number,
        initial_balance=card_data.balance,
        db=db
    )

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    card = await repository.get_rfid_card_by_uid(db, card_data.uid)
    return card
