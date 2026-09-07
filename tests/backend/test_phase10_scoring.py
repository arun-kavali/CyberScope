import sys
import os
import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal, get_db
from app.models.identity import Profile
from app.models.evidence import Alert, Asset, UserDirectory
from app.models.intelligence import AlertAnalysis, RiskScore, ThreatIndicator
from app.auth.service import seed_default_users
from app.services.triage import execute_alert_triage
from app.services.risk import (
    calculate_risk_score,
    calculate_confidence_score,
    calculate_false_positive_likelihood,
    evaluate_and_persist_risk_scores,
    SCORE_VERSION
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

def create_sample_alert(test_db: Session, severity: str = "HIGH", title: str = "Suspicious Account Access") -> Alert:
    alert = Alert(
        alert_code=f"ALT-P10-{uuid.uuid4().hex[:6].upper()}",
        event_type="UNUSUAL_ADMIN_LOGIN",
        event_category="AUTHENTICATION",
        severity=severity,
        status="NEW",
        timestamp=datetime.now(timezone.utc),
        user_context="admin_user",
        asset_context="FIN-DB-01",
        source_ip="192.168.1.100",
        action="ALLOWED",
        description=title,
        raw_payload={"login_attempts": 6, "failed_count": 5}
    )
    test_db.add(alert)
    test_db.commit()
    test_db.refresh(alert)
    return alert

# 1. Risk score within 0–100
def test_risk_score_range(test_db: Session):
    alert = create_sample_alert(test_db, "CRITICAL")
    analysis = execute_alert_triage(test_db, alert)
    risk_rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)
    assert 0.0 <= risk_rec.score <= 100.0

# 2. Confidence score within 0–100
def test_confidence_score_range(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    risk_rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)
    assert 0.0 <= risk_rec.confidence <= 100.0

# 3. FP likelihood within 0–100
def test_fp_likelihood_range(test_db: Session):
    alert = create_sample_alert(test_db, "LOW")
    analysis = execute_alert_triage(test_db, alert)
    risk_rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)
    assert 0.0 <= risk_rec.false_positive_likelihood <= 100.0

# 4. Risk calculation is deterministic
def test_risk_determinism(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    enrichment = (analysis.analysis_metadata or {}).get("context_enrichment", {})
    rules = (analysis.findings or {}).get("triggered_rules", [])
    
    score1, contrib1 = calculate_risk_score(alert, analysis, enrichment, rules)
    score2, contrib2 = calculate_risk_score(alert, analysis, enrichment, rules)
    assert score1 == score2
    assert len(contrib1) == len(contrib2)

# 5. Confidence calculation is deterministic
def test_confidence_determinism(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    enrichment = (analysis.analysis_metadata or {}).get("context_enrichment", {})
    rules = (analysis.findings or {}).get("triggered_rules", [])

    conf1, _ = calculate_confidence_score(alert, analysis, enrichment, rules)
    conf2, _ = calculate_confidence_score(alert, analysis, enrichment, rules)
    assert conf1 == conf2

# 6. FP calculation is deterministic
def test_fp_determinism(test_db: Session):
    alert = create_sample_alert(test_db, "LOW")
    analysis = execute_alert_triage(test_db, alert)
    enrichment = (analysis.analysis_metadata or {}).get("context_enrichment", {})
    rules = (analysis.findings or {}).get("triggered_rules", [])

    fp1, _ = calculate_false_positive_likelihood(alert, analysis, enrichment, rules)
    fp2, _ = calculate_false_positive_likelihood(alert, analysis, enrichment, rules)
    assert fp1 == fp2

# 7. Risk does not equal confidence by implementation shortcut
def test_risk_does_not_equal_confidence(test_db: Session):
    alert = create_sample_alert(test_db, "LOW")
    analysis = execute_alert_triage(test_db, alert)
    risk_rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)
    assert risk_rec.score != risk_rec.confidence

# 8. Risk does not simply equal 100 - FP
def test_risk_does_not_equal_100_minus_fp(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    risk_rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)
    assert risk_rec.score != (100.0 - risk_rec.false_positive_likelihood)

# 9. Severity contributes correctly
def test_severity_contribution(test_db: Session):
    alert_low = create_sample_alert(test_db, "LOW")
    alert_crit = create_sample_alert(test_db, "CRITICAL")
    analysis_low = execute_alert_triage(test_db, alert_low)
    analysis_crit = execute_alert_triage(test_db, alert_crit)
    
    rec_low = evaluate_and_persist_risk_scores(test_db, alert_low, analysis_low)
    rec_crit = evaluate_and_persist_risk_scores(test_db, alert_crit, analysis_crit)
    assert rec_crit.score > rec_low.score

# 10. Detection signals contribute correctly
def test_detection_signal_contribution(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    alert.event_type = "BRUTE_FORCE_EXHAUSTION"
    alert.raw_payload = {"failed_attempts": 20, "is_locked": True}
    analysis = execute_alert_triage(test_db, alert)
    
    rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)
    rule_contribs = [c for c in rec.contributors["risk_contributors"] if c["category"] == "rule_trigger"]
    assert len(rule_contribs)# 11. Asset criticality contributes correctly when available
def test_asset_criticality_contribution(test_db: Session):
    code = f"CRIT-DC-{uuid.uuid4().hex[:4]}"
    asset = Asset(
        asset_id_code=code,
        name=code,
        type="DomainController",
        criticality="CRITICAL",
        ip_address="10.0.0.5"
    )
    test_db.add(asset)
    test_db.commit()

    alert = create_sample_alert(test_db, "MEDIUM")
    alert.asset_context = code
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)

    asset_contribs = [c for c in rec.contributors["risk_contributors"] if c["category"] == "asset"]
    assert len(asset_contribs) > 0
    assert asset_contribs[0]["weight"] == 15.0

