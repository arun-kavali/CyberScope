import sys
import os
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import get_db
from app.models.identity import Profile, Role
from app.models.evidence import Alert, Investigation
from app.models.sources import DataSource, AlertSource
from app.models.audit import AuditLog, Report

client = TestClient(app)

@pytest.fixture
def db_session():
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

def create_user_via_api(username_prefix: str, role_name: str = "SOC_ANALYST"):
    uid = uuid.uuid4().hex[:6]
    username = f"{username_prefix}_{uid}"
    email = f"{username}@cyberscope.test"
    password = "SecurePassword123!"

    res = client.post("/api/v1/auth/signup", json={
        "username": username,
        "email": email,
        "password": password,
        "full_name": f"Test {username_prefix}",
        "role": role_name
    })
    assert res.status_code == 201, f"Signup failed: {res.text}"
    data = res.json()
    token = data["token"]
    user_id = data["user"]["id"]
    return user_id, username, token

def test_new_soc_analyst_starts_with_zero_alerts():
    user_id, username, token = create_user_via_api("analyst_zero", "SOC_ANALYST")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["metrics"]["live_alerts_count"] == 0, "New SOC Analyst must start with 0 operational alerts"

def test_cross_workspace_isolation_user_a_and_user_b():
    user_a_id, username_a, token_a = create_user_via_api("analyst_iso_a", "SOC_ANALYST")
    user_b_id, username_b, token_b = create_user_via_api("analyst_iso_b", "SOC_ANALYST")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Import sample dataset for User A
    res_import = client.post("/api/v1/alerts/sample-dataset?quantity=10", headers=headers_a)
    assert res_import.status_code == 201
    assert res_import.json()["accepted_count"] > 0

    # User A dashboard reflects User A's alerts
    res_dash_a = client.get("/api/v1/dashboard/summary", headers=headers_a)
    assert res_dash_a.status_code == 200
    count_a = res_dash_a.json()["metrics"]["live_alerts_count"]
    assert count_a > 0

    # User B dashboard MUST reflect 0 alerts (No cross-workspace data leakage)
    res_dash_b = client.get("/api/v1/dashboard/summary", headers=headers_b)
    assert res_dash_b.status_code == 200
    count_b = res_dash_b.json()["metrics"]["live_alerts_count"]
    assert count_b == 0, f"User B sees {count_b} alerts belonging to User A!"

def test_data_source_ownership_and_unauthorized_access_denied():
    user_a_id, username_a, token_a = create_user_via_api("ds_owner_a", "SOC_ANALYST")
    user_b_id, username_b, token_b = create_user_via_api("ds_owner_b", "SOC_ANALYST")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A connects a database source
    res = client.post("/api/v1/sources/database", json={
        "name": "User A Private PostgreSQL",
        "type": "POSTGRESQL",
        "connection_config": {"host": "localhost", "port": 5432, "database": "private_a", "user": "admin", "password": "SecretPassword123"}
    }, headers=headers_a)
    assert res.status_code == 200
    ds_id = res.json()["data_source_id"]

    # User A lists sources and sees their source (with sanitized config)
    res_list_a = client.get("/api/v1/sources", headers=headers_a)
    assert res_list_a.status_code == 200
    sources_a = res_list_a.json()
    assert any(s["id"] == ds_id for s in sources_a)

    # User B lists sources and DOES NOT see User A's source
    res_list_b = client.get("/api/v1/sources", headers=headers_b)
    assert res_list_b.status_code == 200
    sources_b = res_list_b.json()
    assert not any(s["id"] == ds_id for s in sources_b)

    # User B attempts direct access to User A's data source detail -> 404 Not Found
    res_detail_b = client.get(f"/api/v1/sources/{ds_id}", headers=headers_b)
    assert res_detail_b.status_code == 404

def test_demo_mode_read_only_isolation_and_rbac():
    analyst_id, username_an, token_analyst = create_user_via_api("demo_analyst", "SOC_ANALYST")
    source_id, username_src, token_source = create_user_via_api("demo_source", "ALERT_SOURCE")

    headers_analyst = {"Authorization": f"Bearer {token_analyst}"}
    headers_source = {"Authorization": f"Bearer {token_source}"}

    # SOC_ANALYST can request demo_mode=true to read demo telemetry
    res_demo = client.get("/api/v1/dashboard/summary?demo_mode=true", headers=headers_analyst)
    assert res_demo.status_code == 200

    # ALERT_SOURCE passing demo_mode=true cannot view analyst demo telemetry
    res_source_alerts = client.get("/api/v1/alerts?demo_mode=true", headers=headers_source)
    assert res_source_alerts.status_code == 200
    for alert in res_source_alerts.json():
        assert alert.get("submitted_by_user_id") == str(source_id) or alert.get("submitted_by_user_id") is None

