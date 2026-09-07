import asyncio
import logging
from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket

logger = logging.getLogger("cyberscope.realtime")

class ConnectionManager:
    """
    Thread-safe & async connection manager for managing active WebSocket clients,
    tracking connection roles, and broadcasting events safely.
    """
    def __init__(self):
        # Maps websocket connection -> dict metadata (user_id, username, role)
        self.active_connections: Dict[WebSocket, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: str, username: str, role: str):
        await websocket.accept()
        async with self._lock:
            self.active_connections[websocket] = {
                "user_id": user_id,
                "username": username,
                "role": role
            }
        logger.info(f"WebSocket client connected: user='{username}', role='{role}'. Total active: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                info = self.active_connections.pop(websocket)
                logger.info(f"WebSocket client disconnected: user='{info.get('username')}'. Remaining active: {len(self.active_connections)}")

    async def broadcast_to_role(self, message: Dict[str, Any], target_role: str):
        """
        Broadcasts JSON event payload to all connected clients possessing target_role.
        Automatically cleans up broken or closed connections.
        """
        async with self._lock:
            target_websockets = [
                ws for ws, info in self.active_connections.items()
                if info.get("role") == target_role
            ]

        if not target_websockets:
            return

        disconnected_sockets: List[WebSocket] = []
        for ws in target_websockets:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Error broadcasting to WebSocket client: {e}")
                disconnected_sockets.append(ws)

        if disconnected_sockets:
            async with self._lock:
                for ws in disconnected_sockets:
                    if ws in self.active_connections:
                        self.active_connections.pop(ws, None)

manager = ConnectionManager()
