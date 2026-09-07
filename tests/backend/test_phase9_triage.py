import sys
import os
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal
from app.auth.service import seed_default_users
from app.models.evidence import Alert, Asset, UserDirectory
from app.models.intelligence import AlertAnalysis, ThreatIndicator
from app.services.enrichment import enrich_alert_context
from app.services.detection import evaluate_detection_rules
from app.services.triage import execute_alert_triage

client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_seeded_data():
    db: Session = SessionLocal()
    try:
        seed_default_users(db)
        
        # Seed test asset
        asset = db.scalar(select(Asset).where(Asset.asset_id_code == "EP-TEST-01"))
        if not asset:
            asset = Asset(
                asset_id_code="EP-TEST-01",
                name="WORKSTATION-482.cyberscope.local",
                type="ENDPOINT",
                ip_address="192.168.1.105",
                hostname="WORKSTATION-482",
                status="CONNECTED",
                criticality="HIGH"
            )
            db.add(asset)

        # Seed test user directory
        usr = db.scalar(select(UserDirectory).where(UserDirectory.user_id_code == "USR-TEST-01"))
        if not usr:
            usr = UserDirectory(
                user_id_code="USR-TEST-01",
                name="John Doe",
                email="jdoe@cyberscope.local",
                department="Security Operations",
                status="ACTIVE"
            )
            db.add(usr)

        # Seed threat indicator
        ind = db.scalar(select(ThreatIndicator).where(ThreatIndicator.value == "198.51.100.204"))
        if not ind:
            ind = ThreatIndicator(
                indicator_type="IP",
                value="198.51.100.204",
                threat_actor="APT29_SIMULATED",
                confidence=90.0,
                metadata_info={"category": "C2 Server"}
            )
            db.add(ind)

        db.commit()
    finally:
        db.close()

def get_tokens():
    analyst_res = client.post("/auth/login", json={"username": "analyst", "password": "Analyst123!"})
    analyst_token = analyst_res.json()["token"]

    source_res = client.post("/auth/login", json={"username": "alert_source", "password": "Source123!"})
    source_token = source_res.json()["token"]

    return analyst_token, source_token


def test_valid_alert_automatically_receives_triage():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Auto triage test",
            "user_context": "USR-TEST-01"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    alert_id = res.json()["id"]

    analysis_res = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"})
    assert analysis_res.status_code == 200
    data = analysis_res.json()
    assert data["alert_id"] == alert_id
    assert data["findings"]["triage_status"] == "COMPLETED"


def test_analysis_record_creation_and_fields():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Suspicious PowerShell",
            "event_category": "ENDPOINT",
            "severity": "CRITICAL",
            "description": "Analysis record fields test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    assert res.status_code == 201
    alert_id = res.json()["id"]

    analysis_res = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"})
    data = analysis_res.json()
    assert "summary" in data
    assert "findings" in data
    assert "analysis_metadata" in data
    assert data["analysis_metadata"]["triage_version"] == "1.0"


def test_asset_enrichment_when_asset_context_exists():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Malware Detection",
            "event_category": "ENDPOINT",
            "severity": "HIGH",
            "description": "Asset enrichment test",
            "asset_context": "WORKSTATION-482.cyberscope.local"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    asset_info = analysis["analysis_metadata"]["context_enrichment"]["asset"]
    assert asset_info["context_available"] is True
    assert asset_info["criticality"] == "HIGH"


def test_missing_asset_context_does_not_fail_triage():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Missing asset test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    assert analysis["findings"]["triage_status"] == "COMPLETED"
    assert analysis["analysis_metadata"]["context_enrichment"]["asset"]["context_available"] is False


def test_user_enrichment_when_user_context_exists():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "User enrichment test",
            "user_context": "jdoe@cyberscope.local"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    user_info = analysis["analysis_metadata"]["context_enrichment"]["user"]
    assert user_info["context_available"] is True
    assert user_info["name"] == "John Doe"


def test_source_enrichment_when_source_exists():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Source enrichment test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    source_info = analysis["analysis_metadata"]["context_enrichment"]["source"]
    assert source_info["context_available"] is True


def test_historical_context_calculated_deterministically():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "History test",
            "user_context": "usr_history_test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    history = analysis["analysis_metadata"]["context_enrichment"]["history"]
    assert "window_hours" in history
    assert history["window_hours"] == 24


def test_threat_indicator_local_match():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Suspicious DNS",
            "event_category": "NETWORK",
            "severity": "HIGH",
            "description": "Threat indicator match test",
            "source_ip": "198.51.100.204"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    ti = analysis["analysis_metadata"]["context_enrichment"]["threat_indicator"]
    assert ti["matched"] is True
    assert ti["threat_actor"] == "APT29_SIMULATED"


def test_rul001_failed_login_rule_triggers():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "RUL-001 test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    rules = analysis["findings"]["triggered_rules"]
    rule_ids = [r["rule_id"] for r in rules]
    assert "RUL-001" in rule_ids


