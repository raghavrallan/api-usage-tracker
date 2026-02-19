import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Boolean, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PlatformKey(Base):
    __tablename__ = "platform_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    api_key_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    key_label: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="platform_keys")
    usage_records = relationship("UsageRecord", back_populates="platform_key", cascade="all, delete-orphan")
    billing_snapshots = relationship("BillingSnapshot", back_populates="platform_key", cascade="all, delete-orphan")
    sync_logs = relationship("SyncLog", back_populates="platform_key", cascade="all, delete-orphan")
