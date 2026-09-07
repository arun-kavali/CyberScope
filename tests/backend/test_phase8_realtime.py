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
from app.realtime.manager import manager
from app.realtime.publisher import format_alert_created_payload, publish_alert_created

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


def test_ws_authenticated_soc_analyst_can_connect():
    analyst_token, _ = get_tokens()
    with client.websocket_connect(f"/ws?token={analyst_token}") as websocket:
        assert websocket is not None


def test_ws_unauthenticated_connection_rejected():
    with pytest.raises(Exception):
        with client.websocket_connect("/ws"):
            pass


def test_ws_invalid_expired_token_rejected():
    with pytest.raises(Exception):
        with client.websocket_connect("/ws?token=invalid_expired_token_123"):
            pass


def test_ws_alert_source_role_rejected():
    _, source_token = get_tokens()
    with pytest.raises(Exception):
        with client.websocket_connect(f"/ws?token={source_token}"):
            pass


def test_ws_connection_manager_tracking():
    analyst_token, _ = get_tokens()
    initial_count = len(manager.active_connections)
    with client.websocket_connect(f"/ws?token={analyst_token}"):
        assert len(manager.active_connections) == initial_count + 1
    assert len(manager.active_connections) == initial_count


def test_ws_disconnected_client_cleanup():
    analyst_token, _ = get_tokens()
    initial_count = len(manager.active_connections)
    with client.websocket_connect(f"/ws?token={analyst_token}") as ws:
        assert len(manager.active_connections) == initial_count + 1
    assert len(manager.active_connections) == initial_count


def test_successful_alert_persistence_publishes_alert_created():
    analyst_token, source_token = get_tokens()
    with client.websocket_connect(f"/ws?token={analyst_token}") as websocket:
        ingest_res = client.post(
            "/alerts",
            json={
                "event_type": "Brute Force",
                "event_category": "AUTHENTICATION",
                "severity": "HIGH",
                "description": "Realtime test alert"
            },
            headers={"Authorization": f"Bearer {source_token}"}
        )
        assert ingest_res.status_code == 201
        event = websocket.receive_json()
        assert event["type"] == "ALERT_CREATED"
        assert event["data"]["event_type"] == "Brute Force"
        assert event["data"]["severity"] == "HIGH"


def test_validation_failure_does_not_publish_event():
    analyst_token, source_token = get_tokens()
    with client.websocket_connect(f"/ws?token={analyst_token}") as websocket:
        # Invalid payload
        res = client.post(
            "/alerts",
            json={
                "event_type": "Invalid Type Not Supported",
                "event_category": "AUTHENTICATION",
                "severity": "HIGH",
                "description": "Bad alert"
            },
            headers={"Authorization": f"Bearer {source_token}"}
        )
        assert res.status_code == 422

        # Subsequent valid alert
        client.post(
            "/alerts",
            json={
                "event_type": "Brute Force",
                "event_category": "AUTHENTICATION",
                "severity": "HIGH",
                "description": "Valid alert after invalid"
            },
            headers={"Authorization": f"Bearer {source_token}"}
        )
        # First event received must be the valid alert
        event = websocket.receive_json()
        assert event["data"]["description"] == "Valid alert after invalid"


def test_duplicate_rejection_does_not_publish_event():
    analyst_token, source_token = get_tokens()
    payload = {
        "event_type": "Brute Force",
        "event_category": "AUTHENTICATION",
        "severity": "HIGH",
        "description": "Duplicate stream test",
        "timestamp": "2026-09-07T10:00:00Z"
    }

    # Initial submission
    res1 = client.post("/alerts", json=payload, headers={"Authorization": f"Bearer {source_token}"})
    assert res1.status_code == 201

    with client.websocket_connect(f"/ws?token={analyst_token}") as websocket:
        # Submit duplicate
        res2 = client.post("/alerts", json=payload, headers={"Authorization": f"Bearer {source_token}"})
        assert res2.status_code == 201
        assert res2.json()["id"] == res1.json()["id"]

        # Submit new distinct alert
        client.post(
            "/alerts",
            json={
                "event_type": "Port Scan",
                "event_category": "NETWORK",
                "severity": "LOW",
                "description": "Non-duplicate after duplicate"
            },
            headers={"Authorization": f"Bearer {source_token}"}
        )
        event = websocket.receive_json()
        assert event["data"]["description"] == "Non-duplicate after duplicate"


