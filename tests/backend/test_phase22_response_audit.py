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
from app.auth.service import seed_default_users
from app.models.response import ResponsePolicy, ResponseAction, SandboxUser, SandboxEndpoint, SandboxFirewallRule
from app.models.audit import AuditLog
from app.services.audit_service import AuditService
from app.services.response_service import ResponseService

client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_seeded_users():
    db: Session = SessionLocal()
    try:
        seed_default_users(db)
        ResponseService.seed_default_policies(db)
        ResponseService.seed_sandbox_entities(db)
    finally:
        db.close()

def get_tokens():
    analyst_res = client.post("/auth/login", json={"username": "analyst", "password": "Analyst123!"})
    analyst_token = analyst_res.json()["token"]

    source_res = client.post("/auth/login", json={"username": "alert_source", "password": "Source123!"})
    source_token = source_res.json()["token"]

    return analyst_token, source_token


def test_response_policy_retrieval_and_evaluation():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Retrieve policies
    res = client.get("/api/v1/response/policies", headers=headers)
    assert res.status_code == 200, res.text
    policies = res.json()
    assert len(policies) >= 6

    # 2. Evaluate high risk IP policy (risk=95, confidence=90, malicious_indicator=True -> BLOCK_IP)
    eval_payload = {
        "target_entity_type": "IP",
        "target_entity_id": "185.220.101.5",
        "risk_score": 95.0,
        "confidence_score": 90.0,
        "malicious_indicator": True
    }
    eval_res = client.post("/api/v1/response/evaluate", json=eval_payload, headers=headers)
    assert eval_res.status_code == 200, eval_res.text
    eval_data = eval_res.json()
    assert eval_data["action_type"] == "BLOCK_IP"
    assert eval_data["status"] == "PENDING_APPROVAL"
    assert eval_data["policy_id_code"] == "POL-001"


def test_analyst_approval_sandbox_execution_and_rollback():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Create a response action to isolate endpoint EP-0017
    action_payload = {
        "action_type": "ISOLATE_ENDPOINT",
        "target_entity_type": "ENDPOINT",
        "target_entity_id": "EP-0017",
        "reason": "Suspicious C2 beaconing activity"
    }
    create_res = client.post("/api/v1/response/actions", json=action_payload, headers=headers)
    assert create_res.status_code == 200, create_res.text
    action_id = create_res.json()["id"]
    assert create_res.json()["status"] == "PENDING_APPROVAL"

    # 2. Approve action -> triggers sandbox execution
    approve_res = client.post(f"/api/v1/response/actions/{action_id}/approve", json={"reason": "Approved containment"}, headers=headers)
    assert approve_res.status_code == 200, approve_res.text
    assert approve_res.json()["status"] == "EXECUTED"

    # Verify sandbox state in DB (EP-0017 status is now ISOLATED)
    db: Session = SessionLocal()
    try:
        ep = db.scalar(select(SandboxEndpoint).where(SandboxEndpoint.endpoint_code == "EP-0017"))
        assert ep is not None
        assert ep.status == "ISOLATED"
    finally:
        db.close()

    # 3. Rollback action -> restores sandbox state to CONNECTED
    rollback_res = client.post(f"/api/v1/response/actions/{action_id}/rollback", json={"reason": "False positive resolved"}, headers=headers)
    assert rollback_res.status_code == 200, rollback_res.text
    assert rollback_res.json()["status"] == "ROLLED_BACK"

    # Verify sandbox state restored to CONNECTED in DB
    db = SessionLocal()
    try:
        ep = db.scalar(select(SandboxEndpoint).where(SandboxEndpoint.endpoint_code == "EP-0017"))
        assert ep.status == "CONNECTED"
    finally:
        db.close()


def test_analyst_rejection():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # Create action to disable user USR-4821
    action_payload = {
        "action_type": "DISABLE_USER",
        "target_entity_type": "USER",
        "target_entity_id": "USR-4821",
        "reason": "Anomalous login pattern"
    }
    create_res = client.post("/api/v1/response/actions", json=action_payload, headers=headers)
    action_id = create_res.json()["id"]

    # Reject action
    reject_res = client.post(f"/api/v1/response/actions/{action_id}/reject", json={"reason": "User verified identity via out-of-band call"}, headers=headers)
    assert reject_res.status_code == 200, reject_res.text
    assert reject_res.json()["status"] == "REJECTED"


def test_investigate_further_action():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    action_payload = {
        "action_type": "INVESTIGATE_FURTHER",
        "target_entity_type": "ALERT",
        "target_entity_id": "ALT-TEST-999",
        "reason": "Deep forensic investigation needed"
    }
    create_res = client.post("/api/v1/response/actions", json=action_payload, headers=headers)
    action_id = create_res.json()["id"]

    approve_res = client.post(f"/api/v1/response/actions/{action_id}/approve", headers=headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "EXECUTED"


def test_audit_log_retrieval_pagination_and_secret_masking():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Log a test audit event with a sensitive key
    db: Session = SessionLocal()
    try:
        AuditService.log_event(
            db=db,
            action="TEST_SECRET_ACTION",
            reason="Testing audit secret masking",
            audit_metadata={"password": "super_secret_password_123", "safe_field": "visible_value"}
        )
    finally:
        db.close()

    # 2. Query audit endpoint
    res = client.get("/api/v1/audit?page=1&page_size=10", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "items" in data
    assert data["total"] > 0

    # Verify secret masking
    test_item = next((item for item in data["items"] if item["action"] == "TEST_SECRET_ACTION"), None)
    assert test_item is not None
    assert test_item["audit_metadata"]["password"] == "[REDACTED]"
    assert test_item["audit_metadata"]["safe_field"] == "visible_value"


def test_rbac_alert_source_denial():
    _, source_token = get_tokens()
    headers = {"Authorization": f"Bearer {source_token}"}

    # ALERT_SOURCE receives 403 Forbidden on all response & audit endpoints
    assert client.get("/api/v1/response/policies", headers=headers).status_code == 403
    assert client.get("/api/v1/response/actions", headers=headers).status_code == 403
    assert client.post("/api/v1/response/evaluate", json={"target_entity_type": "IP", "target_entity_id": "1.1.1.1"}, headers=headers).status_code == 403
    assert client.get("/api/v1/audit", headers=headers).status_code == 403
