from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    repository_name: Optional[str] = None
    scan_id: str
    scanner: str
    rule_id: str
    title: str
    description: Optional[str] = None
    severity: str
    confidence: str
    file_path: str
    start_line: int
    end_line: int
    vulnerability_ids: str
    package_name: str
    package_version: str
    fixed_version: str
    references: str
    snippet: str
    status: str
    first_detected_at: datetime
    last_detected_at: datetime

class FindingUpdateStatus(BaseModel):
    status: str = Field(..., pattern="^(OPEN|RESOLVED|IGNORED)$")
