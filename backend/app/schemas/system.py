from typing import Dict, Any, List
from pydantic import BaseModel

class ScannerStatus(BaseModel):
    name: str
    version: str
    available: bool
    path: str
    error: str | None = None

class AIStatus(BaseModel):
    provider: str
    base_url: str
    configured_model: str
    available: bool
    installed_models: List[str] = []
    error: str | None = None

class SystemStatusResponse(BaseModel):
    app_name: str
    version: str
    environment: str
    database_status: str
    ai_status: AIStatus
    scanners: Dict[str, ScannerStatus]
