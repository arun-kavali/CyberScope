import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_

from app.models.evidence import Alert, Asset, UserDirectory
from app.models.sources import AlertSource
from app.models.intelligence import ThreatIndicator

logger = logging.getLogger("cyberscope.enrichment")

def enrich_alert_context(db: Session, alert: Alert) -> Dict[str, Any]:
    """
    Performs local context enrichment for an ingested alert.
    Retrieves Asset context, User context, Source context, bounded historical stats,
    and local ThreatIndicator matches from PostgreSQL.
    """
    enrichment: Dict[str, Any] = {
        "asset": {"context_available": False},
        "user": {"context_available": False},
        "source": {"context_available": False},
        "history": {},
        "threat_indicator": {"matched": False}
    }

    # 1. Asset Context Enrichment
    try:
        asset_obj: Optional[Asset] = None
        if alert.asset_id:
            asset_obj = db.scalar(select(Asset).where(Asset.id == alert.asset_id))
        elif alert.asset_context:
            asset_str = str(alert.asset_context).strip()
            stmt = select(Asset).where(
                (Asset.name == asset_str) |
                (Asset.hostname == asset_str) |
                (Asset.ip_address == asset_str) |
                (Asset.asset_id_code == asset_str)
            )
            asset_obj = db.scalar(stmt)

        if asset_obj:
            enrichment["asset"] = {
                "context_available": True,
                "asset_id": str(asset_obj.id),
                "asset_code": asset_obj.asset_id_code,
                "name": asset_obj.name,
                "type": asset_obj.type,
                "criticality": asset_obj.criticality,
                "ip_address": asset_obj.ip_address,
                "hostname": asset_obj.hostname,
                "status": asset_obj.status
            }
        else:
            enrichment["asset"] = {
                "context_available": False,
                "reason": f"No asset record found matching '{alert.asset_context}'" if alert.asset_context else "No asset context provided in alert"
            }
    except Exception as e:
        logger.warning(f"Asset enrichment error: {e}")
        enrichment["asset"] = {"context_available": False, "reason": str(e)}

    # 2. User Context Enrichment
    try:
        user_obj: Optional[UserDirectory] = None
        if alert.user_id:
            user_obj = db.scalar(select(UserDirectory).where(UserDirectory.id == alert.user_id))
        elif alert.user_context:
            user_str = str(alert.user_context).strip()
            stmt = select(UserDirectory).where(
                (UserDirectory.user_id_code == user_str) |
                (UserDirectory.email == user_str) |
                (UserDirectory.name == user_str)
            )
            user_obj = db.scalar(stmt)

        if user_obj:
            is_priv = any(kw in (user_obj.name or "").lower() for kw in ["admin", "root", "sec"]) or \
                      any(kw in (user_obj.user_id_code or "").lower() for kw in ["admin", "root"]) or \
                      any(kw in (user_obj.email or "").lower() for kw in ["admin", "root", "sec"]) or \
                      (user_obj.department or "") in ["IT Security", "IT Administration", "Executive"]
            enrichment["user"] = {
                "context_available": True,
                "user_id": str(user_obj.id),
                "user_code": user_obj.user_id_code,
                "name": user_obj.name,
                "email": user_obj.email,
                "username": user_obj.user_id_code or user_obj.name,
                "department": user_obj.department,
                "is_privileged": is_priv,
                "status": user_obj.status
            }
        else:
            enrichment["user"] = {
                "context_available": False,
                "reason": f"No user directory record found matching '{alert.user_context}'" if alert.user_context else "No user context provided in alert"
            }
    except Exception as e:
        logger.warning(f"User enrichment error: {e}")
        enrichment["user"] = {"context_available": False, "reason": str(e)}

    # 3. Source Context Enrichment
    try:
        if alert.source_id:
            source_obj = db.scalar(select(AlertSource).where(AlertSource.id == alert.source_id))
            if source_obj:
                enrichment["source"] = {
                    "context_available": True,
                    "source_id": str(source_obj.id),
                    "name": source_obj.name,
                    "type": source_obj.source_type,
                    "status": source_obj.status
                }
    except Exception as e:
        logger.warning(f"Source enrichment error: {e}")

    # 4. Historical Context (Bounded 24-hour window before alert timestamp)
    try:
        window_start = alert.timestamp - timedelta(hours=24)
        window_end = alert.timestamp

        user_history_count = 0
        if alert.user_context:
            stmt_user = select(func.count(Alert.id)).where(
                Alert.user_context == alert.user_context,
                Alert.timestamp >= window_start,
                Alert.timestamp <= window_end,
                Alert.id != alert.id
            )
            user_history_count = db.scalar(stmt_user) or 0

        asset_history_count = 0
        if alert.asset_context:
            stmt_asset = select(func.count(Alert.id)).where(
                Alert.asset_context == alert.asset_context,
                Alert.timestamp >= window_start,
                Alert.timestamp <= window_end,
                Alert.id != alert.id
            )
            asset_history_count = db.scalar(stmt_asset) or 0

        source_ip_count = 0
        if alert.source_ip:
            stmt_ip = select(func.count(Alert.id)).where(
                Alert.source_ip == alert.source_ip,
                Alert.timestamp >= window_start,
                Alert.timestamp <= window_end,
                Alert.id != alert.id
            )
            source_ip_count = db.scalar(stmt_ip) or 0

        event_type_count = 0
        stmt_type = select(func.count(Alert.id)).where(
            Alert.event_type == alert.event_type,
            Alert.timestamp >= window_start,
            Alert.timestamp <= window_end,
            Alert.id != alert.id
        )
        event_type_count = db.scalar(stmt_type) or 0

        enrichment["history"] = {
            "window_hours": 24,
            "user_alerts_24h": user_history_count,
            "asset_alerts_24h": asset_history_count,
            "source_ip_alerts_24h": source_ip_count,
            "event_type_alerts_24h": event_type_count
        }
    except Exception as e:
        logger.warning(f"Historical enrichment error: {e}")
        enrichment["history"] = {"window_hours": 24, "user_alerts_24h": 0, "asset_alerts_24h": 0, "source_ip_alerts_24h": 0, "event_type_alerts_24h": 0}

    # 5. Local Threat Indicator Context Match
    try:
        indicator_val = alert.indicator or alert.source_ip or alert.destination_ip
        if indicator_val:
            ind_stmt = select(ThreatIndicator).where(ThreatIndicator.value == str(indicator_val).strip())
            ind_obj = db.scalar(ind_stmt)
            if ind_obj:
                enrichment["threat_indicator"] = {
                    "matched": True,
                    "indicator_id": str(ind_obj.id),
                    "type": ind_obj.indicator_type,
                    "value": ind_obj.value,
                    "threat_actor": ind_obj.threat_actor,
                    "confidence": ind_obj.confidence,
                    "metadata": ind_obj.metadata_info
                }
    except Exception as e:
        logger.warning(f"Threat indicator enrichment error: {e}")

    return enrichment
