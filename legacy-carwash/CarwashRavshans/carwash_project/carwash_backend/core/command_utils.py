from typing import Dict, List

class ServiceManager:

    @staticmethod
    def create_default_services() -> List[Dict]:

        return [
            {
                "name": "Вода",
                "price_per_minute": 2000.0,
                "command_str": "WATER_ON",
                "is_active": True
            },
            {
                "name": "Турбо-вода",
                "price_per_minute": 4000.0,
                "command_str": "TURBO_WATER_ON",
                "is_active": True
            },
            {
                "name": "Активная химия",
                "price_per_minute": 3000.0,
                "command_str": "CHEMISTRY_ON",
                "is_active": True
            },
            {
                "name": "Нано-шампунь",
                "price_per_minute": 3000.0,
                "command_str": "SHAMPOO_ON",
                "is_active": True
            },
            {
                "name": "Воск",
                "price_per_minute": 5000.0,
                "command_str": "WAX_ON",
                "is_active": True
            },
            {
                "name": "Осмос",
                "price_per_minute": 2000.0,
                "command_str": "OSMOSIS_ON",
                "is_active": True
            },
            {
                "name": "Тёплая вода",
                "price_per_minute": 3000.0,
                "command_str": "WARM_WATER_ON",
                "is_active": True
            },
            {
                "name": "Сервис",
                "price_per_minute": 0.0,
                "command_str": "SERVICE_MODE",
                "is_active": True
            },
            {
                "name": "Пауза",
                "price_per_minute": 0.0,
                "command_str": "PAUSE",
                "is_active": True
            }
        ]

class PauseController:

    @staticmethod
    async def execute_pause_sequence():

        import logging

        logger = logging.getLogger(__name__)
        logger.info("Backend: отправка команды паузы на контроллер")

        return {
            "success": True,
            "command": "EXECUTE_PAUSE_PROCEDURE",
            "message": "Pause command sent to controller"
        }

service_manager = ServiceManager()
pause_controller = PauseController()
