from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentTransactionBase(BaseModel):
    post_id: int
    amount: int
    payment_type: str = "payme"
    status: str = "pending"

class PaymentTransactionCreate(BaseModel):

    post_id: int
    amount: int
    payment_type: str = "payme"

class PaymentTransactionOut(PaymentTransactionBase):
    id: int
    created_at: datetime
    transaction_id: Optional[str] = None
    payme_state: Optional[int] = None

    class Config:
        from_attributes = True
from pydantic import BaseModel, Field, constr
from typing import Optional, List, Annotated, Dict, Any, Union
from datetime import datetime
from .models import PostStatusEnum

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class AdminBase(BaseModel):
    username: str

class AdminCreate(AdminBase):
    password: str

class AdminUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

class AdminOut(AdminBase):
    id: int
    class Config:
        from_attributes = True

class ServiceBase(BaseModel):
    name: str
    price_per_minute: float
    is_active: bool = True
    command_str: Optional[str] = None

    relay_bits: str = "00000000"
    pump1_power: int = Field(default=0, ge=0, le=99)
    pump2_power: int = Field(default=0, ge=0, le=99)
    pump3_power: int = Field(default=0, ge=0, le=99)
    pump4_power: int = Field(default=0, ge=0, le=99)
    motor_frequency: float = Field(default=0.0, ge=0.0, le=50.0)
    motor_flag: str = Field(default="S", pattern="^(F|S)$")
    price_water: float = 0.0
    power_water: int = 0
    price_foam: float = 0.0
    power_foam: int = 0
    price_chem: float = 0.0
    power_chem: int = 0
    price_wax: float = 0.0
    power_wax: int = 0
    price_osmos: float = 0.0
    power_osmos: int = 0

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    price_per_minute: Optional[float] = None
    is_active: Optional[bool] = None
    command_str: Optional[str] = None
    relay_bits: Optional[str] = None
    pump1_power: Optional[int] = Field(None, ge=0, le=99)
    pump2_power: Optional[int] = Field(None, ge=0, le=99)
    pump3_power: Optional[int] = Field(None, ge=0, le=99)
    pump4_power: Optional[int] = Field(None, ge=0, le=99)
    motor_frequency: Optional[float] = Field(None, ge=0.0, le=50.0)
    motor_flag: Optional[str] = Field(None, pattern="^(F|S)$")
    price_water: Optional[float] = None
    power_water: Optional[int] = None
    price_foam: Optional[float] = None
    power_foam: Optional[int] = None
    price_chem: Optional[float] = None
    power_chem: Optional[int] = None
    price_wax: Optional[float] = None
    power_wax: Optional[int] = None
    price_osmos: Optional[float] = None
    power_osmos: Optional[int] = None

class ServiceOut(ServiceBase):
    id: int
    class Config:
        from_attributes = True

class PostBase(BaseModel):
    name: str
    is_active: bool = True
    controller_id: Optional[str] = None

class PostCreate(PostBase):
    available_service_ids: List[int] = []

class PostUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[PostStatusEnum] = None
    controller_id: Optional[str] = None
    available_service_ids: Optional[List[int]] = None

class PostOut(PostBase):
    id: int
    status: PostStatusEnum
    available_services: List[ServiceOut] = []

    class Config:
        from_attributes = True

class PostWithControllerOut(BaseModel):
    id: int
    name: str
    controller_id: Optional[str] = None
    is_active: bool = True
    status: PostStatusEnum
    available_services: List[ServiceOut] = []
    controller: Optional[Dict[str, str]] = None

class BonusTierBase(BaseModel):
    name: Optional[str] = None
    min_amount: float = Field(..., ge=0, description="Минимальная сумма для бонуса")
    max_amount: float = Field(..., ge=0, description="Максимальная сумма для бонуса")
    bonus_percent: float = Field(..., ge=0, le=100, description="Процент бонуса")
    is_active: bool = True

