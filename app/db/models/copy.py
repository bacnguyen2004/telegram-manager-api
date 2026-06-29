from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..base import Base


class CopyState(Base):
    __tablename__ = "copy_states"
    __table_args__ = (UniqueConstraint("source_group", "target_group"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    source_group: Mapped[str] = mapped_column(String(255))
    target_group: Mapped[str] = mapped_column(String(255))
    last_message_id: Mapped[int] = mapped_column(BigInteger, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CopyHistory(Base):
    __tablename__ = "copy_histories"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int | None] = mapped_column(
        ForeignKey("telegram_accounts.id", ondelete="SET NULL"), nullable=True
    )
    source_group: Mapped[str] = mapped_column(String(255))
    target_group: Mapped[str] = mapped_column(String(255))
    source_message_id: Mapped[int | None] = mapped_column(BigInteger)
    sent_message_id: Mapped[int | None] = mapped_column(BigInteger)
    content_type: Mapped[str] = mapped_column(String(30), default="unknown")
    status: Mapped[str] = mapped_column(String(10), default="info")
    message: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    account: Mapped[TelegramAccount | None] = relationship(back_populates="copy_histories")