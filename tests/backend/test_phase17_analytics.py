import sys
import os
import pytest
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

def test_analytics_unauthenticated_rejected():
    res = client.get("/api/v1/analytics/summary")
    assert res.status_code == 401

    res_run = client.post("/api/v1/analytics/run")
    assert res_run.status_code == 401

def test_analytics_alert_source_denied():
    _, source_token = get_tokens()

    res_sum = client.get("/api/v1/analytics/summary", headers={"Authorization": f"Bearer {source_token}"})
    assert res_sum.status_code == 403

    res_run = client.post("/api/v1/analytics/run", headers={"Authorization": f"Bearer {source_token}"})
    assert res_run.status_code == 403

    res_find = client.get("/api/v1/analytics/findings", headers={"Authorization": f"Bearer {source_token}"})
    assert res_find.status_code == 403

def test_analytics_analyst_access_and_metrics():
    analyst_token, source_token = get_tokens()

    # Ingest a sample alert
    client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "CRITICAL",
            "description": "Phase 17 analytics alert test",
            "user_context": "usr_phase17",
            "source_ip": "198.51.100.22"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )

    # 1. GET /api/v1/analytics/summary
    res_summary = client.get("/api/v1/analytics/summary", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_summary.status_code == 200
    data = res_summary.json()

    assert "alert_analytics" in data
    assert "incident_analytics" in data
    assert "investigation_analytics" in data
    assert "escalation_analytics" in data
    assert "disposition_analytics" in data
    assert "entity_analytics" in data
    assert "time_series" in data
    assert data["alert_analytics"]["total_alerts"] >= 1
    assert data["data_quality_status"] in ["NORMAL", "INSUFFICIENT_DATA", "NO_DATA"]

    # 2. POST /api/v1/analytics/run
    res_run = client.post("/api/v1/analytics/run?days=30", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_run.status_code == 200
    run_data = res_run.json()
    assert run_data["alert_analytics"]["total_alerts"] >= 1

    # 3. GET /api/v1/analytics/findings
    res_findings = client.get("/api/v1/analytics/findings", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_findings.status_code == 200
    assert isinstance(res_findings.json(), list)
