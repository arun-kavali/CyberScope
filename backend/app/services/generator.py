import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

EXACT_SCENARIO_CATEGORIES = {
    "AUTHENTICATION": [
        "Brute Force",
        "Credential Stuffing",
        "Impossible Travel",
        "Suspicious Login",
        "Privileged Login",
        "MFA Abuse"
    ],
    "ENDPOINT": [
        "Malware Detection",
        "Suspicious PowerShell",
        "Suspicious Process",
        "Ransomware Behavior",
        "Privilege Escalation"
    ],
    "NETWORK": [
        "Port Scan",
        "Command-and-Control Activity",
        "Data Exfiltration",
        "Suspicious DNS",
        "Unusual Network Connection"
    ],
    "DATABASE": [
        "Unusual Query",
        "Bulk Data Read",
        "Privilege Abuse",
        "Suspicious Database Login"
    ],
    "EMAIL": [
        "Phishing",
        "Malicious Attachment",
        "Suspicious Link"
    ]
}

# Pre-defined realistic synthetic pools (offline-capable, safe, reserved ranges)
SYNTHETIC_USERS = [
    "usr_jdoe", "usr_msmith", "usr_ajohnson", "usr_bwilson", "usr_admin_dev",
    "usr_sec_analyst", "usr_service_acct", "usr_sys_admin", "usr_hr_lead", "usr_finance_mgr"
]

SYNTHETIC_ASSETS = [
    {"name": "DC-01.cyberscope.local", "type": "SERVER", "ip": "10.0.1.10"},
    {"name": "WORKSTATION-482.cyberscope.local", "type": "ENDPOINT", "ip": "192.168.1.105"},
    {"name": "SQL-PROD-02.cyberscope.local", "type": "SERVER", "ip": "10.0.2.20"},
    {"name": "FW-INTERNAL-01", "type": "FIREWALL", "ip": "10.0.0.1"},
    {"name": "MAIL-GW-01.cyberscope.local", "type": "SERVER", "ip": "10.0.4.5"}
]

SYNTHETIC_EXTERNAL_IPS = [
    "203.0.113.45", "198.51.100.12", "192.0.2.89", "203.0.113.111", "198.51.100.204"
]

