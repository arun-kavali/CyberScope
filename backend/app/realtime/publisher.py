import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any
from app.models.evidence import Alert
from app.realtime.manager import manager

logger = logging.getLogger("cyberscope.realtime.publisher")

def format_alert_created_payload(alert: Alert) -> Dict[str, Any]:
    """
    Constructs safe ALERT_CREATED event payload for SOC Analyst clients.
    Excludes passwords, tokens, hashes, and internal secrets.
    """
    timestamp_str = alert.timestamp.isoformat() if isinstance(alert.timestamp, datetime) else str(alert.timestamp)
    created_str = alert.created_at.isoformat() if isinstance(alert.created_at, datetime) else str(alert.created_at)

    return {
        "type": "ALERT_CREATED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "alert_id": str(alert.id),
            "alert_code": alert.alert_code,
            "event_type": alert.event_type,
            "event_category": alert.event_category,
            "severity": alert.severity,
            "status": alert.status,
            "timestamp": timestamp_str,
            "user_context": alert.user_context,
            "asset_context": alert.asset_context,
            "source_ip": alert.source_ip,
            "destination_ip": alert.destination_ip,
            "source_port": alert.source_port,
            "destination_port": alert.destination_port,
            "protocol": alert.protocol,
            "action": alert.action,
            "description": alert.description,
            "indicator": alert.indicator,
            "technique": alert.technique,
            "source_id": str(alert.source_id) if alert.source_id else None,
            "created_at": created_str
        }
    }

async def publish_alert_created_async(alert: Alert) -> None:
    """
    Async helper to format and broadcast ALERT_CREATED event.
    """
    try:
        payload = format_alert_created_payload(alert)
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish ALERT_CREATED event: {e}")

def publish_alert_created(alert: Alert) -> None:
    """
    Synchronous entrypoint called by ingestion pipeline.
    Schedules async broadcast on current event loop if available.
    """
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_alert_created_async(alert))
        else:
            asyncio.run(publish_alert_created_async(alert))
    except RuntimeError:
        # Fallback if no running loop in context
        try:
            asyncio.run(publish_alert_created_async(alert))
        except Exception as e:
            logger.error(f"Error publishing alert event outside loop: {e}")
