from typing import Optional, List
import datetime
import json
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from . import models, schemas
from carwash_backend.core.command_queue import command_queue
from sqlalchemy import update

logger = logging.getLogger(__name__)

async def create_payment_transaction(db: AsyncSession, transaction_data: schemas.PaymentTransactionCreate) -> models.PaymentTransaction:

    import uuid

    temp_transaction_id = f"temp_{uuid.uuid4().hex[:12]}"

    db_transaction = models.PaymentTransaction(
        post_id=transaction_data.post_id,
        amount=transaction_data.amount,
        payment_type=getattr(transaction_data, 'payment_type', 'payme'),
        transaction_id=temp_transaction_id,
        status="pending"
    )
    db.add(db_transaction)
    await db.commit()
    await db.refresh(db_transaction)
    return db_transaction

async def get_payment_transaction_by_payme_id(db: AsyncSession, payme_transaction_id: str) -> Optional[models.PaymentTransaction]:

    result = await db.execute(
        select(models.PaymentTransaction).filter(models.PaymentTransaction.transaction_id == payme_transaction_id)
    )
    return result.scalars().first()

async def get_payment_transaction_by_internal_id(db: AsyncSession, internal_id: int) -> Optional[models.PaymentTransaction]:

    result = await db.execute(
        select(models.PaymentTransaction).filter(models.PaymentTransaction.id == internal_id)
    )
    return result.scalars().first()

async def get_payment_transaction_by_transaction_id(db: AsyncSession, transaction_id: str) -> Optional[models.PaymentTransaction]:

    result = await db.execute(
        select(models.PaymentTransaction).filter(models.PaymentTransaction.transaction_id == transaction_id)
    )
    return result.scalars().first()

async def get_payment_transactions_for_statement(
    db: AsyncSession,
    start_date: datetime.datetime,
    end_date: datetime.datetime
) -> List[models.PaymentTransaction]:

    result = await db.execute(
        select(models.PaymentTransaction)
        .filter(models.PaymentTransaction.payment_type == "payme")
        .filter(models.PaymentTransaction.payme_create_time >= start_date)
        .filter(models.PaymentTransaction.payme_create_time <= end_date)
        .order_by(models.PaymentTransaction.payme_create_time)
    )
    return result.scalars().all()
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import OperationalError
from typing import List, Optional
import asyncio
import datetime

from . import models, schemas
from carwash_backend.core.security import get_password_hash, verify_password

async def retry_db_operation(operation, max_retries=3, delay=0.1):
    for attempt in range(max_retries):
        try:
            return await operation()
        except OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                await asyncio.sleep(delay * (attempt + 1))
                continue
            raise

async def get_admin_by_username(db: AsyncSession, username: str):
    result = await db.execute(select(models.Admin).filter(models.Admin.username == username))
    return result.scalars().first()

async def create_admin(db: AsyncSession, admin: schemas.AdminCreate):
    async def _create_admin():
        hashed_password = get_password_hash(admin.password)
        db_admin = models.Admin(username=admin.username, hashed_password=hashed_password)
        db.add(db_admin)
        await db.commit()
        await db.refresh(db_admin)
        return db_admin

    return await retry_db_operation(_create_admin)

async def authenticate_admin(db: AsyncSession, username: str, password: str):
    admin = await get_admin_by_username(db, username)
    if not admin:
        return None
    if not verify_password(password, admin.hashed_password):
        return None
    return admin

async def update_admin(db: AsyncSession, admin_id: int, admin_update: schemas.AdminUpdate) -> Optional[models.Admin]:
    db_admin = await db.get(models.Admin, admin_id)
    if not db_admin:
        return None
    if admin_update.username:
        db_admin.username = admin_update.username
    if admin_update.password:
        db_admin.hashed_password = get_password_hash(admin_update.password)
    await db.commit()
    await db.refresh(db_admin)
    return db_admin

async def get_service_by_command_str(db: AsyncSession, command_str: str):
    from carwash_backend.db import models
    result = await db.execute(
        select(models.Service).where(models.Service.command_str == command_str)
    )
    return result.scalars().first()

async def create_post(db: AsyncSession, post: schemas.PostCreate) -> models.Post:
    async def _create_post():
        post_data = post.dict(exclude={"available_service_ids"})
        db_post = models.Post(**post_data)

        if post.available_service_ids:
            services_result = await db.execute(
                select(models.Service).filter(models.Service.id.in_(post.available_service_ids))
            )
            services = services_result.scalars().all()
            db_post.available_services.extend(services)

        db.add(db_post)
        await db.commit()
        await db.refresh(db_post)

        result = await db.execute(
            select(models.Post)
            .options(selectinload(models.Post.available_services))
            .filter(models.Post.id == db_post.id)
        )
        return result.scalars().first()

    return await retry_db_operation(_create_post)

async def get_post(db: AsyncSession, post_id: int) -> Optional[models.Post]:
    async def _get_post():
        result = await db.execute(
            select(models.Post)
            .options(selectinload(models.Post.available_services))
            .filter(models.Post.id == post_id)
        )
        return result.scalars().first()
    return await retry_db_operation(_get_post)

