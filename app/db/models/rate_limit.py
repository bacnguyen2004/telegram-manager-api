from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..base import Base


class RateLimitRule(Base):
    __tablename__ = "rate_limit_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    action_type: Mapped[str] = mapped_column(String(30), unique=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_actions: Mapped[int] = mapped_column(Integer, default=20)
    window_minutes: Mapped[int] = mapped_column(Integer, default=60)
    cooldown_minutes: Mapped[int] = mapped_column(Integer, default=30)
    delay_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    delay_min_seconds: Mapped[int] = mapped_column(Integer, default=3)
    delay_max_seconds: Mapped[int] = mapped_column(Integer, default=8)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AccountRateState(Base):
    __tablename__ = "account_rate_states"
    __table_args__ = (UniqueConstraint("account_id", "action_type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("telegram_accounts.id", ondelete="CASCADE")
    )
    action_type: Mapped[str] = mapped_column(String(30))
    window_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    action_count: Mapped[int] = mapped_column(Integer, default=0)
    cooldown_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    account: Mapped[TelegramAccount] = relationship(back_populates="rate_states")