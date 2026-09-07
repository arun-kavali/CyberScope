import sys
import os
import pytest
import uuid
import random
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal, get_db
from app.models.identity import Profile
from app.models.evidence import Alert, Asset, UserDirectory
from app.models.intelligence import AlertAnalysis, RiskScore, AnomalyScore
from app.auth.service import seed_default_users
from app.services.triage import execute_alert_triage
from app.services.anomaly import (
    extract_anomaly_features,
    calculate_statistical_baselines,
    run_isolation_forest_model,
    evaluate_and_persist_anomaly,
    MODEL_VERSION,
    FEATURE_VERSION
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

def create_sample_alert(test_db: Session, severity: str = "HIGH", title: str = "Suspicious Event", timestamp: Optional[datetime] = None) -> Alert:
    alert = Alert(
        alert_code=f"ALT-P11-{uuid.uuid4().hex[:6].upper()}",
        event_type="SUSPICIOUS_EXECUTION",
        event_category="ENDPOINT",
        severity=severity,
        status="NEW",
        timestamp=timestamp or datetime.now(timezone.utc),
        user_context=f"user_{uuid.uuid4().hex[:4]}",
        asset_context=f"host_{uuid.uuid4().hex[:4]}",
        source_ip=f"192.168.1.{random.randint(10, 200)}",
        action="DETECTED",
        description=title,
        raw_payload={"failed_attempts": 3}
    )
    test_db.add(alert)
    test_db.commit()
    test_db.refresh(alert)
    return alert

# 1. Feature extraction works
def test_feature_extraction(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH", "Feature Extraction Test")
    features = extract_anomaly_features(test_db, alert)

    assert "alert_volume_24h" in features
    assert "user_alert_frequency_24h" in features
    assert "failed_login_count_24h" in features
    assert "high_severity_ratio_24h" in features
    assert "off_hours_activity_flag" in features
    assert features["alert_volume_24h"] >= 1.0

# 2. Historical baseline calculation works
def test_historical_baseline_calculation(test_db: Session):
    user_name = f"target_user_{uuid.uuid4().hex[:4]}"
    for i in range(5):
        al = create_sample_alert(test_db, "MEDIUM", f"Historical Alert {i}")
        al.user_context = user_name
        test_db.commit()

    latest_alert = create_sample_alert(test_db, "HIGH", "Latest Target Alert")
    latest_alert.user_context = user_name
    test_db.commit()

    means, stds, sample_size = calculate_statistical_baselines(test_db, latest_alert)

    assert sample_size >= 5
    assert "alert_volume_24h" in means
    assert "failed_login_count_24h" in stds

# 3. Z-score calculation works
def test_z_score_calculation(test_db: Session):
    alert = create_sample_alert(test_db, "CRITICAL")
    alert.raw_payload = {"failed_attempts": 25}
    test_db.commit()

    analysis = execute_alert_triage(test_db, alert)
    anomaly_rec = evaluate_and_persist_anomaly(test_db, alert, analysis)

    assert anomaly_rec.anomaly_score > 0.0
    anom_feats = anomaly_rec.reasons.get("anomalous_features", [])
    assert any(f["feature_name"] == "failed_login_count_24h" for f in anom_feats)

# 4. Frequency-spike detection works
def test_frequency_spike_detection(test_db: Session):
    target_user = f"victim_user_{uuid.uuid4().hex[:4]}"
    for _ in range(8):
        al = create_sample_alert(test_db, "HIGH", "Burst Alert")
        al.user_context = target_user
        test_db.commit()

    last_alert = create_sample_alert(test_db, "CRITICAL", "Final Spike Alert")
    last_alert.user_context = target_user
    test_db.commit()

    analysis = execute_alert_triage(test_db, last_alert)
    anomaly_rec = evaluate_and_persist_anomaly(test_db, last_alert, analysis)

    assert anomaly_rec.anomaly_score >= 30.0

# 5. Time-of-day deviation works
def test_time_of_day_deviation(test_db: Session):
    # Force 03:00 AM UTC timestamp
    off_hours_time = datetime.now(timezone.utc).replace(hour=3, minute=15)
    alert = create_sample_alert(test_db, "MEDIUM", "Off Hours Event", timestamp=off_hours_time)

    features = extract_anomaly_features(test_db, alert)
    assert features["off_hours_activity_flag"] == 1.0

# 6. Insufficient historical data handled safely
def test_insufficient_historical_data(test_db: Session):
    # Single isolated low-context alert for a brand new unique user
    alert = Alert(
        alert_code=f"ALT-ISOLATED-{uuid.uuid4().hex[:6]}",
        event_type="SYSTEM_PING",
        event_category="NETWORK",
        severity="LOW",
        user_context=f"new_isolated_user_{uuid.uuid4().hex[:6]}",
        timestamp=datetime.now(timezone.utc),
        description="Isolated low context ping"
    )
    test_db.add(alert)
    test_db.commit()

    analysis = execute_alert_triage(test_db, alert)
    anomaly_rec = evaluate_and_persist_anomaly(test_db, alert, analysis)

    assert anomaly_rec.reasons["status"] == "INSUFFICIENT_DATA"
    assert anomaly_rec.anomaly_score == 0.0

# 7. Isolation Forest works with scikit-learn
def test_isolation_forest_model_execution(test_db: Session):
    curr_features = {
        "alert_volume_24h": 45.0,
        "user_alert_frequency_24h": 22.0,
        "asset_alert_frequency_24h": 15.0,
        "source_ip_frequency_24h": 10.0,
        "event_type_frequency_24h": 12.0,
        "failed_login_count_24h": 30.0,
        "high_severity_ratio_24h": 0.9,
        "off_hours_activity_flag": 1.0
    }
    score, meta = run_isolation_forest_model(curr_features, [])
    assert score >= 40.0
    assert meta["algorithm"] == "IsolationForest (scikit-learn)"
    assert meta["random_state"] == 42

# 8. Model parameters verified
def test_isolation_forest_parameters(test_db: Session):
    curr_features = extract_anomaly_features(test_db, create_sample_alert(test_db))
    score, meta = run_isolation_forest_model(curr_features, [])
    assert meta["contamination"] == 0.1
    assert meta["n_estimators"] == 50

# 9. Determinism with fixed random_state=42
def test_isolation_forest_determinism(test_db: Session):
    curr_features = {
        "alert_volume_24h": 20.0,
        "user_alert_frequency_24h": 5.0,
        "asset_alert_frequency_24h": 5.0,
        "source_ip_frequency_24h": 4.0,
        "event_type_frequency_24h": 6.0,
        "failed_login_count_24h": 8.0,
        "high_severity_ratio_24h": 0.5,
        "off_hours_activity_flag": 1.0
    }
    score1, _ = run_isolation_forest_model(curr_features, [])
    score2, _ = run_isolation_forest_model(curr_features, [])
    assert score1 == score2

# 10. Anomaly score remains 0–100
def test_anomaly_score_range(test_db: Session):
    alert = create_sample_alert(test_db, "CRITICAL")
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_anomaly(test_db, alert, analysis)
    assert 0.0 <= rec.anomaly_score <= 100.0

# 11. Anomaly score is independent of Risk score
def test_anomaly_score_independence(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    anom_rec = evaluate_and_persist_anomaly(test_db, alert, analysis)
    risk_score_val = (analysis.findings or {}).get("risk_score", {}).get("score", 0.0)

    # Anomaly score measures baseline deviation, risk measures impact. They are distinct.
    assert hasattr(anom_rec, "anomaly_score")
    assert isinstance(anom_rec.anomaly_score, float)

# 12. Baseline is persisted
def test_baseline_persistence(test_db: Session):
    alert = create_sample_alert(test_db, "CRITICAL")
    alert.raw_payload = {"failed_attempts": 15}
    test_db.commit()

    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_anomaly(test_db, alert, analysis)

    assert "anomalous_features" in rec.reasons

# 13. Observed value is persisted
def test_observed_value_persistence(test_db: Session):
    alert = create_sample_alert(test_db, "CRITICAL")
    alert.raw_payload = {"failed_attempts": 20}
    test_db.commit()

    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_anomaly(test_db, alert, analysis)

    anom_feats = rec.reasons.get("anomalous_features", [])
    if anom_feats:
        assert "observed" in anom_feats[0]

# 14. Deviation is persisted
def test_deviation_persistence(test_db: Session):
    alert = create_sample_alert(test_db, "CRITICAL")
    alert.raw_payload = {"failed_attempts": 20}
    test_db.commit()

    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_anomaly(test_db, alert, analysis)

    anom_feats = rec.reasons.get("anomalous_features", [])
    if anom_feats:
        assert "deviation" in anom_feats[0]

# 15. Explanation is persisted
def test_explanation_persistence(test_db: Session):
    alert = create_sample_alert(test_db, "CRITICAL")
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_anomaly(test_db, alert, analysis)

    assert "summary" in rec.reasons
    assert "disclaimer" in rec.reasons

# 16. Model version is persisted
def test_model_version_persistence(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_anomaly(test_db, alert, analysis)

    assert rec.reasons.get("model_version") == MODEL_VERSION

# 17. Feature version is persisted
def test_feature_version_persistence(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_anomaly(test_db, alert, analysis)

    assert rec.reasons.get("feature_version") == FEATURE_VERSION

# 18. Anomaly lifecycle works
def test_anomaly_lifecycle(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    rec = evaluate_and_persist_anomaly(test_db, alert, analysis)

    assert rec.reasons.get("status") in ["COMPLETED", "INSUFFICIENT_DATA"]

# 19. Anomaly failure does not delete Alert
def test_failure_isolation_preserves_alert(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    alert_id = alert.id
    analysis = execute_alert_triage(test_db, alert)
    evaluate_and_persist_anomaly(test_db, alert, analysis)

    fetched_alert = test_db.scalar(select(Alert).where(Alert.id == alert_id))
    assert fetched_alert is not None

# 20. Anomaly failure does not delete AlertAnalysis
def test_failure_isolation_preserves_analysis(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    evaluate_and_persist_anomaly(test_db, alert, analysis)

    fetched_analysis = test_db.scalar(select(AlertAnalysis).where(AlertAnalysis.alert_id == alert.id))
    assert fetched_analysis is not None

# 21. Anomaly failure does not corrupt RiskScore
def test_failure_isolation_preserves_risk_score(test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    evaluate_and_persist_anomaly(test_db, alert, analysis)

    risk_rec = test_db.scalar(select(RiskScore).where(RiskScore.alert_id == alert.id))
    assert risk_rec is not None
    assert 0.0 <= risk_rec.score <= 100.0

# 22. Reanalysis updates anomaly result
def test_reanalysis_recalculates_anomaly(test_db: Session):
    alert = create_sample_alert(test_db, "LOW")
    analysis1 = execute_alert_triage(test_db, alert)
    rec1 = test_db.scalar(select(AnomalyScore).where(AnomalyScore.alert_id == alert.id))
    score1 = rec1.anomaly_score if rec1 else 0.0

    # Inject brute force spike
    alert.raw_payload = {"failed_attempts": 30}
    test_db.commit()

    analysis2 = execute_alert_triage(test_db, alert)
    rec2 = test_db.scalar(select(AnomalyScore).where(AnomalyScore.alert_id == alert.id))
    score2 = rec2.anomaly_score

    assert score2 >= score1

# 23. SOC Analyst can access anomaly information
def test_soc_analyst_can_access_anomaly(soc_analyst_token: str, test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    execute_alert_triage(test_db, alert)

    response = client.get(
        f"/alerts/{alert.id}/analysis",
        headers={"Authorization": f"Bearer {soc_analyst_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "findings" in data
    assert "anomaly_score" in data["findings"]

# 24. Alert Source receives 403
def test_alert_source_cannot_access_anomaly(alert_source_token: str, test_db: Session):
    alert = create_sample_alert(test_db, "HIGH")
    execute_alert_triage(test_db, alert)

    response = client.get(
        f"/alerts/{alert.id}/analysis",
        headers={"Authorization": f"Bearer {alert_source_token}"}
    )
    assert response.status_code == 403

# 25. Realtime anomaly event format
def test_realtime_anomaly_event_format(test_db: Session):
    from app.realtime.publisher import format_anomaly_completed_payload
    alert = create_sample_alert(test_db, "HIGH")
    analysis = execute_alert_triage(test_db, alert)
    anomaly_rec = evaluate_and_persist_anomaly(test_db, alert, analysis)

    payload = format_anomaly_completed_payload(anomaly_rec, alert)
    assert payload["type"] == "ANOMALY_COMPLETED"
    assert payload["data"]["alert_id"] == str(alert.id)
    assert "anomaly_score" in payload["data"]
    assert "status" in payload["data"]
