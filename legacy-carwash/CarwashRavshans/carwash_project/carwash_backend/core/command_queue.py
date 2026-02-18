from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from carwash_backend.db import models

class CommandQueue:
    async def finish_pending_commands(self, db: AsyncSession, controller_id: str):

        from datetime import datetime, timezone
        from sqlalchemy import update
        await db.execute(
            update(models.ControllerCommand)
            .where(
                models.ControllerCommand.controller_id == controller_id,
                models.ControllerCommand.status == "pending"
            )
            .values(status="executed", executed_at=datetime.now(timezone.utc))
        )
        await db.commit()

    async def mark_command_executed(self, db: AsyncSession, command_id: int, execution_result: str = "success") -> bool:
        command = await db.get(models.ControllerCommand, command_id)
        if not command:
            return False
        command.status = "executed"
        command.result = execution_result
        command.executed_at = datetime.now(timezone.utc)
        await db.commit()
        return True

    async def mark_command_failed(self, db: AsyncSession, command_id: int, error_message: str = "error") -> bool:
        command = await db.get(models.ControllerCommand, command_id)
        if not command:
            return False
        command.status = "failed"
        command.result = error_message
        command.executed_at = datetime.now(timezone.utc)
        await db.commit()
        return True

    async def update_controller_heartbeat(
        self,
        db: AsyncSession,
        controller_id: str,
        status_data: Dict[str, Any]
    ):

        now = datetime.now(timezone.utc)

        result = await db.execute(
            select(models.Controller).filter(models.Controller.controller_id == controller_id)
        )
        controller = result.scalar_one_or_none()

        if not controller:

            controller = models.Controller(
                controller_id=controller_id,
                name=f"Controller {controller_id}",
                is_active=True,
                last_ping=now
            )
            db.add(controller)
        else:

            controller.last_ping = now
            controller.is_active = True

        await db.commit()

    async def get_pending_commands(
        self,
        db: AsyncSession,
        controller_id: str
    ) -> List[models.ControllerCommand]:

        result = await db.execute(
            select(models.ControllerCommand)
            .filter(
                models.ControllerCommand.controller_id == controller_id,
                models.ControllerCommand.status == "pending"
            )
            .order_by(
                models.ControllerCommand.priority.desc(),
                models.ControllerCommand.created_at
            )
            .limit(10)
        )
        return list(result.scalars().all())

    async def create_command(
        self,
        db: AsyncSession,
        controller_id: str,
        command_type: str,
        command_str: str,
        priority: int = 1
    ) -> models.ControllerCommand:

        command = models.ControllerCommand(
            controller_id=controller_id,
            command_type=command_type,
            command_str=command_str,
            priority=priority,
            status="pending"
        )
        db.add(command)
        await db.commit()
        await db.refresh(command)
        return command

    async def update_command_status(
        self,
        db: AsyncSession,
        command_id: int,
        status: str,
        result: Optional[str] = None
    ):

        command = await db.get(models.ControllerCommand, command_id)
        if command:
            command.status = status
            command.result = result
            if status in ["executed", "failed"]:
                command.executed_at = datetime.now(timezone.utc)
            await db.commit()

    async def create_service_commands(self, db: AsyncSession = None) -> Dict[str, Dict]:

        if not db:

            return self._get_default_service_commands()

        try:

            from carwash_backend.db import repository
            services = await repository.get_services(db, limit=100)

            service_commands = {}
            for service in services:
                if service.is_active:

                    service_commands[service.command_str or f"service_{service.id}"] = {
                        "name": service.name,
                        "bits": service.relay_bits or "00000000",
                        "d1": service.pump1_power or 0,
                        "d2": service.pump2_power or 0,
                        "d3": service.pump3_power or 0,
                        "d4": service.pump4_power or 0,
                        "freq": service.motor_frequency or 0.0,
                        "flag": service.motor_flag or "S",
                        "price_per_minute": service.price_per_minute,
                        "service_id": service.id
                    }

            return service_commands

        except Exception as e:

            import logging
            logging.getLogger(__name__).error(f"Error loading service commands from DB: {e}")
            return self._get_default_service_commands()

    def _get_default_service_commands(self) -> Dict[str, Dict]:

        return {
            "WATER_ON": {
                "name": "Вода",
                "bits": "00000001",
                "d1": 50,
                "d2": 0,
                "d3": 0,
                "d4": 0,
                "freq": 25.0,
                "flag": "F",
                "price_per_minute": 2000.0
            },
            "TURBO_WATER_ON": {
                "name": "Турбо-вода",
                "bits": "00000011",
                "d1": 80,
                "d2": 0,
                "d3": 0,
                "d4": 0,
                "freq": 40.0,
                "flag": "F",
                "price_per_minute": 4000.0
            },
            "CHEMISTRY_ON": {
                "name": "Активная химия",
                "bits": "00000101",
                "d1": 60,
                "d2": 40,
                "d3": 0,
                "d4": 0,
                "freq": 30.0,
                "flag": "F",
                "price_per_minute": 3000.0
            },
            "WAX_ON": {
                "name": "Воск",
                "bits": "00001001",
                "d1": 0,
                "d2": 0,
                "d3": 70,
                "d4": 0,
                "freq": 20.0,
                "flag": "F",
                "price_per_minute": 5000.0
            },
            "OSMOSIS_ON": {
                "name": "Осмос",
                "bits": "00010001",
                "d1": 40,
                "d2": 0,
                "d3": 0,
                "d4": 60,
                "freq": 15.0,
                "flag": "F",
                "price_per_minute": 2000.0
            }
        }

command_queue = CommandQueue()
