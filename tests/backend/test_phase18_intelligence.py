import sys
import os
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal
from app.auth.service import seed_default_users
from app.models.evidence import Alert, Asset
from app.models.intelligence import Incident, AlertAnalysis, RiskScore
from app.models.analytics import ExecutionGapFinding, NegativeSpaceFinding, PeerBenchmark

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

def test_phase18_rbac_denies_alert_source():
    _, source_token = get_tokens()

    res_eg = client.get("/api/v1/analytics/execution-gaps", headers={"Authorization": f"Bearer {source_token}"})
    assert res_eg.status_code == 403

    res_ns = client.get("/api/v1/analytics/negative-space", headers={"Authorization": f"Bearer {source_token}"})
    assert res_ns.status_code == 403

    res_pb = client.get("/api/v1/analytics/peer-benchmarks", headers={"Authorization": f"Bearer {source_token}"})
    assert res_pb.status_code == 403

    res_an = client.get("/api/v1/analytics/anomalies", headers={"Authorization": f"Bearer {source_token}"})
    assert res_an.status_code == 403

def test_execution_gaps_detection_and_language():
    analyst_token, source_token = get_tokens()

    # 1. Ingest a CRITICAL alert without escalation to trigger MISSING_ESCALATION gap
    client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "CRITICAL",
            "description": "Critical brute force alert for missing escalation gap test",
            "user_context": "usr_gap_test",
            "source_ip": "198.51.100.99"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )

    res = client.get("/api/v1/analytics/execution-gaps", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res.status_code == 200
    gaps = res.json()
    assert isinstance(gaps, list)
    assert len(gaps) >= 1

    # Verify neutral, non-accusatory language
    for g in gaps:
        reason = g["reason"].lower()
        assert "compromise" not in reason
        assert "failure" not in reason
        assert "attack confirmed" not in reason
        assert "potential execution gap" in reason or "pattern observed" in reason or "execution gap" in reason or "closed in" in reason

def test_negative_space_detection_and_language():
    analyst_token, source_token = get_tokens()

    # Seed a critical asset with zero alerts
    db: Session = SessionLocal()
    try:
        crit_asset = db.scalar(select(Asset).where(Asset.asset_id_code == "CRIT-EP-999"))
        if not crit_asset:
            crit_asset = Asset(
                asset_id_code="CRIT-EP-999",
                name="Critical-Database-Server-999",
                type="SERVER",
                criticality="CRITICAL",
                status="CONNECTED"
            )
            db.add(crit_asset)
            db.commit()
    finally:
        db.close()

    res = client.get("/api/v1/analytics/negative-space", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res.status_code == 200
    ns_findings = res.json()
    assert isinstance(ns_findings, list)
    assert len(ns_findings) >= 1

    # Verify neutral, non-accusatory language
    for ns in ns_findings:
        indicator = (ns.get("potential_indicator") or "").lower()
        assert "compromise" not in indicator
        assert "threat detected" not in indicator
        assert "attack confirmed" not in indicator
        assert "potential indicator" in indicator or "expected activity was not observed" in indicator

def test_peer_benchmarks_endpoint():
    analyst_token, _ = get_tokens()
    res = client.get("/api/v1/analytics/peer-benchmarks", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res.status_code == 200
    benchmarks = res.json()
    assert len(benchmarks) >= 1
    assert "metric_name" in benchmarks[0]

def test_operational_anomalies_endpoint():
    analyst_token, _ = get_tokens()
    res = client.get("/api/v1/analytics/anomalies", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res.status_code == 200
    anomalies = res.json()
    assert isinstance(anomalies, list)
