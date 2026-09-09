import hashlib
import random
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.evidence import Alert
from app.models.sources import AlertSource
from app.services.validation import validate_alert_payload
from app.services.normalization import normalize_alert_payload

@dataclass
class IngestionResult:
    status: str # "SUCCESS" | "DUPLICATE" | "FAILED"
    alert_id: Optional[uuid.UUID]
    alert_code: Optional[str]
    validation: Dict[str, Any]
    normalization: Dict[str, Any]
    data_quality: Dict[str, Any]
    duplicate_status: Dict[str, Any]
    alert: Optional[Alert]

def compute_alert_fingerprint(source_id: uuid.UUID, normalized_data: Dict[str, Any]) -> str:
    """
    Computes a deterministic SHA-256 fingerprint for duplicate detection based on
    source identity, event category, event type, entity context, network tuple, and timestamp.
    """
    raw_str = (
        f"{source_id}:"
        f"{normalized_data.get('event_category', '')}:"
        f"{normalized_data.get('event_type', '')}:"
        f"{normalized_data.get('user_context', '')}:"
        f"{normalized_data.get('asset_context', '')}:"
        f"{normalized_data.get('source_ip', '')}:"
        f"{normalized_data.get('destination_ip', '')}:"
        f"{normalized_data.get('timestamp', '').isoformat() if isinstance(normalized_data.get('timestamp'), datetime) else str(normalized_data.get('timestamp', ''))}"
    )
    return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

def assess_data_quality(normalized_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Runs Phase 7 data-quality completeness & quality checks.
    """
    issues: List[str] = []

    if not normalized_data.get("user_context") and not normalized_data.get("asset_context"):
        issues.append("Missing entity context: neither user_context nor asset_context was provided.")

    if not normalized_data.get("source_ip") and not normalized_data.get("asset_context"):
        issues.append("Missing source location: neither source_ip nor asset_context was provided.")

    if not normalized_data.get("indicator"):
        issues.append("Missing threat indicator.")

    if not normalized_data.get("technique"):
        issues.append("Unassigned MITRE ATT&CK technique.")

    return {
        "status": "PASSED" if not issues else "WARNING",
        "issue_count": len(issues),
        "issues": issues
    }

def process_alert_ingestion(
    db: Session,
    alert_data: Dict[str, Any],
    source_id: uuid.UUID,
    is_batch: bool = False,
    submitted_by_user_id: Optional[uuid.UUID] = None
) -> IngestionResult:
    """
    Executes the complete Phase 7 alert ingestion pipeline:
    Input Validation -> Normalization -> Data Quality -> Fingerprint Duplicate Check -> PostgreSQL Persistence
    """
    # 1. Input Validation
    val_errors = validate_alert_payload(alert_data)
    if val_errors:
        return IngestionResult(
            status="FAILED",
            alert_id=None,
            alert_code=None,
            validation={"valid": False, "issues": val_errors},
            normalization={"applied": False, "fields_normalized": []},
            data_quality={"status": "FAILED", "issue_count": len(val_errors), "issues": val_errors},
            duplicate_status={"is_duplicate": False, "fingerprint": None},
            alert=None
        )

    # 2. String & Enum Normalization
    normalized, norm_fields = normalize_alert_payload(alert_data)

    # 3. Data Quality Checks
    dq_report = assess_data_quality(normalized)

    # 4. Fingerprint & Duplicate Check
    fingerprint = compute_alert_fingerprint(source_id, normalized)

    # Query DB for matching exact duplicate within identical source & fingerprint metadata
    stmt = select(Alert).where(
        Alert.source_id == source_id,
        Alert.event_category == normalized["event_category"],
        Alert.event_type == normalized["event_type"],
        Alert.timestamp == normalized["timestamp"],
        Alert.source_ip == normalized.get("source_ip"),
        Alert.user_context == normalized.get("user_context")
    )
    existing_duplicate = db.scalar(stmt)

    is_duplicate = existing_duplicate is not None

    if is_duplicate:
        return IngestionResult(
            status="DUPLICATE",
            alert_id=existing_duplicate.id,
            alert_code=existing_duplicate.alert_code,
            validation={"valid": True, "issues": []},
            normalization={"applied": True, "fields_normalized": norm_fields},
            data_quality=dq_report,
            duplicate_status={
                "is_duplicate": True,
                "fingerprint": fingerprint,
                "existing_alert_id": str(existing_duplicate.id),
                "existing_alert_code": existing_duplicate.alert_code
            },
            alert=existing_duplicate
        )

    # 5. Persist Normalized Alert to PostgreSQL
    alert_code = normalized.get("alert_code") or f"ALT-{random.randint(10000, 99999)}"

    def make_json_serializable(obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: make_json_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [make_json_serializable(v) for v in obj]
        elif isinstance(obj, uuid.UUID):
            return str(obj)
        return obj

    metadata = dict(normalized.get("alert_metadata") or {})
    metadata.update({
        "fingerprint": fingerprint,
        "data_quality": dq_report,
        "normalization": {"applied": True, "fields_normalized": norm_fields},
        "ingestion": {"version": "1.0", "status": "NORMALIZED"}
    })

    db_alert = Alert(
        alert_code=alert_code,
        source_id=source_id,
        submitted_by_user_id=submitted_by_user_id,
        event_type=normalized["event_type"],
        event_category=normalized["event_category"],
        severity=normalized["severity"],
        status=normalized.get("status") or "NEW",
        timestamp=normalized["timestamp"],
        user_context=normalized.get("user_context"),
        asset_context=normalized.get("asset_context"),
        source_ip=normalized.get("source_ip"),
        destination_ip=normalized.get("destination_ip"),
        source_port=normalized.get("source_port"),
        destination_port=normalized.get("destination_port"),
        protocol=normalized.get("protocol"),
        action=normalized.get("action"),
        description=normalized["description"],
        indicator=normalized.get("indicator"),
        technique=normalized.get("technique"),
        raw_payload=make_json_serializable(normalized.get("raw_payload") or {}),
        alert_metadata=make_json_serializable(metadata)
    )

    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)

    # Publish Phase 8 ALERT_CREATED event to connected SOC Analyst clients
    try:
        from app.realtime.publisher import publish_alert_created
        publish_alert_created(db_alert)
    except Exception as e:
        import logging
        logging.getLogger("cyberscope.ingestion").error(f"Error publishing realtime alert event: {e}")

    # Execute Phase 9 Automatic Triage & Context Enrichment Pipeline
    try:
        from app.services.triage import execute_alert_triage
        execute_alert_triage(db, db_alert)
    except Exception as e:
        import logging
        logging.getLogger("cyberscope.ingestion").error(f"Error executing automatic alert triage: {e}")

    return IngestionResult(
        status="SUCCESS",
        alert_id=db_alert.id,
        alert_code=db_alert.alert_code,
        validation={"valid": True, "issues": []},
        normalization={"applied": True, "fields_normalized": norm_fields},
        data_quality=dq_report,
        duplicate_status={"is_duplicate": False, "fingerprint": fingerprint},
        alert=db_alert
    )
