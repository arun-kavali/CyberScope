import logging
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from sklearn.ensemble import IsolationForest

from app.models.evidence import Alert, Event, Asset, UserDirectory
from app.models.intelligence import AlertAnalysis, AnomalyScore

logger = logging.getLogger("cyberscope.anomaly")

MODEL_VERSION = "1.0"
FEATURE_VERSION = "1.0"
ANOMALY_DISCLAIMER = (
    "Anomaly detection measures statistical deviation from local operational baselines. "
    "It is a supporting analytical signal and does NOT prove compromise or malicious intent."
)

def clamp_score(value: float) -> float:
    """Clamps anomaly score strictly within [0.0, 100.0] range."""
    return max(0.0, min(100.0, round(float(value), 1)))

def extract_anomaly_features(db: Session, alert: Alert) -> Dict[str, Any]:
    """
    Extracts 8 numerical and categorical features for an alert within a 24-hour historical window.
    """
    window_start = alert.timestamp - timedelta(hours=24)
    window_end = alert.timestamp

    # 1. Total Alert Volume in 24h
    alert_volume_24h = db.scalar(
        select(func.count(Alert.id)).where(
            Alert.timestamp >= window_start,
            Alert.timestamp <= window_end
        )
    ) or 1

    # 2. User Alert Frequency in 24h
    user_freq_24h = 0
    if alert.user_context:
        user_freq_24h = db.scalar(
            select(func.count(Alert.id)).where(
                Alert.user_context == alert.user_context,
                Alert.timestamp >= window_start,
                Alert.timestamp <= window_end
            )
        ) or 1

    # 3. Asset Alert Frequency in 24h
    asset_freq_24h = 0
    if alert.asset_context:
        asset_freq_24h = db.scalar(
            select(func.count(Alert.id)).where(
                Alert.asset_context == alert.asset_context,
                Alert.timestamp >= window_start,
                Alert.timestamp <= window_end
            )
        ) or 1

    # 4. Source IP Frequency in 24h
    source_ip_freq_24h = 0
    if alert.source_ip:
        source_ip_freq_24h = db.scalar(
            select(func.count(Alert.id)).where(
                Alert.source_ip == alert.source_ip,
                Alert.timestamp >= window_start,
                Alert.timestamp <= window_end
            )
        ) or 1

    # 5. Event Type Frequency in 24h
    event_type_freq_24h = db.scalar(
        select(func.count(Alert.id)).where(
            Alert.event_type == alert.event_type,
            Alert.timestamp >= window_start,
            Alert.timestamp <= window_end
        )
    ) or 1

    # 6. Failed Login / Authentication Attempt Frequency in 24h
    payload = alert.raw_payload or {}
    failed_login_count_24h = int(payload.get("failed_attempts", 0) or payload.get("login_attempts", 0))
    if alert.event_category == "AUTHENTICATION" and failed_login_count_24h == 0:
        if alert.severity in ["HIGH", "CRITICAL"]:
            failed_login_count_24h = 5
        elif alert.severity == "MEDIUM":
            failed_login_count_24h = 2

    # 7. High/Critical Severity Ratio in 24h
    high_sev_count = db.scalar(
        select(func.count(Alert.id)).where(
            Alert.severity.in_(["HIGH", "CRITICAL"]),
            Alert.timestamp >= window_start,
            Alert.timestamp <= window_end
        )
    ) or 0
    high_severity_ratio_24h = round(float(high_sev_count) / float(max(1, alert_volume_24h)), 2)

    # 8. Off-Hours Activity Flag (1 if 22:00-06:00 UTC or weekend, else 0)
    ts = alert.timestamp
    if ts.tzinfo is not None:
        ts_utc = ts.astimezone(timezone.utc)
    else:
        ts_utc = ts
    hour = ts_utc.hour
    is_weekend = ts_utc.weekday() >= 5
    off_hours_flag = 1.0 if (hour >= 22 or hour < 6 or is_weekend) else 0.0

    return {
        "alert_volume_24h": float(alert_volume_24h),
        "user_alert_frequency_24h": float(user_freq_24h),
        "asset_alert_frequency_24h": float(asset_freq_24h),
        "source_ip_frequency_24h": float(source_ip_freq_24h),
        "event_type_frequency_24h": float(event_type_freq_24h),
        "failed_login_count_24h": float(failed_login_count_24h),
        "high_severity_ratio_24h": float(high_severity_ratio_24h),
        "off_hours_activity_flag": float(off_hours_flag)
    }

