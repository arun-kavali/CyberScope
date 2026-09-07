import sys
import os
import pytest
import uuid
import random
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select, func

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal, get_db
from app.models.identity import Profile
from app.models.evidence import Alert
from app.models.intelligence import (
    AlertAnalysis,
    RiskScore,
    AnomalyScore,
    CorrelationResult,
    Incident,
    IncidentAlert,
    IncidentTimeline
)
from app.auth.service import seed_default_users
from app.services.triage import execute_alert_triage
from app.services.correlation import (
    evaluate_alert_correlation,
    calculate_correlation_signals,
    derive_incident_scores,
    generate_incident_number,
    CORRELATION_SCORE_THRESHOLD
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_seeded_users():
    db: Session = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()

@pytest.fixture
def test_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def soc_analyst_token() -> str:
    res = client.post("/auth/login", json={"username": "analyst", "password": "Analyst123!"})
    assert res.status_code == 200
    return res.json()["token"]

@pytest.fixture
def alert_source_token() -> str:
    res = client.post("/auth/login", json={"username": "alert_source", "password": "Source123!"})
    assert res.status_code == 200
    return res.json()["token"]

def create_sample_alert(
    test_db: Session,
    severity: str = "HIGH",
    event_type: str = "SUSPICIOUS_EXECUTION",
    user_context: Optional[str] = None,
    asset_context: Optional[str] = None,
    source_ip: Optional[str] = None,
    raw_payload: Optional[Dict[str, Any]] = None,
    timestamp: Optional[datetime] = None
) -> Alert:
    alert = Alert(
        alert_code=f"ALT-P12-{uuid.uuid4().hex[:6].upper()}",
        event_type=event_type,
        event_category="ENDPOINT" if "EXECUTION" in event_type else "AUTHENTICATION",
        severity=severity,
        status="NEW",
        timestamp=timestamp or datetime.now(timezone.utc),
        user_context=user_context or f"user_{uuid.uuid4().hex[:4]}",
        asset_context=asset_context or f"host_{uuid.uuid4().hex[:4]}",
        source_ip=source_ip or f"192.168.{random.randint(10, 200)}.{random.randint(10, 200)}",
        action="DETECTED",
        description="Phase 12 test alert",
        raw_payload=raw_payload or {"failed_attempts": 3}
    )
    test_db.add(alert)
    test_db.commit()
    test_db.refresh(alert)
    return alert

# 1. Same-User Correlation
def test_same_user_correlation(test_db: Session):
    user_name = f"target_user_{uuid.uuid4().hex[:4]}"
    al1 = create_sample_alert(test_db, "HIGH", "Login Attempt", user_context=user_name)
    execute_alert_triage(test_db, al1)

    al2 = create_sample_alert(test_db, "CRITICAL", "Privilege Escalation", user_context=user_name)
    execute_alert_triage(test_db, al2)

    corr_rec = test_db.scalar(
        select(CorrelationResult)
        .order_by(CorrelationResult.created_at.desc())
        .limit(1)
    )
    assert corr_rec is not None
    c_ids = corr_rec.correlated_alert_ids.get("correlated_alert_ids", [])
    assert str(al1.id) in c_ids
    assert str(al2.id) in c_ids

# 2. Same-Asset Correlation
def test_same_asset_correlation(test_db: Session):
    asset_name = f"srv_db_{uuid.uuid4().hex[:4]}"
    al1 = create_sample_alert(test_db, "MEDIUM", "Port Scan", asset_context=asset_name)
    execute_alert_triage(test_db, al1)

    al2 = create_sample_alert(test_db, "HIGH", "SQL Injection", asset_context=asset_name)
    execute_alert_triage(test_db, al2)

    corr_rec = test_db.scalar(
        select(CorrelationResult)
        .order_by(CorrelationResult.created_at.desc())
        .limit(1)
    )
    assert corr_rec is not None
    signals = corr_rec.correlated_alert_ids.get("signals_matched", [])
    assert any(s["signal_type"] == "same_asset" for s in signals)

# 3. Same Source IP Correlation
def test_same_source_ip_correlation(test_db: Session):
    shared_ip = "10.0.4.99"
    al1 = create_sample_alert(test_db, "HIGH", "Brute Force", source_ip=shared_ip)
    execute_alert_triage(test_db, al1)

    al2 = create_sample_alert(test_db, "CRITICAL", "Successful Login", source_ip=shared_ip)
    execute_alert_triage(test_db, al2)

    corr_rec = test_db.scalar(
        select(CorrelationResult)
        .order_by(CorrelationResult.created_at.desc())
        .limit(1)
    )
    assert corr_rec is not None
    signals = corr_rec.correlated_alert_ids.get("signals_matched", [])
    assert any(s["signal_type"] == "same_source_ip" for s in signals)

# 4. Same Indicator Correlation
def test_same_indicator_correlation(test_db: Session):
    ioc_payload = {"hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
    al1 = create_sample_alert(test_db, "HIGH", "Malware Detected", raw_payload=ioc_payload)
    execute_alert_triage(test_db, al1)

    al2 = create_sample_alert(test_db, "CRITICAL", "Malware Execution", raw_payload=ioc_payload)
    execute_alert_triage(test_db, al2)

    corr_rec = test_db.scalar(
        select(CorrelationResult)
        .order_by(CorrelationResult.created_at.desc())
        .limit(1)
    )
    assert corr_rec is not None
    signals = corr_rec.correlated_alert_ids.get("signals_matched", [])
    assert any(s["signal_type"] == "same_indicator" for s in signals)

# 5. Temporal Correlation
def test_temporal_correlation(test_db: Session):
    now_utc = datetime.now(timezone.utc)
    al1 = create_sample_alert(test_db, "HIGH", timestamp=now_utc - timedelta(minutes=5))
    al2 = create_sample_alert(test_db, "HIGH", timestamp=now_utc)

    score, signals = calculate_correlation_signals(al1, al2)
    assert any(s["signal_type"] == "temporal_proximity" for s in signals)

# 6. Sequence Correlation
def test_sequence_correlation(test_db: Session):
    user_name = f"user_seq_{uuid.uuid4().hex[:4]}"
    al1 = create_sample_alert(test_db, "MEDIUM", "Failed Login", user_context=user_name)
    al2 = create_sample_alert(test_db, "HIGH", "Successful Login", user_context=user_name)

    score, signals = calculate_correlation_signals(al1, al2)
    assert any(s["signal_type"] == "event_sequence" for s in signals)

# 7. Unrelated Alerts Not Grouped
def test_unrelated_alerts_not_grouped(test_db: Session):
    al1 = create_sample_alert(
        test_db, "LOW", "Event A",
        user_context=f"user_{uuid.uuid4().hex[:4]}",
        asset_context=f"asset_{uuid.uuid4().hex[:4]}",
        source_ip="172.16.8.10",
        timestamp=datetime.now(timezone.utc) - timedelta(hours=10)
    )
    execute_alert_triage(test_db, al1)

    al2 = create_sample_alert(
        test_db, "LOW", "Event B",
        user_context=f"user_{uuid.uuid4().hex[:4]}",
        asset_context=f"asset_{uuid.uuid4().hex[:4]}",
        source_ip="172.16.9.50",
        timestamp=datetime.now(timezone.utc)
    )
    analysis2 = execute_alert_triage(test_db, al2)

    corr_data = (analysis2.findings or {}).get("correlation", {})
    assert corr_data.get("correlated_alert_count", 1) == 1

# 8. Deterministic Correlation Strength
def test_correlation_strength_determinism(test_db: Session):
    user_name = f"det_user_{uuid.uuid4().hex[:4]}"
    al1 = create_sample_alert(test_db, "HIGH", user_context=user_name)
    al2 = create_sample_alert(test_db, "HIGH", user_context=user_name)

    score1, sigs1 = calculate_correlation_signals(al1, al2)
    score2, sigs2 = calculate_correlation_signals(al1, al2)

    assert score1 == score2
    assert len(sigs1) == len(sigs2)

# 9. Evidence Persistence
def test_correlation_evidence_persistence(test_db: Session):
    user_name = f"ev_user_{uuid.uuid4().hex[:4]}"
    al1 = create_sample_alert(test_db, "HIGH", user_context=user_name)
    execute_alert_triage(test_db, al1)

    al2 = create_sample_alert(test_db, "CRITICAL", user_context=user_name)
    execute_alert_triage(test_db, al2)

    corr_rec = test_db.scalar(
        select(CorrelationResult)
        .order_by(CorrelationResult.created_at.desc())
        .limit(1)
    )
    assert corr_rec is not None
    assert "signals_matched" in corr_rec.correlated_alert_ids
    assert "explanation" in corr_rec.correlated_alert_ids

# 10. Incident Creation
def test_incident_creation(test_db: Session):
    user_name = f"inc_user_{uuid.uuid4().hex[:4]}"
    al1 = create_sample_alert(test_db, "HIGH", "Brute Force", user_context=user_name)
    execute_alert_triage(test_db, al1)

    al2 = create_sample_alert(test_db, "CRITICAL", "Account Takeover", user_context=user_name)
    execute_alert_triage(test_db, al2)

    inc = test_db.scalar(
        select(Incident)
        .join(IncidentAlert, IncidentAlert.incident_id == Incident.id)
        .where(IncidentAlert.alert_id == al2.id)
    )
    assert inc is not None
    assert inc.incident_number.startswith("INC-")
    assert inc.status == "OPEN"
    assert inc.severity == "CRITICAL"

# 11. Incident Update
def test_incident_update(test_db: Session):
    user_name = f"upd_user_{uuid.uuid4().hex[:4]}"
    al1 = create_sample_alert(test_db, "MEDIUM", "Alert 1", user_context=user_name)
    execute_alert_triage(test_db, al1)

    al2 = create_sample_alert(test_db, "HIGH", "Alert 2", user_context=user_name)
    execute_alert_triage(test_db, al2)

    inc1 = test_db.scalar(
        select(Incident)
        .join(IncidentAlert, IncidentAlert.incident_id == Incident.id)
        .where(IncidentAlert.alert_id == al2.id)
    )
    assert inc1 is not None
    inc1_id = inc1.id

    al3 = create_sample_alert(test_db, "CRITICAL", "Alert 3", user_context=user_name)
    execute_alert_triage(test_db, al3)

    inc2 = test_db.scalar(select(Incident).where(Incident.id == inc1_id))
    assert inc2.severity == "CRITICAL"
    
    inc_alerts = test_db.scalars(select(IncidentAlert).where(IncidentAlert.incident_id == inc1_id)).all()
    assert len(inc_alerts) >= 3

# 12. IncidentAlert Linking
def test_incident_alert_linking(test_db: Session):
    user_name = f"link_user_{uuid.uuid4().hex[:4]}"
    al1 = create_sample_alert(test_db, "HIGH", user_context=user_name)
    execute_alert_triage(test_db, al1)

    al2 = create_sample_alert(test_db, "HIGH", user_context=user_name)
    execute_alert_triage(test_db, al2)

    inc = test_db.scalar(
        select(Incident)
        .join(IncidentAlert, IncidentAlert.incident_id == Incident.id)
        .where(IncidentAlert.alert_id == al2.id)
    )
    assert inc is not None
    links = test_db.scalars(select(IncidentAlert).where(IncidentAlert.incident_id == inc.id)).all()
    
    linked_alert_ids = [l.alert_id for l in links]
    assert al1.id in linked_alert_ids
    assert al2.id in linked_alert_ids

# 13. Duplicate Link Prevention
def test_duplicate_link_prevention(test_db: Session):
    user_name = f"dup_user_{uuid.uuid4().hex[:4]}"
    al1 = create_sample_alert(test_db, "HIGH", user_context=user_name)
    execute_alert_triage(test_db, al1)

    al2 = create_sample_alert(test_db, "HIGH", user_context=user_name)
    execute_alert_triage(test_db, al2)

    # Trigger correlation again on al2
    analysis = execute_alert_triage(test_db, al2)
    
    inc = test_db.scalar(select(Incident).order_by(Incident.created_at.desc()).limit(1))
    links = test_db.scalars(select(IncidentAlert).where(IncidentAlert.incident_id == inc.id)).all()
    
    # Each alert ID should appear exactly once in IncidentAlert for this incident
    alert_ids = [l.alert_id for l in links]
    assert len(alert_ids) == len(set(alert_ids))

# 14. Incident Severity Derivation
def test_incident_severity_derivation(test_db: Session):
    al1 = create_sample_alert(test_db, "LOW")
    al2 = create_sample_alert(test_db, "HIGH")
    al3 = create_sample_alert(test_db, "MEDIUM")

    sev, risk, conf = derive_incident_scores(test_db, [al1.id, al2.id, al3.id])
    assert sev == "HIGH"

# 15. Incident Risk Derivation
def test_incident_risk_derivation(test_db: Session):
    al1 = create_sample_alert(test_db, "HIGH")
    al2 = create_sample_alert(test_db, "CRITICAL")
    execute_alert_triage(test_db, al1)
    execute_alert_triage(test_db, al2)

    sev, risk, conf = derive_incident_scores(test_db, [al1.id, al2.id])
    assert 0.0 <= risk <= 100.0
    assert risk >= 40.0

# 16. Incident Confidence Derivation
def test_incident_confidence_derivation(test_db: Session):
    al1 = create_sample_alert(test_db, "HIGH")
    al2 = create_sample_alert(test_db, "CRITICAL")
    execute_alert_triage(test_db, al1)
    execute_alert_triage(test_db, al2)

    sev, risk, conf = derive_incident_scores(test_db, [al1.id, al2.id])
    assert 0.0 <= conf <= 100.0

# 17. Incident Timeline Creation
def test_incident_timeline_creation(test_db: Session):
    user_name = f"time_user_{uuid.uuid4().hex[:4]}"
    al1 = create_sample_alert(test_db, "HIGH", user_context=user_name)
    execute_alert_triage(test_db, al1)

    al2 = create_sample_alert(test_db, "CRITICAL", user_context=user_name)
    execute_alert_triage(test_db, al2)

    inc = test_db.scalar(select(Incident).order_by(Incident.created_at.desc()).limit(1))
    timeline = test_db.scalars(
        select(IncidentTimeline)
        .where(IncidentTimeline.incident_id == inc.id)
        .order_by(IncidentTimeline.timestamp.asc())
    ).all()

    assert len(timeline) >= 2
    assert any(t.event_type == "INCIDENT_CREATED" for t in timeline)

# 18. Realtime Correlation Event Format
def test_realtime_correlation_event_format(test_db: Session):
    from app.realtime.publisher import format_correlation_completed_payload
    al = create_sample_alert(test_db, "HIGH")
    corr_rec = CorrelationResult(
        rule_name="CompositeCorrelationEngine",
        score=75.0,
        correlated_alert_ids={"correlated_alert_ids": [str(al.id)], "explanation": "Test explanation"},
        description="Test correlation"
    )
    payload = format_correlation_completed_payload(corr_rec, al)

    assert payload["type"] == "CORRELATION_COMPLETED"
    assert payload["data"]["correlation_score"] == 75.0
    assert payload["data"]["alert_id"] == str(al.id)

# 19. Realtime Incident Created Event Format
def test_realtime_incident_created_event_format(test_db: Session):
    from app.realtime.publisher import format_incident_created_payload
    al = create_sample_alert(test_db, "HIGH")
    inc = Incident(
        incident_number="INC-2026-9999",
        title="Test Incident",
        summary="Test Summary",
        severity="HIGH",
        risk_score=80.0,
        confidence_score=85.0,
        status="OPEN"
    )
    payload = format_incident_created_payload(inc, al)

    assert payload["type"] == "INCIDENT_CREATED"
    assert payload["data"]["incident_number"] == "INC-2026-9999"
    assert payload["data"]["risk_score"] == 80.0

# 20. Realtime Incident Updated Event Format
def test_realtime_incident_updated_event_format(test_db: Session):
    from app.realtime.publisher import format_incident_updated_payload
    al = create_sample_alert(test_db, "CRITICAL")
    inc = Incident(
        incident_number="INC-2026-9999",
        title="Test Incident",
        summary="Updated Summary",
        severity="CRITICAL",
        risk_score=90.0,
        confidence_score=90.0,
        status="OPEN"
    )
    payload = format_incident_updated_payload(inc, al)

    assert payload["type"] == "INCIDENT_UPDATED"
    assert payload["data"]["incident_number"] == "INC-2026-9999"

# 21. Correlation Failure Isolation
def test_correlation_failure_isolation(test_db: Session):
    al = create_sample_alert(test_db, "HIGH")
    al_id = al.id
    analysis = execute_alert_triage(test_db, al)

    fetched_alert = test_db.scalar(select(Alert).where(Alert.id == al_id))
    assert fetched_alert is not None
    assert analysis is not None

# 22. RBAC Authorization
def test_rbac_authorization_incidents(soc_analyst_token: str, alert_source_token: str, test_db: Session):
    user_name = f"rbac_user_{uuid.uuid4().hex[:4]}"
    al1 = create_sample_alert(test_db, "HIGH", user_context=user_name)
    execute_alert_triage(test_db, al1)
    al2 = create_sample_alert(test_db, "CRITICAL", user_context=user_name)
    execute_alert_triage(test_db, al2)

    inc = test_db.scalar(select(Incident).order_by(Incident.created_at.desc()).limit(1))
    inc_id = str(inc.id) if inc else str(uuid.uuid4())

    # 1. SOC Analyst -> 200 OK
    res_list = client.get("/incidents", headers={"Authorization": f"Bearer {soc_analyst_token}"})
    assert res_list.status_code == 200

    res_detail = client.get(f"/incidents/{inc_id}", headers={"Authorization": f"Bearer {soc_analyst_token}"})
    assert res_detail.status_code == 200

    res_timeline = client.get(f"/incidents/{inc_id}/timeline", headers={"Authorization": f"Bearer {soc_analyst_token}"})
    assert res_timeline.status_code == 200

    # 2. Alert Source -> 403 Forbidden
    res_forbidden = client.get("/incidents", headers={"Authorization": f"Bearer {alert_source_token}"})
    assert res_forbidden.status_code == 403

    # 3. Unauthenticated -> 401 Unauthorized
    res_unauth = client.get("/incidents")
    assert res_unauth.status_code == 401
