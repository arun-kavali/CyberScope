from datetime import datetime, timezone
from typing import Dict, Any, Tuple, List

def normalize_alert_payload(alert_data: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """
    Applies string, enum, and timestamp normalization while preserving raw payload intact.
    Returns (normalized_dict, list_of_normalized_fields).
    """
    normalized = dict(alert_data)
    normalized_fields: List[str] = []

    # Preserve raw input in raw_payload if not already populated
    if not normalized.get("raw_payload"):
        normalized["raw_payload"] = dict(alert_data)

    # 1. Normalize Category
    if normalized.get("event_category"):
        raw_cat = str(normalized["event_category"])
        clean_cat = raw_cat.strip().upper()
        if clean_cat != raw_cat:
            normalized["event_category"] = clean_cat
            normalized_fields.append("event_category")

    # 2. Normalize Severity
    if normalized.get("severity"):
        raw_sev = str(normalized["severity"])
        clean_sev = raw_sev.strip().upper()
        if clean_sev != raw_sev:
            normalized["severity"] = clean_sev
            normalized_fields.append("severity")

    # 3. Normalize Protocol
    if normalized.get("protocol"):
        raw_proto = str(normalized["protocol"])
        clean_proto = raw_proto.strip().upper()
        if clean_proto != raw_proto:
            normalized["protocol"] = clean_proto
            normalized_fields.append("protocol")

    # 4. Normalize Status
    if normalized.get("status"):
        raw_stat = str(normalized["status"])
        clean_stat = raw_stat.strip().upper()
        if clean_stat != raw_stat:
            normalized["status"] = clean_stat
            normalized_fields.append("status")

    # 5. Trim text fields
    for text_field in ["user_context", "asset_context", "indicator", "technique", "source_ip", "destination_ip", "description"]:
        val = normalized.get(text_field)
        if val and isinstance(val, str):
            clean_val = val.strip()
            if clean_val != val:
                normalized[text_field] = clean_val
                normalized_fields.append(text_field)

    # 6. Normalize Timestamp to UTC
    ts = normalized.get("timestamp")
    if ts:
        if isinstance(ts, str):
            parsed_dt = datetime.fromisoformat(ts)
            if parsed_dt.tzinfo is None:
                parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
            else:
                parsed_dt = parsed_dt.astimezone(timezone.utc)
            normalized["timestamp"] = parsed_dt
            normalized_fields.append("timestamp")
        elif isinstance(ts, datetime):
            if ts.tzinfo is None:
                parsed_dt = ts.replace(tzinfo=timezone.utc)
            else:
                parsed_dt = ts.astimezone(timezone.utc)
            normalized["timestamp"] = parsed_dt
            normalized_fields.append("timestamp")
    else:
        normalized["timestamp"] = datetime.now(timezone.utc)
        normalized_fields.append("timestamp")

    return normalized, normalized_fields
