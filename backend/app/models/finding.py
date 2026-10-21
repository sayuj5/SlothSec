import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("scan_jobs.id", ondelete="CASCADE"), nullable=False)
    
    scanner: Mapped[str] = mapped_column(String(32), nullable=False)  # semgrep, osv, gitleaks
    rule_id: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    confidence: Mapped[str] = mapped_column(String(32), default="MEDIUM")  # HIGH, MEDIUM, LOW
    
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    start_line: Mapped[int] = mapped_column(Integer, default=1)
    end_line: Mapped[int] = mapped_column(Integer, default=1)
    
    vulnerability_ids: Mapped[str] = mapped_column(String(255), default="")  # e.g., CVE-2023-xxxx
    package_name: Mapped[str] = mapped_column(String(255), default="")
    package_version: Mapped[str] = mapped_column(String(64), default="")
    fixed_version: Mapped[str] = mapped_column(String(64), default="")
    references: Mapped[str] = mapped_column(Text, default="[]")  # JSON encoded list of URLs
    snippet: Mapped[str] = mapped_column(Text, default="")
    
    status: Mapped[str] = mapped_column(String(32), default="OPEN")  # OPEN, RESOLVED, IGNORED
    first_detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    last_detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    repository = relationship("Repository", back_populates="findings")
    scan = relationship("ScanJob", back_populates="findings")
    analyses = relationship("AIAnalysis", back_populates="finding", cascade="all, delete-orphan")
    patches = relationship("RemediationPatch", back_populates="finding", cascade="all, delete-orphan")
