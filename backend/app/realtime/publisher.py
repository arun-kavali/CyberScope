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

def format_analysis_completed_payload(analysis: Any, alert: Alert) -> Dict[str, Any]:
    findings = analysis.findings or {}
    return {
        "type": "ANALYSIS_COMPLETED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "analysis_id": str(analysis.id),
            "alert_id": str(alert.id),
            "alert_code": alert.alert_code,
            "status": findings.get("triage_status", "COMPLETED"),
            "summary": analysis.summary,
            "triggered_rules_count": findings.get("triggered_rules_count", 0),
            "created_at": analysis.created_at.isoformat() if isinstance(analysis.created_at, datetime) else str(analysis.created_at)
        }
    }

async def publish_analysis_completed_async(analysis: Any, alert: Alert) -> None:
    try:
        payload = format_analysis_completed_payload(analysis, alert)
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish ANALYSIS_COMPLETED event: {e}")

def publish_analysis_completed(analysis: Any, alert: Alert) -> None:
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_analysis_completed_async(analysis, alert))
        else:
            asyncio.run(publish_analysis_completed_async(analysis, alert))
    except RuntimeError:
        try:
            asyncio.run(publish_analysis_completed_async(analysis, alert))
        except Exception as e:
            logger.error(f"Error publishing analysis event outside loop: {e}")

def format_scores_completed_payload(risk_score: Any, alert: Alert) -> Dict[str, Any]:
    return {
        "type": "SCORES_COMPLETED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "risk_score_id": str(risk_score.id),
            "alert_id": str(alert.id),
            "alert_code": alert.alert_code,
            "risk_score": float(risk_score.score),
            "confidence": float(risk_score.confidence),
            "false_positive_likelihood": float(risk_score.false_positive_likelihood),
            "version": risk_score.version,
            "status": "COMPLETED",
            "timestamp": risk_score.timestamp.isoformat() if isinstance(risk_record_ts := getattr(risk_score, "timestamp", None), datetime) else str(risk_record_ts)
        }
    }

async def publish_scores_completed_async(risk_score: Any, alert: Alert) -> None:
    try:
        payload = format_scores_completed_payload(risk_score, alert)
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish SCORES_COMPLETED event: {e}")

def publish_scores_completed(risk_score: Any, alert: Alert) -> None:
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_scores_completed_async(risk_score, alert))
        else:
            asyncio.run(publish_scores_completed_async(risk_score, alert))
    except RuntimeError:
        try:
            asyncio.run(publish_scores_completed_async(risk_score, alert))
        except Exception as e:
            logger.error(f"Error publishing scores event outside loop: {e}")

def format_anomaly_completed_payload(anomaly_score: Any, alert: Alert) -> Dict[str, Any]:
    reasons = anomaly_score.reasons or {}
    return {
        "type": "ANOMALY_COMPLETED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "anomaly_score_id": str(anomaly_score.id),
            "alert_id": str(alert.id),
            "alert_code": alert.alert_code,
            "anomaly_score": float(anomaly_score.anomaly_score),
            "detector_name": anomaly_score.detector_name,
            "status": reasons.get("status", "COMPLETED"),
            "summary": reasons.get("summary", ""),
            "timestamp": anomaly_score.timestamp.isoformat() if isinstance(anom_ts := getattr(anomaly_score, "timestamp", None), datetime) else str(anom_ts)
        }
    }

async def publish_anomaly_completed_async(anomaly_score: Any, alert: Alert) -> None:
    try:
        payload = format_anomaly_completed_payload(anomaly_score, alert)
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish ANOMALY_COMPLETED event: {e}")

def publish_anomaly_completed(anomaly_score: Any, alert: Alert) -> None:
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_anomaly_completed_async(anomaly_score, alert))
        else:
            asyncio.run(publish_anomaly_completed_async(anomaly_score, alert))
    except RuntimeError:
        try:
            asyncio.run(publish_anomaly_completed_async(anomaly_score, alert))
        except Exception as e:
            logger.error(f"Error publishing anomaly event outside loop: {e}")

