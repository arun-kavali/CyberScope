import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db
from app.auth.service import validate_session_token
from app.realtime.manager import manager

logger = logging.getLogger("cyberscope.realtime.ws")

router = APIRouter(tags=["Realtime"])

@router.websocket("/ws")
@router.websocket("/ws/")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Authenticated WebSocket endpoint for realtime SOC Analyst alert event stream.
    Validates session token and enforces SOC_ANALYST role access.
    """
    if not token:
        logger.warning("WebSocket connection attempt without token rejected.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication token required")
        return

    db: Session = SessionLocal()
    try:
        profile = validate_session_token(db, token)
        if not profile:
            logger.warning("WebSocket connection attempt with invalid/expired token rejected.")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired session token")
            return

        role_name = profile.role.name if profile.role else ""
        if role_name != "SOC_ANALYST":
            logger.warning(f"WebSocket connection rejected for role '{role_name}'. Required: SOC_ANALYST.")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Role SOC_ANALYST required")
            return

        # Register connection in ConnectionManager
        user_id = str(profile.id)
        username = profile.username
        await manager.connect(websocket, user_id=user_id, username=username, role=role_name)

        # Keep socket open and process incoming messages (read-only event stream)
        try:
            while True:
                data = await websocket.receive_text()
                # Server-to-client read-only stream: Client commands are ignored or acknowledged safely
                logger.debug(f"Received ping/message from client '{username}': {data}")
        except WebSocketDisconnect:
            await manager.disconnect(websocket)
        except Exception as e:
            logger.error(f"WebSocket client exception: {e}")
            await manager.disconnect(websocket)
    finally:
        db.close()
