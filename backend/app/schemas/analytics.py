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

class ExecutionGapResponseSchema(BaseModel):
    id: UUID
    finding_type: str
    severity: str
    reason: str
    evidence: Optional[Dict[str, Any]] = None
    supporting_records: Optional[Dict[str, Any]] = None
    threshold: Optional[float] = None
    peer_context: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NegativeSpaceResponseSchema(BaseModel):
    id: UUID
    finding_type: Optional[str] = "NEGATIVE_SPACE"
    severity: Optional[str] = "MEDIUM"
    expected_activity: str
    observed_activity: str
    baseline_comparison: Optional[Dict[str, Any]] = None
    potential_indicator: Optional[str] = None
    supporting_evidence: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PeerBenchmarkResponseSchema(BaseModel):
    id: UUID
    metric_name: str
    normalized_metric: float
    peer_group: str
    subject_entity: str = "SOC_ORGANIZATION"
    subject_value: float = 0.0
    peer_baseline: float = 0.0
    deviation: float = 0.0
    direction: str = "NORMAL"  # "ABOVE", "BELOW", "NORMAL", "INSUFFICIENT_DATA"
    sample_size: int = 0
    time_range: str = "Last 30 Days"
    methodology: str = "Normalized median baseline comparison against enterprise peer group."
    comparison_context: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OperationalAnomalySchema(BaseModel):
    id: str
    metric: str
    baseline: float
    observed: float
    deviation: float
    interpretation: str
    threshold_method: str
    supporting_records: Optional[Dict[str, Any]] = None
    timestamp: datetime

class RiskContributorSchema(BaseModel):
    contributor_type: str
    contribution: float
    supporting_evidence: Optional[Dict[str, Any]] = None
    source_record: Optional[Dict[str, Any]] = None
    calculation_method: str
    timestamp: datetime

class SupervisoryRiskResponseSchema(BaseModel):
    overall_score: float
    status: str
    contributors: List[RiskContributorSchema]
    calculation_methodology: str
    data_quality_status: str
    timestamp: datetime

class ReviewPriorityResponseSchema(BaseModel):
    id: UUID
    target_type: str
    target_id: UUID
    rank: int
    priority_score: float
    severity: str
    reason: str
    risk_indicator: float
    evidence_references: Optional[Dict[str, Any]] = None
    supporting_findings: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TraceabilityNodeSchema(BaseModel):
    node_type: str  # "FINDING", "CASE_INCIDENT", "INVESTIGATION", "ALERT_EVENT", "NORMALIZED_EVIDENCE"
    status: str     # "RESOLVED", "NOT_OBSERVED", "ORPHAN"
    record_id: Optional[str] = None
    title: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class FindingDetailResponseSchema(BaseModel):
    finding_id: UUID
    finding_type: str
    category: Optional[str] = "OPERATIONAL"
    severity: str
    risk_score: Optional[float] = 0.0
    title: str
    summary: str
    reason: str
    evidence_references: Optional[Dict[str, Any]] = None
    analytical_signals: Optional[Dict[str, Any]] = None
    peer_context: Optional[Dict[str, Any]] = None
    created_at: datetime
    evidence_chain: List[TraceabilityNodeSchema] = Field(default_factory=list)

class EvidenceDetailResponseSchema(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    evidence_payload: Optional[Dict[str, Any]] = None
    sanitized: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
