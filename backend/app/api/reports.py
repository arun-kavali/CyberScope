import uuid
import os
import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.dependencies import require_soc_analyst
from app.models.identity import Profile
from app.schemas.report import ReportGenerateRequest, ReportResponse, PaginatedReportResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(
    req: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Generates a security posture and governance report in PDF, CSV, or JSON format.
    Restricted to SOC_ANALYST.
    """
    try:
        report = ReportService.generate_report(
            db=db,
            report_type=req.report_type,
            title=req.title,
            fmt=req.format,
            generated_by=current_user.id
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Report generation failed: {str(e)}")

@router.get("", response_model=PaginatedReportResponse)
def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    report_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Lists generated security reports with server-side pagination.
    Restricted to SOC_ANALYST.
    """
    items, total = ReportService.list_reports(db=db, page=page, page_size=page_size, report_type=report_type)
    pages = math.ceil(total / page_size) if total > 0 else 1
    return PaginatedReportResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages
    )

@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Retrieves report details by ID.
    Restricted to SOC_ANALYST.
    """
    report = ReportService.get_report_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.get("/{report_id}/download")
def download_report(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_soc_analyst)
):
    """
    Downloads the generated report file (PDF, CSV, or JSON).
    Restricted to SOC_ANALYST.
    """
    report = ReportService.get_report_by_id(db, report_id)
    if not report or not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")

    file_name = os.path.basename(report.file_path)
    media_type = "application/pdf"
    if file_name.endswith(".csv"):
        media_type = "text/csv"
    elif file_name.endswith(".json"):
        media_type = "application/json"

    return FileResponse(
        path=report.file_path,
        filename=file_name,
        media_type=media_type
    )
