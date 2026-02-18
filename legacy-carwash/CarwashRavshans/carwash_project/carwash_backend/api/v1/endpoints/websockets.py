from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from carwash_backend.api.v1.websocket_manager import websocket_manager
from carwash_backend.api.v1.dependencies import get_current_admin
from carwash_backend.db.models import Admin

router = APIRouter()

@router.websocket("/ws/admin")
async def websocket_admin_endpoint(
    websocket: WebSocket,
):
    await websocket_manager.connect_admin(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect_admin(websocket)

@router.websocket("/ws/controller/{post_id}")
async def websocket_controller_endpoint(websocket: WebSocket, post_id: int):
    await websocket_manager.connect_controller(websocket, post_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect_controller(post_id)