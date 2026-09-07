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
from app.models.evidence import Alert, Case, Investigation, Escalation, Asset
from app.models.intelligence import Incident, AlertAnalysis, RiskScore
from app.models.sources import AlertSource
from app.models.analytics import ExecutionGapFinding, NegativeSpaceFinding, PeerBenchmark, ReviewPriority

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

def test_peer_benchmarking_endpoints():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # Trigger peer benchmarks endpoint
    response = client.get("/api/v1/analytics/peer-benchmarks", headers=headers)
    assert response.status_code == 200
    benchmarks = response.json()
    assert isinstance(benchmarks, list)
    assert len(benchmarks) >= 8

    # Verify benchmark structure
    first = benchmarks[0]
    assert "metric_name" in first
    assert "subject_value" in first
    assert "peer_baseline" in first
    assert "deviation" in first
    assert "direction" in first
    assert first["direction"] in ["ABOVE", "BELOW", "NORMAL", "INSUFFICIENT_DATA"]
    assert "sample_size" in first
    assert "peer_group" in first
    assert first["peer_group"] == "Enterprise SOC Peer Group"

def test_supervisory_risk_indicator_bounds_and_contributors():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    db: Session = SessionLocal()
    try:
        # Insert execution gaps to generate risk contributors
        gap1 = ExecutionGapFinding(
            finding_type="MISSING_ESCALATION",
            severity="HIGH",
            reason="Potential execution gap: expected escalation evidence was not observed under threshold for CRITICAL alert AL-9001.",
            evidence={"alert_id": str(uuid.uuid4())},
            supporting_records={"alert_code": "AL-9001"},
            threshold=80.0
        )
        gap2 = ExecutionGapFinding(
            finding_type="FAST_CLOSURE",
            severity="MEDIUM",
            reason="Potential execution gap: Investigation closed in 12.0 seconds crossing 30s threshold.",
            evidence={"duration_seconds": 12.0},
            supporting_records={"investigation_id": str(uuid.uuid4())},
            threshold=30.0
        )
        db.add_all([gap1, gap2])
        db.commit()
    finally:
        db.close()

    response = client.get("/api/v1/analytics/supervisory-risk", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert "overall_score" in data
    assert 0.0 <= data["overall_score"] <= 100.0
    assert "status" in data
    assert data["status"] in ["NORMAL", "ELEVATED", "HIGH_ATTENTION"]
    assert "contributors" in data
    assert len(data["contributors"]) >= 1

    for c in data["contributors"]:
        assert "contributor_type" in c
        assert "contribution" in c
        assert c["contribution"] > 0
        assert "supporting_evidence" in c
        assert "calculation_method" in c

def test_review_priorities_ranking_and_traceability():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    db: Session = SessionLocal()
    try:
        inc_id = uuid.uuid4()
        inc = Incident(
            id=inc_id,
            incident_number=f"INC-{uuid.uuid4().hex[:6].upper()}",
            title="High Severity Threat Activity Pattern",
            summary="Correlated alerts requiring analyst review.",
            severity="CRITICAL",
            status="OPEN"
        )
        db.add(inc)
        db.commit()
    finally:
        db.close()

    response = client.get("/api/v1/analytics/review-priorities", headers=headers)
    assert response.status_code == 200
    priorities = response.json()

    assert isinstance(priorities, list)
    assert len(priorities) >= 1

    # Verify priority ranks are in strictly ascending order (1, 2, 3...)
    ranks = [p["rank"] for p in priorities]
    assert ranks == list(range(1, len(priorities) + 1))

    # Verify priority scores are in descending order
    scores = [p["priority_score"] for p in priorities]
    assert scores == sorted(scores, reverse=True)

    # Verify traceability chain in supporting_findings
    top_priority = priorities[0]
    assert "target_type" in top_priority
    assert "target_id" in top_priority
    assert "reason" in top_priority
    assert "supporting_findings" in top_priority
    assert isinstance(top_priority["supporting_findings"], list)
    assert len(top_priority["supporting_findings"]) >= 1

def test_rbac_denial_for_alert_source():
    _, source_token = get_tokens()
    headers = {"Authorization": f"Bearer {source_token}"}

    endpoints = [
        "/api/v1/analytics/peer-benchmarks",
        "/api/v1/analytics/supervisory-risk",
        "/api/v1/analytics/review-priorities"
    ]

    for ep in endpoints:
        resp = client.get(ep, headers=headers)
        assert resp.status_code == 403, f"Endpoint {ep} should deny ALERT_SOURCE with 403"

def test_neutral_non_accusatory_language():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    sup_resp = client.get("/api/v1/analytics/supervisory-risk", headers=headers)
    rev_resp = client.get("/api/v1/analytics/review-priorities", headers=headers)

    sup_text = str(sup_resp.json())
    rev_text = str(rev_resp.json())

    prohibited_terms = [
        "compromised",
        "attack confirmed",
        "threat detected",
        "analyst failure",
        "malicious activity",
        "security control failure"
    ]

    for term in prohibited_terms:
        assert term not in sup_text.lower(), f"Prohibited term '{term}' found in supervisory risk output"
        assert term not in rev_text.lower(), f"Prohibited term '{term}' found in review priorities output"
