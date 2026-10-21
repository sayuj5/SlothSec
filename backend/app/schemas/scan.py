from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ScanCreate(BaseModel):
    repository_id: str
    scanners: List[str] = Field(default=["semgrep", "osv", "gitleaks"])

class ScannerExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    scanner_name: str
    status: str
    exit_code: int
    findings_count: int
    duration_ms: float
    error_message: Optional[str] = None
    executed_at: datetime

class ScanJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    repository_name: Optional[str] = None
    status: str
    triggered_by: str
    scanners: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: float
    error_message: Optional[str] = None
    scanner_executions: List[ScannerExecutionResponse] = []
    findings_count: int = 0