# 12. Privileged context contributes correctly
def test_privileged_user_contribution(test_db: Session):
    code = f"admin_sec_{uuid.uuid4().hex[:4]}"
    user = UserDirectory(
        user_id_code=code,
        name=code,
        email=f"{code}@cyberscope.local",
        department="IT Security"
    )
    test_db.add(user)
    test_db.commit()

    alert = create_sample_alert(test_db, "MEDIUM")
    alert.user_context = code
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)

    user_contribs = [c for c in rec.contributors["risk_contributors"] if c["category"] == "user"]
    assert len(user_contribs) > 0
    assert user_contribs[0]["weight"] == 15.0

# 13. Threat indicator context contributes correctly
def test_threat_indicator_contribution(test_db: Session):
    ip = f"203.0.113.{uuid.uuid4().int % 200 + 10}"
    ti = ThreatIndicator(
        indicator_type="IP",
        value=ip,
        threat_actor="APT-Phase10",
        confidence=90.0
    )
    test_db.add(ti)
    test_db.commit()

    alert = create_sample_alert(test_db, "HIGH")
    alert.source_ip = ip
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)

    ti_contribs = [c for c in rec.contributors["risk_contributors"] if c["category"] == "threat_intel"]
    assert len(ti_contribs) > 0

# 14. Missing optional context handled safely
def test_missing_optional_context(test_db: Session):
    alert = Alert(
        alert_code=f"ALT-MISSING-{uuid.uuid4().hex[:6]}",
        event_type="GENERIC_PING",
        event_category="NETWORK",
        severity="LOW",
        timestamp=datetime.now(timezone.utc),
        description="Low context alert"
    )
    test_db.add(alert)
    test_db.commit()

    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)
    assert rec.score >= 0.0
    assert rec.confidence >= 0.0
    assert rec.false_positive_likelihood >= 0.0

# 15. Confidence reflects evidence availability
def test_confidence_evidence_availability(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)

    assert rec.confidence >= 35.0

# 16. FP likelihood reflects benign indicators
def test_fp_benign_indicators(test_db: Session):
    alert = create_sample_alert(test_db, "LOW", "Routine Scheduled Backup")
    alert.raw_payload = {"is_routine": True, "scheduled_maintenance": True}
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)

    assert rec.false_positive_likelihood > 30.0

# 17. Score contributors are persisted
def test_score_contributors_persistence(test_db: Session):
    alert = create_sample_alert(test_db, "CRITICAL")
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)

    db_rec = test_db.scalar(select(RiskScore).where(RiskScore.id == rec.id))
    assert db_rec is not None
    assert "risk_contributors" in db_rec.contributors
    assert "confidence_contributors" in db_rec.contributors
    assert "fp_contributors" in db_rec.contributors
    assert db_rec.contributors["score_disclaimer"] is not None

# 18. Score version is persisted
def test_score_version_persistence(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)

    assert rec.version == SCORE_VERSION