class BonusTierCreate(BonusTierBase):
    pass

class BonusTierUpdate(BaseModel):
    name: Optional[str] = None
    min_amount: Optional[float] = Field(None, ge=0)
    max_amount: Optional[float] = Field(None, ge=0)
    bonus_percent: Optional[float] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None

class BonusTierOut(BonusTierBase):
    id: int
    class Config:
        from_attributes = True

class TimeDiscountBase(BaseModel):
    name: Optional[str] = None
    start_time: str = Field(..., description="Время начала в формате HH:MM")
    end_time: str = Field(..., description="Время окончания в формате HH:MM")
    discount_percent: float = Field(..., ge=0, le=100, description="Процент скидки")
    is_active: bool = True

class TimeDiscountCreate(TimeDiscountBase):
    pass

class TimeDiscountUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    discount_percent: Optional[float] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None

class TimeDiscountOut(TimeDiscountBase):
    id: int
    class Config:
        from_attributes = True

class RfidCardBase(BaseModel):
    uid: str = Field(..., description="Уникальный идентификатор карты")
    holder_name: str = Field(..., description="Имя владельца карты")
    phone_number: Optional[str] = Field(None, description="Номер телефона")
    balance: float = Field(default=0.0, ge=0, description="Баланс карты")
    is_active: bool = True

class RfidCardCreate(RfidCardBase):
    pass

class RfidCardUpdate(BaseModel):
    holder_name: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None

class RfidCardOut(RfidCardBase):
    id: int
    class Config:
        from_attributes = True

class RfidCardTopup(BaseModel):
    amount: float = Field(..., gt=0, description="Сумма пополнения")

class RfidCardStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="Статус активности карты")

class PaymentCreate(BaseModel):
    card_uid: str
    amount: float = Field(..., gt=0)
    payment_method: str = Field(..., description="click, payme, uzum")
    phone_number: Optional[str] = None

class PaymentResponse(BaseModel):
    success: bool
    payment_url: Optional[str] = None
    merchant_trans_id: Optional[str] = None
    error: Optional[str] = None

class RfidScanData(BaseModel):
    uid: str
    scan_time: Optional[str] = None

class ServiceSelectionData(BaseModel):
    service_id: int
    selection_time: Optional[str] = None

class SessionFinishedData(BaseModel):
    duration: Optional[int] = None
    finish_time: Optional[str] = None
    reason: Optional[str] = None

class ControllerEventData(BaseModel):
    uid: Optional[str] = None
    scan_time: Optional[str] = None

    service_id: Optional[Union[int, str]] = None
    selection_time: Optional[str] = None

    duration: Optional[int] = None
    finish_time: Optional[str] = None
    reason: Optional[str] = None

    amount: Optional[float] = None

class ControllerEvent(BaseModel):
    post_id: int
    event_type: str
    data: ControllerEventData

class ServiceSelectionRequest(BaseModel):
    service_id: int

class WashSessionBase(BaseModel):
    post_id: int
    rfid_card_id: Optional[int] = None
    total_balance: float = 0.0
    cash_balance: float = 0.0
    online_balance: float = 0.0
    card_initial_balance: float = 0.0

class WashSessionOut(WashSessionBase):
    id: int
    status: str
    started_at: str
    finished_at: Optional[str] = None
    merchant_trans_id: Optional[str] = None
    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    amount: float
    description: Optional[str] = None

class TransactionOut(TransactionBase):
    id: int
    session_id: Optional[int] = None
    rfid_card_id: Optional[int] = None
    type: str
    timestamp: str
    class Config:
        from_attributes = True

class StatisticsRequest(BaseModel):
    start_date: str = Field(..., description="Дата начала в формате YYYY-MM-DD")
    end_date: str = Field(..., description="Дата окончания в формате YYYY-MM-DD")
    post_id: Optional[int] = None

