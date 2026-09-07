from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db

router = APIRouter(prefix="/test", tags=["Testing & Diagnostics"])

@router.get("/database", tags=["Testing & Diagnostics"])
async def test_database_connection(db: Session = Depends(get_db)):
    """
    Database connectivity test endpoint for Phase 2.
    Executes a minimal query against native local PostgreSQL.
    Returns status: healthy, database: connected if successful.
    """
    try:
        result = db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            return {
                "database": "connected",
                "status": "healthy"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"database": "disconnected", "status": "unhealthy"}
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "database": "disconnected",
                "status": "unhealthy",
                "message": "Failed to establish connection to native local PostgreSQL database."
            }
        )
