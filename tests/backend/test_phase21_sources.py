import sys
import os
import io
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal
from app.auth.service import seed_default_users
from app.models.evidence import Alert
from app.models.sources import DataSource

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


def test_csv_upload_and_schema_discovery():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}
    csv_content = (
        "event_type,severity,source_ip,destination_ip,user_id,description\n"
        "MALWARE_DETECTED,HIGH,192.168.1.10,10.0.0.1,john_doe,Ransomware activity detected\n"
        "PORT_SCAN,MEDIUM,192.168.1.11,10.0.0.2,jane_doe,Reconnaissance scan\n"
    )
    files = {"file": ("test.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/v1/sources/csv", files=files, headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["source_type"] == "CSV"
    assert data["total_fields"] == 6
    assert data["estimated_records"] == 2
    assert len(data["preview_rows"]) == 2


def test_csv_malformed_input():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    response = client.post("/api/v1/sources/csv", files=files, headers=headers)
    assert response.status_code == 400


def test_json_upload_and_schema_discovery():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}
    json_data = [
        {
            "event_type": "UNAUTHORIZED_SUDO",
            "severity": "CRITICAL",
            "source_ip": "10.0.2.15",
            "destination_ip": "10.0.0.5",
            "description": "Root privilege escalation attempt"
        }
    ]
    files = {"file": ("test.json", io.BytesIO(json.dumps(json_data).encode("utf-8")), "application/json")}
    response = client.post("/api/v1/sources/json", files=files, headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["source_type"] == "JSON"
    assert data["total_fields"] == 5
    assert data["estimated_records"] == 1


def test_excel_upload_and_schema_discovery():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}
    csv_fallback_xls = "event_type,severity,description\nEXCEL_AUDIT,LOW,Excel log test\n"
    files = {"file": ("test.xlsx", io.BytesIO(csv_fallback_xls.encode("utf-8")), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = client.post("/api/v1/sources/excel", files=files, headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["source_type"] == "XLSX"
    assert data["total_fields"] == 3


def test_database_connectors_discovery():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}
    
    # Test PostgreSQL
    pg_payload = {
        "name": "Postgres Audit Connector",
        "type": "POSTGRESQL",
        "connection_config": {"host": "localhost", "port": 5432, "database": "cyberscope", "table_name": "alerts"}
    }
    response = client.post("/api/v1/sources/database", json=pg_payload, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["source_type"] == "POSTGRESQL"

    # Test MySQL
    mysql_payload = {
        "name": "MySQL Security Connector",
        "type": "MYSQL",
        "connection_config": {"host": "localhost", "port": 3306, "database": "security"}
    }
    response = client.post("/api/v1/sources/database", json=mysql_payload, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["source_type"] == "MYSQL"

    # Test MongoDB
    mongo_payload = {
        "name": "MongoDB Event Connector",
        "type": "MONGODB",
        "connection_config": {"connection_string": "mongodb://localhost:27017", "database": "logs"}
    }
    response = client.post("/api/v1/sources/database", json=mongo_payload, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["source_type"] == "MONGODB"

    # Test Supabase
    supa_payload = {
        "name": "Supabase Audit Connector",
        "type": "SUPABASE",
        "connection_config": {"project_url": "https://xyzcompany.supabase.co", "api_key": "secret_key_123"}
    }
    response = client.post("/api/v1/sources/database", json=supa_payload, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["source_type"] == "SUPABASE"

    # Test REST
    rest_payload = {
        "name": "REST API Telemetry Connector",
        "type": "REST",
        "connection_config": {"url": "https://api.securityprovider.com/v1/alerts", "auth_token": "token_abc"}
    }
    response = client.post("/api/v1/sources/database", json=rest_payload, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["source_type"] == "REST"


def test_field_mapping_validation_and_import_pipeline():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Upload CSV to create data source
    csv_content = (
        "src_event,src_sev,src_ip,dst_ip,src_user,src_desc\n"
        "Port Scan,HIGH,192.168.21.99,10.0.0.99,phase21_unique_user,Phase 21 unique connection test\n"
    )
    files = {"file": ("firewall.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    disc_resp = client.post("/api/v1/sources/csv", files=files, headers=headers)
    assert disc_resp.status_code == 200
    source_id = disc_resp.json()["data_source_id"]

    # 2. Map schema
    field_mappings = {
        "src_event": "event_type",
        "src_sev": "severity",
        "src_ip": "source_ip",
        "dst_ip": "destination_ip",
        "src_user": "user_id",
        "src_desc": "description"
    }
    map_resp = client.post("/api/v1/sources/map-schema", json={"data_source_id": source_id, "field_mappings": field_mappings}, headers=headers)
    assert map_resp.status_code == 200, map_resp.text
    assert map_resp.json()["is_validated"] is True

    # 3. Validate
    val_resp = client.post("/api/v1/sources/validate", json={"data_source_id": source_id, "field_mappings": field_mappings}, headers=headers)
    assert val_resp.status_code == 200
    assert val_resp.json()["valid_count"] == 1
    assert val_resp.json()["invalid_count"] == 0

    # 4. Import & Normalize (reuses Phase 7 normalization pipeline!)
    imp_resp = client.post("/api/v1/sources/import", json={"data_source_id": source_id, "field_mappings": field_mappings}, headers=headers)
    assert imp_resp.status_code == 200, imp_resp.text
    imp_data = imp_resp.json()
    assert imp_data["status"] == "COMPLETED"
    assert imp_data["imported_records"] == 1

    # 5. Duplicate import check (re-running import should skip existing duplicate)
    dup_resp = client.post("/api/v1/sources/import", json={"data_source_id": source_id, "field_mappings": field_mappings}, headers=headers)
    assert dup_resp.status_code == 200
    assert dup_resp.json()["duplicate_records"] == 1


def test_credential_masking_security():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}
    payload = {
        "name": "Secured Supabase Source",
        "type": "SUPABASE",
        "connection_config": {
            "project_url": "https://xyzcompany.supabase.co",
            "api_key": "super_secret_service_key_999",
            "password": "db_super_password"
        }
    }
    create_resp = client.post("/api/v1/sources/database", json=payload, headers=headers)
    assert create_resp.status_code == 200

    # Fetch sources list
    list_resp = client.get("/api/v1/sources", headers=headers)
    assert list_resp.status_code == 200
    sources = list_resp.json()

    # Find the newly created source and verify secrets are masked
    target_source = next((s for s in sources if s["name"] == "Secured Supabase Source"), None)
    assert target_source is not None
    config = target_source["connection_config"]
    assert config["api_key"] == "[REDACTED]"
    assert config["password"] == "[REDACTED]"


def test_rbac_alert_source_denied():
    _, source_token = get_tokens()
    headers = {"Authorization": f"Bearer {source_token}"}
    
    # ALERT_SOURCE role must be denied (403 Forbidden) on all source management endpoints
    res1 = client.get("/api/v1/sources", headers=headers)
    assert res1.status_code == 403

    res2 = client.post("/api/v1/sources/database", json={"name": "x", "type": "CSV"}, headers=headers)
    assert res2.status_code == 403

    res3 = client.post("/api/v1/sources/import", json={"source_type": "CSV", "field_mappings": {}}, headers=headers)
    assert res3.status_code == 403
