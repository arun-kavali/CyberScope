import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict

class EvidenceReference(BaseModel):
    id: str
    type: str = Field(default="EVIDENCE", description="Type of evidence entity: ALERT, INCIDENT, EVENT, RULE")
    label: Optional[str] = Field(default=None, description="Human readable label or code")

class AIStructuredOutput(BaseModel):
    summary: str = Field(..., description="High-level executive summary")
    what_happened: str = Field(..., description="Factual chronological description of events")
    why_suspicious: str = Field(..., description="Explanation of risk/anomaly indicators")
    potential_impact: str = Field(..., description="Assessment of potential operational impact")
    recommended_investigation: List[str] = Field(default_factory=list, description="Advisory investigation steps")
    recommended_response: List[str] = Field(default_factory=list, description="Advisory response actions")
    evidence_references: List[EvidenceReference] = Field(default_factory=list, description="Validated evidence entity references")
    uncertainty: str = Field(default="Based strictly on observed evidence; further context required.", description="Uncertainties or evidence gaps")
    limitations: str = Field(default="Scope limited to provided security sensor data.", description="Analysis scope limitations")

    model_config = ConfigDict(extra="ignore")

class AIStatusResponse(BaseModel):
    available: bool
    mode: str
    model: str
    url: str
    models_installed: Optional[List[str]] = None
    model_exists: Optional[bool] = None
    reason: Optional[str] = None

class AIIntelligenceResponse(BaseModel):
    id: uuid.UUID
    target_type: str
    target_id: uuid.UUID
    intelligence_type: str
    status: str # PENDING, PROCESSING, COMPLETED, FAILED
    structured_output: Optional[AIStructuredOutput] = None
    evidence_references: Optional[List[EvidenceReference]] = None
    model_name: str
    model_version: Optional[str] = None
    prompt_version: str
    intelligence_version: str
    error_info: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

def validate_and_filter_evidence_references(
    structured_data: Dict[str, Any],
    valid_ids: set[str]
) -> tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Validates evidence_references array inside structured model output against valid context IDs.
    Filters out any fake/fabricated IDs created by the LLM.
    Returns (cleaned_structured_data, validated_references).
    """
    if not isinstance(structured_data, dict):
        return structured_data, []

    refs = structured_data.get("evidence_references", [])
    valid_refs = []

    if isinstance(refs, list):
        for ref in refs:
            if isinstance(ref, dict):
                ref_id = str(ref.get("id", "")).strip()
                if ref_id in valid_ids:
                    valid_refs.append(ref)
                else:
                    # Id is not in valid_ids set
                    pass
            elif isinstance(ref, str):
                if ref.strip() in valid_ids:
                    valid_refs.append({"id": ref.strip(), "type": "EVIDENCE", "label": ref.strip()})

    structured_data["evidence_references"] = valid_refs
    return structured_data, valid_refs
