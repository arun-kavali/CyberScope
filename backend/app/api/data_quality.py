from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import require_soc_analyst
from app.models.identity import Profile
from app.schemas.data_quality import DataQualitySummary
from app.services.data_quality_service import DataQualityService

router = APIRouter(prefix="/data-quality", tags=["Data Quality"])

@router.get("/summary", response_model=DataQualitySummary)
def get_data_quality_summary(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Returns data quality metrics, issue breakdown, and dataset governance score.
    Restricted to SOC_ANALYST.
    """
    return DataQualityService.run_quality_checks(db)

@router.post("/check", response_model=DataQualitySummary)
def run_data_quality_check(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Executes an on-demand data quality check sweep over ingested records.
    Restricted to SOC_ANALYST.
    """
    return DataQualityService.run_quality_checks(db)