def generate_synthetic_alerts_data(
    category: str,
    scenario_name: str,
    generation_mode: str,
    severity: str,
    intent: str,
    quantity: int = 1,
    start_time: Optional[datetime] = None,
    custom_params: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Generates a list of synthetic alert dictionary payloads adhering strictly
    to the CyberScope common alert schema.
    """
    if category not in EXACT_SCENARIO_CATEGORIES:
        raise ValueError(f"Invalid category '{category}'. Must be one of {list(EXACT_SCENARIO_CATEGORIES.keys())}")
    
    if scenario_name not in EXACT_SCENARIO_CATEGORIES[category]:
        raise ValueError(f"Invalid scenario '{scenario_name}' for category '{category}'")

    if severity not in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
        raise ValueError(f"Invalid severity '{severity}'. Must be LOW, MEDIUM, HIGH, or CRITICAL.")

    # Server-side quantity limit (max 100 per batch)
    capped_quantity = max(1, min(quantity, 100))

    if not start_time:
        start_time = datetime.now(timezone.utc)
    elif start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)

    params = custom_params or {}
    is_benign = (intent == "BENIGN" or intent == "Benign / False Positive")
    results = []

    # Pick representative user & asset
    target_user = params.get("user") or random.choice(SYNTHETIC_USERS)
    target_asset = random.choice(SYNTHETIC_ASSETS)
    source_ip = params.get("source_ip") or (
        "192.168.1.50" if is_benign else random.choice(SYNTHETIC_EXTERNAL_IPS)
    )
    dest_ip = params.get("destination_ip") or target_asset["ip"]

    for i in range(capped_quantity):
        # Time calculation depending on generation mode
        if generation_mode == "MULTI-ALERT SEQUENCE":
            event_time = start_time + timedelta(seconds=i * 45)
        elif generation_mode == "HIGH-VOLUME BURST":
            event_time = start_time + timedelta(milliseconds=i * 200)
        elif generation_mode == "REPEATED EVENTS":
            event_time = start_time + timedelta(minutes=i * 5)
        else: # SINGLE ALERT
            event_time = start_time

        alert_code = f"ALT-{random.randint(10000, 99999)}"
        
        # Build specific metadata and payloads by scenario
        payload, description, indicator, technique = _build_scenario_details(
            category, scenario_name, is_benign, target_user, target_asset["name"], source_ip, dest_ip, params, i
        )

        alert_dict = {
            "alert_code": alert_code,
            "event_type": scenario_name,
            "event_category": category,
            "severity": severity,
            "status": "NEW",
            "timestamp": event_time.isoformat(),
            "user_context": target_user,
            "asset_context": target_asset["name"],
            "source_ip": source_ip,
            "destination_ip": dest_ip,
            "source_port": params.get("source_port") or random.randint(49152, 65535),
            "destination_port": params.get("destination_port") or (443 if category == "NETWORK" else 80),
            "protocol": params.get("protocol") or ("TCP" if category != "EMAIL" else "SMTP"),
            "action": "ALLOWED" if is_benign else ("BLOCKED" if severity in ["HIGH", "CRITICAL"] else "DETECTED"),
            "description": description,
            "indicator": indicator,
            "technique": technique,
            "raw_payload": payload,
            "alert_metadata": {
                "synthetic": True,
                "generation_mode": generation_mode,
                "intent": "BENIGN" if is_benign else "SUSPICIOUS",
                "sequence_index": i + 1,
                "total_in_batch": capped_quantity,
                "scenario_name": scenario_name
            }
        }
        results.append(alert_dict)

    return results

def _build_scenario_details(
    category: str,
    scenario_name: str,
    is_benign: bool,
    user: str,
    asset: str,
    src_ip: str,
    dst_ip: str,
    params: Dict[str, Any],
    index: int
) -> tuple:
    """Helper to build scenario-specific details (raw_payload, description, indicator, technique)."""
    prefix = "[BENIGN TEST] " if is_benign else "[SYNTHETIC ALERT] "

    if category == "AUTHENTICATION":
        technique = "T1110 - Brute Force" if "Brute" in scenario_name else "T1078 - Valid Accounts"
        attempts = params.get("attempt_count", 5 + index * 3)
        description = f"{prefix}{scenario_name} detected for user {user} on asset {asset} ({attempts} attempts from {src_ip})."
        indicator = f"auth_failure_burst:{user}:{src_ip}"
        payload = {
            "user": user,
            "source_ip": src_ip,
            "destination_asset": asset,
            "attempt_count": attempts,
            "auth_method": "Natively Delegated Active Directory",
            "is_benign_simulation": is_benign
        }
    elif category == "ENDPOINT":
        technique = "T1059.001 - PowerShell" if "PowerShell" in scenario_name else "T1204 - User Execution"
        proc = params.get("process") or ("powershell.exe" if "PowerShell" in scenario_name else "svchost_suspicious.exe")
        description = f"{prefix}{scenario_name} execution observed on endpoint {asset} by {user}."
        indicator = f"endpoint_proc:{proc}:{asset}"
        payload = {
            "endpoint_hostname": asset,
            "user": user,
            "process_name": proc,
            "command_line": params.get("command_context") or f"C:\\Windows\\System32\\{proc} -ExecutionPolicy Bypass -NoProfile",
            "parent_process": "explorer.exe",
            "is_benign_simulation": is_benign
        }
    elif category == "NETWORK":
        technique = "T1046 - Network Service Discovery" if "Port" in scenario_name else "T1071 - Application Layer Protocol"
        description = f"{prefix}{scenario_name} detected between {src_ip} and {dst_ip}."
        indicator = f"network_flow:{src_ip}->{dst_ip}"
        payload = {
            "source_ip": src_ip,
            "destination_ip": dst_ip,
            "bytes_transferred": params.get("read_volume", 154800 + index * 2048),
            "protocol": "TCP",
            "is_benign_simulation": is_benign
        }
    elif category == "DATABASE":
        technique = "T1005 - Data from Local System"
        query = params.get("query") or ("SELECT * FROM users_credentials;" if not is_benign else "SELECT count(*) FROM audit_logs;")
        description = f"{prefix}{scenario_name} executed on database asset {asset} by DB user {user}."
        indicator = f"db_query:{asset}:{user}"
        payload = {
            "database_asset": asset,
            "db_user": user,
            "executed_query": query,
            "read_volume_rows": params.get("read_volume", 50000 if not is_benign else 10),
            "is_benign_simulation": is_benign
        }
    else: # EMAIL
        technique = "T1566 - Phishing"
        sender = params.get("sender") or ("billing-verify@external-update.test" if not is_benign else "hr-newsletter@cyberscope.local")
        description = f"{prefix}{scenario_name} detected in email to recipient {user} from {sender}."
        indicator = f"email_phish:{sender}"
        payload = {
            "sender": sender,
            "recipient": user,
            "subject": params.get("subject") or "URGENT: Verify your account credentials immediately",
            "attachment_name": "invoice_statement_2026.pdf.exe" if "Attachment" in scenario_name else None,
            "suspicious_url": "http://cyberscope-login.phish-test.com/login" if "Link" in scenario_name else None,
            "is_benign_simulation": is_benign
        }

    return payload, description, indicator, technique