class PaymentBreakdown(BaseModel):
    payme: float = 0.0
    click: float = 0.0
    uzum: float = 0.0
    rfid: float = 0.0

class StatisticsResponse(BaseModel):
    total_revenue: float
    cash_revenue: float
    online_revenue: float
    rfid_revenue: float
    rfid_spent: float
    total_sessions: int
    average_session_duration: float
    post_statistics: List[dict] = []
    payment_breakdown: Optional[PaymentBreakdown] = None

class PaginationInfo(BaseModel):
    total_count: int = Field(..., description="Общее количество записей")
    total_pages: int = Field(..., description="Общее количество страниц")
    current_page: int = Field(..., description="Текущая страница")
    page_size: int = Field(..., description="Размер страницы")
    has_next: bool = Field(..., description="Есть ли следующая страница")
    has_previous: bool = Field(..., description="Есть ли предыдущая страница")

class TransactionItem(BaseModel):
    id: int
    created_at: str = Field(..., description="Дата и время в формате YYYY-MM-DD HH:MM:SS")
    type: str = Field(..., description="Тип транзакции")
    amount: float = Field(..., description="Сумма транзакции")
    device_id: str = Field(..., description="ID устройства")
    description: str = Field(..., description="Описание транзакции")

class PaginatedTransactionsResponse(BaseModel):
    transactions: List[TransactionItem] = Field(..., description="Список транзакций")
    pagination: PaginationInfo = Field(..., description="Информация о пагинации")

class PostStatusUpdate(BaseModel):
    status: PostStatusEnum

class PostManualTopup(BaseModel):
    amount: float = Field(..., gt=0, description="Сумма пополнения поста")

class PostCurrentStatus(BaseModel):
    post_id: int
    status: PostStatusEnum
    current_balance: float = 0.0
    active_service_id: Optional[int] = None
    remaining_time_seconds: int = 0
    last_activity: Optional[str] = None

class LoyaltyTopupRequest(BaseModel):
    uid: str = Field(..., description="UID RFID карты")
    amount: float = Field(..., gt=0, description="Сумма пополнения")

class LoyaltyTopupResponse(BaseModel):
    success: bool
    new_balance: float
    bonus_amount: float = 0.0
    total_added: float
    message: Optional[str] = None

class ConfigUpdate(BaseModel):
    config_data: dict = Field(..., description="Данные конфигурации")

class ConfigResponse(BaseModel):
    success: bool
    message: str
    current_config: Optional[dict] = None

class RfidScanRequest(BaseModel):
    uid: str = Field(..., description="UID RFID карты")

class RfidScanResult(BaseModel):
    uid: Optional[str] = None
    timestamp: str
    success: bool
    message: str

class ExportRequest(BaseModel):
    start_date: str
    end_date: str
    format: str = Field(..., description="excel, csv")
    data_type: str = Field(..., description="transactions, statistics, rfid_cards")

class LogFilter(BaseModel):
    level: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    search_text: Optional[str] = None
    limit: int = Field(default=1000, le=10000)

class LogEntry(BaseModel):
    timestamp: str
    level: str
    message: str
    source: Optional[str] = None

class KioskBase(BaseModel):
    name: str
    post_id: int
    cash_balance: float = Field(default=0.0, ge=0)
    is_active: bool = True

class KioskCreate(KioskBase):
    pass

class KioskUpdate(BaseModel):
    name: Optional[str] = None
    post_id: Optional[int] = None  # Добавляем возможность изменения локации
    cash_balance: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None
    available_service_ids: Optional[List[int]] = None

class KioskOut(KioskBase):
    id: int
    last_maintenance: Optional[str] = None
    class Config:
        from_attributes = True

class KioskTopup(BaseModel):
    amount: float = Field(..., gt=0, description="Сумма для пополнения киоска")

class ServiceCommandRequest(BaseModel):
    action: str = Field(..., description="start_service, stop_service, pause_service")
    service_type: Optional[str] = Field(None, description="water, turbo_water, active_chemistry, etc.")

