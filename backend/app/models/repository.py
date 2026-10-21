import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.database.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=True, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    scans = relationship("ScanJob", back_populates="repository", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="repository", cascade="all, delete-orphan")
    patches = relationship("RemediationPatch", back_populates="repository", cascade="all, delete-orphan")
    schedules = relationship("ScanSchedule", back_populates="repository", cascade="all, delete-orphan")