def format_correlation_completed_payload(correlation_result: Any, alert: Alert) -> Dict[str, Any]:
    data_dict = correlation_result.correlated_alert_ids or {}
    return {
        "type": "CORRELATION_COMPLETED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "correlation_id": str(correlation_result.id),
            "alert_id": str(alert.id),
            "alert_code": alert.alert_code,
            "correlation_score": float(correlation_result.score),
            "correlated_alert_count": len(data_dict.get("correlated_alert_ids", [])),
            "explanation": correlation_result.description,
            "created_at": correlation_result.created_at.isoformat() if isinstance(correlation_result.created_at, datetime) else str(correlation_result.created_at)
        }
    }

async def publish_correlation_completed_async(correlation_result: Any, alert: Alert) -> None:
    try:
        payload = format_correlation_completed_payload(correlation_result, alert)
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish CORRELATION_COMPLETED event: {e}")

def publish_correlation_completed(correlation_result: Any, alert: Alert) -> None:
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_correlation_completed_async(correlation_result, alert))
        else:
            asyncio.run(publish_correlation_completed_async(correlation_result, alert))
    except RuntimeError:
        try:
            asyncio.run(publish_correlation_completed_async(correlation_result, alert))
        except Exception as e:
            logger.error(f"Error publishing correlation event outside loop: {e}")

def format_incident_created_payload(incident: Any, alert: Alert) -> Dict[str, Any]:
    return {
        "type": "INCIDENT_CREATED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "incident_id": str(incident.id),
            "incident_number": incident.incident_number,
            "title": incident.title,
            "severity": incident.severity,
            "risk_score": float(incident.risk_score),
            "confidence_score": float(incident.confidence_score),
            "status": incident.status,
            "trigger_alert_id": str(alert.id),
            "trigger_alert_code": alert.alert_code,
            "created_at": incident.created_at.isoformat() if isinstance(incident.created_at, datetime) else str(incident.created_at)
        }
    }

async def publish_incident_created_async(incident: Any, alert: Alert) -> None:
    try:
        payload = format_incident_created_payload(incident, alert)
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish INCIDENT_CREATED event: {e}")

def publish_incident_created(incident: Any, alert: Alert) -> None:
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_incident_created_async(incident, alert))
        else:
            asyncio.run(publish_incident_created_async(incident, alert))
    except RuntimeError:
        try:
            asyncio.run(publish_incident_created_async(incident, alert))
        except Exception as e:
            logger.error(f"Error publishing incident created event outside loop: {e}")

def format_incident_updated_payload(incident: Any, alert: Alert) -> Dict[str, Any]:
    return {
        "type": "INCIDENT_UPDATED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "incident_id": str(incident.id),
            "incident_number": incident.incident_number,
            "severity": incident.severity,
            "risk_score": float(incident.risk_score),
            "confidence_score": float(incident.confidence_score),
            "status": incident.status,
            "added_alert_id": str(alert.id),
            "added_alert_code": alert.alert_code,
            "updated_at": incident.updated_at.isoformat() if isinstance(incident.updated_at, datetime) else str(incident.updated_at)
        }
    }

async def publish_incident_updated_async(incident: Any, alert: Alert) -> None:
    try:
        payload = format_incident_updated_payload(incident, alert)
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish INCIDENT_UPDATED event: {e}")

def publish_incident_updated(incident: Any, alert: Alert) -> None:
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_incident_updated_async(incident, alert))
        else:
            asyncio.run(publish_incident_updated_async(incident, alert))
    except RuntimeError:
        try:
            asyncio.run(publish_incident_updated_async(incident, alert))
        except Exception as e:
            logger.error(f"Error publishing incident updated event outside loop: {e}")

def format_investigation_started_payload(investigation: Any, incident: Any, analyst: Any) -> Dict[str, Any]:
    analyst_name = getattr(analyst, "full_name", None) or getattr(analyst, "username", None) or getattr(analyst, "email", "SOC Analyst") if hasattr(analyst, "__dict__") else str(analyst)
    return {
        "type": "INVESTIGATION_STARTED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "investigation_id": str(investigation.id),
            "incident_id": str(incident.id),
            "incident_number": incident.incident_number,
            "status": incident.status,
            "analyst_name": analyst_name,
            "started_at": datetime.now(timezone.utc).isoformat()
        }
    }