def test_batch_accepted_alerts_generate_individual_events():
    analyst_token, source_token = get_tokens()
    with client.websocket_connect(f"/ws?token={analyst_token}") as websocket:
        batch_res = client.post(
            "/alerts/batch",
            json={
                "alerts": [
                    {
                        "event_type": "Suspicious Login",
                        "event_category": "AUTHENTICATION",
                        "severity": "MEDIUM",
                        "description": "Batch realtime alert 1"
                    },
                    {
                        "event_type": "Port Scan",
                        "event_category": "NETWORK",
                        "severity": "HIGH",
                        "description": "Batch realtime alert 2"
                    }
                ]
            },
            headers={"Authorization": f"Bearer {source_token}"}
        )
        assert batch_res.status_code == 201
        assert batch_res.json()["accepted_count"] == 2

        events = [websocket.receive_json() for _ in range(8)]
        created_events = [e for e in events if e["type"] == "ALERT_CREATED"]
        assert len(created_events) == 2


def test_batch_rejected_alerts_generate_no_events():
    analyst_token, source_token = get_tokens()
    with client.websocket_connect(f"/ws?token={analyst_token}") as websocket:
        batch_res = client.post(
            "/alerts/batch",
            json={
                "alerts": [
                    {
                        "event_type": "Invalid Event Type",
                        "event_category": "AUTHENTICATION",
                        "severity": "MEDIUM",
                        "description": "Rejected batch alert"
                    }
                ]
            },
            headers={"Authorization": f"Bearer {source_token}"}
        )
        assert batch_res.status_code == 201
        assert batch_res.json()["rejected_count"] == 1

        # Submit valid alert to verify stream
        client.post(
            "/alerts",
            json={
                "event_type": "Brute Force",
                "event_category": "AUTHENTICATION",
                "severity": "HIGH",
                "description": "Valid alert after batch rejection"
            },
            headers={"Authorization": f"Bearer {source_token}"}
        )
        event = websocket.receive_json()
        assert event["data"]["description"] == "Valid alert after batch rejection"


def test_event_payload_contains_required_safe_fields():
    analyst_token, source_token = get_tokens()
    with client.websocket_connect(f"/ws?token={analyst_token}") as websocket:
        client.post(
            "/alerts",
            json={
                "event_type": "Credential Stuffing",
                "event_category": "AUTHENTICATION",
                "severity": "CRITICAL",
                "description": "Safe fields test",
                "user_context": "usr_safe"
            },
            headers={"Authorization": f"Bearer {source_token}"}
        )
        event = websocket.receive_json()
        assert "type" in event
        assert event["type"] == "ALERT_CREATED"
        data = event["data"]
        assert "alert_id" in data
        assert "alert_code" in data
        assert "event_type" in data
        assert "event_category" in data
        assert "severity" in data
        assert "status" in data
        assert "timestamp" in data
        assert data["user_context"] == "usr_safe"


def test_event_payload_contains_no_secrets_or_tokens():
    analyst_token, source_token = get_tokens()
    with client.websocket_connect(f"/ws?token={analyst_token}") as websocket:
        client.post(
            "/alerts",
            json={
                "event_type": "Credential Stuffing",
                "event_category": "AUTHENTICATION",
                "severity": "CRITICAL",
                "description": "No secrets test"
            },
            headers={"Authorization": f"Bearer {source_token}"}
        )
        event = websocket.receive_json()
        data = event["data"]
        assert "hashed_password" not in data
        assert "token" not in data
        assert "token_hash" not in data
        assert "secret" not in data


def test_websocket_endpoint_available_at_v1_prefix():
    analyst_token, _ = get_tokens()
    with client.websocket_connect(f"/api/v1/ws?token={analyst_token}") as websocket:
        assert websocket is not None
