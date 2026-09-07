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
from app.models.evidence import Alert, Case, Investigation, Escalation, Asset
from app.models.intelligence import Incident
from app.models.analytics import ExecutionGapFinding, NegativeSpaceFinding, Evidence, PeerBenchmark

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

def test_finding_detail_and_traceability_chain():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    db: Session = SessionLocal()
    try:
        alert = Alert(
            id=uuid.uuid4(),
            alert_code=f"ALT-{uuid.uuid4().hex[:4].upper()}",
            event_type="Unauthorized Privilege Escalation",
            event_category="ENDPOINT",
            severity="CRITICAL",
            status="NEW",
            timestamp=datetime.now(timezone.utc),
            description="Privilege escalation via cmd.exe",
            raw_payload={"username": "admin", "password": "SuperSecretPassword123!", "token": "Bearer abc123xyz"}
        )
        db.add(alert)
        db.commit()

        inv = Investigation(
            id=uuid.uuid4(),
            summary="Investigating privilege escalation",
            status="CLOSED",
            notes="Closed rapidly for testing"
        )
        db.add(inv)
        db.commit()

        inc = Incident(
            id=uuid.uuid4(),
            incident_number=f"INC-{uuid.uuid4().hex[:6].upper()}",
            title="Privilege Escalation Campaign",
            summary="Correlated alerts for endpoint escalation",
            severity="CRITICAL",
            status="OPEN",
            investigation_id=inv.id
        )
        db.add(inc)
        db.commit()

        gap = ExecutionGapFinding(
            finding_type="FAST_CLOSURE",
            severity="MEDIUM",
            reason="Potential execution gap: Investigation closed in 5 seconds crossing 30s threshold.",
            evidence={"alert_id": str(alert.id), "secret_key": "my_api_key_value"},
            supporting_records={
                "incident_id": str(inc.id),
                "investigation_id": str(inv.id),
                "alert_id": str(alert.id),
                "alert_code": alert.alert_code
            },
            threshold=30.0
        )
        db.add(gap)
        db.commit()

        gap_id = gap.id
        inc_id = inc.id
        inv_id = inv.id
        alert_id = alert.id
    finally:
        db.close()

    res = client.get(f"/api/v1/analytics/findings/{gap_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["finding_id"] == str(gap_id)
    assert data["finding_type"] == "FAST_CLOSURE"
    assert data["severity"] == "MEDIUM"
    assert "evidence_chain" in data
    assert len(data["evidence_chain"]) == 5

    chain = {node["node_type"]: node for node in data["evidence_chain"]}
    assert chain["FINDING"]["status"] == "RESOLVED"
    assert chain["CASE_INCIDENT"]["status"] == "RESOLVED"
    assert chain["CASE_INCIDENT"]["record_id"] == str(inc_id)
    assert chain["INVESTIGATION"]["status"] == "RESOLVED"
    assert chain["INVESTIGATION"]["record_id"] == str(inv_id)
    assert chain["ALERT_EVENT"]["status"] == "RESOLVED"
    assert chain["ALERT_EVENT"]["record_id"] == str(alert_id)
    assert chain["NORMALIZED_EVIDENCE"]["status"] == "RESOLVED"

    # Verify secret sanitization in analytical_signals / details
    payload_str = str(data)
    assert "SuperSecretPassword123!" not in payload_str
    assert "my_api_key_value" not in payload_str or "[REDACTED]" in payload_str

def test_missing_relationship_graceful_handling():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    db: Session = SessionLocal()
    try:
        orphan_gap = ExecutionGapFinding(
            finding_type="MISSING_ESCALATION",
            severity="HIGH",
            reason="Potential execution gap: expected escalation evidence not observed.",
            evidence={"alert_id": str(uuid.uuid4())},
            supporting_records={"incident_id": str(uuid.uuid4()), "investigation_id": str(uuid.uuid4())},
            threshold=80.0
        )
        db.add(orphan_gap)
        db.commit()
        gap_id = orphan_gap.id
    finally:
        db.close()

    res = client.get(f"/api/v1/analytics/findings/{gap_id}/traceability", headers=headers)
    assert res.status_code == 200
    data = res.json()

    chain = {node["node_type"]: node for node in data["evidence_chain"]}
    assert chain["CASE_INCIDENT"]["status"] == "NOT_OBSERVED"
    assert chain["INVESTIGATION"]["status"] == "NOT_OBSERVED"

def test_nonexistent_finding_returns_404():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    fake_id = uuid.uuid4()
    res = client.get(f"/api/v1/analytics/findings/{fake_id}", headers=headers)
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

def test_evidence_endpoint_and_sanitization():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    ev_id = uuid.uuid4()
    db: Session = SessionLocal()
    try:
        ev = Evidence(
            id=ev_id,
            entity_type="ALERT",
            entity_id=uuid.uuid4(),
            evidence_payload={
                "user": "analyst1",
                "auth_token": "secret_session_token_12345",
                "api_key": "sk_live_abcdef123456"
            }
        )
        db.add(ev)
        db.commit()
    finally:
        db.close()

    res = client.get(f"/api/v1/analytics/evidence/{ev_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["id"] == str(ev_id)
    assert data["sanitized"] is True
    payload = data["evidence_payload"]
    assert payload["auth_token"] == "[REDACTED]"
    assert payload["api_key"] == "[REDACTED]"
    assert payload["user"] == "analyst1"

def test_rbac_denial_for_alert_source():
    _, source_token = get_tokens()
    headers = {"Authorization": f"Bearer {source_token}"}

    fake_id = uuid.uuid4()
    res_f = client.get(f"/api/v1/analytics/findings/{fake_id}", headers=headers)
    assert res_f.status_code == 403

    res_e = client.get(f"/api/v1/analytics/evidence/{fake_id}", headers=headers)
    assert res_e.status_code == 403
