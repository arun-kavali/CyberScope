import sys
import os
import uuid
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

def test_alert_monitoring_unauthenticated_rejected():
    res = client.get("/api/v1/alerts")
    assert res.status_code == 401

def test_alert_monitoring_authenticated_analyst_access():
    analyst_token, _ = get_tokens()
    res = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_analyst_detail_endpoints_deny_alert_source():
    analyst_token, source_token = get_tokens()

    # Submit alert via source token with exact valid event_type and category
    post_res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Phase 16 RBAC alert test",
            "user_context": "usr_phase16_test",
            "source_ip": "198.51.100.12"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert post_res.status_code == 201
    alert_id = post_res.json()["id"]

    # ALERT_SOURCE role attempting to access analyst endpoints
    # 1. Triage analysis
    res_ana = client.get(f"/api/v1/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {source_token}"})
    assert res_ana.status_code == 403

    # 2. Reanalyze
    res_rean = client.post(f"/api/v1/alerts/{alert_id}/reanalyze", headers={"Authorization": f"Bearer {source_token}"})
    assert res_rean.status_code == 403

    # 3. Related alerts
    res_rel = client.get(f"/api/v1/alerts/{alert_id}/related", headers={"Authorization": f"Bearer {source_token}"})
    assert res_rel.status_code == 403

    # 4. Incident relationship
    res_inc = client.get(f"/api/v1/alerts/{alert_id}/incident", headers={"Authorization": f"Bearer {source_token}"})
    assert res_inc.status_code == 403

    # 5. Timeline
    res_time = client.get(f"/api/v1/alerts/{alert_id}/timeline", headers={"Authorization": f"Bearer {source_token}"})
    assert res_time.status_code == 403

    # 6. AI intelligence
    res_ai = client.get(f"/api/v1/alerts/{alert_id}/ai", headers={"Authorization": f"Bearer {source_token}"})
    assert res_ai.status_code == 403

def test_server_side_search_and_filtering():
    analyst_token, source_token = get_tokens()

    res1 = client.post(
        "/alerts",
        json={
            "event_type": "Port Scan",
            "event_category": "NETWORK",
            "severity": "CRITICAL",
            "description": "UniqueSearchTermXYZ port scan detected",
            "user_context": "usr_alpha",
            "source_ip": "203.0.113.99"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res1.status_code == 201

    res2 = client.post(
        "/alerts",
        json={
            "event_type": "Phishing",
            "event_category": "EMAIL",
            "severity": "LOW",
            "description": "Email phishing test message",
            "user_context": "usr_beta",
            "source_ip": "198.51.100.4"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res2.status_code == 201

    # Search filter
    res_search = client.get("/api/v1/alerts?search=UniqueSearchTermXYZ", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert len(search_data) >= 1
    assert search_data[0]["event_type"] == "Port Scan"

    # Category filter
    res_cat = client.get("/api/v1/alerts?category=NETWORK", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_cat.status_code == 200
    for a in res_cat.json():
        assert a["event_category"] == "NETWORK"

    # Severity filter
    res_sev = client.get("/api/v1/alerts?severity=CRITICAL", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_sev.status_code == 200
    for a in res_sev.json():
        assert a["severity"] == "CRITICAL"

    # User context filter
    res_usr = client.get("/api/v1/alerts?user=usr_alpha", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_usr.status_code == 200
    assert len(res_usr.json()) >= 1
    assert res_usr.json()[0]["user_context"] == "usr_alpha"

def test_pagination():
    analyst_token, _ = get_tokens()
    res_p1 = client.get("/api/v1/alerts?page=1&page_size=2", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_p1.status_code == 200
    p1_data = res_p1.json()
    assert len(p1_data) <= 2

    res_p2 = client.get("/api/v1/alerts?page=2&page_size=2", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_p2.status_code == 200

def test_alert_detail_workflow_and_reanalyze():
    analyst_token, source_token = get_tokens()

    post_res = client.post(
        "/alerts",
        json={
            "event_type": "Malware Detection",
            "event_category": "ENDPOINT",
            "severity": "HIGH",
            "description": "Malware execution on endpoint EP-1002",
            "asset_context": "EP-1002",
            "source_ip": "10.0.0.50"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert post_res.status_code == 201
    alert_id = post_res.json()["id"]

    # Get single alert detail
    res_detail = client.get(f"/api/v1/alerts/{alert_id}", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_detail.status_code == 200
    assert res_detail.json()["id"] == alert_id

    # Get analysis
    res_ana = client.get(f"/api/v1/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_ana.status_code == 200
    ana_data = res_ana.json()
    assert "findings" in ana_data

    # Reanalyze alert
    res_rean = client.post(f"/api/v1/alerts/{alert_id}/reanalyze", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_rean.status_code == 200
    assert res_rean.json()["id"] == ana_data["id"]

    # Get timeline
    res_time = client.get(f"/api/v1/alerts/{alert_id}/timeline", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_time.status_code == 200
    timeline = res_time.json()
    assert len(timeline) >= 2

def test_nonexistent_alert_returns_404():
    analyst_token, _ = get_tokens()
    fake_id = str(uuid.uuid4())
    res = client.get(f"/api/v1/alerts/{fake_id}", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res.status_code == 404
