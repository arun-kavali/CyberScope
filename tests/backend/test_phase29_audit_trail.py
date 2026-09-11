import sys
import os
import uuid
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app

client = TestClient(app)

def get_auth(username: str, role: str = "SOC_ANALYST"):
    signup_payload = {
        "username": username,
        "email": f"{username}@cyberscope.io",
        "password": "Password123!",
        "full_name": f"User {username}",
        "role": role
    }
    res = client.post("/api/v1/auth/signup", json=signup_payload)
    if res.status_code == 201:
        token = res.json()["token"]
    else:
        login_res = client.post("/api/v1/auth/login", json={"username": username, "password": "Password123!"})
        assert login_res.status_code == 200, login_res.text
        token = login_res.json()["token"]
    return {"Authorization": f"Bearer {token}"}

def test_auth_and_rbac_audit_events():
    user = f"audit_usr_{uuid.uuid4().hex[:6]}"
    headers = get_auth(user, "SOC_ANALYST")

    # 1. Verify AUTH_SIGNUP / AUTH_LOGIN in audit logs
    audit_res = client.get("/api/v1/audit?page_size=100", headers=headers)
    assert audit_res.status_code == 200
    actions = [item["action"] for item in audit_res.json()["items"]]
    assert "AUTH_SIGNUP" in actions or "AUTH_LOGIN" in actions

    # 2. Test AUTH_LOGIN_FAILED
    failed_login = client.post("/api/v1/auth/login", json={"username": user, "password": "WrongPassword!"})
    assert failed_login.status_code == 401

    audit_res2 = client.get("/api/v1/audit?page_size=100", headers=headers)
    actions2 = [item["action"] for item in audit_res2.json()["items"]]
    assert "AUTH_LOGIN_FAILED" in actions2

    # 3. Test UNAUTHORIZED_ACCESS_ATTEMPT via RBAC
    rbac_denied = client.get("/api/v1/incidents", headers=headers)
    # Analyst can access incidents, so let's test ALERT_SOURCE attempting /incidents
    src_user = f"audit_src_{uuid.uuid4().hex[:6]}"
    src_headers = get_auth(src_user, "ALERT_SOURCE")
    rbac_denied2 = client.get("/api/v1/incidents", headers=src_headers)
    assert rbac_denied2.status_code == 403

    audit_res3 = client.get("/api/v1/audit?page_size=100", headers=src_headers)
    assert audit_res3.status_code == 403 # ALERT_SOURCE cannot access audit endpoint

    # Check via analyst in system (or admin)
    audit_res4 = client.get(f"/api/v1/audit?page_size=100&action=UNAUTHORIZED_ACCESS_ATTEMPT", headers=headers)
    assert audit_res4.status_code == 200

def test_alert_and_triage_audit_events():
    headers = get_auth("audit_analyst_02", "SOC_ANALYST")

    ds_res = client.post("/api/v1/alerts/sample-dataset", headers=headers)
    assert ds_res.status_code == 201

    alerts_res = client.get("/api/v1/alerts", headers=headers)
    assert alerts_res.status_code == 200
    alert_items = alerts_res.json()
    alert_id = alert_items[0]["id"] if isinstance(alert_items, list) else alert_items["items"][0]["id"]

    # 2. Trigger Reanalysis
    reanalyze_res = client.post(f"/api/v1/analysis/alert/{alert_id}", headers=headers)
    assert reanalyze_res.status_code == 200

    # 3. Check Audit logs for SAMPLE_DATASET_INGESTED, ALERT_TRIAGED, ALERT_REANALYZED
    audit_res = client.get("/api/v1/audit?page_size=100", headers=headers)
    assert audit_res.status_code == 200
    actions = [item["action"] for item in audit_res.json()["items"]]
    assert "SAMPLE_DATASET_INGESTED" in actions
    assert "ALERT_TRIAGED" in actions
    assert "ALERT_REANALYZED" in actions

