from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class AIAnalysisRequest(BaseModel):
    custom_instructions: Optional[str] = None

class AIAnalysisStructuredOutput(BaseModel):
    executive_summary: str = Field(..., description="High-level 1-2 sentence overview for engineering leads")
    technical_explanation: str = Field(..., description="Deep-dive into the vulnerability mechanics")
    root_cause: str = Field(..., description="Underlying programming, architectural, or dependency flaw")
    potential_impact: str = Field(..., description="Consequences if exploited in a production context")
    exploitability_context: str = Field(..., description="Conditions required to trigger or exploit the issue")
    recommended_remediation: str = Field(..., description="Concrete, actionable steps to eliminate the vulnerability")
    suggested_patch_diff: Optional[str] = Field(default="", description="Unified diff or replacement code snippet")
    priority_recommendation: str = Field(default="MEDIUM", description="AI priority assessment: CRITICAL, HIGH, MEDIUM, LOW")
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0, description="Confidence in this assessment")
    limitations: str = Field(default="", description="Caveats, assumptions, or missing context")

class AIAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    finding_id: str
    model_name: str
    executive_summary: str
    technical_explanation: str
    root_cause: str
    potential_impact: str
    exploitability_context: str
    recommended_remediation: str
    suggested_patch_diff: str
    priority_recommendation: str
    confidence_score: float
    limitations: str
    created_at: datetime
