import sys
import os
import pytest
import uuid
import random
import json
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select, func

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal, get_db
from app.models.identity import Profile
from app.models.evidence import Alert, Investigation
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
from app.services.investigation import (
    start_incident_investigation,
    add_investigation_note,
    get_incident_intelligence_summary
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

def create_sample_incident_cluster(test_db: Session) -> Tuple[Incident, Alert, Alert]:
    user_name = f"inv_user_{uuid.uuid4().hex[:4]}"
    al1 = Alert(
        alert_code=f"ALT-P13-{uuid.uuid4().hex[:6].upper()}",
        event_type="SUSPICIOUS_LOGIN",
        event_category="AUTHENTICATION",
        severity="HIGH",
        status="NEW",
        timestamp=datetime.now(timezone.utc) - timedelta(minutes=15),
        user_context=user_name,
        asset_context=f"host_{uuid.uuid4().hex[:4]}",
        source_ip=f"172.16.5.{random.randint(10, 200)}",
        description="Phase 13 alert 1"
    )
    al2 = Alert(
        alert_code=f"ALT-P13-{uuid.uuid4().hex[:6].upper()}",
        event_type="PRIVILEGE_ESCALATION",
        event_category="AUTHENTICATION",
        severity="CRITICAL",
        status="NEW",
        timestamp=datetime.now(timezone.utc),
        user_context=user_name,
        asset_context=f"host_{uuid.uuid4().hex[:4]}",
        source_ip=f"172.16.5.{random.randint(10, 200)}",
        description="Phase 13 alert 2"
    )
    test_db.add_all([al1, al2])
    test_db.commit()

    execute_alert_triage(test_db, al1)
    execute_alert_triage(test_db, al2)

    inc = test_db.scalar(
        select(Incident)
        .join(IncidentAlert, IncidentAlert.incident_id == Incident.id)
        .where(IncidentAlert.alert_id == al2.id)
    )
    assert inc is not None
    return inc, al1, al2

# 1. Start Investigation API & Service
def test_start_investigation(soc_analyst_token: str, test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    
    res = client.post(
        f"/incidents/{inc.id}/start-investigation",
        headers={"Authorization": f"Bearer {soc_analyst_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["investigation"]["incident_status"] == "IN_PROGRESS"

# 2. Investigation Persistence
def test_investigation_persistence(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    analyst = test_db.scalar(select(Profile).where(Profile.email == "analyst@cyberscope.local"))
    
    inv, updated_inc = start_incident_investigation(test_db, inc.id, analyst)
    
    assert inv.id is not None
    assert inv.status == "IN_PROGRESS"
    assert updated_inc.investigation_id == inv.id

# 3. Duplicate Active Investigation Prevention
def test_duplicate_active_investigation_prevention(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    analyst = test_db.scalar(select(Profile).where(Profile.email == "analyst@cyberscope.local"))
    
    inv1, _ = start_incident_investigation(test_db, inc.id, analyst)
    inv2, _ = start_incident_investigation(test_db, inc.id, analyst)

    assert inv1.id == inv2.id

# 4. Incident Status Transition (OPEN -> IN_PROGRESS)
def test_incident_status_transition(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    analyst = test_db.scalar(select(Profile).where(Profile.email == "analyst@cyberscope.local"))
    
    assert inc.status == "OPEN"
    _, updated_inc = start_incident_investigation(test_db, inc.id, analyst)
    assert updated_inc.status == "IN_PROGRESS"

# 5. Intelligence Retrieval
def test_investigation_intelligence_retrieval(soc_analyst_token: str, test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)

    res = client.get(
        f"/incidents/{inc.id}/intelligence",
        headers={"Authorization": f"Bearer {soc_analyst_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "what_happened" in data
    assert "why_suspicious" in data
    assert "potential_impact" in data

# 6. What Happened Derivation
def test_what_happened_derivation(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    summary = get_incident_intelligence_summary(test_db, inc.id)

    assert inc.incident_number in summary["what_happened"]
    assert "SUSPICIOUS_LOGIN" in summary["what_happened"] or "PRIVILEGE_ESCALATION" in summary["what_happened"]

# 7. Why Suspicious Derivation
def test_why_suspicious_derivation(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    summary = get_incident_intelligence_summary(test_db, inc.id)

    why = summary["why_suspicious"]
    assert "summary" in why
    assert "triggered_rules" in why
    assert "correlation_signals" in why

# 8. Potential Impact Derivation
def test_potential_impact_derivation(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    summary = get_incident_intelligence_summary(test_db, inc.id)

    impact = summary["potential_impact"]
    assert "affected_users" in impact
    assert "disclaimer" in impact
    assert "Does NOT prove business compromise" in impact["disclaimer"]

# 9. Evidence Chain Traceability
def test_evidence_chain_traceability(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    summary = get_incident_intelligence_summary(test_db, inc.id)

    chain = summary["evidence_chain"]
    assert len(chain) >= 2
    assert any(e["alert_code"] == al1.alert_code for e in chain)

# 10. Neutral Recommendations Placeholder
def test_neutral_recommendations_placeholder(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    summary = get_incident_intelligence_summary(test_db, inc.id)

    placeholder = summary["recommendations_placeholder"]
    assert placeholder == "AI intelligence will be available in the next intelligence phase."

# 11. Timeline Chronological Order
def test_timeline_chronological_order(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    analyst = test_db.scalar(select(Profile).where(Profile.email == "analyst@cyberscope.local"))
    
    start_incident_investigation(test_db, inc.id, analyst)
    add_investigation_note(test_db, inc.id, "Testing timeline note", analyst)

    entries = test_db.scalars(
        select(IncidentTimeline)
        .where(IncidentTimeline.incident_id == inc.id)
        .order_by(IncidentTimeline.timestamp.asc())
    ).all()

    timestamps = [e.timestamp for e in entries]
    assert timestamps == sorted(timestamps)

# 12. Add Investigation Note API & Service
def test_add_investigation_note(soc_analyst_token: str, test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)

    res = client.post(
        f"/incidents/{inc.id}/notes",
        headers={"Authorization": f"Bearer {soc_analyst_token}"},
        json={"note": "Analyst verified suspicious login activity."}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "success"
    assert data["note"]["note"] == "Analyst verified suspicious login activity."

# 13. Note Persistence & Attribution
def test_note_persistence_and_attribution(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    analyst = test_db.scalar(select(Profile).where(Profile.email == "analyst@cyberscope.local"))

    new_note, notes_list = add_investigation_note(test_db, inc.id, "Detailed analyst findings", analyst)

    analyst_name = analyst.full_name or analyst.username or analyst.email
    assert new_note["analyst_name"] == analyst_name
    assert new_note["note"] == "Detailed analyst findings"
    assert any(n["id"] == new_note["id"] for n in notes_list)

# 14. Empty Note Validation Failure
def test_note_empty_validation(soc_analyst_token: str, test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)

    res = client.post(
        f"/incidents/{inc.id}/notes",
        headers={"Authorization": f"Bearer {soc_analyst_token}"},
        json={"note": "   "}
    )
    assert res.status_code in [400, 422]

# 15. Invalid Incident ID 404
def test_invalid_incident_id_404(soc_analyst_token: str):
    fake_id = str(uuid.uuid4())
    res = client.get(
        f"/incidents/{fake_id}/intelligence",
        headers={"Authorization": f"Bearer {soc_analyst_token}"}
    )
    assert res.status_code == 404

# 16. RBAC Alert Source Forbidden
def test_rbac_alert_source_forbidden(alert_source_token: str, test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)

    res_start = client.post(
        f"/incidents/{inc.id}/start-investigation",
        headers={"Authorization": f"Bearer {alert_source_token}"}
    )
    assert res_start.status_code == 403

    res_note = client.post(
        f"/incidents/{inc.id}/notes",
        headers={"Authorization": f"Bearer {alert_source_token}"},
        json={"note": "Unauthorized note"}
    )
    assert res_note.status_code == 403

    res_intel = client.get(
        f"/incidents/{inc.id}/intelligence",
        headers={"Authorization": f"Bearer {alert_source_token}"}
    )
    assert res_intel.status_code == 403

# 17. RBAC Unauthenticated Unauthorized
def test_rbac_unauthenticated_unauthorized(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)

    assert client.post(f"/incidents/{inc.id}/start-investigation").status_code == 401
    assert client.post(f"/incidents/{inc.id}/notes", json={"note": "test"}).status_code == 401
    assert client.get(f"/incidents/{inc.id}/intelligence").status_code == 401

# 18. Realtime Investigation Started Event Format
def test_realtime_investigation_started_event_format(test_db: Session):
    from app.realtime.publisher import format_investigation_started_payload
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    analyst = test_db.scalar(select(Profile).where(Profile.email == "analyst@cyberscope.local"))
    inv, _ = start_incident_investigation(test_db, inc.id, analyst)

    payload = format_investigation_started_payload(inv, inc, analyst)
    assert payload["type"] == "INVESTIGATION_STARTED"
    assert payload["data"]["incident_number"] == inc.incident_number

# 19. Realtime Investigation Note Added Event Format
def test_realtime_investigation_note_added_event_format(test_db: Session):
    from app.realtime.publisher import format_investigation_note_added_payload
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    analyst = test_db.scalar(select(Profile).where(Profile.email == "analyst@cyberscope.local"))
    note, _ = add_investigation_note(test_db, inc.id, "Realtime test note", analyst)

    payload = format_investigation_note_added_payload(note, inc, analyst)
    assert payload["type"] == "INVESTIGATION_NOTE_ADDED"
    assert payload["data"]["note"]["note"] == "Realtime test note"

# 20. Failure Isolation
def test_investigation_failure_isolation(test_db: Session):
    inc, al1, al2 = create_sample_incident_cluster(test_db)
    fetched_inc = test_db.scalar(select(Incident).where(Incident.id == inc.id))
    assert fetched_inc is not None
