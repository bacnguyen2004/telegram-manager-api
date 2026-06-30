import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, select

from ..config import settings
from .engine import get_engine
from .models import AuditLog, GroupScan, SessionMeta, utc_now


logger = logging.getLogger(__name__)


class MetadataStore:
    """Persist business metadata in PostgreSQL (Telethon .session stays on disk)."""

    def _session(self) -> Session:
        return Session(get_engine())

    def _run(self, action: str, callback) -> None:
        if not settings.database_enabled:
            return
        try:
            with self._session() as session:
                callback(session)
                session.commit()
        except Exception:
            logger.exception("MetadataStore.%s failed", action)

    def record_login(
        self,
        phone: str,
        *,
        telegram_user_id: int | None,
        username: str | None,
        first_name: str | None,
        last_name: str | None,
    ) -> None:
        phone = phone.strip()
        if not phone:
            return

        display_name = " ".join(
            part for part in [first_name or "", last_name or ""] if part
        ).strip() or None
        now = utc_now()

        def _write(db: Session) -> None:
            row = db.get(SessionMeta, phone)
            if row is None:
                row = SessionMeta(
                    phone=phone,
                    telegram_user_id=telegram_user_id,
                    username=username,
                    display_name=display_name,
                    first_login_at=now,
                    last_login_at=now,
                    login_count=1,
                )
            else:
                row.telegram_user_id = telegram_user_id
                row.username = username
                row.display_name = display_name
                row.last_login_at = now
                row.login_count += 1
            db.add(row)
            self._append_audit(
                db,
                phone=phone,
                action="auth.login",
                resource=phone,
                status="success",
                detail={"telegram_user_id": telegram_user_id, "username": username},
            )

        self._run("record_login", _write)

    def record_group_scan(self, phone: str, groups: list[dict[str, Any]]) -> None:
        phone = phone.strip()
        if not phone:
            return

        group_count = sum(1 for item in groups if not item.get("is_channel"))
        channel_count = sum(1 for item in groups if item.get("is_channel"))
        total = len(groups)

        def _write(db: Session) -> None:
            db.add(
                GroupScan(
                    phone=phone,
                    total=total,
                    group_count=group_count,
                    channel_count=channel_count,
                    scanned_at=utc_now(),
                )
            )
            self._append_audit(
                db,
                phone=phone,
                action="groups.scan",
                resource=phone,
                status="success",
                detail={
                    "total": total,
                    "group_count": group_count,
                    "channel_count": channel_count,
                },
            )

        self._run("record_group_scan", _write)

    def record_audit(
        self,
        phone: str,
        *,
        action: str,
        status: str,
        resource: str | None = None,
        detail: dict[str, Any] | str | None = None,
    ) -> None:
        phone = phone.strip()
        if not phone:
            return

        def _write(db: Session) -> None:
            self._append_audit(
                db,
                phone=phone,
                action=action,
                resource=resource,
                status=status,
                detail=detail,
            )

        self._run("record_audit", _write)

    def remove_session_meta(self, phone: str) -> None:
        phone = phone.strip()
        if not phone:
            return

        def _write(db: Session) -> None:
            row = db.get(SessionMeta, phone)
            if row is not None:
                db.delete(row)

        self._run("remove_session_meta", _write)

    def get_session_snapshot(self, phone: str) -> dict[str, Any] | None:
        if not settings.database_enabled:
            return None

        phone = phone.strip()
        if not phone:
            return None

        try:
            with self._session() as session:
                meta = session.get(SessionMeta, phone)
                if meta is None:
                    return None

                last_scan = session.exec(
                    select(GroupScan)
                    .where(GroupScan.phone == phone)
                    .order_by(GroupScan.scanned_at.desc())
                    .limit(1)
                ).first()

                recent_audit = session.exec(
                    select(AuditLog)
                    .where(AuditLog.phone == phone)
                    .order_by(AuditLog.created_at.desc())
                    .limit(5)
                ).all()

                return {
                    "telegram_user_id": meta.telegram_user_id,
                    "username": meta.username,
                    "display_name": meta.display_name,
                    "first_login_at": _iso(meta.first_login_at),
                    "last_login_at": _iso(meta.last_login_at),
                    "login_count": meta.login_count,
                    "last_group_scan": (
                        {
                            "total": last_scan.total,
                            "group_count": last_scan.group_count,
                            "channel_count": last_scan.channel_count,
                            "scanned_at": _iso(last_scan.scanned_at),
                        }
                        if last_scan
                        else None
                    ),
                    "recent_audit": [
                        {
                            "action": item.action,
                            "resource": item.resource,
                            "status": item.status,
                            "created_at": _iso(item.created_at),
                        }
                        for item in recent_audit
                    ],
                }
        except Exception:
            logger.exception("MetadataStore.get_session_snapshot failed")
            return None

    @staticmethod
    def _append_audit(
        db: Session,
        *,
        phone: str,
        action: str,
        status: str,
        resource: str | None = None,
        detail: dict[str, Any] | str | None = None,
    ) -> None:
        detail_text: str | None
        if detail is None:
            detail_text = None
        elif isinstance(detail, str):
            detail_text = detail[:2000]
        else:
            detail_text = json.dumps(detail, ensure_ascii=False)[:2000]

        db.add(
            AuditLog(
                phone=phone,
                action=action,
                resource=resource,
                status=status,
                detail=detail_text,
                created_at=utc_now(),
            )
        )


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


metadata_store = MetadataStore()