async def get_posts(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[models.Post]:
    async def _get_posts():
        result = await db.execute(
            select(models.Post)
            .options(selectinload(models.Post.available_services))
            .order_by(models.Post.id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    return await retry_db_operation(_get_posts)

async def get_all_posts(db: AsyncSession) -> List[models.Post]:
    async def _get_all_posts():
        result = await db.execute(
            select(models.Post)
            .options(selectinload(models.Post.available_services))
            .order_by(models.Post.id)
        )
        return result.scalars().all()
    return await retry_db_operation(_get_all_posts)

async def update_post(db: AsyncSession, post_id: int, post_update: schemas.PostUpdate) -> Optional[models.Post]:
    async def _update_post():
        db_post = await get_post(db, post_id)
        if not db_post:
            return None

        update_data = post_update.dict(exclude_unset=True, exclude={"available_service_ids"})
        for key, value in update_data.items():
            if value is not None:
                setattr(db_post, key, value)

        if post_update.available_service_ids is not None:
            await db.execute(
                models.post_service_association.delete().where(
                    models.post_service_association.c.post_id == post_id
                )
            )
            if post_update.available_service_ids:
                for service_id in post_update.available_service_ids:
                    await db.execute(
                        models.post_service_association.insert().values(
                            post_id=post_id, service_id=service_id
                        )
                    )

        await db.commit()
        return await get_post(db, post_id)

    return await retry_db_operation(_update_post)

async def delete_post(db: AsyncSession, post_id: int) -> Optional[models.Post]:
    db_post = await get_post(db, post_id)
    if not db_post:
        return None
    await db.delete(db_post)
    await db.commit()
    return db_post

async def get_bonus_tiers(db: AsyncSession) -> List[models.BonusTier]:
    result = await db.execute(select(models.BonusTier).order_by(models.BonusTier.min_amount))
    return result.scalars().all()

async def create_bonus_tier(db: AsyncSession, bonus_tier: schemas.BonusTierCreate) -> models.BonusTier:
    db_tier = models.BonusTier(**bonus_tier.dict())
    db.add(db_tier)
    await db.commit()
    await db.refresh(db_tier)
    return db_tier

async def update_bonus_tier(db: AsyncSession, tier_id: int, tier_update: schemas.BonusTierUpdate) -> Optional[models.BonusTier]:

    db_tier = await db.get(models.BonusTier, tier_id)
    if not db_tier:
        return None

    update_data = tier_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_tier, field, value)

    await db.commit()
    await db.refresh(db_tier)
    return db_tier

async def delete_bonus_tier(db: AsyncSession, tier_id: int) -> bool:
    db_tier = await db.get(models.BonusTier, tier_id)
    if not db_tier:
        return False

    await db.delete(db_tier)
    await db.commit()
    return True

async def get_time_discounts(db: AsyncSession) -> List[models.TimeDiscount]:

    result = await db.execute(select(models.TimeDiscount).order_by(models.TimeDiscount.start_time))
    return result.scalars().all()

async def create_time_discount(db: AsyncSession, time_discount: schemas.TimeDiscountCreate) -> models.TimeDiscount:

    db_discount = models.TimeDiscount(**time_discount.dict())
    db.add(db_discount)
    await db.commit()
    await db.refresh(db_discount)
    return db_discount

async def update_time_discount(db: AsyncSession, discount_id: int, discount_update: schemas.TimeDiscountUpdate) -> Optional[models.TimeDiscount]:

    db_discount = await db.get(models.TimeDiscount, discount_id)
    if not db_discount:
        return None

    update_data = discount_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_discount, field, value)

    await db.commit()
    await db.refresh(db_discount)
    return db_discount

async def delete_time_discount(db: AsyncSession, discount_id: int) -> bool:

    db_discount = await db.get(models.TimeDiscount, discount_id)
    if not db_discount:
        return False

    await db.delete(db_discount)
    await db.commit()
    return True

async def get_rfid_cards(db: AsyncSession, skip: int = 0, limit: int = 100):

    result = await db.execute(
        select(models.RfidCard)
        .offset(skip)
        .limit(limit)
        .order_by(models.RfidCard.holder_name)
    )
    return result.scalars().all()

async def create_rfid_card(db: AsyncSession, card_data: dict):

    db_card = models.RfidCard(**card_data)
    db.add(db_card)
    await db.commit()
    await db.refresh(db_card)
    return db_card

async def get_rfid_card_by_uid(db: AsyncSession, uid: str):

    result = await db.execute(
        select(models.RfidCard).where(models.RfidCard.uid == uid)
    )
    return result.scalars().first()

async def get_rfid_card(db: AsyncSession, card_id: int):

    result = await db.execute(
        select(models.RfidCard).where(models.RfidCard.id == card_id)
    )
    return result.scalars().first()

async def update_rfid_card(db: AsyncSession, card_id: int, card_update: schemas.RfidCardUpdate):

    result = await db.execute(
        select(models.RfidCard).where(models.RfidCard.id == card_id)
    )
    db_card = result.scalars().first()

    if db_card:
        update_data = card_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_card, key, value)

        await db.commit()
        await db.refresh(db_card)

    return db_card

