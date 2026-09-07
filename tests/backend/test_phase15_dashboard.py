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
def setup_users():
    db: Session = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()

def get_analyst_token():
    res = client.post("/auth/login", json={"username": "analyst", "password": "Analyst123!"})
    return res.json()["token"]

def get_source_token():
    res = client.post("/auth/login", json={"username": "alert_source", "password": "Source123!"})
    return res.json()["token"]

def test_dashboard_unauthenticated_denied():
    res = client.get("/api/v1/dashboard/summary")
    assert res.status_code == 401

def test_dashboard_alert_source_denied():
    token = get_source_token()
    res = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403

def test_dashboard_analyst_allowed():
    token = get_analyst_token()
    res = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "severity_distribution" in data
    assert "risk_distribution" in data
    assert "source_distribution" in data
    assert "critical_alerts" in data
    assert "active_incidents" in data
    assert "operational_indicators" in data

def test_dashboard_empty_state_handling():
    token = get_analyst_token()
    res = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    metrics = data["metrics"]
    assert isinstance(metrics["live_alerts_count"], int)
    assert isinstance(metrics["critical_high_alerts_count"], int)
    assert isinstance(metrics["active_incidents_count"], int)
