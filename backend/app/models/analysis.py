import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    finding_id: Mapped[str] = mapped_column(String(36), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False, default="qwen3:4b")
    
    executive_summary: Mapped[str] = mapped_column(Text, nullable=False)
    technical_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    root_cause: Mapped[str] = mapped_column(Text, nullable=False)
    potential_impact: Mapped[str] = mapped_column(Text, nullable=False)
    exploitability_context: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_remediation: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_patch_diff: Mapped[str] = mapped_column(Text, default="")
    priority_recommendation: Mapped[str] = mapped_column(String(32), default="MEDIUM")
    confidence_score: Mapped[float] = mapped_column(Float, default=0.85)
    limitations: Mapped[str] = mapped_column(Text, default="")
    raw_response: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    finding = relationship("Finding", back_populates="analyses")
