import yaml
import os
from pydantic import BaseModel
from pathlib import Path
from typing import Dict, Any, Optional

CONFIG_FILE_PATH = Path(__file__).parent.parent.parent / "config.yaml"
DATABASE_FILE_PATH = Path(__file__).parent.parent.parent / "carwash.db"

class DBSettings(BaseModel):
    url: str = f"sqlite+aiosqlite:///{DATABASE_FILE_PATH}"
    echo: bool = True

class PaymentGatewaySettings(BaseModel):
    click_merchant_id: str = ""
    click_service_id: str = ""
    click_secret_key: str = ""
    payme_merchant_id: str = ""
    payme_secret_key: str = ""
    uzum_merchant_id: str = ""
    uzum_secret_key: str = ""

class NetworkSettings(BaseModel):
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    base_url: str = "http://localhost:8000"

class LoggingSettings(BaseModel):
    level: str = "INFO"
    log_file_path: str = "carwash.log"
    max_log_size: int = 10485760
    backup_count: int = 5

class LoyaltySettings(BaseModel):
    enabled: bool = True
    max_credit: int = 1000000

class Settings(BaseModel):
    db: DBSettings = DBSettings()
    payment_gateways: PaymentGatewaySettings = PaymentGatewaySettings()
    network: NetworkSettings = NetworkSettings()
    logging: LoggingSettings = LoggingSettings()
    loyalty: LoyaltySettings = LoyaltySettings()

def load_config() -> dict:

    try:
        with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        print(f"Конфигурационный файл {CONFIG_FILE_PATH} не найден")
        return {}
    except Exception as e:
        print(f"Ошибка загрузки конфигурации: {e}")
        return {}

def get_config_value(key_path: str, default: Any = None) -> Any:

    config = load_config()
    keys = key_path.split('.')
    value = config

    try:
        for key in keys:
            value = value[key]
        return value
    except (KeyError, TypeError):
        return default

config_data = load_config()
settings = Settings()

if config_data:
    if 'payment_gateways' in config_data:
        pg = config_data['payment_gateways']
        if 'click' in pg:
            settings.payment_gateways.click_merchant_id = pg['click'].get('merchant_id', '')
            settings.payment_gateways.click_service_id = pg['click'].get('service_id', '')
            settings.payment_gateways.click_secret_key = pg['click'].get('secret_key', '')
        if 'payme' in pg:
            settings.payment_gateways.payme_merchant_id = pg['payme'].get('merchant_id', '')
            settings.payment_gateways.payme_secret_key = pg['payme'].get('secret_key', '')
        if 'uzum' in pg:
            settings.payment_gateways.uzum_merchant_id = pg['uzum'].get('merchant_id', '')
            settings.payment_gateways.uzum_secret_key = pg['uzum'].get('secret_key', '')

    if 'network' in config_data:
        net = config_data['network']
        settings.network.api_host = net.get('api_host', '0.0.0.0')
        settings.network.api_port = net.get('api_port', 8000)
        settings.network.base_url = net.get('base_url', 'http://localhost:8000')

    if 'logging' in config_data:
        log = config_data['logging']
        settings.logging.level = log.get('level', 'INFO')
        settings.logging.log_file_path = log.get('log_file_path', 'carwash.log')

    if 'loyalty' in config_data:
        loyalty = config_data['loyalty']
        settings.loyalty.enabled = loyalty.get('enabled', True)
        settings.loyalty.max_credit = loyalty.get('max_credit', 1000000)

def get_settings() -> Settings:
    return settings