async def publish_investigation_started_async(investigation: Any, incident: Any, analyst: Any) -> None:
    try:
        payload = format_investigation_started_payload(investigation, incident, analyst)
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish INVESTIGATION_STARTED event: {e}")

def publish_investigation_started(investigation: Any, incident: Any, analyst: Any) -> None:
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_investigation_started_async(investigation, incident, analyst))
        else:
            asyncio.run(publish_investigation_started_async(investigation, incident, analyst))
    except RuntimeError:
        try:
            asyncio.run(publish_investigation_started_async(investigation, incident, analyst))
        except Exception as e:
            logger.error(f"Error publishing investigation started event outside loop: {e}")

def format_investigation_note_added_payload(note: Dict[str, Any], incident: Any, analyst: Any) -> Dict[str, Any]:
    analyst_name = getattr(analyst, "full_name", None) or getattr(analyst, "username", None) or getattr(analyst, "email", "SOC Analyst") if hasattr(analyst, "__dict__") else str(analyst)
    return {
        "type": "INVESTIGATION_NOTE_ADDED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "incident_id": str(incident.id),
            "incident_number": incident.incident_number,
            "note": note,
            "analyst_name": analyst_name
        }
    }

async def publish_investigation_note_added_async(note: Dict[str, Any], incident: Any, analyst: Any) -> None:
    try:
        payload = format_investigation_note_added_payload(note, incident, analyst)
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish INVESTIGATION_NOTE_ADDED event: {e}")

def publish_investigation_note_added(note: Dict[str, Any], incident: Any, analyst: Any) -> None:
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_investigation_note_added_async(note, incident, analyst))
        else:
            asyncio.run(publish_investigation_note_added_async(note, incident, analyst))
    except RuntimeError:
        try:
            asyncio.run(publish_investigation_note_added_async(note, incident, analyst))
        except Exception as e:
            logger.error(f"Error publishing investigation note event outside loop: {e}")

async def publish_ai_intelligence_started_async(ai_id: str, target_type: str, target_id: str) -> None:
    try:
        payload = {
            "type": "AI_INTELLIGENCE_STARTED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {"ai_id": ai_id, "target_type": target_type, "target_id": target_id, "status": "PROCESSING"}
        }
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish AI_INTELLIGENCE_STARTED event: {e}")

async def publish_ai_intelligence_completed_async(ai_id: str, target_type: str, target_id: str, output: Any) -> None:
    try:
        payload = {
            "type": "AI_INTELLIGENCE_COMPLETED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {"ai_id": ai_id, "target_type": target_type, "target_id": target_id, "status": "COMPLETED", "output": output}
        }
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish AI_INTELLIGENCE_COMPLETED event: {e}")

async def publish_ai_intelligence_failed_async(ai_id: str, target_type: str, target_id: str, error: str) -> None:
    try:
        payload = {
            "type": "AI_INTELLIGENCE_FAILED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {"ai_id": ai_id, "target_type": target_type, "target_id": target_id, "status": "FAILED", "error": error}
        }
        await manager.broadcast_to_role(payload, "SOC_ANALYST")
    except Exception as e:
        logger.error(f"Failed to publish AI_INTELLIGENCE_FAILED event: {e}")

async def publish_ai_intelligence_started(ai_id: str, target_type: str, target_id: str) -> None:
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_ai_intelligence_started_async(ai_id, target_type, target_id))
        else:
            await publish_ai_intelligence_started_async(ai_id, target_type, target_id)
    except Exception as e:
        logger.error(f"Error publishing AI started event: {e}")

async def publish_ai_intelligence_completed(ai_id: str, target_type: str, target_id: str, output: Any) -> None:
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_ai_intelligence_completed_async(ai_id, target_type, target_id, output))
        else:
            await publish_ai_intelligence_completed_async(ai_id, target_type, target_id, output)
    except Exception as e:
        logger.error(f"Error publishing AI completed event: {e}")

async def publish_ai_intelligence_failed(ai_id: str, target_type: str, target_id: str, error: str) -> None:
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(publish_ai_intelligence_failed_async(ai_id, target_type, target_id, error))
        else:
            await publish_ai_intelligence_failed_async(ai_id, target_type, target_id, error)
    except Exception as e:
        logger.error(f"Error publishing AI failed event: {e}")