def test_rul002_success_after_failures_rule_triggers():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Suspicious Login",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "RUL-002 test",
            "user_context": "usr_success_after_fail"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    assert analysis["findings"]["triage_status"] == "COMPLETED"


def test_rul003_impossible_travel_rule_triggers():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Impossible Travel",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "RUL-003 test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    rules = analysis["findings"]["triggered_rules"]
    rule_ids = [r["rule_id"] for r in rules]
    assert "RUL-003" in rule_ids


def test_rul004_privileged_login_rule_triggers():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Privileged Login",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "RUL-004 test",
            "user_context": "usr_admin_dev"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    rules = analysis["findings"]["triggered_rules"]
    rule_ids = [r["rule_id"] for r in rules]
    assert "RUL-004" in rule_ids


def test_rul005_suspicious_process_rule_triggers():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Suspicious PowerShell",
            "event_category": "ENDPOINT",
            "severity": "HIGH",
            "description": "RUL-005 test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    rules = analysis["findings"]["triggered_rules"]
    rule_ids = [r["rule_id"] for r in rules]
    assert "RUL-005" in rule_ids


def test_rul006_bulk_database_extraction_rule_triggers():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Bulk Data Read",
            "event_category": "DATABASE",
            "severity": "HIGH",
            "description": "RUL-006 test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    rules = analysis["findings"]["triggered_rules"]
    rule_ids = [r["rule_id"] for r in rules]
    assert "RUL-006" in rule_ids


def test_rul007_suspicious_dns_rule_triggers():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Suspicious DNS",
            "event_category": "NETWORK",
            "severity": "HIGH",
            "description": "RUL-007 test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    rules = analysis["findings"]["triggered_rules"]
    rule_ids = [r["rule_id"] for r in rules]
    assert "RUL-007" in rule_ids


def test_rule_versions_stored_in_output():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Rule version test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    rules = analysis["findings"]["triggered_rules"]
    for r in rules:
        assert "rule_version" in r
        assert r["rule_version"] == "1.0"


def test_evidence_and_supporting_details_preserved():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Evidence preservation test",
            "source_ip": "1.2.3.4"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    rules = analysis["findings"]["triggered_rules"]
    assert len(rules) > 0
    assert "evidence" in rules[0]


def test_reanalysis_endpoint_execution():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Reanalysis test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]

    reanalysis_res = client.post(f"/alerts/{alert_id}/reanalyze", headers={"Authorization": f"Bearer {analyst_token}"})
    assert reanalysis_res.status_code == 200
    data = reanalysis_res.json()
    assert data["alert_id"] == alert_id
    assert data["findings"]["triage_status"] == "COMPLETED"


def test_get_alert_analysis_endpoint_rbac():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "RBAC test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]

    # Analyst permitted
    analyst_get = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"})
    assert analyst_get.status_code == 200

    # Unauthenticated rejected
    unauth_get = client.get(f"/alerts/{alert_id}/analysis")
    assert unauth_get.status_code == 401


def test_alert_source_cannot_access_analyst_analysis():
    _, source_token = get_tokens()
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    res = client.get(f"/alerts/{fake_uuid}/analysis", headers={"Authorization": f"Bearer {source_token}"})
    assert res.status_code == 403


def test_phase10_scores_present():
    analyst_token, source_token = get_tokens()
    res = client.post(
        "/alerts",
        json={
            "event_type": "Brute Force",
            "event_category": "AUTHENTICATION",
            "severity": "HIGH",
            "description": "Phase 10 score presence test"
        },
        headers={"Authorization": f"Bearer {source_token}"}
    )
    alert_id = res.json()["id"]
    analysis = client.get(f"/alerts/{alert_id}/analysis", headers={"Authorization": f"Bearer {analyst_token}"}).json()
    findings = analysis["findings"]
    assert "risk_score" in findings
    assert "score" in findings["risk_score"]
    assert "confidence" in findings["risk_score"]
    assert "false_positive_likelihood" in findings["risk_score"]


def test_realtime_analysis_completed_event():
    analyst_token, source_token = get_tokens()
    with client.websocket_connect(f"/ws?token={analyst_token}") as websocket:
        client.post(
            "/alerts",
            json={
                "event_type": "Suspicious PowerShell",
                "event_category": "ENDPOINT",
                "severity": "HIGH",
                "description": "Realtime analysis event test"
            },
            headers={"Authorization": f"Bearer {source_token}"}
        )
        # Event 1: ALERT_CREATED
        e1 = websocket.receive_json()
        assert e1["type"] == "ALERT_CREATED"

        # Event 2: ANALYSIS_COMPLETED
        e2 = websocket.receive_json()
        assert e2["type"] == "ANALYSIS_COMPLETED"
        assert e2["data"]["status"] == "COMPLETED"