async def topup_rfid_card(db: AsyncSession, card_id: int, amount: float, post_id: int = None) -> models.RfidCard:

    async def _topup_rfid_card():
        result = await db.execute(
            select(models.RfidCard).where(models.RfidCard.id == card_id)
        )
        db_card = result.scalars().first()
        if not db_card:
            return None
        db_card.balance += amount
        await db.commit()
        await db.refresh(db_card)

        await create_transaction(db, {
            "rfid_card_id": db_card.id,
            "type": models.TransactionTypeEnum.rfid_top_up,
            "amount": amount,
            "description": f"Пополнение RFID-карты {db_card.uid} на сумму {amount}"
        })

        post = None
        if post_id:
            post = await get_post(db, post_id)
        if post and post.controller_id:
            cmd_data = {
                "type": "rfid_topup",
                "card_id": db_card.id,
                "amount": amount,
                "balance": db_card.balance,
                "post_id": post.id
            }
            import json
            await command_queue.create_command(
                db=db,
                controller_id=post.controller_id,
                command_type="rfid_topup",
                command_str=json.dumps(cmd_data),
                priority=1
            )
        else:
            logger.warning("Не найден пост с controller_id для отправки polling-команды rfid_topup")

        return db_card
    return await retry_db_operation(_topup_rfid_card)

async def get_statistics(db: AsyncSession, start_date, end_date, post_id: Optional[int] = None) -> schemas.StatisticsResponse:

    from sqlalchemy import func, and_
    import datetime

    payment_summary = await get_payment_summary_by_methods(db, start_date, end_date)

    query = select(models.Transaction).where(
        and_(
            models.Transaction.timestamp >= start_date,
            models.Transaction.timestamp <= end_date
        )
    )

    result = await db.execute(query)
    transactions = result.scalars().all()

    cash_revenue = payment_summary["cash"]
    online_revenue = payment_summary["online"]
    rfid_revenue = payment_summary["rfid"]

    rfid_spent = sum(abs(t.amount) for t in transactions
                    if t.type == models.TransactionTypeEnum.rfid_wash
                    and t.amount < 0)

    total_revenue = payment_summary["total"]

    sessions_query = select(models.WashSession).where(
        and_(
            models.WashSession.started_at >= start_date,
            models.WashSession.started_at <= end_date
        )
    )

    if post_id:
        sessions_query = sessions_query.where(models.WashSession.post_id == post_id)

    sessions_result = await db.execute(sessions_query)
    sessions = sessions_result.scalars().all()

    total_sessions = len(sessions)

    completed_sessions = [s for s in sessions if s.finished_at]
    if completed_sessions:
        durations = []
        for session in completed_sessions:
            if session.finished_at and session.started_at:
                duration = (session.finished_at - session.started_at).total_seconds()
                durations.append(duration)
        average_duration = sum(durations) / len(durations) if durations else 0
    else:
        average_duration = 0

    payment_breakdown = schemas.PaymentBreakdown(
        payme=payment_summary["by_provider"]["payme"],
        click=payment_summary["by_provider"]["click"],
        uzum=payment_summary["by_provider"]["uzum"],
        rfid=rfid_revenue
    )

    return schemas.StatisticsResponse(
        total_revenue=total_revenue,
        cash_revenue=cash_revenue,
        online_revenue=online_revenue,
        rfid_revenue=rfid_revenue,
        rfid_spent=rfid_spent,
        total_sessions=total_sessions,
        average_session_duration=average_duration,
        post_statistics=[],
        payment_breakdown=payment_breakdown
    )

async def get_transactions_for_export(db: AsyncSession, start_date, end_date) -> List[dict]:

    from sqlalchemy import and_

    query = select(models.Transaction).where(
        and_(
            models.Transaction.timestamp >= start_date,
            models.Transaction.timestamp <= end_date
        )
    ).order_by(models.Transaction.timestamp.desc())

    result = await db.execute(query)
    transactions = result.scalars().all()

    export_data = []
    for t in transactions:
        export_data.append({
            "ID": t.id,
            "Дата и время": t.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "Тип": t.type.value,
            "Сумма": t.amount,
            "Описание": t.description or "",
            "ID сессии": t.session_id or "",
            "ID карты": t.rfid_card_id or ""
        })

    return export_data

async def get_statistics_for_export(db: AsyncSession, start_date, end_date) -> List[dict]:

    export_data = []
    current_date = start_date.date()
    end_date_only = end_date.date()

    while current_date <= end_date_only:
        day_start = datetime.datetime.combine(current_date, datetime.time.min)
        day_end = datetime.datetime.combine(current_date, datetime.time.max)

        daily_stats = await get_statistics(db, day_start, day_end)

        export_data.append({
            "Дата": current_date.strftime("%Y-%m-%d"),
            "Общая выручка": daily_stats.total_revenue,
            "Наличные": daily_stats.cash_revenue,
            "Онлайн": daily_stats.online_revenue,
            "RFID": daily_stats.rfid_revenue,
            "Всего сессий": daily_stats.total_sessions,
            "Средняя длительность (сек)": round(daily_stats.average_session_duration, 2)
        })

        current_date += datetime.timedelta(days=1)

    return export_data

async def get_rfid_cards_for_export(db: AsyncSession) -> List[dict]:

    result = await db.execute(select(models.RfidCard).order_by(models.RfidCard.id))
    cards = result.scalars().all()

    export_data = []
    for card in cards:
        export_data.append({
            "ID": card.id,
            "UID": card.uid,
            "Владелец": card.holder_name,
            "Телефон": card.phone_number or "",
            "Баланс": card.balance,
            "Активна": "Да" if card.is_active else "Нет"
        })

    return export_data

