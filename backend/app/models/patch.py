import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class RemediationPatch(Base):
    __tablename__ = "remediation_patches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    finding_id: Mapped[str] = mapped_column(String(36), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False)
    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    original_content: Mapped[str] = mapped_column(Text, default="")
    proposed_content: Mapped[str] = mapped_column(Text, default="")
    diff: Mapped[str] = mapped_column(Text, nullable=False)
    
    status: Mapped[str] = mapped_column(String(32), default="PROPOSED")  # PROPOSED, APPROVED, REJECTED, APPLIED, FAILED, VERIFIED
    backup_path: Mapped[str] = mapped_column(Text, nullable=True)
    approval_note: Mapped[str] = mapped_column(Text, nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    verification_scan_id: Mapped[str] = mapped_column(String(36), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(32), default="PENDING")  # PENDING, VERIFIED_FIXED, STILL_VULNERABLE
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    finding = relationship("Finding", back_populates="patches")
    repository = relationship("Repository", back_populates="patches")
