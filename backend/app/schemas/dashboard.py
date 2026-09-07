from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class DashboardMetricsSchema(BaseModel):
    live_alerts_count: int
    critical_high_alerts_count: int
    active_incidents_count: int
    active_investigations_count: int
    execution_gaps_count: int
    negative_space_count: int
    review_priorities_count: int

class DistributionItemSchema(BaseModel):
    name: str
    count: int

class OperationalIndicatorsSchema(BaseModel):
    avg_risk_score: float
    avg_confidence_score: float
    resolved_incidents_count: int
    total_incidents_count: int

class DashboardAlertItemSchema(BaseModel):
    id: UUID
    alert_code: str
    event_type: str
    event_category: str
    severity: str
    status: str
    timestamp: datetime
    risk_score: Optional[float] = None
    source_name: Optional[str] = None
    user_context: Optional[str] = None

class DashboardIncidentItemSchema(BaseModel):
    id: UUID
    incident_number: str
    title: str
    severity: str
    risk_score: float
    confidence_score: float
    status: str
    created_at: datetime
    updated_at: datetime

class FindingSummaryItemSchema(BaseModel):
    id: UUID
    title: str
    category: str
    severity: str
    created_at: datetime

class DashboardSummaryResponse(BaseModel):
    metrics: DashboardMetricsSchema
    severity_distribution: List[DistributionItemSchema]
    risk_distribution: List[DistributionItemSchema]
    source_distribution: List[DistributionItemSchema]
    category_distribution: List[DistributionItemSchema]
    critical_alerts: List[DashboardAlertItemSchema]
    active_incidents: List[DashboardIncidentItemSchema]
    recent_incidents: List[DashboardIncidentItemSchema]
    operational_findings: List[FindingSummaryItemSchema]
    execution_gaps: List[FindingSummaryItemSchema]
    negative_space: List[FindingSummaryItemSchema]
    operational_indicators: OperationalIndicatorsSchema

    model_config = ConfigDict(from_attributes=True)