async def update_session_cash_balance(db: AsyncSession, session_id: int, new_balance: float) -> bool:

    try:
        stmt = update(models.Session).where(
            models.Session.id == session_id
        ).values(cash_balance=new_balance)

        result = await db.execute(stmt)
        await db.commit()

        return result.rowcount > 0
    except Exception as e:
        await db.rollback()
        print(f"❌ Ошибка обновления баланса сессии: {e}")
        return False

async def get_payment_summary_by_methods(
    db: AsyncSession,
    start_date: datetime.datetime,
    end_date: datetime.datetime
) -> dict:

    from sqlalchemy import and_

    trx_query = select(models.Transaction).where(
        and_(
            models.Transaction.timestamp >= start_date,
            models.Transaction.timestamp <= end_date
        )
    )
    trx_result = await db.execute(trx_query)
    transactions = trx_result.scalars().all()

    cash_sum = sum(
        t.amount for t in transactions
        if t.type == models.TransactionTypeEnum.cash
        and "киоск" not in (t.description or "").lower()
        and "kiosk" not in (t.description or "").lower()
    )
    online_sum_legacy = sum(
        t.amount for t in transactions
        if t.type == models.TransactionTypeEnum.online
    )
    rfid_sum = sum(
        t.amount for t in transactions
        if t.type in [models.TransactionTypeEnum.rfid_wash, models.TransactionTypeEnum.rfid_top_up] and t.amount > 0
    )

    pay_query = select(models.PaymentTransaction).where(
        and_(
            models.PaymentTransaction.created_at >= start_date,
            models.PaymentTransaction.created_at <= end_date,
            models.PaymentTransaction.status == "completed"
        )
    )
    pay_result = await db.execute(pay_query)
    payment_rows = pay_result.scalars().all()

    by_provider = {"click": 0.0, "payme": 0.0, "uzum": 0.0}
    for p in payment_rows:
        provider = (p.payment_type or "").lower()
        amount_sum = (p.amount or 0) / 100.0 if isinstance(p.amount, int) else float(p.amount or 0)
        if provider in by_provider:
            by_provider[provider] += amount_sum
        elif provider != "cash":

            by_provider.setdefault(provider, 0.0)
            by_provider[provider] += amount_sum

    online_providers_sum = sum(v for k, v in by_provider.items() if k != "cash")
    online_total = online_sum_legacy + online_providers_sum

    total = cash_sum + rfid_sum + online_total

    print(f"🔍 ОТЛАДКА ПЛАТЕЖЕЙ:")
    print(f"   💵 Наличные (cash_sum): {cash_sum}")
    print(f"   🌐 Старые онлайн (online_sum_legacy): {online_sum_legacy}")
    print(f"   💳 Payme: {by_provider['payme']}")
    print(f"   💳 Click: {by_provider['click']}")
    print(f"   💳 Uzum: {by_provider['uzum']}")
    print(f"   🔢 Сумма провайдеров: {sum(by_provider.values())}")
    print(f"   🌐 Онлайн итого: {online_total}")
    print(f"   🎫 RFID: {rfid_sum}")
    print(f"   💰 Общий итог: {total}")

    return {
        "total": round(total, 2),
        "cash": round(cash_sum, 2),
        "rfid": round(rfid_sum, 2),

        "online": round(online_providers_sum, 2),

        "click": round(by_provider.get('click', 0), 2),
        "payme": round(by_provider.get('payme', 0), 2),
        "uzum": round(by_provider.get('uzum', 0), 2),
        "by_provider": {k: round(v, 2) for k, v in by_provider.items()},

        "debug": {
            "online_sum_legacy": round(online_sum_legacy, 2),
            "providers_sum": round(online_providers_sum, 2),
            "online_total": round(online_total, 2)
        }
    }

async def get_daily_summary(db: AsyncSession, target_date) -> dict:

    day_start = datetime.datetime.combine(target_date.date(), datetime.time.min)
    day_end = datetime.datetime.combine(target_date.date(), datetime.time.max)

    stats = await get_statistics(db, day_start, day_end)

    return {
        "date": target_date.date().strftime("%Y-%m-%d"),
        "total_revenue": stats.total_revenue,
        "total_sessions": stats.total_sessions,
        "average_session_duration": stats.average_session_duration
    }

async def get_posts_activity(
    db: AsyncSession,
    start_date: Optional[datetime.datetime] = None,
    end_date: Optional[datetime.datetime] = None,
    hours: Optional[int] = None
) -> List[dict]:

    import datetime
    from sqlalchemy import and_, select, func

    if start_date and end_date:
        start_time = start_date
        end_time = end_date
    elif hours:
        end_time = datetime.datetime.utcnow()
        start_time = end_time - datetime.timedelta(hours=hours)
    else:

        end_time = datetime.datetime.utcnow()
        start_time = end_time - datetime.timedelta(hours=24)

    sessions_subquery = (
        select(
            models.WashSession.post_id,
            func.count(models.WashSession.id).label("sessions_count"),
            func.sum(models.WashSession.total_balance).label("total_revenue")
        )
        .where(
            models.WashSession.started_at.between(start_time, end_time)
        )
        .group_by(models.WashSession.post_id)
        .subquery()
    )

    posts_query = (
        select(
            models.Post.id,
            models.Post.name,
            models.Post.status,
            sessions_subquery.c.sessions_count,
            sessions_subquery.c.total_revenue
        )
        .outerjoin(sessions_subquery, models.Post.id == sessions_subquery.c.post_id)
        .order_by(models.Post.id)
    )

    result = await db.execute(posts_query)
    posts_activity = result.all()

    activity = [
        {
            "post_id": post.id,
            "post_name": post.name,
            "status": post.status.value if post.status else 'unknown',
            "sessions_count": post.sessions_count or 0,
            "total_revenue": post.total_revenue or 0.0,
        }
        for post in posts_activity
    ]

    return activity