class HardwareCommandRequest(BaseModel):
    action: str = Field(..., description="Action type")
    bits: str = Field(..., description="8-bit relay control")
    d1: str = Field(default="00", description="Pump/Dimmer 1 power (00-99)")
    d2: str = Field(default="00", description="Pump/Dimmer 2 power (00-99)")
    d3: str = Field(default="00", description="Pump/Dimmer 3 power (00-99)")
    d4: str = Field(default="00", description="Pump/Dimmer 4 power (00-99)")
    freq: str = Field(default="0.0", description="Motor frequency (0-50.0)")
    flag: str = Field(default="S", description="Motor control flag (F=forward, S=stop)")
    priority: Optional[int] = Field(default=1, description="Command priority")

class ServiceStartRequest(BaseModel):
    service_type: str = Field(..., description="Service type from predefined list")

class RfidEventCreate(BaseModel):
    controller_id: str
    card_uid: str
    post_id: int

class CashEventCreate(BaseModel):
    controller_id: str
    post_id: int
    amount: float
    pulse_count: int

class RfidCardStatusUpdate(BaseModel):
    is_active: bool

class ControllerCommandBase(BaseModel):
    controller_id: str
    command_type: str
    command_data: dict
    priority: int = Field(default=0)

class ControllerCommandCreate(ControllerCommandBase):
    pass

class ControllerCommandOut(ControllerCommandBase):
    id: int
    status: str
    created_at: str
    executed_at: Optional[str] = None
    result: Optional[str] = None

    class Config:
        from_attributes = True

class DesktopStatistics(BaseModel):
    active_sessions: int = Field(..., ge=0, description="Количество активных сессий")
    total_cash_today: float = Field(..., ge=0, description="Общая сумма наличных за день")
    total_online_payments_today: float = Field(..., ge=0, description="Общая сумма онлайн платежей за день")
    total_rfid_payments_today: float = Field(..., ge=0, description="Общая сумма оплат по RFID за день")
    rfid_cards_scanned_today: int = Field(..., ge=0, description="Количество сканирований RFID карт за день")
    bill_acceptor_status: str = Field(..., description="Статус купюроприемника")
    online_payment_status: str = Field(..., description="Статус системы онлайн платежей")
    rfid_scanner_status: str = Field(..., description="Статус RFID сканера")
    last_cash_insert: Optional[float] = Field(None, description="Последняя сумма наличных")
    last_online_payment: Optional[float] = Field(None, description="Последний онлайн платеж")
    last_rfid_scan: Optional[str] = Field(None, description="Последний отсканированный UID")
    system_uptime: int = Field(..., ge=0, description="Время работы системы в секундах")
    errors_count: int = Field(..., ge=0, description="Количество ошибок")
    warnings_count: int = Field(..., ge=0, description="Количество предупреждений")
    hardware_status: Dict[str, Any] = Field(..., description="Статус оборудования")

class DesktopStatisticsResponse(BaseModel):
    status: str = "ok"
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    message: str = "Statistics received successfully"
    data: Optional[Dict[str, Any]] = None

class ControllerBase(BaseModel):
    controller_id: str
    name: str
    description: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    is_active: bool = True

class ControllerCreate(ControllerBase):
    pass

class ControllerUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    is_active: Optional[bool] = None

class ControllerOut(ControllerBase):
    id: int
    last_ping: Optional[datetime] = None

    class Config:
        from_attributes = True

class HardwareCommand(BaseModel):
    bits: str
    d1: str = "00"
    d2: str = "00"
    d3: str = "00"
    d4: str = "00"
    freq: str = "0.0"
    flag: str = "S"

    def to_command_string(self) -> str:
        return f"<{self.bits},{self.d1},{self.d2},{self.d3},{self.d4},{self.freq},{self.flag}>"
