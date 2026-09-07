import sys
import os
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal
from app.auth.service import seed_default_users
from app.services.generator import EXACT_SCENARIO_CATEGORIES, generate_synthetic_alerts_data

client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_seeded_users():
    db: Session = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()

def get_tokens():
    analyst_res = client.post("/auth/login", json={"username": "analyst", "password": "Analyst123!"})
    analyst_token = analyst_res.json()["token"]

    source_res = client.post("/auth/login", json={"username": "alert_source", "password": "Source123!"})
    source_token = source_res.json()["token"]

    return analyst_token, source_token

def test_alert_source_can_submit_valid_alert():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Test synthetic brute force alert",
            "user_context": "usr_jdoe",
            "source_ip": "203.0.113.45"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert "alert_code" in data
    assert data["event_type"] == "Brute Force"
    assert data["event_category"] == "AUTHENTICATION"
    assert data["severity"] == "HIGH"

def test_unauthenticated_submission_rejected():
    res = client.post("/alerts", json={
        "event_type": "Brute Force",
        "event_category": "AUTHENTICATION",
        "severity": "HIGH",
        "description": "Unauthenticated submission test"
    })
    assert res.status_code == 401

def test_unauthorized_role_rejected():
    analyst_token, _ = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Unauthorized role submission test"
        },
        headers={"Authorization": f"Bearer {analyst_token}"}
    )
    assert res.status_code == 403

def test_invalid_severity_rejected():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "INVALID_SEVERITY",
            "description": "Invalid severity test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 422

def test_required_field_validation():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force"
            # Missing event_category, severity, description
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 422

def test_all_scenario_categories_and_exact_names_exist():
    assert "AUTHENTICATION" in EXACT_SCENARIO_CATEGORIES
    assert "ENDPOINT" in EXACT_SCENARIO_CATEGORIES
    assert "NETWORK" in EXACT_SCENARIO_CATEGORIES
    assert "DATABASE" in EXACT_SCENARIO_CATEGORIES
    assert "EMAIL" in EXACT_SCENARIO_CATEGORIES

    auth_names = EXACT_SCENARIO_CATEGORIES["AUTHENTICATION"]
    assert "Brute Force" in auth_names
    assert "Credential Stuffing" in auth_names
    assert "Impossible Travel" in auth_names
    assert "Suspicious Login" in auth_names
    assert "Privileged Login" in auth_names
    assert "MFA Abuse" in auth_names

    endpoint_names = EXACT_SCENARIO_CATEGORIES["ENDPOINT"]
    assert "Malware Detection" in endpoint_names
    assert "Suspicious PowerShell" in endpoint_names
    assert "Suspicious Process" in endpoint_names
    assert "Ransomware Behavior" in endpoint_names
    assert "Privilege Escalation" in endpoint_names

    net_names = EXACT_SCENARIO_CATEGORIES["NETWORK"]
    assert "Port Scan" in net_names
    assert "Command-and-Control Activity" in net_names
    assert "Data Exfiltration" in net_names
    assert "Suspicious DNS" in net_names
    assert "Unusual Network Connection" in net_names

    db_names = EXACT_SCENARIO_CATEGORIES["DATABASE"]
    assert "Unusual Query" in db_names
    assert "Bulk Data Read" in db_names
    assert "Privilege Abuse" in db_names
    assert "Suspicious Database Login" in db_names

    email_names = EXACT_SCENARIO_CATEGORIES["EMAIL"]
    assert "Phishing" in email_names
    assert "Malicious Attachment" in email_names
    assert "Suspicious Link" in email_names

def test_single_generation_creates_one_alert():
    alerts = generate_synthetic_alerts_data("AUTHENTICATION", "Brute Force", "SINGLE ALERT", "HIGH", "Suspicious", quantity=1)
    assert len(alerts) == 1

def test_multi_alert_sequence_ordered_timestamps():
    start = datetime.now(timezone.utc)
    alerts = generate_synthetic_alerts_data("AUTHENTICATION", "Brute Force", "MULTI-ALERT SEQUENCE", "HIGH", "Suspicious", quantity=5, start_time=start)
    assert len(alerts) == 5
    timestamps = [datetime.fromisoformat(a["timestamp"]) for a in alerts]
    for i in range(len(timestamps) - 1):
        assert timestamps[i] < timestamps[i + 1]

def test_repeated_events_creates_requested_count():
    alerts = generate_synthetic_alerts_data("ENDPOINT", "Malware Detection", "REPEATED EVENTS", "CRITICAL", "Suspicious", quantity=4)
    assert len(alerts) == 4

def test_burst_respects_max_server_limit():
    alerts = generate_synthetic_alerts_data("NETWORK", "Port Scan", "HIGH-VOLUME BURST", "MEDIUM", "Suspicious", quantity=500)
    assert len(alerts) == 100 # Capped at 100

def test_benign_intent_payload_representation():
    alerts = generate_synthetic_alerts_data("AUTHENTICATION", "Suspicious Login", "SINGLE ALERT", "LOW", "Benign / False Positive", quantity=1)
    assert len(alerts) == 1
    assert alerts[0]["alert_metadata"]["intent"] == "BENIGN"
    assert "[BENIGN TEST]" in alerts[0]["description"]

def test_batch_submission_and_history_persistence():
    _, source_token = get_tokens()
    
    # Submit batch
    batch_res = client.post(
        "/alerts/batch",
        json={
            "alerts": [
                {
                    "event_type": "Phishing",
                    "event_category": "EMAIL",
                    "severity": "HIGH",
                    "description": "Batch test phishing email 1"
                },
                {
                    "event_type": "Malicious Attachment",
                    "event_category": "EMAIL",
                    "severity": "CRITICAL",
                    "description": "Batch test malicious attachment 2"
                }
            ]
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert batch_res.status_code == 201
    batch_data = batch_res.json()
    assert batch_data["accepted_count"] == 2
    assert batch_data["rejected_count"] == 0

    # Query history
    history_res = client.get("/alerts", headers={"Authorization": f"Bearer {source_token}"})
    assert history_res.status_code == 200
    history_data = history_res.json()
    assert len(history_data) >= 2
