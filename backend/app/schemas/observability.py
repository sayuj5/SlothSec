from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class SpanResponse(BaseModel):
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None
    name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_ms: float
    status: str
    status_description: Optional[str] = None
    attributes: Dict[str, str] = {}

class ObservabilityMetricsResponse(BaseModel):
    metrics: Dict[str, Any]
    averages: Dict[str, Any]
    recent_spans_count: int

class DashboardSummaryResponse(BaseModel):
    total_repositories: int
    total_scans: int
    total_findings: int
    open_findings: int
    resolved_findings: int
    critical_findings: int
    high_findings: int
    medium_findings: int
    low_findings: int
    recent_scans: List[Dict[str, Any]]
    recent_findings: List[Dict[str, Any]]
    scanner_health: Dict[str, bool]
    ai_health: bool
