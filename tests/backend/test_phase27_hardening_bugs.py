import sys
import os
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select, func, distinct

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import get_db
from app.models.identity import Profile, Role
from app.models.intelligence import Incident, IncidentAlert
from app.models.evidence import Alert
from app.models.sources import DataSource, DataSourceConnection
from app.models.audit import AuditLog

client = TestClient(app)

@pytest.fixture
def db_session():
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

def create_authenticated_analyst(db_session: Session, prefix: str = "hardened_analyst"):
    username = f"{prefix}_{uuid.uuid4().hex[:6]}"
    email = f"{username}@cyberscope.local"
    password = "AnalystPassword123!"

    signup_res = client.post("/api/v1/auth/signup", json={
        "username": username,
        "email": email,
        "password": password,
        "full_name": f"Hardening {prefix}",
        "role": "SOC_ANALYST"
    })
    assert signup_res.status_code == 201, f"Signup failed: {signup_res.text}"
    data = signup_res.json()
    token = data["token"]
    user_id = uuid.UUID(data["user"]["id"])
    user = db_session.get(Profile, user_id)
    return user, token

def test_resolve_incident_increments_resolved_today(db_session: Session):
    user, token = create_authenticated_analyst(db_session, "res_today_user")
    headers = {"Authorization": f"Bearer {token}"}

    # Initial dashboard check
    res1 = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res1.status_code == 200
    init_res_today = res1.json()["operational_indicators"]["resolved_incidents_count"]

    now = datetime.now(timezone.utc)
    # Create an alert and incident for this user
    alert = Alert(
        alert_code=f"ALT-{uuid.uuid4().hex[:6]}",
        event_type="UNAUTHORIZED_ACCESS",
        event_category="SECURITY",
        severity="HIGH",
        status="ACTIVE",
        description="Test security alert description",
        timestamp=now,
        submitted_by_user_id=user.id,
        raw_payload={"test": "data"}
    )
    db_session.add(alert)
    db_session.commit()

    inc = Incident(
        incident_number=f"INC-{uuid.uuid4().hex[:6]}",
        title="Test Security Incident",
        summary="Test incident summary",
        severity="HIGH",
        risk_score=75.0,
        confidence_score=85.0,
        status="OPEN"
    )
    db_session.add(inc)
    db_session.commit()

    inc_alert = IncidentAlert(incident_id=inc.id, alert_id=alert.id)
    db_session.add(inc_alert)
    db_session.commit()

    # Resolve incident
    resolve_res = client.post(f"/api/v1/incidents/{inc.id}/resolve", headers=headers)
    assert resolve_res.status_code == 200
    assert resolve_res.json()["new_status"] == "RESOLVED"

    # Dashboard check after resolve
    res2 = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res2.status_code == 200
    new_res_today = res2.json()["operational_indicators"]["resolved_incidents_count"]
    assert new_res_today == init_res_today + 1

def test_yesterday_resolution_excluded_from_resolved_today(db_session: Session):
    user, token = create_authenticated_analyst(db_session, "res_yesterday_user")
    headers = {"Authorization": f"Bearer {token}"}

    now = datetime.now(timezone.utc)
    alert = Alert(
        alert_code=f"ALT-{uuid.uuid4().hex[:6]}",
        event_type="MALWARE_EXPLOIT",
        event_category="SECURITY",
        severity="CRITICAL",
        status="ACTIVE",
        description="Test malware alert description",
        timestamp=now,
        submitted_by_user_id=user.id,
        raw_payload={"test": "data"}
    )
    db_session.add(alert)
    db_session.commit()

    # Incident resolved yesterday
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    inc_yesterday = Incident(
        incident_number=f"INC-{uuid.uuid4().hex[:6]}",
        title="Yesterday Incident",
        summary="Yesterday incident summary",
        severity="CRITICAL",
        risk_score=90.0,
        confidence_score=95.0,
        status="RESOLVED",
        created_at=yesterday - timedelta(hours=2),
        updated_at=yesterday
    )
    db_session.add(inc_yesterday)
    db_session.commit()

    inc_alert = IncidentAlert(incident_id=inc_yesterday.id, alert_id=alert.id)
    db_session.add(inc_alert)
    db_session.commit()

    # Dashboard check
    res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res.status_code == 200
    res_today = res.json()["operational_indicators"]["resolved_incidents_count"]
    # Yesterday's resolution must NOT be counted in resolved today
    assert res_today == 0

def test_dashboard_metrics_stability(db_session: Session):
    user, token = create_authenticated_analyst(db_session, "stability_user")
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch dashboard multiple consecutive times
    r1 = client.get("/api/v1/dashboard/summary", headers=headers).json()
    r2 = client.get("/api/v1/dashboard/summary", headers=headers).json()
    r3 = client.get("/api/v1/dashboard/summary", headers=headers).json()

    assert r1["metrics"] == r2["metrics"] == r3["metrics"]
    assert r1["operational_indicators"] == r2["operational_indicators"] == r3["operational_indicators"]

