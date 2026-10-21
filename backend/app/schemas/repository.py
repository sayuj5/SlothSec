from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class RepositoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    path: str = Field(..., min_length=1)
    description: str = Field(default="")

class RepositoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    path: str
    description: str
    created_at: datetime
    updated_at: datetime
    scans_count: int = 0
    open_findings_count: int = 0
