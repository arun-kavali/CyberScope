import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.main import app
from app.db.session import get_db
from app.models.identity import Profile, Role
from app.models.audit import Report, AuditLog
from app.models.evidence import Alert, Investigation

client = TestClient(app)

@pytest.fixture
def db_session():
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

def test_phase3_user_signup_login_me():
    """Verify signup, login, and identity verification for Analyst A and Analyst B."""
    # 1. Signup Analyst A
    email_a = f"analyst_a_{uuid.uuid4().hex[:6]}@cyberscope.io"
    res_a = client.post("/api/v1/auth/signup", json={
        "username": f"analyst_a_{uuid.uuid4().hex[:6]}",
        "email": email_a,
        "password": "SecureTestPassword123!",
        "full_name": "Analyst A Test",
        "role": "SOC_ANALYST"
    })
    assert res_a.status_code == 201
    data_a = res_a.json()
    token_a = data_a["token"]
    user_a_id = data_a["user"]["id"]

    # 2. Signup Analyst B
    email_b = f"analyst_b_{uuid.uuid4().hex[:6]}@cyberscope.io"
    res_b = client.post("/api/v1/auth/signup", json={
        "username": f"analyst_b_{uuid.uuid4().hex[:6]}",
        "email": email_b,
        "password": "SecureTestPassword123!",
        "full_name": "Analyst B Test",
        "role": "SOC_ANALYST"
    })
    assert res_b.status_code == 201
    data_b = res_b.json()
    token_b = data_b["token"]
    user_b_id = data_b["user"]["id"]

    assert user_a_id != user_b_id

    # 3. Verify /auth/me identity match for A
    me_a = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    assert me_a.status_code == 200
    assert me_a.json()["id"] == user_a_id

    # 4. Verify /auth/me identity match for B
    me_b = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_b}"})
    assert me_b.status_code == 200
    assert me_b.json()["id"] == user_b_id

def test_phase3_alert_source_submission_isolation():
    """Verify Alert Source A submissions are hidden from Alert Source B."""
    # 1. Signup Alert Source A
    res_a = client.post("/api/v1/auth/signup", json={
        "username": f"src_a_{uuid.uuid4().hex[:6]}",
        "email": f"src_a_{uuid.uuid4().hex[:6]}@cyberscope.io",
        "password": "SecureTestPassword123!",
        "full_name": "Alert Source A",
        "role": "ALERT_SOURCE"
    })
    assert res_a.status_code == 201
    token_a = res_a.json()["token"]

    # 2. Signup Alert Source B
    res_b = client.post("/api/v1/auth/signup", json={
        "username": f"src_b_{uuid.uuid4().hex[:6]}",
        "email": f"src_b_{uuid.uuid4().hex[:6]}@cyberscope.io",
        "password": "SecureTestPassword123!",
        "full_name": "Alert Source B",
        "role": "ALERT_SOURCE"
    })
    assert res_b.status_code == 201
    token_b = res_b.json()["token"]

    # 3. Source A submits an alert
    post_a = client.post("/api/v1/alerts", headers={"Authorization": f"Bearer {token_a}"}, json={
        "event_type": "Suspicious PowerShell",
        "event_category": "ENDPOINT",
        "severity": "HIGH",
        "user_context": "USR-4821",
        "asset_context": "EP-0017",
        "description": "Alert Source A test alert submission"
    })
    assert post_a.status_code == 201
    alert_a_id = post_a.json()["id"]

    # 4. Source B submits an alert
    post_b = client.post("/api/v1/alerts", headers={"Authorization": f"Bearer {token_b}"}, json={
        "event_type": "Brute Force",
        "event_category": "AUTHENTICATION",
        "severity": "MEDIUM",
        "user_context": "USR-9901",
        "asset_context": "SRV-0002",
        "description": "Alert Source B test alert submission"
    })
    assert post_b.status_code == 201
    alert_b_id = post_b.json()["id"]

    # 5. Source A queries GET /api/v1/alerts -> sees A's alert, not B's
    list_a = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {token_a}"})
    assert list_a.status_code == 200
    a_items = list_a.json()
    a_ids = [item["id"] for item in a_items]
    assert alert_a_id in a_ids
    assert alert_b_id not in a_ids

    # 6. Source B queries GET /api/v1/alerts -> sees B's alert, not A's
    list_b = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200
    b_items = list_b.json()
    b_ids = [item["id"] for item in b_items]
    assert alert_b_id in b_ids
    assert alert_a_id not in b_ids

