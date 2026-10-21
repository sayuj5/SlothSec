from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class PatchCreate(BaseModel):
    finding_id: str
    proposed_content: Optional[str] = None
    custom_diff: Optional[str] = None

class PatchReviewAction(BaseModel):
    note: Optional[str] = None

class RemediationPatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    finding_id: str
    repository_id: str
    file_path: str
    diff: str
    status: str
    backup_path: Optional[str] = None
    approval_note: Optional[str] = None
    applied_at: Optional[datetime] = None
    verification_scan_id: Optional[str] = None
    verification_status: str
    error_message: Optional[str] = None
    created_at: datetime
