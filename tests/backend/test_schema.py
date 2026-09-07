import sys
import os
import pytest
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

# Ensure backend directory is in python path for testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import engine, SessionLocal
from app.models import (
    Role, Profile, AlertSource, DataSource, DataSourceConnection, DataSourceSchema, DataSourceMapping,
    UserDirectory, Asset, Event, Alert, Case, Investigation, Escalation, Disposition,
    AlertAnalysis, RiskScore, AnomalyScore, CorrelationResult, ThreatIndicator, Incident, IncidentAlert, IncidentTimeline,
    ExecutionGapFinding, NegativeSpaceFinding, PeerBenchmark, CapabilityScore, ReviewPriority, OperationalFinding, Evidence,
    DetectionRule, ResponsePolicy, ResponseAction, SandboxUser, SandboxEndpoint, SandboxFirewallRule, AuditLog, Report
)

client = TestClient(app)

EXPECTED_TABLES = {
    "roles", "profiles",
    "alert_sources", "data_sources", "data_source_connections", "data_source_schemas", "data_source_mappings",
    "users_directory", "assets", "events", "alerts", "cases", "investigations", "escalations", "dispositions",
    "alert_analysis", "risk_scores", "anomaly_scores", "correlation_results", "threat_indicators", "incidents", "incident_alerts", "incident_timeline",
    "execution_gap_findings", "negative_space_findings", "peer_benchmarks", "capability_scores", "review_priorities", "operational_findings", "evidence",
    "detection_rules", "response_policies", "response_actions", "sandbox_users", "sandbox_endpoints", "sandbox_firewall_rules",
    "audit_logs", "reports", "alembic_version"
}

def test_all_expected_tables_exist_in_postgres():
    """Verify that all 38 CyberScope tables exist in the PostgreSQL database."""
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    for expected_table in EXPECTED_TABLES:
        assert expected_table in existing_tables, f"Table '{expected_table}' missing from PostgreSQL database"

def test_foreign_keys_exist():
    """Verify primary foreign key constraints exist on critical tables."""
    inspector = inspect(engine)
    
    # Check profiles -> roles FK
    fks_profiles = inspector.get_foreign_keys("profiles")
    assert any(fk["referred_table"] == "roles" for fk in fks_profiles)

    # Check alerts -> alert_sources FK
    fks_alerts = inspector.get_foreign_keys("alerts")
    assert any(fk["referred_table"] == "alert_sources" for fk in fks_alerts)

    # Check incident_alerts -> incidents & alerts FKs
    fks_incident_alerts = inspector.get_foreign_keys("incident_alerts")
    referred_tables = {fk["referred_table"] for fk in fks_incident_alerts}
    assert "incidents" in referred_tables
    assert "alerts" in referred_tables

def test_check_constraints_enforce_valid_ranges():
    """Verify PostgreSQL check constraints reject invalid risk score ranges."""
    db: Session = SessionLocal()
    try:
        # Invalid risk score > 100 should raise an IntegrityError
        invalid_risk = RiskScore(
            score=150.0,
            confidence=90.0,
            false_positive_likelihood=10.0,
            version="1.0"
        )
        db.add(invalid_risk)
        with pytest.raises(Exception):
            db.commit()
    finally:
        db.rollback()
        db.close()

def test_role_seeding_and_retrieval():
    """Verify Role ORM model operation with SOC_ANALYST and ALERT_SOURCE."""
    db: Session = SessionLocal()
    try:
        # Query or seed default application roles
        soc_role = db.query(Role).filter(Role.name == "SOC_ANALYST").first()
        if not soc_role:
            soc_role = Role(name="SOC_ANALYST", description="SOC Analyst Operational User")
            db.add(soc_role)

        source_role = db.query(Role).filter(Role.name == "ALERT_SOURCE").first()
        if not source_role:
            source_role = Role(name="ALERT_SOURCE", description="Synthetic Alert Generator Source")
            db.add(source_role)

        db.commit()

        roles = db.query(Role).all()
        role_names = [r.name for r in roles]
        assert "SOC_ANALYST" in role_names
        assert "ALERT_SOURCE" in role_names
    finally:
        db.close()

def test_existing_endpoints_continue_working():
    """Verify GET /health and GET /api/v1/test/database pass."""
    h_res = client.get("/health")
    assert h_res.status_code == 200
    assert h_res.json()["status"] == "healthy"

    db_res = client.get("/api/v1/test/database")
    assert db_res.status_code == 200
    assert db_res.json() == {"database": "connected", "status": "healthy"}
