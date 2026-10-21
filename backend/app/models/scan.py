import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending, running, completed, failed, cancelled
    triggered_by: Mapped[str] = mapped_column(String(32), default="manual")  # manual, schedule, verification
    scanners: Mapped[str] = mapped_column(String(255), default="semgrep,osv,gitleaks")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[float] = mapped_column(Float, default=0.0)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    repository = relationship("Repository", back_populates="scans")
    scanner_executions = relationship("ScannerExecution", back_populates="scan", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")

class ScannerExecution(Base):
    __tablename__ = "scanner_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("scan_jobs.id", ondelete="CASCADE"), nullable=False)
    scanner_name: Mapped[str] = mapped_column(String(32), nullable=False)  # semgrep, osv, gitleaks
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending, running, completed, failed
    exit_code: Mapped[int] = mapped_column(Integer, default=0)
    findings_count: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[float] = mapped_column(Float, default=0.0)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    scan = relationship("ScanJob", back_populates="scanner_executions")
