import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import String, DateTime, Date, ForeignKey, Integer, Numeric, JSON, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UsageRecord(Base):
    __tablename__ = "usage_records"
    __table_args__ = (
        Index("ix_usage_key_date", "platform_key_id", "recorded_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    platform_key_id: Mapped[str] = mapped_column(String(36), ForeignKey("platform_keys.id"), nullable=False)
    recorded_at: Mapped[date] = mapped_column(Date, nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[Decimal] = mapped_column(Numeric(12, 6), default=0)
    request_count: Mapped[int] = mapped_column(Integer, default=0)
    metadata_extra: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    platform_key = relationship("PlatformKey", back_populates="usage_records")
