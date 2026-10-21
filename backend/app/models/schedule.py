import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class ScanSchedule(Base):
    __tablename__ = "scan_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    cron_expression: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g., "0 2 * * *"
    scanners: Mapped[str] = mapped_column(String(255), default="semgrep,osv,gitleaks")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    next_run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    repository = relationship("Repository", back_populates="schedules")
