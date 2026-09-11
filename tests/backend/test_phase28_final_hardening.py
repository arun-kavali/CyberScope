import sys
import os
import uuid
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app

client = TestClient(app)

def get_auth_headers(username: str = "soc_lead_analyst", role: str = "SOC_ANALYST"):
    signup_payload = {
        "username": username,
        "email": f"{username}@cyberscope.io",
        "password": "Password123!",
        "full_name": "SOC Lead Analyst",
        "role": role
    }
    signup_res = client.post("/api/v1/auth/signup", json=signup_payload)
    if signup_res.status_code == 201:
        token = signup_res.json()["token"]
    else:
        login_res = client.post("/api/v1/auth/login", json={"username": username, "password": "Password123!"})
        assert login_res.status_code == 200, login_res.text
        token = login_res.json()["token"]
    return {"Authorization": f"Bearer {token}"}

def test_resolved_incident_cannot_start_investigation():
    headers = get_auth_headers("analyst_hardened_01", "SOC_ANALYST")
    
    # 1. Ingest sample scenario alerts to generate an incident
    sample_res = client.post("/api/v1/alerts/sample-dataset", headers=headers)
    assert sample_res.status_code == 201
    
    # 2. Fetch incidents
    incidents_res = client.get("/api/v1/incidents", headers=headers)
    assert incidents_res.status_code == 200
    items = incidents_res.json()["items"]
    assert len(items) > 0
    incident_id = items[0]["id"]

    # 3. Resolve the incident
    resolve_res = client.post(f"/api/v1/incidents/{incident_id}/resolve", headers=headers)
    assert resolve_res.status_code == 200
    assert resolve_res.json()["new_status"] == "RESOLVED"

    # 4. Attempt to start investigation on RESOLVED incident -> Must be rejected with 400
    start_res = client.post(f"/api/v1/incidents/{incident_id}/start-investigation", headers=headers)
    assert start_res.status_code == 400
    assert "cannot start investigation" in start_res.json()["detail"].lower()

    # 5. Verify audit log entry was created for rejected attempt
    audit_res = client.get("/api/v1/audit?action=UNAUTHORIZED_ACCESS_ATTEMPT", headers=headers)
    assert audit_res.status_code == 200
    audit_items = audit_res.json()["items"]
    assert len(audit_items) > 0
    assert audit_items[0]["target_id"] == incident_id

def test_data_sources_interactive_actions_and_audit():
    headers = get_auth_headers("analyst_hardened_02", "SOC_ANALYST")

    # Upload CSV source
    csv_content = "event_type,severity,source_ip,destination_ip,user_id,timestamp\nAUTHENTICATION,HIGH,192.168.1.50,10.0.0.1,usr_jdoe,2026-09-07T12:00:00Z\n"
    files = {"file": ("test_logs.csv", csv_content.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/sources/csv", files=files, headers=headers)
    assert upload_res.status_code == 200
    source_id = upload_res.json()["data_source_id"]

    # Test connection
    test_res = client.post(f"/api/v1/sources/{source_id}/test", headers=headers)
    assert test_res.status_code == 200
    assert test_res.json()["success"] is True

    # Refresh schema
    schema_res = client.post(f"/api/v1/sources/{source_id}/schema/refresh", headers=headers)
    assert schema_res.status_code == 200
    assert len(schema_res.json()["fields"]) >= 1

    # Preview data
    preview_res = client.get(f"/api/v1/sources/{source_id}/preview", headers=headers)
    assert preview_res.status_code == 200
    assert len(preview_res.json()["records"]) >= 1

    # Disconnect
    disc_res = client.post(f"/api/v1/sources/{source_id}/disconnect", headers=headers)
    assert disc_res.status_code == 200
    assert disc_res.json()["status"] == "DISCONNECTED"

def test_response_action_lifecycle_and_audit():
    headers = get_auth_headers("analyst_hardened_03", "SOC_ANALYST")

    # Create response action
    payload = {
        "action_type": "BLOCK_IP",
        "target_entity_type": "IP",
        "target_entity_id": "185.220.101.5",
        "reason": "Malicious scanner identified during investigation"
    }
    create_res = client.post("/api/v1/response/actions", json=payload, headers=headers)
    assert create_res.status_code == 200
    action_data = create_res.json()
    action_id = action_data["id"]

    # If pending approval, approve it
    if action_data["status"] == "PENDING_APPROVAL":
        appr_res = client.post(f"/api/v1/response/actions/{action_id}/approve", json={"reason": "Approved by analyst"}, headers=headers)
        assert appr_res.status_code == 200
        assert appr_res.json()["status"] == "EXECUTED"

    # Rollback
    rollback_res = client.post(f"/api/v1/response/actions/{action_id}/rollback", json={"reason": "Rollback test"}, headers=headers)
    assert rollback_res.status_code == 200
    assert rollback_res.json()["status"] == "ROLLED_BACK"

    # Verify audit log recorded events
    audit_res = client.get("/api/v1/audit", headers=headers)
    assert audit_res.status_code == 200
    assert len(audit_res.json()["items"]) > 0