def test_alert_source_workspace_routing():
    source_a_id, username_src, token_src_a = create_user_via_api("src_a", "ALERT_SOURCE")
    analyst_b_id, username_an, token_an_b = create_user_via_api("an_b", "SOC_ANALYST")

    headers_src_a = {"Authorization": f"Bearer {token_src_a}"}
    headers_an_b = {"Authorization": f"Bearer {token_an_b}"}

    # Alert Source A submits single alert
    res_sub = client.post("/api/v1/alerts", json={
        "event_type": "Suspicious Login",
        "event_category": "AUTHENTICATION",
        "severity": "HIGH",
        "description": "Suspicious login attempt from untrusted IP",
        "source_ip": "198.51.100.45",
        "user_context": "usr_john_doe"
    }, headers=headers_src_a)
    assert res_sub.status_code == 201
    alert_id = res_sub.json()["id"]

    # Alert Source A sees alert in their submission history
    res_hist_a = client.get("/api/v1/alerts", headers=headers_src_a)
    assert res_hist_a.status_code == 200
    assert any(a["id"] == alert_id for a in res_hist_a.json())

    # Analyst B (different workspace) does NOT see Alert Source A's alert in their workspace
    res_dash_b = client.get("/api/v1/dashboard/summary", headers=headers_an_b)
    assert res_dash_b.status_code == 200
    assert res_dash_b.json()["metrics"]["live_alerts_count"] == 0

def test_real_csv_data_source_full_pipeline_ingestion():
    import time
    user_id, username, token = create_user_via_api("real_csv_analyst", "SOC_ANALYST")
    other_id, username_other, token_other = create_user_via_api("other_csv_analyst", "SOC_ANALYST")

    headers = {"Authorization": f"Bearer {token}"}
    headers_other = {"Authorization": f"Bearer {token_other}"}

    ts = int(time.time())
    csv_content = f"""event_type,event_category,severity,description,source_ip,user_context,asset_context
Brute Force,AUTHENTICATION,HIGH,Multiple failed login attempts detected,198.51.100.12,usr_csv_{ts}_1,EP-CSV-01
Suspicious PowerShell,ENDPOINT,CRITICAL,Encoded PowerShell command execution,192.168.1.105,usr_csv_{ts}_2,EP-CSV-01
""".encode("utf-8")

    # 1. Upload CSV source
    res_upload = client.post(
        "/api/v1/sources/csv",
        files={"file": ("security_logs.csv", csv_content, "text/csv")},
        data={"name": "Real Security Logs CSV"},
        headers=headers
    )
    assert res_upload.status_code == 200
    disc = res_upload.json()
    ds_id = disc["data_source_id"]
    assert ds_id is not None
    assert disc["total_fields"] >= 4

    # 2. Map fields
    mappings = {
        "event_type": "event_type",
        "event_category": "event_category",
        "severity": "severity",
        "description": "description",
        "source_ip": "source_ip",
        "user_context": "user_context",
        "asset_context": "asset_context"
    }
    res_map = client.post(
        "/api/v1/sources/map-schema",
        json={"data_source_id": ds_id, "field_mappings": mappings},
        headers=headers
    )
    assert res_map.status_code == 200

    # 3. Validate records
    res_val = client.post(
        "/api/v1/sources/validate",
        json={"data_source_id": ds_id, "source_type": "CSV", "field_mappings": mappings},
        headers=headers
    )
    assert res_val.status_code == 200
    assert res_val.json()["valid_count"] == 2

    # 4. Import records
    res_imp = client.post(
        "/api/v1/sources/import",
        json={"data_source_id": ds_id, "source_type": "CSV", "field_mappings": mappings},
        headers=headers
    )
    assert res_imp.status_code == 200
    imp_json = res_imp.json()
    assert imp_json["imported_records"] == 2, f"Import response: {imp_json}"

    # 5. Verify records entered analyst workspace
    res_dash = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res_dash.status_code == 200
    assert res_dash.json()["metrics"]["live_alerts_count"] == 2

    # 6. Verify other analyst workspace has 0 alerts (Isolated)
    res_dash_other = client.get("/api/v1/dashboard/summary", headers=headers_other)
    assert res_dash_other.status_code == 200
    assert res_dash_other.json()["metrics"]["live_alerts_count"] == 0
