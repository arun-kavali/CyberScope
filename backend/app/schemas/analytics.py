from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict

class AlertAnalyticsSchema(BaseModel):
    total_alerts: int = Field(0, description="Total persisted alerts")
    severity_distribution: Dict[str, int] = Field(default_factory=dict)
    category_distribution: Dict[str, int] = Field(default_factory=dict)
    source_distribution: Dict[str, int] = Field(default_factory=dict)
    critical_high_ratio: float = Field(0.0, description="Percentage of critical/high risk alerts")
    repeated_patterns_count: int = Field(0, description="Count of repeated alert patterns")

class IncidentAnalyticsSchema(BaseModel):
    total_incidents: int = Field(0, description="Total persisted incidents")
    status_distribution: Dict[str, int] = Field(default_factory=dict)
    severity_distribution: Dict[str, int] = Field(default_factory=dict)
    closure_rate: float = Field(0.0, description="Incident closure rate percentage")
    reopened_count: int = Field(0, description="Reopened incidents count")

class InvestigationAnalyticsSchema(BaseModel):
    total_investigations: int = Field(0, description="Total investigations")
    status_distribution: Dict[str, int] = Field(default_factory=dict)
    mean_duration_minutes: float = Field(0.0, description="Mean investigation duration in minutes")
    median_duration_minutes: float = Field(0.0, description="Median investigation duration in minutes")

class EscalationAnalyticsSchema(BaseModel):
    total_escalations: int = Field(0, description="Total escalation records")
    escalation_rate: float = Field(0.0, description="Escalations to total alerts ratio percentage")
    severity_distribution: Dict[str, int] = Field(default_factory=dict)

class DispositionAnalyticsSchema(BaseModel):
    total_dispositions: int = Field(0, description="Total disposition records")
    disposition_distribution: Dict[str, int] = Field(default_factory=dict)
    fp_benign_ratio: float = Field(0.0, description="False positive and benign ratio percentage")

class EntityAnalyticsSchema(BaseModel):
    top_assets: List[Dict[str, Any]] = Field(default_factory=list)
    top_users: List[Dict[str, Any]] = Field(default_factory=list)
    top_sources: List[Dict[str, Any]] = Field(default_factory=list)

class TimeSeriesPointSchema(BaseModel):
    date: str
    alerts: int = 0
    incidents: int = 0
    investigations: int = 0
    escalations: int = 0

class OperationalAnalyticsSummarySchema(BaseModel):
    alert_analytics: AlertAnalyticsSchema
    incident_analytics: IncidentAnalyticsSchema
    investigation_analytics: InvestigationAnalyticsSchema
    escalation_analytics: EscalationAnalyticsSchema
    disposition_analytics: DispositionAnalyticsSchema
    entity_analytics: EntityAnalyticsSchema
    time_series: List[TimeSeriesPointSchema]
    data_quality_status: str = Field("NORMAL", description="NORMAL, NO_DATA, INSUFFICIENT_DATA, PARTIAL_DATA")
    disclaimer: str = Field("Analytics derived from real persisted database evidence.", description="Data attribution disclaimer")

class OperationalFindingSchema(BaseModel):
    id: UUID
    title: str
    category: str
    severity: str
    impact: str
    recommendations: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
