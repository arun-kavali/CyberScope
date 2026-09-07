import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Ensure backend directory is in python path for testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.db.session import SessionLocal
from app.models.identity import Profile
from app.auth.service import seed_default_users

client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_seeded_users():
    """Ensure default application roles and development seed users exist before running auth tests."""
    db: Session = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()

def test_valid_analyst_login():
    """Verify valid SOC_ANALYST login returns session token and user profile."""
    response = client.post("/auth/login", json={
        "username": "analyst",
        "password": "Analyst123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "analyst"
    assert data["user"]["role"] == "SOC_ANALYST"
    assert "password" not in response.text.lower()
    assert "hashed_password" not in response.text.lower()

def test_valid_alert_source_login():
    """Verify valid ALERT_SOURCE login returns session token and user profile."""
    response = client.post("/auth/login", json={
        "username": "alert_source",
        "password": "Source123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["username"] == "alert_source"
    assert data["user"]["role"] == "ALERT_SOURCE"

def test_invalid_password_rejected():
    """Verify login with incorrect password returns 401 Unauthorized."""
    response = client.post("/auth/login", json={
        "username": "analyst",
        "password": "WrongPassword123!"
    })
    assert response.status_code == 401
    assert "invalid username or password" in response.json()["detail"].lower()

def test_inactive_user_rejected():
    """Verify inactive account is rejected during authentication."""
    db: Session = SessionLocal()
    try:
        analyst = db.query(Profile).filter(Profile.username == "analyst").first()
        if analyst:
            analyst.is_active = False
            db.commit()

        response = client.post("/auth/login", json={
            "username": "analyst",
            "password": "Analyst123!"
        })
        assert response.status_code == 401

        # Restore active state
        if analyst:
            analyst.is_active = True
            db.commit()
    finally:
        db.close()

def test_get_me_with_valid_session():
    """Verify GET /auth/me returns profile for authenticated request."""
    # Login
    login_res = client.post("/auth/login", json={
        "username": "analyst",
        "password": "Analyst123!"
    })
    token = login_res.json()["token"]

    # Call /auth/me
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    profile = me_res.json()
    assert profile["username"] == "analyst"
    assert profile["role"] == "SOC_ANALYST"

def test_get_me_unauthenticated_rejected():
    """Verify GET /auth/me rejects unauthenticated request with 401."""
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_logout_revokes_session():
    """Verify POST /auth/logout revokes session token."""
    # Login
    login_res = client.post("/auth/login", json={
        "username": "analyst",
        "password": "Analyst123!"
    })
    token = login_res.json()["token"]

    # Logout
    logout_res = client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # Verify session is revoked
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 401

def test_security_requirements_token_hash_and_password():
    """Verify raw password and raw token are not stored in database."""
    from app.models.auth import UserSession
    from app.auth.security import hash_session_token

    # Perform login
    login_res = client.post("/auth/login", json={
        "username": "analyst",
        "password": "Analyst123!"
    })
    token = login_res.json()["token"]

    db: Session = SessionLocal()
    try:
        # Check profile hashed password
        analyst = db.query(Profile).filter(Profile.username == "analyst").first()
        assert analyst is not None
        assert analyst.hashed_password != "Analyst123!"
        assert analyst.hashed_password.startswith("$2b$")

        # Check raw token is NOT in DB, but token_hash IS in DB
        computed_hash = hash_session_token(token)
        session_entry = db.query(UserSession).filter(UserSession.token_hash == computed_hash).first()
        assert session_entry is not None
        
        # Querying by raw token directly should return nothing
        raw_session_query = db.query(UserSession).filter(UserSession.token_hash == token).first()
        assert raw_session_query is None
    finally:
        db.close()