def test_dashboard_no_duplicate_counts_on_joins(db_session: Session):
    user, token = create_authenticated_analyst(db_session, "distinct_user")
    headers = {"Authorization": f"Bearer {token}"}

    # Create 1 incident with 3 alerts attached
    inc = Incident(
        incident_number=f"INC-{uuid.uuid4().hex[:6]}",
        title="Multi Alert Incident",
        summary="Multi alert incident summary",
        severity="HIGH",
        risk_score=80.0,
        confidence_score=90.0,
        status="OPEN"
    )
    db_session.add(inc)
    db_session.commit()

    now = datetime.now(timezone.utc)
    for _ in range(3):
        al = Alert(
            alert_code=f"ALT-{uuid.uuid4().hex[:6]}",
            event_type="MULTIPLE_TEST",
            event_category="SECURITY",
            severity="HIGH",
            status="ACTIVE",
            description="Multi alert test description",
            timestamp=now,
            submitted_by_user_id=user.id,
            raw_payload={"test": "data"}
        )
        db_session.add(al)
        db_session.commit()
        inc_alert = IncidentAlert(incident_id=inc.id, alert_id=al.id)
        db_session.add(inc_alert)
        db_session.commit()

    res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    # Live alerts count should be 3, active incidents count should be 1 (NOT 3)
    assert data["metrics"]["live_alerts_count"] == 3
    assert data["metrics"]["active_incidents_count"] == 1

def test_workspace_isolation_dashboard_counts(db_session: Session):
    user1, token1 = create_authenticated_analyst(db_session, "ws_iso_user1")
    user2, token2 = create_authenticated_analyst(db_session, "ws_iso_user2")

    now = datetime.now(timezone.utc)
    # User 1 creates an alert
    al1 = Alert(
        alert_code=f"ALT-{uuid.uuid4().hex[:6]}",
        event_type="USER1_EVENT",
        event_category="SECURITY",
        severity="LOW",
        status="ACTIVE",
        description="Isolated alert description",
        timestamp=now,
        submitted_by_user_id=user1.id,
        raw_payload={"u": 1}
    )
    db_session.add(al1)
    db_session.commit()

    res1 = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token1}"}).json()
    res2 = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token2}"}).json()

    assert res1["metrics"]["live_alerts_count"] == 1
    assert res2["metrics"]["live_alerts_count"] == 0

def test_disconnect_datasource_removes_from_active_list(db_session: Session):
    user, token = create_authenticated_analyst(db_session, "disconnect_test_user")
    headers = {"Authorization": f"Bearer {token}"}

    # Create data source
    src = DataSource(
        name="Test Disconnect Source",
        type="POSTGRESQL",
        status="CONNECTED",
        created_by_user_id=user.id
    )
    db_session.add(src)
    db_session.commit()

    # List sources before disconnect
    sources_before = client.get("/api/v1/sources", headers=headers).json()
    assert any(s["id"] == str(src.id) for s in sources_before)

    # Disconnect source
    disc_res = client.post(f"/api/v1/sources/{src.id}/disconnect", headers=headers)
    assert disc_res.status_code == 200
    assert disc_res.json()["status"] == "DISCONNECTED"

    # List sources after disconnect - must immediately be excluded
    sources_after = client.get("/api/v1/sources", headers=headers).json()
    assert not any(s["id"] == str(src.id) for s in sources_after)

def test_refresh_after_disconnect_preserves_disconnected(db_session: Session):
    user, token = create_authenticated_analyst(db_session, "refresh_disc_user")
    headers = {"Authorization": f"Bearer {token}"}

    src = DataSource(
        name="Test Refresh Disconnect Source",
        type="JSON",
        status="CONNECTED",
        created_by_user_id=user.id
    )
    db_session.add(src)
    db_session.commit()

    # Disconnect
    client.post(f"/api/v1/sources/{src.id}/disconnect", headers=headers)

    # Subsequent fetches must keep it excluded
    for _ in range(3):
        sources = client.get("/api/v1/sources", headers=headers).json()
        assert not any(s["id"] == str(src.id) for s in sources)

    # Refresh session to inspect updated database state
    db_session.expire_all()
    db_src = db_session.get(DataSource, src.id)
    assert db_src is not None
    assert db_src.status == "DISCONNECTED"

def test_datasource_action_endpoints_real_state(db_session: Session):
    user, token = create_authenticated_analyst(db_session, "action_endpoints_user")
    headers = {"Authorization": f"Bearer {token}"}

    src = DataSource(
        name="Real Actions Test DB Source",
        type="POSTGRESQL",
        status="CONNECTED",
        created_by_user_id=user.id
    )
    db_session.add(src)
    db_session.commit()

    conn = DataSourceConnection(
        data_source_id=src.id,
        connection_config={
            "host": "localhost",
            "port": 5432,
            "database": "cyberscope",
            "table_name": "alerts",
            "user": "postgres",
            "password": "SecretPassword123!"
        }
    )
    db_session.add(conn)
    db_session.commit()

    # 1. Test Connection
    test_res = client.post(f"/api/v1/sources/{src.id}/test", headers=headers)
    assert test_res.status_code == 200
    assert "success" in test_res.json()

    # 2. Refresh Schema
    ref_res = client.post(f"/api/v1/sources/{src.id}/schema/refresh", headers=headers)
    assert ref_res.status_code == 200
    assert ref_res.json()["data_source_id"] == str(src.id)

    # 3. Preview Data
    prev_res = client.get(f"/api/v1/sources/{src.id}/preview?limit=10", headers=headers)
    assert prev_res.status_code == 200
    assert "records" in prev_res.json()

    # 4. Sync Now
    sync_res = client.post(f"/api/v1/sources/{src.id}/sync", headers=headers)
    assert sync_res.status_code == 200
    assert "imported_records" in sync_res.json()
