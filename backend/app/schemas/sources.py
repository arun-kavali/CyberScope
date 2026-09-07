import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

# Helper for credential sanitization
SENSITIVE_KEYS = {"password", "secret", "token", "api_key", "credentials", "auth", "private_key", "service_role_key"}

def sanitize_connection_config(config: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not config:
        return config
    sanitized = {}
    for key, value in config.items():
        if any(s_key in key.lower() for s_key in SENSITIVE_KEYS):
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, dict):
            sanitized[key] = sanitize_connection_config(value)
        else:
            sanitized[key] = value
    return sanitized

class DataSourceCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., description="CSV, JSON, XLS, XLSX, POSTGRESQL, MONGODB, MYSQL, SUPABASE, REST")
    connection_config: Optional[Dict[str, Any]] = None

class DataSourceResponseSchema(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    status: str
    connection_config: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class DiscoveredFieldSchema(BaseModel):
    field_name: str
    detected_type: str
    nullable: bool = True
    sample_values: List[Any] = Field(default_factory=list)
    confidence: float = 1.0

class SchemaDiscoveryResponseSchema(BaseModel):
    data_source_id: Optional[uuid.UUID] = None
    source_type: str
    total_fields: int
    fields: List[DiscoveredFieldSchema]
    preview_rows: List[Dict[str, Any]] = Field(default_factory=list)
    estimated_records: int = 0

class FieldMappingRequestSchema(BaseModel):
    data_source_id: uuid.UUID
    field_mappings: Dict[str, str] = Field(..., description="Source field name -> CyberScope common alert schema field name")

class FieldMappingResponseSchema(BaseModel):
    data_source_id: uuid.UUID
    field_mappings: Dict[str, str]
    is_validated: bool
    updated_at: datetime

class ValidationRequestSchema(BaseModel):
    data_source_id: Optional[uuid.UUID] = None
    source_type: Optional[str] = None
    field_mappings: Dict[str, str]
    connection_config: Optional[Dict[str, Any]] = None

class ValidationResponseSchema(BaseModel):
    data_source_id: Optional[uuid.UUID] = None
    valid_count: int
    invalid_count: int
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    sample_invalid_records: List[Dict[str, Any]] = Field(default_factory=list)

class ImportRequestSchema(BaseModel):
    data_source_id: Optional[uuid.UUID] = None
    source_type: Optional[str] = None
    field_mappings: Dict[str, str]
    connection_config: Optional[Dict[str, Any]] = None

class ImportResponseSchema(BaseModel):
    data_source_id: Optional[uuid.UUID] = None
    status: str  # COMPLETED, PARTIAL, FAILED
    total_records: int
    imported_records: int
    skipped_records: int
    invalid_records: int
    duplicate_records: int
    errors: List[str] = Field(default_factory=list)
