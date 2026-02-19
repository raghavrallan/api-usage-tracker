import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import String, DateTime, Date, ForeignKey, Integer, Numeric, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BillingSnapshot(Base):
    __tablename__ = "billing_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    platform_key_id: Mapped[str] = mapped_column(String(36), ForeignKey("platform_keys.id"), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    total_cost_usd: Mapped[Decimal] = mapped_column(Numeric(12, 6), default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    platform_key = relationship("PlatformKey", back_populates="billing_snapshots")
