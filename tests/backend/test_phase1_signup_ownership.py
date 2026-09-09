import sys
import os
import uuid
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app

client = TestClient(app)

def test_1_signup_success_soc_analyst():
    uid = uuid.uuid4().hex[:8]
    payload = {
        "full_name": f"Test Analyst {uid}",
        "username": f"analyst_{uid}",
        "email": f"analyst_{uid}@cyberscope.test",
        "password": "Password123!",
        "role": "SOC_ANALYST"
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "token" in data
    assert data["user"]["username"] == f"analyst_{uid}"
    assert data["user"]["role"] == "SOC_ANALYST"
    assert "password" not in data["user"]
    assert "hashed_password" not in data["user"]

def test_2_signup_duplicate_username():
    uid = uuid.uuid4().hex[:8]
    payload = {
        "full_name": f"Test Analyst {uid}",
        "username": f"user_dup_{uid}",
        "email": f"email_{uid}@cyberscope.test",
        "password": "Password123!",
        "role": "SOC_ANALYST"
    }
    res1 = client.post("/api/v1/auth/signup", json=payload)
    assert res1.status_code == 201

    dup_payload = {
        "full_name": "Test Duplicate Username",
        "username": f"user_dup_{uid}",
        "email": f"other_{uid}@cyberscope.test",
        "password": "Password123!",
        "role": "SOC_ANALYST"
    }
    res2 = client.post("/api/v1/auth/signup", json=dup_payload)
    assert res2.status_code == 400
    assert "already registered" in res2.json()["detail"].lower()

def test_3_signup_duplicate_email():
    uid = uuid.uuid4().hex[:8]
    payload = {
        "full_name": f"Test Analyst {uid}",
        "username": f"user_email_{uid}",
        "email": f"dup_email_{uid}@cyberscope.test",
        "password": "Password123!",
        "role": "SOC_ANALYST"
    }
    res1 = client.post("/api/v1/auth/signup", json=payload)
    assert res1.status_code == 201

    dup_payload = {
        "full_name": "Test Duplicate Email",
        "username": f"other_user_{uid}",
        "email": f"dup_email_{uid}@cyberscope.test",
        "password": "Password123!",
        "role": "SOC_ANALYST"
    }
    res2 = client.post("/api/v1/auth/signup", json=dup_payload)
    assert res2.status_code == 400
    assert "already registered" in res2.json()["detail"].lower()

def test_4_signup_invalid_role():
    uid = uuid.uuid4().hex[:8]
    payload = {
        "full_name": "Hacker Impersonator",
        "username": f"fake_admin_{uid}",
        "email": f"fakeadmin_{uid}@cyberscope.test",
        "password": "Password123!",
        "role": "ADMIN"
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code in [400, 422]
    assert "invalid role" in response.json()["detail"].lower()

def test_5_signup_invalid_short_password():
    uid = uuid.uuid4().hex[:8]
    payload = {
        "full_name": "Short Pass User",
        "username": f"shortpass_{uid}",
        "email": f"shortpass_{uid}@cyberscope.test",
        "password": "123",
        "role": "SOC_ANALYST"
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 422

def test_6_login_newly_created_user():
    uid = uuid.uuid4().hex[:8]
    signup_payload = {
        "full_name": "Alert Source User One",
        "username": f"source_{uid}",
        "email": f"source_{uid}@cyberscope.test",
        "password": "SourcePassword123!",
        "role": "ALERT_SOURCE"
    }
    signup_res = client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_res.status_code == 201

    login_res = client.post("/api/v1/auth/login", json={"username": f"source_{uid}", "password": "SourcePassword123!"})
    assert login_res.status_code == 200
    data = login_res.json()
    assert data["user"]["role"] == "ALERT_SOURCE"
    assert "token" in data

def test_7_get_auth_me():
    uid = uuid.uuid4().hex[:8]
    signup_res = client.post("/api/v1/auth/signup", json={
        "full_name": f"Me User {uid}", "username": f"me_{uid}", "email": f"me_{uid}@test.com", "password": "Password123!", "role": "SOC_ANALYST"
    })
    token = signup_res.json()["token"]

    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    user = me_res.json()
    assert user["username"] == f"me_{uid}"
    assert user["role"] == "SOC_ANALYST"

def test_8_9_logout_and_session_revocation():
    uid = uuid.uuid4().hex[:8]
    signup_res = client.post("/api/v1/auth/signup", json={
        "full_name": f"Logout User {uid}", "username": f"logout_{uid}", "email": f"logout_{uid}@test.com", "password": "Password123!", "role": "SOC_ANALYST"
    })
    token = signup_res.json()["token"]

    logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # Revoked session must fail
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 401

def test_10_13_alert_source_submission_history_ownership():
    uid_a = uuid.uuid4().hex[:8]
    uid_b = uuid.uuid4().hex[:8]

    # Register Alert Source A
    res_a = client.post("/api/v1/auth/signup", json={
        "full_name": "Source A", "username": f"source_a_{uid_a}", "email": f"source_a_{uid_a}@test.com", "password": "Password123!", "role": "ALERT_SOURCE"
    })
    assert res_a.status_code == 201
    token_a = res_a.json()["token"]

    # Register Alert Source B
    res_b = client.post("/api/v1/auth/signup", json={
        "full_name": "Source B", "username": f"source_b_{uid_b}", "email": f"source_b_{uid_b}@test.com", "password": "Password123!", "role": "ALERT_SOURCE"
    })
    assert res_b.status_code == 201
    token_b = res_b.json()["token"]

    # Source A submits an alert
    alert_payload_a = {
        "event_type": "Brute Force",
        "event_category": "AUTHENTICATION",
        "severity": "HIGH",
        "user_context": "usr_source_a",
        "source_ip": "192.168.1.50",
        "description": "Source A unique alert submission test"
    }
    sub_a = client.post("/api/v1/alerts", json=alert_payload_a, headers={"Authorization": f"Bearer {token_a}"})
    assert sub_a.status_code == 201
    alert_code_a = sub_a.json()["alert_code"]

    # Source B submits an alert
    alert_payload_b = {
        "event_type": "Data Exfiltration",
        "event_category": "NETWORK",
        "severity": "CRITICAL",
        "user_context": "usr_source_b",
        "source_ip": "10.0.0.99",
        "description": "Source B unique alert submission test"
    }
    sub_b = client.post("/api/v1/alerts", json=alert_payload_b, headers={"Authorization": f"Bearer {token_b}"})
    assert sub_b.status_code == 201
    alert_code_b = sub_b.json()["alert_code"]

    # Source A views submission history
    hist_a = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {token_a}"})
    assert hist_a.status_code == 200
    codes_a = [item["alert_code"] for item in hist_a.json()]
    assert alert_code_a in codes_a
    assert alert_code_b not in codes_a

    # Source B views submission history
    hist_b = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {token_b}"})
    assert hist_b.status_code == 200
    codes_b = [item["alert_code"] for item in hist_b.json()]
    assert alert_code_b in codes_b
    assert alert_code_a not in codes_b

def test_14_15_16_report_and_response_actor_ownership():
    uid = uuid.uuid4().hex[:8]

    # Login Analyst
    res_analyst = client.post("/api/v1/auth/signup", json={
        "full_name": "Analyst Owner", "username": f"analyst_owner_{uid}", "email": f"analyst_owner_{uid}@test.com", "password": "Password123!", "role": "SOC_ANALYST"
    })
    assert res_analyst.status_code == 201
    token = res_analyst.json()["token"]

    # Generate Report
    rep_res = client.post("/api/v1/reports/generate", json={
        "report_type": "SECURITY_POSTURE",
        "title": "Ownership Audit Report",
        "format": "PDF"
    }, headers={"Authorization": f"Bearer {token}"})
    assert rep_res.status_code == 201

    # Fetch Audit log
    audit_res = client.get("/api/v1/audit", headers={"Authorization": f"Bearer {token}"})
    assert audit_res.status_code == 200
    logs = audit_res.json()["items"]
    assert len(logs) > 0
    latest_log = logs[0]
    assert latest_log["actor_user_id"] == res_analyst.json()["user"]["id"]
    assert latest_log["role"] == "SOC_ANALYST"