def test_phase3_report_ownership_and_cross_user_isolation(db_session: Session):
    """Verify Report ownership and 403 authorization error on cross-user GET request."""
    # 1. Signup Analyst A & B
    res_a = client.post("/api/v1/auth/signup", json={
        "username": f"rpt_analyst_a_{uuid.uuid4().hex[:6]}",
        "email": f"rpt_analyst_a_{uuid.uuid4().hex[:6]}@cyberscope.io",
        "password": "SecureTestPassword123!",
        "full_name": "Report Analyst A",
        "role": "SOC_ANALYST"
    })
    token_a = res_a.json()["token"]

    res_b = client.post("/api/v1/auth/signup", json={
        "username": f"rpt_analyst_b_{uuid.uuid4().hex[:6]}",
        "email": f"rpt_analyst_b_{uuid.uuid4().hex[:6]}@cyberscope.io",
        "password": "SecureTestPassword123!",
        "full_name": "Report Analyst B",
        "role": "SOC_ANALYST"
    })
    token_b = res_b.json()["token"]

    # 2. User A generates a report
    gen_res = client.post("/api/v1/reports/generate", headers={"Authorization": f"Bearer {token_a}"}, json={
        "report_type": "EXECUTIVE_SUMMARY",
        "title": "Analyst A Executive Summary Report",
        "format": "JSON"
    })
    assert gen_res.status_code == 201
    report_a = gen_res.json()
    report_a_id = report_a["id"]

    # 3. User A retrieves report -> 200 OK
    get_a = client.get(f"/api/v1/reports/{report_a_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert get_a.status_code == 200
    assert get_a.json()["id"] == report_a_id

    # 4. User B attempts direct GET /api/v1/reports/{report_a_id} -> 403 Forbidden
    get_b = client.get(f"/api/v1/reports/{report_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert get_b.status_code == 403
    assert "Access denied" in get_b.json()["detail"]

    # 5. User B attempts direct GET /api/v1/reports/{report_a_id}/download -> 403 Forbidden
    dl_b = client.get(f"/api/v1/reports/{report_a_id}/download", headers={"Authorization": f"Bearer {token_b}"})
    assert dl_b.status_code == 403

def test_phase3_audit_log_actor_attribution(db_session: Session):
    """Verify audit log records actual authenticated user ID as actor."""
    res_a = client.post("/api/v1/auth/signup", json={
        "username": f"audit_analyst_{uuid.uuid4().hex[:6]}",
        "email": f"audit_analyst_{uuid.uuid4().hex[:6]}@cyberscope.io",
        "password": "SecureTestPassword123!",
        "full_name": "Audit Analyst",
        "role": "SOC_ANALYST"
    })
    token_a = res_a.json()["token"]
    user_id_a = res_a.json()["user"]["id"]

    # Generate report
    gen_res = client.post("/api/v1/reports/generate", headers={"Authorization": f"Bearer {token_a}"}, json={
        "report_type": "GOVERNANCE",
        "title": "Audit Governance Report",
        "format": "JSON"
    })
    assert gen_res.status_code == 201
    report_id = gen_res.json()["id"]

    # Verify AuditLog in DB
    audit = db_session.scalar(
        select(AuditLog).where(AuditLog.target_id == str(report_id))
    )
    assert audit is not None
    assert str(audit.actor_user_id) == user_id_a

def test_phase3_database_foreign_keys_and_orphans(db_session: Session):
    """Verify zero orphan records and valid schema relationships."""
    orphan_alerts = db_session.scalar(
        select(func.count(Alert.id)).where(
            Alert.submitted_by_user_id.isnot(None),
            ~Alert.submitted_by_user_id.in_(select(Profile.id))
        )
    ) or 0
    assert orphan_alerts == 0

    orphan_reports = db_session.scalar(
        select(func.count(Report.id)).where(
            Report.generated_by.isnot(None),
            ~Report.generated_by.in_(select(Profile.id))
        )
    ) or 0
    assert orphan_reports == 0