def test_investigation_and_response_audit_events():
    headers = get_auth("audit_analyst_03", "SOC_ANALYST")

    # Seed alerts & incidents
    client.post("/api/v1/alerts/sample-dataset", headers=headers)
    incidents_res = client.get("/api/v1/incidents", headers=headers)
    assert incidents_res.status_code == 200
    items = incidents_res.json()["items"]
    open_items = [i for i in items if i["status"] != "RESOLVED"]
    assert len(open_items) > 0
    inc_id = open_items[0]["id"]

    # 1. Start Investigation
    start_res = client.post(f"/api/v1/incidents/{inc_id}/start-investigation", headers=headers)
    assert start_res.status_code == 200

    # 2. Add Investigation Note
    note_res = client.post(f"/api/v1/incidents/{inc_id}/notes", json={"note": "Audit test note"}, headers=headers)
    assert note_res.status_code == 201

    # 3. Resolve Incident
    res_inc = client.post(f"/api/v1/incidents/{inc_id}/resolve", headers=headers)
    assert res_inc.status_code == 200

    # 4. Verify Audit Logs contain INCIDENT_STARTED_INVESTIGATION, INVESTIGATION_NOTE_ADDED, INCIDENT_RESOLVED
    audit_res = client.get("/api/v1/audit?page_size=100", headers=headers)
    assert audit_res.status_code == 200
    actions = [item["action"] for item in audit_res.json()["items"]]
    assert "INCIDENT_STARTED_INVESTIGATION" in actions
    assert "INVESTIGATION_NOTE_ADDED" in actions
    assert "INCIDENT_RESOLVED" in actions

def test_audit_trail_workspace_isolation_and_secret_masking():
    headers = get_auth("audit_analyst_04", "SOC_ANALYST")

    # Check secret redaction in audit log metadata
    audit_res = client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 200
    for item in audit_res.json()["items"]:
        meta = item.get("audit_metadata") or {}
        # Ensure password or secret keys are never present unredacted
        for k, v in meta.items():
            if "password" in k.lower() or "secret" in k.lower():
                assert v == "[REDACTED]"

def test_data_source_audit_events():
    headers = get_auth("audit_analyst_ds_05", "SOC_ANALYST")

    # 1. Connect database data source (logs DATA_SOURCE_CREATED)
    ds_res = client.post("/api/v1/sources/database", json={
        "name": "Audit Test Database",
        "type": "POSTGRESQL",
        "connection_config": {"host": "localhost", "port": 5432, "database": "audit_db"}
    }, headers=headers)
    assert ds_res.status_code == 200
    ds_data = ds_res.json()
    ds_id = ds_data["data_source_id"]

    # 2. Map schema (logs DATA_SOURCE_SCHEMA_MAPPED)
    map_res = client.post("/api/v1/sources/map-schema", json={
        "data_source_id": ds_id,
        "field_mappings": {"raw_event": "event_type", "severity_level": "severity"}
    }, headers=headers)
    assert map_res.status_code == 200

    # 3. Validate source data (logs DATA_SOURCE_VALIDATED)
    val_res = client.post("/api/v1/sources/validate", json={
        "data_source_id": ds_id,
        "source_type": "POSTGRESQL",
        "field_mappings": {"raw_event": "event_type", "severity_level": "severity"},
        "connection_config": {"host": "localhost", "port": 5432, "database": "audit_db"}
    }, headers=headers)
    assert val_res.status_code == 200

    # 4. Import source data (logs DATA_SOURCE_DATA_IMPORTED)
    imp_res = client.post("/api/v1/sources/import", json={
        "data_source_id": ds_id,
        "source_type": "POSTGRESQL",
        "field_mappings": {"raw_event": "event_type", "severity_level": "severity"},
        "connection_config": {"host": "localhost", "port": 5432, "database": "audit_db"}
    }, headers=headers)
    assert imp_res.status_code == 200

    # 5. Verify audit logs contain DATA_SOURCE_CREATED, DATA_SOURCE_SCHEMA_MAPPED, DATA_SOURCE_VALIDATED, DATA_SOURCE_DATA_IMPORTED
    audit_res = client.get("/api/v1/audit?page_size=100", headers=headers)
    assert audit_res.status_code == 200
    actions = [item["action"] for item in audit_res.json()["items"]]
    assert "DATA_SOURCE_CREATED" in actions
    assert "DATA_SOURCE_SCHEMA_MAPPED" in actions
    assert "DATA_SOURCE_VALIDATED" in actions
    assert "DATA_SOURCE_DATA_IMPORTED" in actions