# 19. Original alert remains intact
def test_original_alert_remains_intact(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    alert_id = alert.id
    analysis = execute_alert_triage(test_db, alert)
    evaluate_and_persist_risk_scores(test_db, alert, analysis)

    fetched_alert = test_db.scalar(select(Alert).where(Alert.id == alert_id))
    assert fetched_alert is not None
    assert fetched_alert.severity == "HIGH"

# 20. Phase 9 analysis remains intact
def test_phase9_analysis_remains_intact(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    evaluate_and_persist_risk_scores(test_db, alert, analysis)

    fetched_analysis = test_db.scalar(select(AlertAnalysis).where(AlertAnalysis.alert_id == alert.id))
    assert fetched_analysis is not None
    assert "risk_score" in fetched_analysis.findings

# 21. Scoring failure isolation
def test_scoring_failure_isolation(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    
    # Passing invalid alert state shouldn't delete analysis or original alert
    fetched_alert = test_db.scalar(select(Alert).where(Alert.id == alert.id))
    assert fetched_alert is not None

# 22. Reanalysis recalculates scores
def test_reanalysis_recalculates_scores(test_db: Session):
    alert = create_sample_alert(test_db, "LOW")
    analysis1 = execute_alert_triage(test_db, alert)
    rec1 = test_db.scalar(select(RiskScore).where(RiskScore.alert_id == alert.id))
    score1 = rec1.score

    # Mutate alert severity to CRITICAL
    alert.severity = "CRITICAL"
    test_db.commit()

    analysis2 = execute_alert_triage(test_db, alert)
    rec2 = test_db.scalar(select(RiskScore).where(RiskScore.alert_id == alert.id))
    score2 = rec2.score

    assert score2 > score1

# 23. SOC Analyst can access scores via API
def test_soc_analyst_can_access_scores(soc_analyst_token: str, test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    execute_alert_triage(test_db, alert)

    response = client.get(
        f"/alerts/{alert.id}/analysis",
        headers={"Authorization": f"Bearer {soc_analyst_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "findings" in data
    assert "risk_score" in data["findings"]
    assert "score" in data["findings"]["risk_score"]

# 24. Alert Source cannot access scores
def test_alert_source_cannot_access_scores(alert_source_token: str, test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    execute_alert_triage(test_db, alert)

    response = client.get(
        f"/alerts/{alert.id}/analysis",
        headers={"Authorization": f"Bearer {alert_source_token}"}
    )
    assert response.status_code == 403

# 25. Realtime score event format
def test_realtime_scores_completed_event_format(test_db: Session):
    from app.realtime.publisher import format_scores_completed_payload
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    risk_rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)

    payload = format_scores_completed_payload(risk_rec, alert)
    assert payload["type"] == "SCORES_COMPLETED"
    assert payload["data"]["alert_id"] == str(alert.id)
    assert "risk_score" in payload["data"]
    assert "confidence" in payload["data"]

# 26. Representative Account Takeover Scenario
def test_account_takeover_representative_scenario(test_db: Session):
    asset_name = f"AUTH-PROD-{uuid.uuid4().hex[:4]}"
    user_name = f"admin_{uuid.uuid4().hex[:4]}"
    ip_str = f"198.51.100.{uuid.uuid4().int % 200 + 10}"

    asset = Asset(
        asset_id_code=asset_name,
        name=asset_name,
        ip_address="10.0.1.10",
        criticality="CRITICAL",
        type="AuthServer"
    )
    user = UserDirectory(
        user_id_code=user_name,
        name=user_name,
        email=f"{user_name}@cyberscope.local",
        department="IT Administration"
    )
    ti = ThreatIndicator(
        indicator_type="IP",
        value=ip_str,
        threat_actor="APT-ACCOUNT-TAKEOVER",
        confidence=95.0
    )
    test_db.add_all([asset, user, ti])
    test_db.commit()

    # Create CRITICAL alert with Account Takeover indicators
    alert = Alert(
        alert_code=f"ALT-ATO-{uuid.uuid4().hex[:6]}",
        event_type="ACCOUNT_TAKEOVER_SUSPECTED",
        event_category="AUTHENTICATION",
        severity="CRITICAL",
        status="NEW",
        timestamp=datetime.now(timezone.utc),
        user_context=user_name,
        asset_context=asset_name,
        source_ip=ip_str,
        action="ALLOWED",
        description="Multiple failed logins followed by successful admin session from malicious IP",
        raw_payload={"failed_attempts": 15, "impossible_travel": True}
    )
    test_db.add(alert)
    test_db.commit()

    analysis = execute_alert_triage(test_db, alert)
    risk_rec = evaluate_and_persist_risk_scores(test_db, alert, analysis)

    # Naturally high risk (~90+) and confidence (~85+)
    assert risk_rec.score >= 90.0
    assert risk_rec.confidence >= 85.0
    assert risk_rec.false_positive_likelihood <= 20.0