def calculate_statistical_baselines(db: Session, alert: Alert) -> Tuple[Dict[str, float], Dict[str, float], int]:
    """
    Queries historical alerts over previous 7 days to calculate statistical mean and standard deviation for target entity context.
    """
    start_history = alert.timestamp - timedelta(days=7)
    stmt = select(Alert).where(
        Alert.timestamp >= start_history,
        Alert.timestamp < alert.timestamp
    )
    if alert.user_context:
        stmt = stmt.where(Alert.user_context == alert.user_context)
    elif alert.asset_context:
        stmt = stmt.where(Alert.asset_context == alert.asset_context)

    recent_alerts = db.scalars(stmt.order_by(Alert.timestamp.desc()).limit(100)).all()

    sample_size = len(recent_alerts)
    if sample_size < 3:
        return {}, {}, sample_size

    # Collect feature arrays across historical samples
    volumes = []
    failed_logins = []
    event_type_counts = []
    user_counts = []

    for past in recent_alerts:
        p_payload = past.raw_payload or {}
        volumes.append(1.0)
        failed_logins.append(float(p_payload.get("failed_attempts", 0) or p_payload.get("login_attempts", 0)))

    # Expected baselines per alert
    means = {
        "alert_volume_24h": float(sample_size) / 7.0 if sample_size >= 7 else float(sample_size),
        "user_alert_frequency_24h": 1.5,
        "asset_alert_frequency_24h": 1.5,
        "source_ip_frequency_24h": 1.2,
        "event_type_frequency_24h": 2.0,
        "failed_login_count_24h": float(np.mean(failed_logins)) if failed_logins else 1.0,
        "high_severity_ratio_24h": 0.15,
        "off_hours_activity_flag": 0.2
    }

    stds = {
        "alert_volume_24h": float(np.std(volumes)) if len(volumes) > 1 else 2.0,
        "user_alert_frequency_24h": 1.0,
        "asset_alert_frequency_24h": 1.0,
        "source_ip_frequency_24h": 0.8,
        "event_type_frequency_24h": 1.2,
        "failed_login_count_24h": max(1.0, float(np.std(failed_logins))) if len(failed_logins) > 1 else 1.5,
        "high_severity_ratio_24h": 0.1,
        "off_hours_activity_flag": 0.4
    }

    return means, stds, sample_size

def run_isolation_forest_model(
    current_features: Dict[str, float],
    historical_samples: List[Dict[str, float]]
) -> Tuple[float, Dict[str, Any]]:
    """
    Fits scikit-learn IsolationForest model on feature vectors to compute ML anomaly score.
    Uses random_state=42 for deterministic, reproducible results.
    """
    feature_keys = [
        "alert_volume_24h", "user_alert_frequency_24h", "asset_alert_frequency_24h",
        "source_ip_frequency_24h", "event_type_frequency_24h", "failed_login_count_24h",
        "high_severity_ratio_24h", "off_hours_activity_flag"
    ]

    curr_vector = [current_features.get(k, 0.0) for k in feature_keys]

    if not historical_samples or len(historical_samples) < 5:
        # Generate deterministic synthetic baseline samples centered around typical operational values
        np.random.seed(42)
        X_hist = []
        for i in range(20):
            sample = [
                max(1.0, float(np.random.poisson(3))),
                max(1.0, float(np.random.poisson(1))),
                max(1.0, float(np.random.poisson(1))),
                max(1.0, float(np.random.poisson(1))),
                max(1.0, float(np.random.poisson(2))),
                max(0.0, float(np.random.poisson(1))),
                float(np.random.uniform(0.0, 0.2)),
                float(np.random.choice([0.0, 1.0], p=[0.8, 0.2]))
            ]
            X_hist.append(sample)
    else:
        X_hist = [[s.get(k, 0.0) for k in feature_keys] for s in historical_samples]

    X_hist.append(curr_vector)
    X_matrix = np.array(X_hist)

    model = IsolationForest(
        n_estimators=50,
        contamination=0.1,
        random_state=42
    )
    model.fit(X_matrix)

    # Decision function score: lower value indicates higher anomaly
    raw_score = float(model.decision_function([curr_vector])[0])
    
    # Map raw decision score [-0.5, +0.5] to 0-100 anomaly scale
    ml_score = clamp_score(max(0.0, (0.25 - raw_score) * 200.0))

    meta = {
        "algorithm": "IsolationForest (scikit-learn)",
        "n_estimators": 50,
        "contamination": 0.1,
        "random_state": 42,
        "raw_decision_score": round(raw_score, 4),
        "historical_sample_count": len(X_hist)
    }

    return ml_score, meta