async def get_active_services(db: AsyncSession) -> List[models.Service]:

    result = await db.execute(
        select(models.Service)
        .where(models.Service.is_active == True)
        .order_by(models.Service.id)
    )
    return result.scalars().all()

async def create_service(db: AsyncSession, service: schemas.ServiceCreate) -> models.Service:

    from carwash_backend.core.hardware_commands import get_predefined_service_config

    service_dict = service.dict()

    if service.name in ["Вода", "Турбо-вода", "Активная химия", "Нано-шампунь", "Воск", "Осмос", "Тёплая вода"]:

        if service.relay_bits == "00000000":
            predefined = get_predefined_service_config(service.name)
            service_dict["relay_bits"] = predefined["relay_bits"]

    db_service = models.Service(**service_dict)
    db.add(db_service)
    await db.commit()
    await db.refresh(db_service)
    return db_service

async def get_service(db: AsyncSession, service_id: int) -> Optional[models.Service]:

    result = await db.execute(select(models.Service).filter(models.Service.id == service_id))
    return result.scalars().first()

async def get_services(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[models.Service]:

    result = await db.execute(select(models.Service).order_by(models.Service.id).offset(skip).limit(limit))
    return result.scalars().all()

async def update_service(db: AsyncSession, service_id: int, service_update: schemas.ServiceUpdate) -> Optional[models.Service]:

    from carwash_backend.core.hardware_commands import get_predefined_service_config

    async def _update_service():
        db_service = await get_service(db, service_id)
        if not db_service:
            return None

        update_data = service_update.dict(exclude_unset=True)

        new_name = update_data.get('name', db_service.name)
        if new_name in ["Вода", "Турбо-вода", "Активная химия", "Нано-шампунь", "Воск", "Осмос", "Тёплая вода"]:

            if 'relay_bits' not in update_data or update_data.get('relay_bits') == "00000000":
                predefined = get_predefined_service_config(new_name)
                update_data['relay_bits'] = predefined["relay_bits"]

        for key, value in update_data.items():
            if value is not None:
                setattr(db_service, key, value)

        await db.commit()
        await db.refresh(db_service)
        return db_service

    return await retry_db_operation(_update_service)

async def delete_service(db: AsyncSession, service_id: int) -> bool:

    db_service = await get_service(db, service_id)
    if not db_service:
        return False

    await db.delete(db_service)
    await db.commit()
    return True

async def get_sessions_by_date_range(db: AsyncSession, start_date: datetime, end_date: datetime):

    from datetime import datetime
    result = await db.execute(
        select(models.WashSession)
        .where(
            models.WashSession.started_at >= start_date,
            models.WashSession.started_at <= end_date
        )
        .order_by(models.WashSession.started_at)
    )
    return result.scalars().all()

async def get_active_session_for_post(db: AsyncSession, post_id: int) -> Optional[models.WashSession]:

    result = await db.execute(
        select(models.WashSession).where(
            models.WashSession.post_id == post_id,
            models.WashSession.status == models.SessionStatusEnum.active
        )
    )
    return result.scalars().first()

async def create_wash_session(db: AsyncSession, session_data: dict) -> models.WashSession:

    db_session = models.WashSession(**session_data)
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    return db_session

async def update_wash_session(db: AsyncSession, session_id: int, session_data: dict) -> Optional[models.WashSession]:

    result = await db.execute(
        select(models.WashSession).where(models.WashSession.id == session_id)
    )
    db_session = result.scalars().first()

    if db_session:
        for key, value in session_data.items():
            if hasattr(db_session, key):
                setattr(db_session, key, value)

        await db.commit()
        await db.refresh(db_session)

    return db_session

async def get_wash_session(db: AsyncSession, session_id: int) -> Optional[models.WashSession]:

    result = await db.execute(
        select(models.WashSession).where(models.WashSession.id == session_id)
    )
    return result.scalars().first()

async def create_transaction(db: AsyncSession, transaction_data: dict) -> models.Transaction:

    if "timestamp" in transaction_data and isinstance(transaction_data["timestamp"], str):
        try:
            transaction_data["timestamp"] = datetime.datetime.fromisoformat(transaction_data["timestamp"])
        except ValueError:

            transaction_data["timestamp"] = datetime.datetime.utcnow()

    if "type" in transaction_data:
        try:

            transaction_data["type"] = models.TransactionTypeEnum(transaction_data["type"])
        except ValueError:

            transaction_data["type"] = models.TransactionTypeEnum.cash

    db_transaction = models.Transaction(**transaction_data)
    db.add(db_transaction)
    await db.commit()
    await db.refresh(db_transaction)
    return db_transaction

async def get_kiosks(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[models.Kiosk]:

    result = await db.execute(
        select(models.Kiosk)
        .options(selectinload(models.Kiosk.post))
        .offset(skip)
        .limit(limit)
        .order_by(models.Kiosk.id)
    )
    return result.scalars().all()

async def create_kiosk(db: AsyncSession, kiosk_data: schemas.KioskCreate) -> models.Kiosk:

    db_kiosk = models.Kiosk(**kiosk_data.dict())
    db.add(db_kiosk)
    await db.commit()
    await db.refresh(db_kiosk)
    return db_kiosk

async def get_kiosk(db: AsyncSession, kiosk_id: int) -> Optional[models.Kiosk]:

    result = await db.execute(
        select(models.Kiosk)
        .options(selectinload(models.Kiosk.post))
        .where(models.Kiosk.id == kiosk_id)
    )
    return result.scalars().first()

async def update_kiosk(db: AsyncSession, kiosk_id: int, kiosk_update: schemas.KioskUpdate) -> Optional[models.Kiosk]:

    db_kiosk = await get_kiosk(db, kiosk_id)
    if not db_kiosk:
        return None

    update_data = kiosk_update.dict(exclude_unset=True, exclude={"available_service_ids"})
    for key, value in update_data.items():
        if value is not None:
            setattr(db_kiosk, key, value)

    if kiosk_update.available_service_ids is not None:
        await update_kiosk_services(db, kiosk_id, kiosk_update.available_service_ids)

    await db.commit()
    await db.refresh(db_kiosk)
    return db_kiosk

async def topup_kiosk_cash(db: AsyncSession, kiosk_id: int, amount: float) -> Optional[models.Kiosk]:

    db_kiosk = await get_kiosk(db, kiosk_id)
    if not db_kiosk:
        return None

    db_kiosk.cash_balance += amount

    transaction_data = {
        "type": models.TransactionTypeEnum.cash,
        "amount": amount,
        "description": f"Пополнение киоска {db_kiosk.name} (ID: {kiosk_id})",
        "timestamp": datetime.datetime.utcnow()
    }
    await create_transaction(db, transaction_data)

    await db.commit()
    await db.refresh(db_kiosk)
    return db_kiosk

async def delete_kiosk(db: AsyncSession, kiosk_id: int) -> bool:

    db_kiosk = await get_kiosk(db, kiosk_id)
    if not db_kiosk:
        return False

    await db.delete(db_kiosk)
    await db.commit()
    return True

async def get_controllers(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[models.Controller]:

    async def _get_controllers():
        result = await db.execute(
            select(models.Controller)
            .order_by(models.Controller.name)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    return await retry_db_operation(_get_controllers)

async def get_controller(db: AsyncSession, controller_id: str) -> Optional[models.Controller]:

    async def _get_controller():
        result = await db.execute(
            select(models.Controller).filter(models.Controller.controller_id == controller_id)
        )
        return result.scalars().first()
    return await retry_db_operation(_get_controller)

async def get_controller_dependencies(db: AsyncSession, controller_id: str) -> dict:

    async def _get_dependencies():

        posts_result = await db.execute(
            select(models.Post)
            .where(models.Post.controller_id == controller_id)
        )
        posts = posts_result.scalars().all()

        commands_result = await db.execute(
            select(models.ControllerCommand)
            .where(models.ControllerCommand.controller_id == controller_id)
        )
        commands = commands_result.scalars().all()

        return {
            "posts_count": len(posts),
            "posts": [{"id": post.id, "name": post.name} for post in posts],
            "commands_count": len(commands),
            "commands": [{"id": cmd.id, "command_type": cmd.command_type, "status": cmd.status} for cmd in commands]
        }
    return await retry_db_operation(_get_dependencies)

async def create_controller(db: AsyncSession, controller: schemas.ControllerCreate) -> models.Controller:

    async def _create_controller():
        db_controller = models.Controller(**controller.dict())
        db.add(db_controller)
        await db.commit()
        await db.refresh(db_controller)
        return db_controller
    return await retry_db_operation(_create_controller)

async def update_controller(db: AsyncSession, controller_id: str, controller_update: schemas.ControllerUpdate) -> Optional[models.Controller]:

    async def _update_controller():
        db_controller = await get_controller(db, controller_id)
        if not db_controller:
            return None

        update_data = controller_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(db_controller, key, value)

        await db.commit()
        await db.refresh(db_controller)
        return db_controller
    return await retry_db_operation(_update_controller)

async def delete_controller(db: AsyncSession, controller_id: str) -> bool:

    async def _delete_controller():
        db_controller = await get_controller(db, controller_id)
        if not db_controller:
            return False

        from sqlalchemy import delete
        await db.execute(
            delete(models.ControllerCommand)
            .where(models.ControllerCommand.controller_id == controller_id)
        )

        await db.execute(
            update(models.Post)
            .where(models.Post.controller_id == controller_id)
            .values(controller_id=None)
        )

        await db.delete(db_controller)
        await db.commit()
        return True
    return await retry_db_operation(_delete_controller)

async def ping_controller(db: AsyncSession, controller_id: str) -> bool:

    async def _ping_controller():
        db_controller = await get_controller(db, controller_id)
        if not db_controller:
            return False

        db_controller.last_ping = datetime.datetime.utcnow()
        await db.commit()
        return True
    return await retry_db_operation(_ping_controller)

async def get_post_with_controller_info(db: AsyncSession, post_id: int) -> Optional[dict]:

    async def _get_post_with_controller_info():

        result = await db.execute(
            select(models.Post)
            .options(selectinload(models.Post.available_services))
            .filter(models.Post.id == post_id)
        )
        post = result.scalars().first()

        if not post:
            return None

        post_dict = {
            "id": post.id,
            "name": post.name,
            "controller_id": post.controller_id,
            "is_active": post.is_active,
            "status": post.status,
            "available_services": [
                {
                    "id": service.id,
                    "name": service.name,
                    "is_active": service.is_active
                } for service in post.available_services
            ],
            "controller": None
        }

        if post.controller_id:
            controller_result = await db.execute(
                select(models.Controller).filter(models.Controller.controller_id == post.controller_id)
            )
            controller = controller_result.scalars().first()
            if controller:
                post_dict["controller"] = {
                    "id": controller.controller_id,
                    "name": controller.name
                }

        return post_dict

    return await retry_db_operation(_get_post_with_controller_info)

async def get_posts_with_controller_info(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[dict]:

    async def _get_posts_with_controller_info():

        result = await db.execute(
            select(models.Post)
            .options(selectinload(models.Post.available_services))
            .order_by(models.Post.id)
            .offset(skip)
            .limit(limit)
        )
        posts = result.scalars().all()

        result_list = []

        for post in posts:
            post_dict = {
                "id": post.id,
                "name": post.name,
                "controller_id": post.controller_id,
                "is_active": post.is_active,
                "status": post.status,
                "available_services": [
                    {
                        "id": service.id,
                        "name": service.name,
                        "is_active": service.is_active
                    } for service in post.available_services
                ],
                "controller": None
            }

            if post.controller_id:
                controller_result = await db.execute(
                    select(models.Controller).filter(models.Controller.controller_id == post.controller_id)
                )
                controller = controller_result.scalars().first()
                if controller:
                    post_dict["controller"] = {
                        "id": controller.controller_id,
                        "name": controller.name
                    }

            result_list.append(post_dict)

        return result_list

    return await retry_db_operation(_get_posts_with_controller_info)

async def get_pending_controller_commands(
    db: AsyncSession,
    controller_id: str,
    limit: int = 10
) -> List[models.ControllerCommand]:

    result = await db.execute(
        select(models.ControllerCommand)
        .where(
            models.ControllerCommand.controller_id == controller_id,
            models.ControllerCommand.status == "pending"
        )
        .order_by(models.ControllerCommand.priority.desc(), models.ControllerCommand.created_at)
        .limit(limit)
    )
    return result.scalars().all()

async def update_controller_command_status(
    db: AsyncSession,
    command_id: int,
    status: str,
    result: Optional[str] = None
) -> bool:

    command = await db.get(models.ControllerCommand, command_id)
    if not command:
        return False

    command.status = status
    command.result = result
    if status in ["executed", "failed"]:
        command.executed_at = datetime.datetime.utcnow()

    await db.commit()
    return True

async def delete_old_controller_commands(
    db: AsyncSession,
    cutoff_date: datetime.datetime
) -> int:

    from sqlalchemy import delete

    result = await db.execute(
        delete(models.ControllerCommand)
        .where(
            models.ControllerCommand.created_at < cutoff_date,
            models.ControllerCommand.status.in_(["executed", "failed"])
        )
    )

    await db.commit()
    return result.rowcount

async def update_controller_last_seen(
    db: AsyncSession,
    controller_id: str,
    status_data: Optional[dict] = None
) -> bool:
    controller = await get_controller(db, controller_id)
    if not controller:
        from . import schemas
        new_controller = schemas.ControllerCreate(
            controller_id=controller_id,
            name=f"Controller {controller_id}"
        )
        await create_controller(db, new_controller)
        return True

    controller.last_ping = datetime.datetime.utcnow()

    await db.commit()
    return True

async def get_controller_status(
    db: AsyncSession,
    controller_id: str
) -> str:
    controller = await get_controller(db, controller_id)
    if not controller:
        return "unknown"

    if not controller.last_ping:
        return "offline"

    time_diff = datetime.datetime.utcnow() - controller.last_ping
    if time_diff.total_seconds() > 60:
        return "offline"

    return "online"

async def get_active_session_by_post(
    db: AsyncSession,
    post_id: int
) -> Optional[models.WashSession]:
    result = await db.execute(
        select(models.WashSession)
        .where(
            models.WashSession.post_id == post_id,
            models.WashSession.status == models.SessionStatusEnum.active
        )
    )
    return result.scalars().first()

async def get_active_time_discounts(db: AsyncSession) -> List[models.TimeDiscount]:
    result = await db.execute(
        select(models.TimeDiscount)
        .where(models.TimeDiscount.is_active == True)
    )
    return result.scalars().all()

async def get_card_transactions(
    db: AsyncSession,
    card_id: int,
    limit: int = 10
) -> List[models.Transaction]:
    result = await db.execute(
        select(models.Transaction)
        .where(models.Transaction.rfid_card_id == card_id)
        .order_by(models.Transaction.timestamp.desc())
        .limit(limit)
    )
    return result.scalars().all()

async def create_rfid_event(db: AsyncSession, event_data: dict) -> models.RfidEvent:
    db_event = models.RfidEvent(**event_data)
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    return db_event

async def create_cash_event(db: AsyncSession, event_data: dict) -> models.CashEvent:
    db_event = models.CashEvent(**event_data)
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    return db_event

async def top_up_rfid_card_balance(
    db: AsyncSession,
    card_id: int,
    amount: float
) -> Optional[models.RfidCard]:
    card = await get_rfid_card(db, card_id)
    if not card:
        return None

    card.balance += amount
    await db.commit()
    await db.refresh(card)
    return card

async def add_services_to_post(db: AsyncSession, post_id: int, service_ids: List[int]) -> bool:

    async def _add_services():
        post = await get_post(db, post_id)
        if not post:
            return False

        services_result = await db.execute(
            select(models.Service).filter(models.Service.id.in_(service_ids))
        )
        services = services_result.scalars().all()

        post.available_services.extend(services)
        await db.commit()
        return True

    return await retry_db_operation(_add_services)

async def get_services_for_post(db: AsyncSession, post_id: int) -> List[models.Service]:

    async def _get_services_for_post():
        result = await db.execute(
            select(models.Post)
            .options(selectinload(models.Post.available_services))
            .filter(models.Post.id == post_id)
        )
        post = result.scalars().first()

        if not post:
            return []

        return post.available_services

    return await retry_db_operation(_get_services_for_post)

async def update_post_services(db: AsyncSession, post_id: int, service_ids: List[int]) -> bool:

    async def _update_services():
        post = await get_post(db, post_id)
        if not post:
            return False

        await db.execute(
            models.post_service_association.delete().where(
                models.post_service_association.c.post_id == post_id
            )
        )

        if service_ids:
            for service_id in service_ids:
                await db.execute(
                    models.post_service_association.insert().values(
                        post_id=post_id, service_id=service_id
                    )
                )

        await db.commit()
        return True

    return await retry_db_operation(_update_services)

async def get_kiosks_by_post_id(db: AsyncSession, post_id: int) -> List[models.Kiosk]:

    async def _get_kiosks_by_post():
        result = await db.execute(
            select(models.Kiosk)
            .options(selectinload(models.Kiosk.post))
            .filter(models.Kiosk.post_id == post_id)
            .order_by(models.Kiosk.name)
        )
        return result.scalars().all()

    return await retry_db_operation(_get_kiosks_by_post)

async def get_services_for_kiosk(db: AsyncSession, kiosk_id: int) -> List[models.Service]:
    async def _get_services_for_kiosk():
        result = await db.execute(
            select(models.Kiosk)
            .options(selectinload(models.Kiosk.available_services))
            .filter(models.Kiosk.id == kiosk_id)
        )
        kiosk = result.scalars().first()
        
        if not kiosk:
            return []
        
        if kiosk.available_services:
            return kiosk.available_services
        else:
            return await get_services_for_post(db, kiosk.post_id)
    
    return await retry_db_operation(_get_services_for_kiosk)

async def update_kiosk_services(db: AsyncSession, kiosk_id: int, service_ids: List[int]) -> bool:
    async def _update_kiosk_services():
        kiosk = await get_kiosk(db, kiosk_id)
        if not kiosk:
            return False

        await db.execute(
            models.kiosk_service_association.delete().where(
                models.kiosk_service_association.c.kiosk_id == kiosk_id
            )
        )

        if service_ids:
            for service_id in service_ids:
                await db.execute(
                    models.kiosk_service_association.insert().values(
                        kiosk_id=kiosk_id, service_id=service_id
                    )
                )

        await db.commit()
        return True

    return await retry_db_operation(_update_kiosk_services)

async def get_posts_for_desktop_selection(db: AsyncSession) -> List[dict]:

    async def _get_posts_for_desktop():
        result = await db.execute(
            select(models.Post)
            .filter(models.Post.is_active == True)
            .order_by(models.Post.name)
        )
        posts = result.scalars().all()

        return [
            {
                "post_id": post.id,
                "post_name": post.name,
                "status": post.status.value,
                "controller_id": post.controller_id
            } for post in posts
        ]

    return await retry_db_operation(_get_posts_for_desktop)

async def validate_service_for_post(db: AsyncSession, post_id: int, service_id: int) -> bool:

    async def _validate_service():

        result = await db.execute(
            select(models.Post)
            .options(selectinload(models.Post.available_services))
            .filter(models.Post.id == post_id)
        )
        post = result.scalars().first()

        if not post:
            return False

        service_ids = [service.id for service in post.available_services]
        return service_id in service_ids

    return await retry_db_operation(_validate_service)

async def get_kiosk_with_location_info(db: AsyncSession, kiosk_id: int) -> Optional[dict]:

    async def _get_kiosk_info():
        result = await db.execute(
            select(models.Kiosk)
            .options(selectinload(models.Kiosk.post))
            .filter(models.Kiosk.id == kiosk_id)
        )
        kiosk = result.scalars().first()

        if not kiosk:
            return None

        return {
            "kiosk_id": kiosk.id,
            "kiosk_name": kiosk.name,
            "cash_balance": kiosk.cash_balance,
            "is_active": kiosk.is_active,
            "location": {
                "post_id": kiosk.post.id,
                "post_name": kiosk.post.name,
                "status": kiosk.post.status.value
            }
        }

    return await retry_db_operation(_get_kiosk_info)

async def create_service_event_log(db: AsyncSession, event_data: dict) -> models.RfidEvent:

    async def _create_event_log():

        event_type = event_data.get("event_type", "service_requested")

        log_data = {
            "post_id": event_data.get("post_id"),
            "event_type": event_type,
            "timestamp": datetime.datetime.utcnow(),
        }

        uid = event_data.get("uid")
        if uid:
            log_data["card_uid"] = uid
        db_event = models.RfidEvent(**log_data)
        db.add(db_event)
        await db.commit()
        await db.refresh(db_event)
        return db_event

    return await retry_db_operation(_create_event_log)
