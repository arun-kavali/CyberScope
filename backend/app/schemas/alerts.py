from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict

class AlertCreateSchema(BaseModel):
    event_type: str = Field(..., description="Exact scenario or event type name")
    event_category: str = Field(..., description="Category: AUTHENTICATION, ENDPOINT, NETWORK, DATABASE, EMAIL")
    severity: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    status: str = Field("NEW", description="Alert status")
    timestamp: Optional[datetime] = Field(default=None, description="Timezone-aware event timestamp")
    user_context: Optional[str] = Field(default=None, description="Username or user ID context")
    asset_context: Optional[str] = Field(default=None, description="Asset name or hostname context")
    source_ip: Optional[str] = Field(default=None, description="Source IP address")
    destination_ip: Optional[str] = Field(default=None, description="Destination IP address")
    source_port: Optional[int] = Field(default=None, description="Source port")
    destination_port: Optional[int] = Field(default=None, description="Destination port")
    protocol: Optional[str] = Field(default=None, description="Protocol (e.g. TCP, UDP, SMTP)")
    action: Optional[str] = Field(default=None, description="Action (e.g. ALLOWED, BLOCKED, DETECTED)")
    description: str = Field(..., description="Human-readable description of alert")
    indicator: Optional[str] = Field(default=None, description="Threat indicator")
    technique: Optional[str] = Field(default=None, description="MITRE ATT&CK technique code/name")
    raw_payload: Optional[Dict[str, Any]] = Field(default=None, description="Raw evidence payload")
    alert_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Synthetic metadata")

class BatchAlertCreateSchema(BaseModel):
    alerts: List[AlertCreateSchema] = Field(..., description="List of alert payloads to submit")

class AlertResponseSchema(BaseModel):
    id: UUID
    alert_code: str
    source_id: Optional[UUID] = None
    event_type: str
    event_category: str
    severity: str
    status: str
    timestamp: datetime
    user_context: Optional[str] = None
    asset_context: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = None
    action: Optional[str] = None
    description: str
    indicator: Optional[str] = None
    technique: Optional[str] = None
    raw_payload: Optional[Dict[str, Any]] = None
    alert_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class IngestionResultSchema(BaseModel):
    status: str
    alert_id: Optional[UUID] = None
    alert_code: Optional[str] = None
    validation: Dict[str, Any]
    normalization: Dict[str, Any]
    data_quality: Dict[str, Any]
    duplicate_status: Dict[str, Any]
    alert: Optional[AlertResponseSchema] = None

class AlertBatchResponseSchema(BaseModel):
    accepted_count: int
    rejected_count: int
    duplicate_count: int = 0
    alerts: List[AlertResponseSchema]
    message: str = "Batch ingestion processed"

class AlertAnalysisResponseSchema(BaseModel):
    id: UUID
    alert_id: UUID
    summary: str
    findings: Optional[Dict[str, Any]] = None
    analysis_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ScenarioGenerateRequestSchema(BaseModel):
    category: str = Field(..., description="AUTHENTICATION, ENDPOINT, NETWORK, DATABASE, EMAIL")
    scenario_name: str = Field(..., description="Predefined scenario name")
    generation_mode: str = Field("SINGLE ALERT", description="SINGLE ALERT, MULTI-ALERT SEQUENCE, HIGH-VOLUME BURST, REPEATED EVENTS")
    severity: str = Field("HIGH", description="LOW, MEDIUM, HIGH, CRITICAL")
    intent: str = Field("Suspicious", description="Suspicious vs Benign / False Positive")
    quantity: int = Field(1, ge=1, le=100, description="Quantity of alerts to generate (max 100)")
    start_time: Optional[datetime] = Field(default=None, description="Base timestamp")
    custom_params: Optional[Dict[str, Any]] = Field(default=None, description="Scenario-specific parameters")

class ScenarioPreviewResponseSchema(BaseModel):
    category: str
    scenario_name: str
    generation_mode: str
    severity: str
    intent: str
    generated_count: int
    alerts: List[Dict[str, Any]]
