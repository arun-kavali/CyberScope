import ipaddress
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.services.generator import EXACT_SCENARIO_CATEGORIES

VALID_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

def validate_alert_payload(alert_data: Dict[str, Any]) -> List[str]:
    """
    Validates alert input dictionary fields.
    Returns a list of error strings. If list is empty, payload is valid.
    """
    errors: List[str] = []

    # 1. Required fields
    event_category = alert_data.get("event_category")
    event_type = alert_data.get("event_type")
    severity = alert_data.get("severity")
    description = alert_data.get("description")

    if not event_category or not str(event_category).strip():
        errors.append("Field 'event_category' is required.")
    if not event_type or not str(event_type).strip():
        errors.append("Field 'event_type' is required.")
    if not severity or not str(severity).strip():
        errors.append("Field 'severity' is required.")
    if not description or not str(description).strip():
        errors.append("Field 'description' is required.")

    # 2. Category & Event Type Validation
    if event_category:
        norm_cat = str(event_category).strip().upper()
        if norm_cat not in EXACT_SCENARIO_CATEGORIES:
            errors.append(f"Invalid category '{event_category}'. Supported categories: {list(EXACT_SCENARIO_CATEGORIES.keys())}")
        elif event_type:
            norm_type = str(event_type).strip()
            # Case-insensitive scenario match
            scenarios = [s.lower() for s in EXACT_SCENARIO_CATEGORIES[norm_cat]]
            if norm_type.lower() not in scenarios:
                errors.append(f"Invalid event_type '{event_type}' for category '{norm_cat}'. Supported: {EXACT_SCENARIO_CATEGORIES[norm_cat]}")

    # 3. Severity Validation
    if severity:
        norm_sev = str(severity).strip().upper()
        if norm_sev not in VALID_SEVERITIES:
            errors.append(f"Invalid severity '{severity}'. Must be one of: {sorted(list(VALID_SEVERITIES))}")

    # 4. IP Address Validation
    for ip_field in ["source_ip", "destination_ip"]:
        ip_val = alert_data.get(ip_field)
        if ip_val and str(ip_val).strip():
            cleaned_ip = str(ip_val).strip()
            try:
                ipaddress.ip_address(cleaned_ip)
            except ValueError:
                errors.append(f"Invalid IP address format in '{ip_field}': '{ip_val}'")

    # 5. Port Range Validation
    for port_field in ["source_port", "destination_port"]:
        port_val = alert_data.get(port_field)
        if port_val is not None:
            try:
                port_num = int(port_val)
                if port_num < 1 or port_num > 65535:
                    errors.append(f"Invalid port number in '{port_field}': {port_val}. Must be between 1 and 65535.")
            except (ValueError, TypeError):
                errors.append(f"Invalid port data type in '{port_field}': '{port_val}'. Must be an integer.")

    # 6. Timestamp Validation
    ts_val = alert_data.get("timestamp")
    if ts_val:
        if isinstance(ts_val, str):
            try:
                parsed_dt = datetime.fromisoformat(ts_val)
            except ValueError:
                errors.append(f"Invalid timestamp format ISO-8601: '{ts_val}'")
        elif not isinstance(ts_val, datetime):
            errors.append(f"Invalid timestamp type: '{type(ts_val)}'. Expected ISO-8601 string or datetime object.")

    return errors
