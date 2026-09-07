import sys
import os
import pytest
from fastapi import APIRouter, Depends, status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal
from app.auth.service import seed_default_users
from app.auth.dependencies import require_soc_analyst, require_alert_source

# Test routes demonstrating server-side RBAC
test_router = APIRouter(prefix="/api/v1/test-rbac")

@test_router.get("/analyst-only", dependencies=[Depends(require_soc_analyst)])
def analyst_only_endpoint():
    return {"message": "Welcome Analyst"}

@test_router.get("/alert-source-only", dependencies=[Depends(require_alert_source)])
def alert_source_only_endpoint():
    return {"message": "Welcome Alert Source"}

app.include_router(test_router)
client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_seeded_users():
    db: Session = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()

def test_analyst_can_access_analyst_route():
    login_res = client.post("/auth/login", json={"username": "analyst", "password": "Analyst123!"})
    token = login_res.json()["token"]

    res = client.get("/api/v1/test-rbac/analyst-only", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["message"] == "Welcome Analyst"

def test_alert_source_cannot_access_analyst_route():
    login_res = client.post("/auth/login", json={"username": "alert_source", "password": "Source123!"})
    token = login_res.json()["token"]

    res = client.get("/api/v1/test-rbac/analyst-only", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "access denied" in res.json()["detail"].lower()

def test_alert_source_can_access_alert_source_route():
    login_res = client.post("/auth/login", json={"username": "alert_source", "password": "Source123!"})
    token = login_res.json()["token"]

    res = client.get("/api/v1/test-rbac/alert-source-only", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["message"] == "Welcome Alert Source"

def test_analyst_cannot_access_alert_source_route():
    login_res = client.post("/auth/login", json={"username": "analyst", "password": "Analyst123!"})
    token = login_res.json()["token"]

    res = client.get("/api/v1/test-rbac/alert-source-only", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "access denied" in res.json()["detail"].lower()
