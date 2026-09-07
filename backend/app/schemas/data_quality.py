from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

class DataQualityIssue(BaseModel):
    rule_code: str
    issue_type: str
    affected_entity: str
    affected_id: str
    reason: str
    severity: str
    threshold_applied: Optional[str] = None
    is_insufficient_data: bool = False

class DataQualitySummary(BaseModel):
    timestamp: datetime
    total_records_checked: int
    total_issues_found: int
    critical_issues: int
    high_issues: int
    insufficient_data_count: int
    quality_score: float
    issues: List[DataQualityIssue]
