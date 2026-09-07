import sys
import os
from fastapi.testclient import TestClient

# Ensure backend directory is in python path for testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.main import app
from app.config import settings

client = TestClient(app)

def test_health_endpoint_remains_functional():
    """Verify Phase 1 GET /health remains functional."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "cyberscope-api"
    }

def test_database_test_endpoint():
    """
    Verify Phase 2 GET /api/v1/test/database returns connected status
    when native local PostgreSQL is running.
    """
    response = client.get("/api/v1/test/database")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

def test_no_credentials_exposed_in_responses():
    """Verify no database passwords or connection URLs are leaked in responses or settings representations."""
    response = client.get("/api/v1/test/database")
    res_str = response.text.lower()
    
    # Ensure sensitive credentials/words are not in response text
    assert "password" not in res_str
    assert "postgresql://" not in res_str
    
    # Check that settings.MASKED_DATABASE_URL hides password
    masked_url = settings.MASKED_DATABASE_URL
    assert "****" in masked_url or masked_url == ""
