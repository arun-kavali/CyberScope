import sys
import os
import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal
from app.auth.service import seed_default_users, QUICK_DEV_WORKSPACE_ID
from app.models.identity import Profile
from app.models.sources import DataSource
from app.models.audit import AuditLog

client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_seeded_users():
    db: Session = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()

def create_user(username: str, role_name: str = "SOC_ANALYST"):
    res = client.post(
        "/auth/signup",
        json={
            "full_name": f"Test User {username}",
            "username": username,
            "email": f"{username}@cyberscope.test",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": role_name
        }
    )
    assert res.status_code == 201
    token = res.json()["token"]
    user_id = res.json()["user"]["id"]
    return user_id, token

def get_quick_dev_tokens():
    res_analyst = client.post("/auth/login", json={"username": "analyst", "password": "Analyst123!"})
    assert res_analyst.status_code == 200
    token_analyst = res_analyst.json()["token"]

    res_source = client.post("/auth/login", json={"username": "alert_source", "password": "Source123!"})
    assert res_source.status_code == 200
    token_source = res_source.json()["token"]

    return token_analyst, token_source

def test_quick_dev_workspace_identity_and_routing():
    token_analyst, token_source = get_quick_dev_tokens()

    # 1. Quick Dev Alert Source submits alert
    ts = int(datetime.now(timezone.utc).timestamp())
    res_sub = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": f"Quick Dev test alert {ts}",
            "source_ip": "198.51.100.20",
            "user_context": f"usr_quick_dev_{ts}"
        },
        headers={"Authorization": f"Bearer {token_source}"}
    )
    assert res_sub.status_code == 201
    alert_id = res_sub.json()["id"]

    # 2. Quick Dev SOC Lead Analyst queries alerts
    res_alerts = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {token_analyst}"})
    assert res_alerts.status_code == 200
    alerts_data = res_alerts.json()
    alert_ids = [a["id"] for a in alerts_data]
    assert alert_id in alert_ids

    # 3. Quick Dev SOC Lead Analyst checks dashboard summary
    res_dash = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token_analyst}"})
    assert res_dash.status_code == 200
    assert res_dash.json()["metrics"]["live_alerts_count"] >= 1

def test_normal_users_isolated_from_quick_dev_data():
    uid_a, token_a = create_user(f"norm_analyst_{uuid.uuid4().hex[:6]}")

    # Normal user views alerts
    res_alerts = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {token_a}"})
    assert res_alerts.status_code == 200
    assert len(res_alerts.json()) == 0

    # Normal user views dashboard
    res_dash = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token_a}"})
    assert res_dash.status_code == 200
    assert res_dash.json()["metrics"]["live_alerts_count"] == 0

def test_cross_user_workspace_isolation():
    uid_a, token_a = create_user(f"user_iso_a_{uuid.uuid4().hex[:6]}")
    uid_b, token_b = create_user(f"user_iso_b_{uuid.uuid4().hex[:6]}")

    # User A imports sample dataset
    res_imp = client.post("/api/v1/alerts/sample-dataset?quantity=5", headers={"Authorization": f"Bearer {token_a}"})
    assert res_imp.status_code == 201

    # User A sees alerts
    res_a = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a.status_code == 200
    assert len(res_a.json()) >= 1

    # User B cannot see User A's alerts
    res_b = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b.status_code == 200
    assert len(res_b.json()) == 0

