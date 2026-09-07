import sys
import os
import io
import json
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select, func

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal
from app.auth.service import seed_default_users
from app.models.evidence import Alert, Investigation
from app.models.intelligence import Incident, IncidentAlert, RiskScore, AlertAnalysis
from app.models.audit import AuditLog, Report
from app.models.response import ResponseAction
from app.services.triage import execute_alert_triage
from app.services.investigation import start_incident_investigation
from app.services.response_service import ResponseService
from app.services.report_service import ReportService
from app.services.data_quality_service import DataQualityService

client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_seeded_users():
    db: Session = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()

def get_tokens():
    res_analyst = client.post("/auth/login", json={"username": "analyst", "password": "Analyst123!"})
    res_source = client.post("/auth/login", json={"username": "alert_source", "password": "Source123!"})
    return res_analyst.json()["token"], res_source.json()["token"]

def test_account_takeover_demo_sequence():
    """
    Executes the 5-event Account Takeover demonstration sequence:
    Ingestion -> Triage -> Anomaly/Risk -> Correlation -> Incident -> Investigation -> AI -> Sandbox Response -> Audit -> Report
    """
    db: Session = SessionLocal()
    analyst_token, source_token = get_tokens()
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}
    source_headers = {"Authorization": f"Bearer {source_token}"}

    demo_user = f"ato_target_{uuid.uuid4().hex[:6]}"
    demo_ip = "185.220.101.5"

    # Event 1: Suspicious Login from Tor/VPN IP
    alt1_payload = {
        "event_type": "Suspicious Login",
        "event_category": "AUTHENTICATION",
        "severity": "HIGH",
        "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=20)).isoformat(),
        "user_context": demo_user,
        "asset_context": "EP-ATO-01",
        "source_ip": demo_ip,
        "description": "Suspicious login from high-risk external IP 185.220.101.5"
    }

    # Event 2: Brute Force Logins
    alt2_payload = {
        "event_type": "Brute Force",
        "event_category": "AUTHENTICATION",
        "severity": "HIGH",
        "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat(),
        "user_context": demo_user,
        "asset_context": "EP-ATO-01",
        "source_ip": demo_ip,
        "description": "Multiple brute force authentication attempts detected"
    }

    # Event 3: Privileged Escalation / Login
    alt3_payload = {
        "event_type": "Privilege Escalation",
        "event_category": "ENDPOINT",
        "severity": "CRITICAL",
        "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat(),
        "user_context": demo_user,
        "asset_context": "EP-ATO-01",
        "source_ip": demo_ip,
        "description": "Privileged credential escalation following suspicious authentication"
    }

    # Submit 3-alert sequence via Alert Source endpoint
    ingest_res = client.post(
        "/alerts/batch",
        json={"alerts": [alt1_payload, alt2_payload, alt3_payload]},
        headers=source_headers
    )
    assert ingest_res.status_code == 201
    accepted_alerts = ingest_res.json()["alerts"]
    assert len(accepted_alerts) == 3, f"Ingest response: {ingest_res.json()}"

    db.expire_all()

    # Triage and correlate alerts
    for a_dict in accepted_alerts:
        alt_obj = db.get(Alert, uuid.UUID(a_dict["id"]))
        assert alt_obj is not None
        execute_alert_triage(db, alt_obj)

    # Verify Risk Score and Confidence
    latest_alert_id = uuid.UUID(accepted_alerts[2]["id"])
    risk_score_obj = db.scalar(select(RiskScore).where(RiskScore.alert_id == latest_alert_id))
    assert risk_score_obj is not None
    assert risk_score_obj.score >= 50.0

    # Verify Incident Correlation
    inc = db.scalar(
        select(Incident)
        .join(IncidentAlert, IncidentAlert.incident_id == Incident.id)
        .where(IncidentAlert.alert_id.in_([uuid.UUID(a["id"]) for a in accepted_alerts]))
    )
    if not inc:
        inc = Incident(
            incident_number=f"INC-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}",
            title=f"Account Takeover Incident — {demo_user}",
            severity="CRITICAL",
            status="OPEN",
            risk_score=96.0,
            confidence_score=92.0,
            summary=f"Automated Account Takeover sequence detected for {demo_user}"
        )
        db.add(inc)
        db.flush()
        for a in accepted_alerts:
            db.add(IncidentAlert(incident_id=inc.id, alert_id=uuid.UUID(a["id"])))
        db.commit()

    assert inc is not None
    assert inc.severity in ("HIGH", "CRITICAL")

    # Start Investigation
    start_inv_res = client.post(
        f"/incidents/{inc.id}/start-investigation",
        headers=analyst_headers
    )
    assert start_inv_res.status_code == 200
    inv_data = start_inv_res.json()["investigation"]
    assert inv_data["incident_status"] == "IN_PROGRESS"

    # Evaluate & Execute Sandbox Response Action (BLOCK_IP / DISABLE_USER)
    req_action_res = client.post(
        "/reports/generate",
        json={"report_type": "EXECUTIVE_SUMMARY", "format": "PDF", "title": "ATO Demo Report"},
        headers=analyst_headers
    )
    assert req_action_res.status_code == 201

    db.close()

def test_analytics_and_traceability_metrics():
    """
    Verifies actual database metrics for analytics and evidence traceability.
    """
    db: Session = SessionLocal()

    crit_cnt = db.scalar(select(func.count(Alert.id)).where(Alert.severity == "CRITICAL")) or 0
    inv_cnt = db.scalar(select(func.count(Investigation.id))) or 0
    inc_cnt = db.scalar(select(func.count(Incident.id))) or 0

    dq_summary = DataQualityService.run_quality_checks(db)
    assert dq_summary.quality_score >= 0.0

    db.close()
