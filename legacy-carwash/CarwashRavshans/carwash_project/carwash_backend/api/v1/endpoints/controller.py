from fastapi import Body

from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from carwash_backend.db import schemas, repository
from carwash_backend.db.database import get_db
from carwash_backend.core.session_manager import session_manager
from carwash_backend.core.config import settings
from carwash_backend.api.v1.websocket_manager import websocket_manager
from carwash_backend.core.command_queue import command_queue

router = APIRouter()

API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)
CONTROLLER_API_KEY = "super_secret_controller_key"

async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key == CONTROLLER_API_KEY:
        return api_key
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

@router.post("/rfid/update-balance", summary="Update RFID Card Balance")
async def update_rfid_balance(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(get_api_key)
):

    uid = payload.get("uid")
    balance = payload.get("balance")
    if not uid:
        raise HTTPException(status_code=400, detail="UID is required")
    if balance is None:
        raise HTTPException(status_code=400, detail="Balance is required")

    rfid_card = await repository.get_rfid_card_by_uid(db, uid)
    if not rfid_card:
        raise HTTPException(status_code=404, detail=f"RFID card with UID {uid} not found")

    rfid_card.balance = balance
    await db.commit()
    return {"status": "ok", "uid": uid, "new_balance": balance}

@router.post("/events", summary="Receive Events from a Controller")
async def receive_controller_event(
    event: schemas.ControllerEvent,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(get_api_key)
):

    try:
        print(f"📥 Получено событие: {event.event_type} для поста {event.post_id}")

        if event.event_type == "rfid_scanned":
            uid = event.data.uid
            if not uid:
                raise HTTPException(status_code=400, detail="UID is required for rfid_scanned event")
            print(f"🔍 RFID сканирование: UID={uid}")

            rfid_card = await repository.get_rfid_card_by_uid(db, uid)
            if not rfid_card:
                raise HTTPException(status_code=404, detail=f"RFID card with UID {uid} not found")

            session = await session_manager.get_session_for_post(event.post_id, db)
            if not session:
                session = await session_manager.start_session_for_post(event.post_id, db)

            if rfid_card.balance > 0:
                card_balance = rfid_card.balance
                print(f"💳 Переводим {card_balance} сум с карты {uid} в сессию")

                await session_manager.spend_from_card_to_session(
                    post_id=event.post_id,
                    card=rfid_card,
                    amount=card_balance,
                    db=db
                )

                print(f"✅ Баланс карты {uid}: {card_balance} → 0, сессия: +{card_balance}")

            await websocket_manager.broadcast_rfid_scan({
                "uid": uid,
                "status": "scanned",
                "balance": rfid_card.balance,
                "post_id": event.post_id,
                "transferred_to_session": rfid_card.balance if rfid_card.balance > 0 else 0,
                "message": f"RFID card {uid} scanned at post {event.post_id}"
            })

        elif event.event_type == "mode_selected" or event.event_type == "service_button_pressed":
            service_id = event.data.service_id

            if service_id is None or service_id == "pause" or service_id == "PAUSE":
                await session_manager.set_service_for_session(event.post_id, None, db)
                print(f"⏸️ Сессия на посту {event.post_id} поставлена на паузу")

                from carwash_backend.core.hardware_commands import get_pause_command
                pause_cmd = get_pause_command()
                frame = pause_cmd.to_command_string()
                rs485_command = {
                    "command_type": "pause_service",
                    "service_id": None,
                    "service_name": "Пауза",
                    "command_str": "PAUSE",
                    "post_id": event.post_id,
                    "frame": frame
                }

                await websocket_manager.broadcast_message({
                    "type": "rs485_command",
                    "post_id": event.post_id,
                    "command": rs485_command,
                    "message": f"Пауза на посту {event.post_id}",
                    "timestamp": datetime.now().isoformat()
                })

                post = await repository.get_post(db, event.post_id)
                if not post or not post.controller_id:
                    print(f"ERROR: Post {event.post_id} не найден или не привязан к контроллеру!")
                    raise HTTPException(status_code=404, detail=f"Post {event.post_id} not found or not linked to controller")
                try:
                    await command_queue.finish_pending_commands(db, post.controller_id)
                    import json
                    cmd = await command_queue.create_command(
                        db=db,
                        controller_id=post.controller_id,
                        command_type="pause_service",
                        command_str=json.dumps(rs485_command),
                        priority=1
                    )
                    print(f"DEBUG: Pause command created: {cmd}")
                except Exception as e:
                    print(f"ERROR: Failed to create Pause ControllerCommand: {e}")
                return {"status": "ok", "message": "Pause command queued"}
            print(f"🎯 Выбран режим: service_id={service_id}")

            service = await repository.get_service(db, service_id)
            if not service:
                raise HTTPException(status_code=404, detail=f"Service {service_id} not found")

            success = await session_manager.set_service_for_session(event.post_id, service_id, db)
            if not success:

                print(f"⚠️ Нет активной сессии для поста {event.post_id}, создаем новую")
                session = await session_manager.start_session_for_post(event.post_id, db)
                success = await session_manager.set_service_for_session(event.post_id, service_id, db)
                if not success:
                    raise HTTPException(status_code=500, detail=f"Failed to set service for post {event.post_id}")

            from carwash_backend.core.hardware_commands import service_to_hardware_command
            hw_command = service_to_hardware_command(service)
            frame = hw_command.to_command_string()

            rs485_command = {
                "command_type": "start_service",
                "service_id": service_id,
                "service_name": service.name,
                "command_str": service.command_str,
                "post_id": event.post_id,
                "price_per_minute": service.price_per_minute,
                "frame": frame,
                "command_format": "<BITS,D1,D2,D3,D4,FREQ,FLAG>"
            }

            await websocket_manager.broadcast_message({
                "type": "rs485_command",
                "post_id": event.post_id,
                "command": rs485_command,
                "message": f"Запуск сервиса '{service.name}' на посту {event.post_id}",
                "timestamp": datetime.now().isoformat()
            })

            print(f"📡 RS485 команда отправлена: {service.command_str} для сервиса '{service.name}'")

            post = await repository.get_post(db, event.post_id)
            if not post:
                print(f"ERROR: Post {event.post_id} не найден!")
                raise HTTPException(status_code=404, detail=f"Post {event.post_id} not found")
            if not post.controller_id:
                print(f"ERROR: У поста {event.post_id} нет controller_id!")
                raise HTTPException(status_code=400, detail=f"Post {event.post_id} is not linked to any controller")

            try:

                await command_queue.finish_pending_commands(db, post.controller_id)
                print(f"DEBUG: Creating command for controller_id={post.controller_id}, command_type='start_service', command_str={service.command_str}")
                import json
                cmd = await command_queue.create_command(
                    db=db,
                    controller_id=post.controller_id,
                    command_type="start_service",
                    command_str=json.dumps(rs485_command),
                    priority=1
                )
                print(f"DEBUG: Command created: {cmd}")
            except Exception as e:
                print(f"ERROR: Failed to create ControllerCommand: {e}")

        elif event.event_type == "session_finished_by_user":
            print(f"🏁 Завершение сессии для поста {event.post_id}")
            await session_manager.stop_session_for_post(
                post_id=event.post_id,
                db=db
            )

            from carwash_backend.core.hardware_commands import get_pause_command
            pause_cmd = get_pause_command()
            frame = pause_cmd.to_command_string()
            rs485_command = {
                "command_type": "pause_service",
                "service_id": None,
                "service_name": "Пауза",
                "command_str": "PAUSE",
                "post_id": event.post_id,
                "frame": frame
            }

            await websocket_manager.broadcast_message({
                "type": "rs485_command",
                "post_id": event.post_id,
                "command": rs485_command,
                "message": f"Пауза (finish) на посту {event.post_id}",
                "timestamp": datetime.now().isoformat()
            })

            post = await repository.get_post(db, event.post_id)
            if post and post.controller_id:
                try:
                    await command_queue.finish_pending_commands(db, post.controller_id)
                    import json
                    cmd = await command_queue.create_command(
                        db=db,
                        controller_id=post.controller_id,
                        command_type="pause_service",
                        command_str=json.dumps(rs485_command),
                        priority=1
                    )
                    print(f"DEBUG: Pause command (finish) created: {cmd}")
                except Exception as e:
                    print(f"ERROR: Failed to create Pause ControllerCommand (finish): {e}")

        elif event.event_type == "cash_inserted":

            amount = event.data.amount or 0.0
            print(f"💰 Cash inserted: {amount} сум на посту {event.post_id}")

            await websocket_manager.broadcast_cash_inserted({
                "post_id": event.post_id,
                "amount": amount,
                "timestamp": datetime.now().isoformat(),
                "message": f"Получена купюра на сумму {amount} сум"
            })

            session = await session_manager.get_session_for_post(event.post_id, db)
            if session:
                session.cash_balance += amount
                await repository.update_session_cash_balance(db, session.id, session.cash_balance)
                print(f"💰 Добавлено {amount} к сессии {session.id}, новый баланс: {session.cash_balance}")
            else:
                print(f"⚠️ Нет активной сессии для поста {event.post_id}, cash_inserted игнорируется")

        else:

            service = await repository.get_service_by_command_str(db, event.event_type)
            if service:

                success = await session_manager.set_service_for_session(event.post_id, service.id, db)
                if not success:
                    session = await session_manager.start_session_for_post(event.post_id, db)
                    success = await session_manager.set_service_for_session(event.post_id, service.id, db)

                from carwash_backend.core.hardware_commands import service_to_hardware_command
                hw_command = service_to_hardware_command(service)
                frame = hw_command.to_command_string()

                rs485_command = {
                    "command_type": "start_service",
                    "service_id": service.id,
                    "service_name": service.name,
                    "command_str": service.command_str,
                    "post_id": event.post_id,
                    "price_per_minute": service.price_per_minute,
                    "frame": frame,
                    "command_format": "<BITS,D1,D2,D3,D4,FREQ,FLAG>"
                }
                await websocket_manager.broadcast_message({
                    "type": "rs485_command",
                    "post_id": event.post_id,
                    "command": rs485_command,
                    "message": f"Запуск сервиса '{service.name}' (event_type: {event.event_type}) на посту {event.post_id}",
                    "timestamp": datetime.now().isoformat()
                })
                print(f"📡 RS485 команда отправлена: {service.command_str} для сервиса '{service.name}' (event_type: {event.event_type})")

                post = await repository.get_post(db, event.post_id)
                if post and post.controller_id:
                    await command_queue.finish_pending_commands(db, post.controller_id)
                    try:
                        import json
                        cmd = await command_queue.create_command(
                            db=db,
                            controller_id=post.controller_id,
                            command_type="start_service",
                            command_str=json.dumps(rs485_command),
                            priority=1
                        )
                        print(f"DEBUG: Command created: {cmd}")
                    except Exception as e:
                        print(f"ERROR: Failed to create ControllerCommand: {e}")

            elif event.event_type == "payment":
                print(f"💵 Обработка события оплаты для поста {event.post_id}")
                return {"status": "ok", "message": "Payment processed"}
            else:
                raise HTTPException(status_code=400, detail=f"Unknown event type: {event.event_type}")
        return {"status": "ok", "message": "Event processed"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка обработки события: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/posts/{post_id}/pause", summary="Pause Active Session")
async def pause_post_session(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(get_api_key)
):

    from carwash_backend.core.command_utils import pause_controller

    result = await pause_controller.execute_pause_sequence()

    await session_manager.set_active_service_for_post(
        post_id=post_id,
        service_id=None
    )

    return {
        "status": "ok",
        "message": "Session paused",
        "pause_result": result
    }

@router.post("/posts/{post_id}/resume", summary="Resume Paused Session")
async def resume_post_session(
    post_id: int,
    service_data: schemas.ServiceSelectionRequest,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(get_api_key)
):

    await session_manager.set_active_service_for_post(
        post_id=post_id,
        service_id=service_data.service_id
    )

    return {
        "status": "ok",
        "message": f"Session resumed with service {service_data.service_id}"
    }

@router.get("/services/available", summary="Get Available Services")
async def get_available_services(
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(get_api_key)
):

    services = await repository.get_services(db, limit=100)
    return {
        "services": [
            {
                "id": service.id,
                "name": service.name,
                "price_per_minute": service.price_per_minute,
                "command_str": service.command_str,
                "is_active": service.is_active
            }
            for service in services if service.is_active
        ]
    }

@router.post("/heartbeat/{controller_id}", summary="Controller Heartbeat & Command Polling")
async def controller_heartbeat(
    controller_id: str,
    status_data: dict = None,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(get_api_key)
):

    await command_queue.update_controller_heartbeat(db, controller_id, status_data)

    pending_commands = await command_queue.get_pending_commands(db, controller_id)
    import json
    commands_response = []

    pause_cmd = None
    latest_cmd = None
    for cmd in pending_commands:
        if cmd.command_type == "pause_service":
            pause_cmd = cmd
        if (not latest_cmd) or (cmd.created_at > latest_cmd.created_at):
            latest_cmd = cmd
    selected_cmd = pause_cmd if pause_cmd else latest_cmd
    if selected_cmd and selected_cmd.command_str:
        try:
            command_data = json.loads(selected_cmd.command_str) if isinstance(selected_cmd.command_str, str) else selected_cmd.command_str
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Invalid command_str for command id={selected_cmd.id}: {selected_cmd.command_str}, error: {e}")
            command_data = {}
        command_response = {
            "id": selected_cmd.id,
            "type": selected_cmd.command_type,
            "command_type": selected_cmd.command_type,
            "action": command_data.get("action"),
            "post_id": command_data.get("post_id"),
            "command_format": command_data.get("command_format"),
            "frame": command_data.get("frame"),
            "priority": selected_cmd.priority,
            "created_at": selected_cmd.created_at.isoformat()
        }

        if selected_cmd.command_type == "kiosk_topup":
            command_response.update({
                "kiosk_id": command_data.get("kiosk_id"),
                "kiosk_name": command_data.get("kiosk_name"),
                "amount": command_data.get("amount"),
                "cash_from_admin": command_data.get("cash_from_admin"),
                "timestamp": command_data.get("timestamp")
            })

        elif selected_cmd.command_type == "payment_received":
            command_response.update({
                "payment_amount": command_data.get("payment_amount"),
                "payment_type": command_data.get("payment_type", "online"),
                "service_name": command_data.get("service_name"),
                "service_cost": command_data.get("service_cost")
            })
        commands_response.append(command_response)
    return {
        "status": "ok",
        "controller_id": controller_id,
        "commands": commands_response,
        "server_time": datetime.now().isoformat()
    }

@router.post("/command/{command_id}/executed", summary="Mark Command as Executed")
async def mark_command_executed(
    command_id: int,
    execution_result: str = "success",
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(get_api_key)
):

    success = await command_queue.mark_command_executed(db, command_id, execution_result)
    if not success:
        raise HTTPException(status_code=404, detail="Command not found")
    return {"status": "ok", "message": "Command marked as executed"}

@router.post("/command/{command_id}/failed", summary="Mark Command as Failed")
async def mark_command_failed(
    command_id: int,
    error_message: str,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(get_api_key)
):

    success = await command_queue.mark_command_failed(db, command_id, error_message)
    if not success:
        raise HTTPException(status_code=404, detail="Command not found")
    return {"status": "ok", "message": "Command marked as failed"}

@router.post("/posts/{post_id}/send-command", summary="Send Command to Post (Desktop App)")
async def send_command_to_post(
    post_id: int,
    command_request: schemas.ServiceCommandRequest,
    db: AsyncSession = Depends(get_db)
):

    post = await repository.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if not post.controller:
        raise HTTPException(status_code=400, detail="No controller assigned to this post")

    service_configs = await command_queue.create_service_commands(db)

    if command_request.action == "start_service":
        service_config = service_configs.get(command_request.service_type)
        if not service_config:
            raise HTTPException(status_code=400, detail="Unknown service type")

        command = await command_queue.add_service_command(
            db=db,
            controller_id=post.controller.id,
            service_type=command_request.service_type,
            service_config=service_config,
            post_id=post_id
        )

        return {
            "status": "success",
            "message": f"Service {service_config['name']} queued for post {post_id}",
            "command_id": command.id,
            "command_format": f"<{service_config['bits']},{service_config['d1']},{service_config['d2']},{service_config['d3']},{service_config['d4']},{service_config['freq']},{service_config['flag']}>"
        }

    elif command_request.action == "stop_service":
        command = await command_queue.add_stop_command(
            db=db,
            controller_id=post.controller.id,
            post_id=post_id
        )

        return {
            "status": "success",
            "message": f"Stop command queued for post {post_id}",
            "command_id": command.id
        }

    elif command_request.action == "pause_service":
        command = await command_queue.add_pause_command(
            db=db,
            controller_id=post.controller.id,
            post_id=post_id
        )

        return {
            "status": "success",
            "message": f"Pause command queued for post {post_id}",
            "command_id": command.id
        }

    else:
        raise HTTPException(status_code=400, detail="Unknown action")

@router.get("/services/commands", summary="Get Service Commands Configuration")
async def get_service_commands(db: AsyncSession = Depends(get_db)):

    services = await command_queue.create_service_commands(db)

    return {
        "services": services,
        "total_count": len(services),
        "command_format": "Формат: <BITS,D1,D2,D3,D4,FREQ,FLAG>"
    }