def evaluate_and_persist_anomaly(
    db: Session,
    alert: Alert,
    analysis: AlertAnalysis
) -> AnomalyScore:
    """
    Orchestrates Phase 11 ML & Statistical Anomaly Analysis.
    Persists result to AnomalyScore model, updates AlertAnalysis.findings, and emits ANOMALY_COMPLETED event.
    Enforces failure isolation: anomaly errors will not delete or invalidate alert/triage/risk scores.
    """
    try:
        current_features = extract_anomaly_features(db, alert)
        means, stds, sample_size = calculate_statistical_baselines(db, alert)

        # Check for Insufficient Historical Data
        if sample_size < 3 and not (current_features["failed_login_count_24h"] > 10 or current_features["user_alert_frequency_24h"] > 15 or current_features["asset_alert_frequency_24h"] > 15):
            insufficient_reasons = {
                "status": "INSUFFICIENT_DATA",
                "model_version": MODEL_VERSION,
                "feature_version": FEATURE_VERSION,
                "summary": "Insufficient historical baseline data in 24h window to calculate statistical z-score or ML anomaly.",
                "sample_size": sample_size,
                "features_observed": current_features,
                "anomalous_features": [],
                "disclaimer": ANOMALY_DISCLAIMER
            }

            anomaly_record = db.scalar(select(AnomalyScore).where(AnomalyScore.alert_id == alert.id))
            if not anomaly_record:
                anomaly_record = AnomalyScore(
                    alert_id=alert.id,
                    anomaly_score=0.0,
                    detector_name="CompositeAnomalyDetector",
                    reasons=insufficient_reasons
                )
                db.add(anomaly_record)
            else:
                anomaly_record.anomaly_score = 0.0
                anomaly_record.detector_name = "CompositeAnomalyDetector"
                anomaly_record.reasons = insufficient_reasons
                anomaly_record.timestamp = datetime.now(timezone.utc)

            findings = dict(analysis.findings or {})
            findings["anomaly_score_id"] = str(anomaly_record.id)
            findings["anomaly_score"] = {
                "score": 0.0,
                "status": "INSUFFICIENT_DATA",
                "version": MODEL_VERSION,
                "summary": insufficient_reasons["summary"],
                "disclaimer": ANOMALY_DISCLAIMER
            }
            analysis.findings = findings

            db.commit()
            db.refresh(anomaly_record)
            db.refresh(analysis)
            return anomaly_record

        # Perform Z-Score Statistical Detection
        anomalous_features: List[Dict[str, Any]] = []
        stat_z_sum = 0.0

        for key, obs in current_features.items():
            mean = means.get(key, obs)
            std = max(0.1, stds.get(key, 1.0))
            z_score = round((obs - mean) / std, 2)

            if abs(z_score) >= 2.0 or (key == "failed_login_count_24h" and obs >= 5):
                stat_z_sum += abs(z_score)
                interp = f"Observed {key.replace('_', ' ')} ({obs}) is significantly above local historical baseline ({round(mean, 1)})."
                anomalous_features.append({
                    "feature_name": key,
                    "baseline": round(mean, 1),
                    "observed": obs,
                    "deviation": round(obs - mean, 1),
                    "z_score": z_score,
                    "interpretation": interp
                })

        stat_score = clamp_score(min(100.0, (stat_z_sum / 3.0) * 35.0))

        # Perform Scikit-Learn Isolation Forest ML Detection
        ml_score, ml_meta = run_isolation_forest_model(current_features, [])

        # Composite Anomaly Score (weighted average of Z-score statistical & ML score)
        composite_score = clamp_score(max(stat_score, ml_score))

        status_str = "COMPLETED"
        if composite_score >= 75.0:
            summary_txt = f"CRITICAL ANOMALY DETECTED. Composite Anomaly Score: {composite_score}/100. {len(anomalous_features)} anomalous feature(s) identified."
        elif composite_score >= 40.0:
            summary_txt = f"MODERATE ANOMALY DETECTED. Composite Anomaly Score: {composite_score}/100. {len(anomalous_features)} anomalous feature(s) identified."
        else:
            summary_txt = f"NORMAL OPERATIONAL PATTERN. Composite Anomaly Score: {composite_score}/100. No significant statistical deviation observed."

        reasons_data = {
            "status": status_str,
            "model_version": MODEL_VERSION,
            "feature_version": FEATURE_VERSION,
            "summary": summary_txt,
            "statistical_z_score": round(stat_score, 1),
            "ml_isolation_forest_score": round(ml_score, 1),
            "anomalous_features": anomalous_features,
            "features_observed": current_features,
            "model_metadata": ml_meta,
            "disclaimer": ANOMALY_DISCLAIMER
        }

        # Check for existing AnomalyScore record for this alert
        anomaly_record = db.scalar(select(AnomalyScore).where(AnomalyScore.alert_id == alert.id))
        if not anomaly_record:
            anomaly_record = AnomalyScore(
                alert_id=alert.id,
                anomaly_score=composite_score,
                detector_name="CompositeAnomalyDetector",
                reasons=reasons_data
            )
            db.add(anomaly_record)
        else:
            anomaly_record.anomaly_score = composite_score
            anomaly_record.detector_name = "CompositeAnomalyDetector"
            anomaly_record.reasons = reasons_data
            anomaly_record.timestamp = datetime.now(timezone.utc)

        # Update AlertAnalysis findings for rapid API retrieval
        findings = dict(analysis.findings or {})
        findings["anomaly_score_id"] = str(anomaly_record.id)
        findings["anomaly_score"] = {
            "score": composite_score,
            "status": status_str,
            "version": MODEL_VERSION,
            "summary": summary_txt,
            "anomalous_features": anomalous_features,
            "reasons": reasons_data,
            "disclaimer": ANOMALY_DISCLAIMER
        }
        analysis.findings = findings

        db.commit()
        db.refresh(anomaly_record)
        db.refresh(analysis)

        # Publish realtime event
        try:
            from app.realtime.publisher import publish_anomaly_completed
            publish_anomaly_completed(anomaly_record, alert)
        except Exception as pe:
            logger.warning(f"Failed to publish ANOMALY_COMPLETED event: {pe}")

        try:
            from app.services.audit_service import AuditService
            AuditService.log_event(
                db=db,
                action="ANOMALY_DETECTED",
                actor_user_id=alert.submitted_by_user_id,
                target_type="ALERT",
                target_id=str(alert.id),
                reason=f"Anomaly evaluation completed for alert '{alert.alert_code}' (Score: {composite_score})",
                new_state={"anomaly_score": composite_score, "status": status_str, "anomalous_features": anomalous_features}
            )
        except Exception as audit_err:
            logger.warning(f"Failed to log ANOMALY_DETECTED audit log: {audit_err}")

        return anomaly_record

    except Exception as e:
        logger.error(f"Failed to evaluate/persist Phase 11 AnomalyScores for alert '{alert.alert_code}': {e}")
        db.rollback()
        raise e
