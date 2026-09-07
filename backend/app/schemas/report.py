import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class ReportGenerateRequest(BaseModel):
    report_type: str = Field("EXECUTIVE_SUMMARY", description="EXECUTIVE_SUMMARY, OPERATIONAL_ANALYTICS, INCIDENT_SUMMARY, DATA_QUALITY, FULL_SYSTEM")
    title: Optional[str] = None
    format: str = Field("PDF", description="PDF, CSV, JSON")
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    report_number: str
    title: str
    report_type: str
    format: str
    generated_by: Optional[uuid.UUID] = None
    created_at: datetime
    content_summary: Optional[Dict[str, Any]] = None
    file_path: Optional[str] = None

class PaginatedReportResponse(BaseModel):
    items: List[ReportResponse]
    total: int
    page: int
    page_size: int
    pages: int
