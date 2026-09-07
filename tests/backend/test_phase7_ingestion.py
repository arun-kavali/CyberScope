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


def test_valid_single_alert_ingestion():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Phase 7 test alert",
            "user_context": "usr_phase7",
            "source_ip": "192.168.1.100",
            "destination_ip": "10.0.0.5",
            "source_port": 4433,
            "destination_port": 80
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["status"] == "NEW"
    assert data["severity"] == "HIGH"
    assert data["event_category"] == "AUTHENTICATION"
    assert "alert_metadata" in data
    assert "data_quality" in data["alert_metadata"]


def test_batch_alert_ingestion():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts/batch",
        json={
            "alerts": [
                {
                    "event_type": "Suspicious Login",
                    "event_category": "AUTHENTICATION",
                    "severity": "MEDIUM",
                    "description": "Batch alert 1",
                    "user_context": "admin_usr"
                },
                {
                    "event_type": "Port Scan",
                    "event_category": "NETWORK",
                    "severity": "CRITICAL",
                    "description": "Batch alert 2",
                    "source_ip": "10.0.1.50"
                }
            ]
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["accepted_count"] == 2
    assert data["rejected_count"] == 0
    assert data["duplicate_count"] == 0
    assert len(data["alerts"]) == 2


def test_missing_required_fields_rejection():
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


def test_invalid_event_category_rejection():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "NON_EXISTENT_CATEGORY",
            "severity": "HIGH",
            "description": "Invalid category test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 422


def test_invalid_event_type_rejection():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Fake Event Type Not In Scenario",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Invalid event type test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 422


def test_invalid_severity_rejection():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "SUPER_HIGH",
            "description": "Invalid severity test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 422


def test_invalid_ip_address_format_rejection():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Bad IP test",
            "source_ip": "999.888.777.666"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 422


def test_invalid_port_range_rejection():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Bad Port test",
            "source_port": 70000
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 422


def test_invalid_timestamp_format_rejection():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Bad timestamp test",
            "timestamp": "not-a-valid-iso-date"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 422


def test_lowercase_and_whitespace_enum_normalization():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": " authentication ",
            "severity": " high ",
            "protocol": " tcp ",
            "description": "Normalization test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["event_category"] == "AUTHENTICATION"
    assert data["severity"] == "HIGH"
    assert data["protocol"] == "TCP"
    assert "normalization" in data["alert_metadata"]
    assert "event_category" in data["alert_metadata"]["normalization"]["fields_normalized"]


def test_text_field_whitespace_trimming():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": " Whitespace test description ",
            "user_context": "  usr_whitespace  "
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["description"] == "Whitespace test description"
    assert data["user_context"] == "usr_whitespace"


def test_timestamp_timezone_normalization_utc():
    _, source_token = get_tokens()
    iso_time = "2026-09-07T10:30:00+02:00"
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Timezone test",
            "timestamp": iso_time
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    ts_str = data["timestamp"]
    assert isinstance(ts_str, str)
    dt_parsed = datetime.fromisoformat(ts_str)
    assert dt_parsed is not None


def test_raw_payload_preservation():
    _, source_token = get_tokens()
    raw_input = {
        "event_type": "Brute Force",
        "event_category": "AUTHENTICATION",
        "severity": "HIGH",
        "description": "Raw payload test",
        "custom_metadata_field": "custom_val_123"
    }
    res = client.post(
        "/alerts",
        json=raw_input,
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["raw_payload"] is not None
    assert data["raw_payload"]["description"] == "Raw payload test"


def test_data_quality_warning_flagging():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Incomplete entity alert"
            # Missing user_context, asset_context, indicator, technique
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    dq = data["alert_metadata"]["data_quality"]
    assert dq["status"] == "WARNING"
    assert dq["issue_count"] > 0


def test_deterministic_duplicate_fingerprint_detection():
    _, source_token = get_tokens()
    payload = {
        "event_type": "Brute Force",
        "event_category": "AUTHENTICATION",
        "severity": "HIGH",
        "description": "Duplicate detection test",
        "user_context": "usr_dup_test",
        "source_ip": "1.2.3.4",
        "timestamp": "2026-09-07T12:00:00Z"
    }

    res1 = client.post("/alerts", json=payload, headers={"Authorization": f"Bearer {source_token}"})
    assert res1.status_code == 201
    data1 = res1.json()
    assert "id" in data1

    res2 = client.post("/alerts", json=payload, headers={"Authorization": f"Bearer {source_token}"})
    assert res2.status_code == 201
    data2 = res2.json()
    assert data2["id"] == data1["id"] # Duplicate returns existing alert record
    assert data2["alert_metadata"]["fingerprint"] is not None


def test_source_ip_destination_ip_ipv4_ipv6_acceptance():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Suspicious DNS",
            "event_category": "NETWORK",
            "severity": "HIGH",
            "description": "IPv6 test",
            "source_ip": "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
            "destination_ip": "192.168.1.1"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["source_ip"] == "2001:0db8:85a3:0000:0000:8a2e:0370:7334"


def test_unauthenticated_ingestion_rejection():
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Unauthenticated test"
        }
    )
    assert res.status_code == 401


def test_unauthorized_role_analyst_rejection():
    analyst_token, _ = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Analyst role test"
        },
        headers={"Authorization": f"Bearer {analyst_token}"}
    )
    assert res.status_code == 403


def test_get_alert_by_id_success():
    analyst_token, source_token = get_tokens()
    ingest_res = client.post(
        "/alerts",
        json={
            "event_type": "Ransomware Behavior",
            "event_category": "ENDPOINT",
            "severity": "CRITICAL",
            "description": "Get by ID test",
            "asset_context": "srv-db-01"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert ingest_res.status_code == 201
    alert_id = ingest_res.json()["id"]

    get_res = client.get(f"/alerts/{alert_id}", headers={"Authorization": f"Bearer {analyst_token}"})
    assert get_res.status_code == 200
    alert_data = get_res.json()
    assert alert_data["id"] == alert_id
    assert alert_data["severity"] == "CRITICAL"


def test_get_alert_by_id_not_found():
    analyst_token, _ = get_tokens()
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    get_res = client.get(f"/alerts/{fake_uuid}", headers={"Authorization": f"Bearer {analyst_token}"})
    assert get_res.status_code == 404


def test_source_id_linked_correctly():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Source ID link test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["source_id"] is not None


def test_synthetic_scenario_alerts_ingest_successfully():
    _, source_token = get_tokens()
    res = client.post(
        "/alerts/generate-preview",
        json={
            "category": "AUTHENTICATION",
            "scenario_name": "Brute Force",
            "quantity": 3
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["generated_count"] == 3
    assert len(data["alerts"]) == 3
