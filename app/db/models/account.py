from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..base import Base


class TelegramAccount(Base):
    __tablename__ = "telegram_accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100), default="")
    last_name: Mapped[str] = mapped_column(String(100), default="")
    username: Mapped[str] = mapped_column(String(100), default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    avatar_url: Mapped[str] = mapped_column(String(255), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    health_status: Mapped[str] = mapped_column(String(20), default="unknown")
    health_note: Mapped[str] = mapped_column(Text, default="")
    last_health_check: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    identity: Mapped["AccountIdentity | None"] = relationship(
        back_populates="telegram_account", uselist=False
    )
    logs: Mapped[list["ActionLog"]] = relationship(back_populates="account")
    copy_histories: Mapped[list["CopyHistory"]] = relationship(back_populates="account")
    proxy_config: Mapped["AccountProxy | None"] = relationship(
        back_populates="account", uselist=False
    )
    rate_states: Mapped[list["AccountRateState"]] = relationship(back_populates="account")


class AccountIdentity(Base):
    __tablename__ = "account_identities"

    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_account_id: Mapped[int] = mapped_column(
        ForeignKey("telegram_accounts.id", ondelete="CASCADE"), unique=True
    )
    platform: Mapped[str] = mapped_column(String(100), default="")
    login_email: Mapped[str] = mapped_column(String(254), default="")
    external_uid: Mapped[str] = mapped_column(String(100), default="")
    identifier: Mapped[str] = mapped_column(String(150), default="")
    status: Mapped[str] = mapped_column(String(20), default="active")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    telegram_account: Mapped[TelegramAccount] = relationship(back_populates="identity")