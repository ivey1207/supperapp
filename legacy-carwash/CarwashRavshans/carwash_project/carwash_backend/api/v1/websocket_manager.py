from fastapi import WebSocket
from typing import List, Dict, Any
import json

class ConnectionManager:
    def __init__(self):
        self.active_admin_connections: List[WebSocket] = []
        self.active_controller_connections: Dict[int, WebSocket] = {}

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.active_admin_connections.append(websocket)

    def disconnect_admin(self, websocket: WebSocket):
        if websocket in self.active_admin_connections:
            self.active_admin_connections.remove(websocket)

    async def connect_controller(self, websocket: WebSocket, post_id: int):
        await websocket.accept()
        self.active_controller_connections[post_id] = websocket

    def disconnect_controller(self, post_id: int):
        if post_id in self.active_controller_connections:
            del self.active_controller_connections[post_id]

    async def broadcast_to_admins(self, message: str):
        for connection in self.active_admin_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error sending to admin: {e}")

    async def send_command_to_controller(self, post_id: int, command: str):
        if post_id in self.active_controller_connections:
            websocket = self.active_controller_connections[post_id]
            try:
                await websocket.send_text(command)
                print(f"Sent command to post {post_id}: {command}")
            except Exception as e:
                print(f"Error sending to controller {post_id}: {e}")
        else:
            print(f"WARNING: No active controller connection for post {post_id}")

    async def broadcast_rfid_scan(self, data: Dict[str, Any]):
        message = json.dumps({
            "type": "rfid_scan",
            "data": data
        })
        await self.broadcast_to_admins(message)

    async def broadcast_cash_inserted(self, data: Dict[str, Any]):
        message = json.dumps({
            "type": "cash_inserted", 
            "data": data
        })
        await self.broadcast_to_admins(message)

    async def broadcast_message(self, data: Dict[str, Any]):
        message = json.dumps(data)
        await self.broadcast_to_admins(message)

    async def send_to_post(self, post_id: int, message: str):
        await self.send_command_to_controller(post_id, message)

websocket_manager = ConnectionManager()