def test_data_source_action_endpoints_and_security():
    uid_a, token_a = create_user(f"ds_analyst_a_{uuid.uuid4().hex[:6]}")
    uid_b, token_b = create_user(f"ds_analyst_b_{uuid.uuid4().hex[:6]}")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Create CSV source for User A
    csv_bytes = b"event_type,severity,description,source_ip\nSSH_Failure,HIGH,Failed SSH login,10.0.0.5\n"
    res_up = client.post(
        "/api/v1/sources/csv",
        files={"file": ("test.csv", csv_bytes, "text/csv")},
        headers=headers_a
    )
    assert res_up.status_code == 200
    source_id = res_up.json()["data_source_id"]

    # 2. Test Connection
    res_test = client.post(f"/api/v1/sources/{source_id}/test", headers=headers_a)
    assert res_test.status_code == 200
    assert res_test.json()["success"] is True

    # 3. Refresh Schema
    res_ref = client.post(f"/api/v1/sources/{source_id}/schema/refresh", headers=headers_a)
    assert res_ref.status_code == 200
    assert len(res_ref.json()["fields"]) >= 1

    # 4. Preview Data (User A)
    res_prev = client.get(f"/api/v1/sources/{source_id}/preview?limit=20", headers=headers_a)
    assert res_prev.status_code == 200
    assert len(res_prev.json()["records"]) >= 1

    # 5. Preview Data Security: Rejection of forbidden SQL terms
    res_sql_inj = client.get(f"/api/v1/sources/{source_id}/preview?table_name=alerts;DROP TABLE alerts;", headers=headers_a)
    assert res_sql_inj.status_code == 400

    # 6. IDOR Protection: User B cannot access User A's data source action
    res_b_test = client.post(f"/api/v1/sources/{source_id}/test", headers=headers_b)
    assert res_b_test.status_code == 404

    # 7. Disconnect Source
    res_disc = client.post(f"/api/v1/sources/{source_id}/disconnect", headers=headers_a)
    assert res_disc.status_code == 200
    assert res_disc.json()["status"] == "DISCONNECTED"

def test_audit_events_logged_for_data_source_actions():
    uid_a, token_a = create_user(f"ds_audit_user_{uuid.uuid4().hex[:6]}")
    headers = {"Authorization": f"Bearer {token_a}"}

    csv_bytes = b"event_type,severity,description\nPortScan,MEDIUM,Nmap scan detected\n"
    res_up = client.post("/api/v1/sources/csv", files={"file": ("audit.csv", csv_bytes, "text/csv")}, headers=headers)
    source_id = res_up.json()["data_source_id"]

    client.post(f"/api/v1/sources/{source_id}/test", headers=headers)
    client.post(f"/api/v1/sources/{source_id}/schema/refresh", headers=headers)
    client.post(f"/api/v1/sources/{source_id}/disconnect", headers=headers)

    db: Session = SessionLocal()
    try:
        logs = db.scalars(
            select(AuditLog).where(AuditLog.target_id == str(source_id))
        ).all()
        actions = [l.action for l in logs]
        assert "DATA_SOURCE_CONNECTION_TESTED" in actions
        assert "DATA_SOURCE_SCHEMA_REFRESHED" in actions
        assert "DATA_SOURCE_DISCONNECTED" in actions
    finally:
        db.close()

def test_postgresql_connector_credential_resolution_and_special_chars():
    from app.services.sources.db_connectors import PostgreSQLConnector

    # 1. Config with special character password (e.g. 'shooter@47!')
    cfg_special = {
        "host": "localhost",
        "port": 5432,
        "user": "postgres",
        "password": "shooter@47!",
        "database": "cyberscope"
    }
    connector_special = PostgreSQLConnector(cfg_special)
    assert connector_special.validate_connection() is True

    # 2. Config with redacted password ('[REDACTED]') resolving bound credentials from DATABASE_URL
    cfg_redacted = {
        "host": "localhost",
        "port": 5432,
        "user": "[REDACTED]",
        "password": "[REDACTED]",
        "database": "cyberscope"
    }
    connector_redacted = PostgreSQLConnector(cfg_redacted)
    assert connector_redacted.validate_connection() is True

    # 3. Invalid host/password returning False cleanly
    cfg_invalid = {
        "host": "invalid-host-999.local",
        "port": 5432,
        "user": "postgres",
        "password": "wrongpassword!",
        "database": "cyberscope"
    }
    connector_invalid = PostgreSQLConnector(cfg_invalid)
    assert connector_invalid.validate_connection() is False

