import datetime
from datetime import timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Enum as SQLAlchemyEnum,
    JSON,
    Text,
    Table
)
from sqlalchemy.orm import relationship, selectinload
from .database import Base
import enum

class PostStatusEnum(str, enum.Enum):
    free = "free"
    busy = "busy"
    maintenance = "maintenance"
    error = "error"

class SessionStatusEnum(str, enum.Enum):
    active = "active"
    paused = "paused"
    finished = "finished"

class TransactionTypeEnum(str, enum.Enum):
    cash = "cash"
    online = "online"
    rfid_top_up = "rfid_top_up"
    rfid_wash = "rfid_wash"
    bonus = "bonus"

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

post_service_association = Table(
    'post_service_association', Base.metadata,
    Column('post_id', Integer, ForeignKey('posts.id'), primary_key=True),
    Column('service_id', Integer, ForeignKey('services.id'), primary_key=True)
)

kiosk_service_association = Table(
    'kiosk_service_association', Base.metadata,
    Column('kiosk_id', Integer, ForeignKey('kiosks.id'), primary_key=True),
    Column('service_id', Integer, ForeignKey('services.id'), primary_key=True)
)

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    status = Column(SQLAlchemyEnum(PostStatusEnum), default=PostStatusEnum.free, nullable=False)
    is_active = Column(Boolean, default=True)
    controller_id = Column(String, ForeignKey("controllers.controller_id"), nullable=True, index=True)

    available_services = relationship(
        "Service",
        secondary=post_service_association
    )

    payment_transactions = relationship("PaymentTransaction", back_populates="post")

class RfidCard(Base):
    __tablename__ = "rfid_cards"
    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, unique=True, index=True, nullable=False)
    holder_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    balance = Column(Float, default=0.0, nullable=False)
    is_active = Column(Boolean, default=True)

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price_per_minute = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    command_str = Column(String, nullable=True)

    relay_bits = Column(String, default="00000000", nullable=False)
    pump1_power = Column(Integer, default=0, nullable=False)
    pump2_power = Column(Integer, default=0, nullable=False)
    pump3_power = Column(Integer, default=0, nullable=False)
    pump4_power = Column(Integer, default=0, nullable=False)
    motor_frequency = Column(Float, default=0.0, nullable=False)
    motor_flag = Column(String, default="S", nullable=False)

    price_water = Column(Float, default=0.0, nullable=False)
    power_water = Column(Integer, default=0, nullable=False)
    price_foam = Column(Float, default=0.0, nullable=False)
    power_foam = Column(Integer, default=0, nullable=False)
    price_chem = Column(Float, default=0.0, nullable=False)
    power_chem = Column(Integer, default=0, nullable=False)
    price_wax = Column(Float, default=0.0, nullable=False)
    power_wax = Column(Integer, default=0, nullable=False)
    price_osmos = Column(Float, default=0.0, nullable=False)
    power_osmos = Column(Integer, default=0, nullable=False)

class Kiosk(Base):
    __tablename__ = "kiosks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    cash_balance = Column(Float, default=0.0, nullable=False)
    is_active = Column(Boolean, default=True)
    last_maintenance = Column(DateTime, nullable=True)

    post = relationship("Post")
    available_services = relationship(
        "Service",
        secondary=kiosk_service_association
    )

class WashSession(Base):
    __tablename__ = "wash_sessions"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    rfid_card_id = Column(Integer, ForeignKey("rfid_cards.id"), nullable=True)
    status = Column(SQLAlchemyEnum(SessionStatusEnum), nullable=False)
    started_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)

    total_balance = Column(Float, default=0.0)
    cash_balance = Column(Float, default=0.0)
    online_balance = Column(Float, default=0.0)
    card_initial_balance = Column(Float, default=0.0)
    merchant_trans_id = Column(String, index=True, unique=True, nullable=True)

    post = relationship("Post")
    rfid_card = relationship("RfidCard")
    transactions = relationship("Transaction", back_populates="session")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("wash_sessions.id"), nullable=True)
    rfid_card_id = Column(Integer, ForeignKey("rfid_cards.id"), nullable=True)
    type = Column(SQLAlchemyEnum(TransactionTypeEnum), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    session = relationship("WashSession", back_populates="transactions")

class BonusTier(Base):
    __tablename__ = "bonus_tiers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    min_amount = Column(Float, nullable=False)
    max_amount = Column(Float, nullable=False)
    bonus_percent = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)

class TimeDiscount(Base):
    __tablename__ = "time_discounts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    discount_percent = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)

class Controller(Base):
    __tablename__ = "controllers"
    id = Column(Integer, primary_key=True, index=True)
    controller_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    port = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    last_ping = Column(DateTime, nullable=True)

    posts = relationship("Post", backref="controller")

class ControllerCommand(Base):
    __tablename__ = "controller_commands"
    id = Column(Integer, primary_key=True, index=True)
    controller_id = Column(String, nullable=False)
    command_type = Column(String, nullable=False)
    command_str = Column(String, nullable=False)
    priority = Column(Integer, default=1)
    status = Column(String, default="pending")
    result = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    executed_at = Column(DateTime, nullable=True)

class RfidEvent(Base):
    __tablename__ = "rfid_events"
    id = Column(Integer, primary_key=True, index=True)
    rfid_card_id = Column(Integer, ForeignKey("rfid_cards.id"), nullable=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    event_type = Column(String, nullable=False)
    card_uid = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    rfid_card = relationship("RfidCard")
    post = relationship("Post")

class CashEvent(Base):
    __tablename__ = "cash_events"
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    event_type = Column(String, nullable=False)
    amount = Column(Float, nullable=True)
    bill_denomination = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    post = relationship("Post")

class PaymentTransaction(Base):

    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)

    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)

    amount = Column(Integer, nullable=False)

    payment_type = Column(String(50), nullable=False, index=True)

    transaction_id = Column(String(255), unique=True, nullable=True, index=True)

    rfid_card_id = Column(Integer, ForeignKey("rfid_cards.id"), nullable=True)

    status = Column(String(50), default="pending", index=True)

    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    description = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)

    payme_state = Column(Integer, nullable=True, index=True)

    payme_create_time = Column(DateTime(timezone=True), nullable=True)

    payme_perform_time = Column(DateTime(timezone=True), nullable=True)

    payme_cancel_time = Column(DateTime(timezone=True), nullable=True)

    payme_reason = Column(String(255), nullable=True)

    post = relationship("Post", back_populates="payment_transactions")
    rfid_card = relationship("RfidCard")
    rfid_card = relationship("RfidCard")

Post.payment_transactions = relationship("PaymentTransaction", back_populates="post")
Post.qr_codes = relationship("QRCode", back_populates="post")

class QRCode(Base):

    __tablename__ = "qr_codes"

    id = Column(Integer, primary_key=True, index=True)

    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)

    payment_type = Column(String(50), nullable=False)

    qr_url = Column(Text, nullable=False)

    image_path = Column(String(255), nullable=True)

    status = Column(String(50), default="active")

    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=True)

    post = relationship("Post", back_populates="qr_codes")

    def __repr__(self):
        return f"<QRCode(post_id={self.post_id}, type={self.payment_type}, status={self.status})>"
