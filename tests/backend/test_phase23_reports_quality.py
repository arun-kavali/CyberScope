import sys
import os
import io
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal
from app.auth.service import seed_default_users
from app.models.audit import Report

client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_seeded_users():
    db: Session = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()

def get_tokens():
    res_analyst = client.post("/auth/login", json={"username": "analyst", "password": "Analyst123!"})
    res_source = client.post("/auth/login", json={"username": "alert_source", "password": "Source123!"})
    return res_analyst.json()["token"], res_source.json()["token"]

def test_report_generation_pdf_csv_json():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Generate PDF Report
    pdf_res = client.post(
        "/reports/generate",
        json={"report_type": "EXECUTIVE_SUMMARY", "format": "PDF", "title": "Test PDF Briefing"},
        headers=headers
    )
    assert pdf_res.status_code == 201, f"Generate failed: {pdf_res.json()}"
    pdf_data = pdf_res.json()
    assert pdf_data["report_number"].startswith("RPT-")
    assert pdf_data["title"] == "Test PDF Briefing"
    assert pdf_data["format"] == "PDF"

    # 2. Generate CSV Report
    csv_res = client.post(
        "/reports/generate",
        json={"report_type": "OPERATIONAL_ANALYTICS", "format": "CSV", "title": "Test CSV Export"},
        headers=headers
    )
    assert csv_res.status_code == 201
    csv_data = csv_res.json()
    assert csv_data["format"] == "CSV"

    # 3. Generate JSON Report
    json_res = client.post(
        "/reports/generate",
        json={"report_type": "DATA_QUALITY", "format": "JSON", "title": "Test JSON Posture"},
        headers=headers
    )
    assert json_res.status_code == 201
    json_data = json_res.json()
    assert json_data["format"] == "JSON"

def test_report_listing_and_download():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # Generate a report first
    gen_res = client.post(
        "/reports/generate",
        json={"report_type": "FULL_SYSTEM", "format": "PDF", "title": "Download Test Report"},
        headers=headers
    )
    assert gen_res.status_code == 201
    report_id = gen_res.json()["id"]

    # List reports
    list_res = client.get("/reports?page=1&page_size=10", headers=headers)
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 1
    assert any(r["id"] == report_id for r in data["items"])

    # Download report
    dl_res = client.get(f"/reports/{report_id}/download", headers=headers)
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] in ["application/pdf", "text/csv", "application/json"]
    assert len(dl_res.content) > 0

def test_data_quality_governance():
    analyst_token, _ = get_tokens()
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # Summary
    sum_res = client.get("/data-quality/summary", headers=headers)
    assert sum_res.status_code == 200
    sum_data = sum_res.json()
    assert "quality_score" in sum_data
    assert "issues" in sum_data
    assert sum_data["quality_score"] >= 0.0

    # On-demand sweep
    chk_res = client.post("/data-quality/check", headers=headers)
    assert chk_res.status_code == 200
    assert "total_records_checked" in chk_res.json()

def test_rbac_alert_source_denial():
    _, source_token = get_tokens()
    headers = {"Authorization": f"Bearer {source_token}"}

    # Reports API forbidden for ALERT_SOURCE
    res1 = client.get("/reports", headers=headers)
    assert res1.status_code in [401, 403]

    res2 = client.post("/reports/generate", json={"report_type": "EXECUTIVE_SUMMARY", "format": "PDF"}, headers=headers)
    assert res2.status_code in [401, 403]

    # Data Quality API forbidden for ALERT_SOURCE
    res3 = client.get("/data-quality/summary", headers=headers)
    assert res3.status_code in [401, 403]
