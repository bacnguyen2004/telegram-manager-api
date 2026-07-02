import json
import logging
import re
import unicodedata
from typing import Any

from sqlmodel import Session, select

from ..config import settings
from .engine import get_engine
from .models import RosterColumn, SessionMeta, utc_now


logger = logging.getLogger(__name__)

DEFAULT_ROSTER_COLUMNS: list[tuple[str, str, int]] = [
    ("btse_uid", "BTSE UID", 0),
    ("btse_email", "BTSE email", 1),
    ("binance_uid", "Binance UID", 2),
    ("note", "Ghi chú", 3),
]

MAX_FIELD_VALUE_LENGTH = 2000


def _iso(value) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def parse_custom_fields(raw: str | None) -> dict[str, str]:
    if not raw or not raw.strip():
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    if not isinstance(parsed, dict):
        return {}
    result: dict[str, str] = {}
    for key, value in parsed.items():
        if not isinstance(key, str):
            continue
        if value is None:
            continue
        text = str(value).strip()
        if text:
            result[key] = text[:MAX_FIELD_VALUE_LENGTH]
    return result


def dump_custom_fields(fields: dict[str, str]) -> str:
    cleaned: dict[str, str] = {}
    for key, value in fields.items():
        key_text = key.strip()
        if not key_text:
            continue
        value_text = str(value).strip()
        if not value_text:
            continue
        cleaned[key_text] = value_text[:MAX_FIELD_VALUE_LENGTH]
    return json.dumps(cleaned, ensure_ascii=False)


def slugify_column_key(label: str, existing: set[str]) -> str:
    normalized = unicodedata.normalize("NFD", label.strip().lower())
    without_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    base = re.sub(r"[^a-z0-9]+", "_", without_marks).strip("_") or "column"
    key = base
    index = 2
    while key in existing:
        key = f"{base}_{index}"
        index += 1
    return key


class RosterStore:
    def _session(self) -> Session:
        return Session(get_engine())

    def ensure_default_columns(self, db: Session) -> None:
        count = len(db.exec(select(RosterColumn)).all())
        if count > 0:
            return
        now = utc_now()
        for column_key, label, sort_order in DEFAULT_ROSTER_COLUMNS:
            db.add(
                RosterColumn(
                    column_key=column_key,
                    label=label,
                    sort_order=sort_order,
                    created_at=now,
                )
            )

    def list_columns(self) -> list[dict[str, Any]]:
        if not settings.database_enabled:
            return []
        try:
            with self._session() as session:
                self.ensure_default_columns(session)
                session.commit()
                columns = session.exec(
                    select(RosterColumn).order_by(
                        RosterColumn.sort_order.asc(),
                        RosterColumn.id.asc(),
                    )
                ).all()
                return [
                    {
                        "column_key": item.column_key,
                        "label": item.label,
                        "sort_order": item.sort_order,
                        "created_at": _iso(item.created_at),
                    }
                    for item in columns
                ]
        except Exception:
            logger.exception("RosterStore.list_columns failed")
            return []

    def get_sheet(self, phones: list[str]) -> dict[str, Any]:
        if not settings.database_enabled:
            return {"database_enabled": False, "columns": [], "rows": []}

        normalized_phones = [phone.strip() for phone in phones if phone.strip()]
        try:
            with self._session() as session:
                self.ensure_default_columns(session)
                session.commit()

                columns = session.exec(
                    select(RosterColumn).order_by(
                        RosterColumn.sort_order.asc(),
                        RosterColumn.id.asc(),
                    )
                ).all()
                column_items = [
                    {
                        "column_key": item.column_key,
                        "label": item.label,
                        "sort_order": item.sort_order,
                        "created_at": _iso(item.created_at),
                    }
                    for item in columns
                ]

                meta_by_phone: dict[str, SessionMeta] = {}
                if normalized_phones:
                    metas = session.exec(
                        select(SessionMeta).where(SessionMeta.phone.in_(normalized_phones))
                    ).all()
                    meta_by_phone = {item.phone: item for item in metas}

                rows: list[dict[str, Any]] = []
                for phone in normalized_phones:
                    meta = meta_by_phone.get(phone)
                    rows.append(
                        {
                            "phone": phone,
                            "display_name": meta.display_name if meta else None,
                            "username": meta.username if meta else None,
                            "status": meta.status if meta else None,
                            "last_synced_at": _iso(meta.last_synced_at) if meta else None,
                            "imported_at": _iso(meta.imported_at) if meta else None,
                            "custom_fields": parse_custom_fields(
                                meta.custom_fields if meta else None
                            ),
                        }
                    )

                return {
                    "database_enabled": True,
                    "columns": column_items,
                    "rows": rows,
                }
        except Exception:
            logger.exception("RosterStore.get_sheet failed")
            return {"database_enabled": True, "columns": [], "rows": []}

    def _get_or_create_meta(self, db: Session, phone: str) -> SessionMeta:
        row = db.get(SessionMeta, phone)
        if row is None:
            row = SessionMeta(phone=phone, source="imported", status="unknown")
            db.add(row)
        return row

    def _column_keys(self, db: Session) -> set[str]:
        return {
            item.column_key
            for item in db.exec(select(RosterColumn)).all()
        }

    def patch_row(self, phone: str, fields: dict[str, str]) -> dict[str, str] | None:
        if not settings.database_enabled:
            return None

        phone = phone.strip()
        if not phone:
            return None

        try:
            with self._session() as session:
                self.ensure_default_columns(session)
                valid_keys = self._column_keys(session)
                if not valid_keys:
                    session.commit()
                    return None

                row = self._get_or_create_meta(session, phone)
                current = parse_custom_fields(row.custom_fields)
                for key, value in fields.items():
                    key_text = key.strip()
                    if key_text not in valid_keys:
                        continue
                    value_text = str(value).strip()
                    if value_text:
                        current[key_text] = value_text[:MAX_FIELD_VALUE_LENGTH]
                    elif key_text in current:
                        del current[key_text]
                row.custom_fields = dump_custom_fields(current)
                session.add(row)
                session.commit()
                return current
        except Exception:
            logger.exception("RosterStore.patch_row failed for %s", phone)
            return None

    def add_column(self, label: str) -> dict[str, Any] | None:
        if not settings.database_enabled:
            return None

        label_text = label.strip()
        if not label_text:
            return None

        try:
            with self._session() as session:
                self.ensure_default_columns(session)
                column, _created = self._add_column_in_session(session, label_text)
                if column is None:
                    return None
                session.commit()
                session.refresh(column)
                return {
                    "column_key": column.column_key,
                    "label": column.label,
                    "sort_order": column.sort_order,
                    "created_at": _iso(column.created_at),
                }
        except Exception:
            logger.exception("RosterStore.add_column failed")
            return None

    def rename_column(self, column_key: str, label: str) -> dict[str, Any] | None:
        if not settings.database_enabled:
            return None

        column_key = column_key.strip()
        label_text = label.strip()
        if not column_key or not label_text:
            return None

        try:
            with self._session() as session:
                column = session.exec(
                    select(RosterColumn).where(RosterColumn.column_key == column_key)
                ).first()
                if column is None:
                    return None

                for item in session.exec(select(RosterColumn)).all():
                    if item.id == column.id:
                        continue
                    if item.label.casefold() == label_text.casefold():
                        return None

                column.label = label_text
                session.add(column)
                session.commit()
                session.refresh(column)
                return {
                    "column_key": column.column_key,
                    "label": column.label,
                    "sort_order": column.sort_order,
                    "created_at": _iso(column.created_at),
                }
        except Exception:
            logger.exception("RosterStore.rename_column failed")
            return None

    def remove_column(self, column_key: str) -> bool:
        if not settings.database_enabled:
            return False

        column_key = column_key.strip()
        if not column_key:
            return False

        try:
            with self._session() as session:
                column = session.exec(
                    select(RosterColumn).where(RosterColumn.column_key == column_key)
                ).first()
                if column is None:
                    return False

                metas = session.exec(select(SessionMeta)).all()
                for meta in metas:
                    fields = parse_custom_fields(meta.custom_fields)
                    if column_key not in fields:
                        continue
                    del fields[column_key]
                    meta.custom_fields = dump_custom_fields(fields)
                    session.add(meta)

                session.delete(column)
                session.commit()
                return True
        except Exception:
            logger.exception("RosterStore.remove_column failed")
            return False

    def _add_column_in_session(
        self,
        db: Session,
        label: str,
    ) -> tuple[RosterColumn | None, bool]:
        label_text = label.strip()
        if not label_text:
            return None, False

        existing = db.exec(select(RosterColumn)).all()
        for item in existing:
            if item.label.casefold() == label_text.casefold():
                return item, False

        keys = {item.column_key for item in existing}

        max_order = max((item.sort_order for item in existing), default=-1)
        created = RosterColumn(
            column_key=slugify_column_key(label_text, keys),
            label=label_text,
            sort_order=max_order + 1,
            created_at=utc_now(),
        )
        db.add(created)
        return created, True

    def import_rows(
        self,
        phones: set[str],
        *,
        new_column_labels: list[str],
        rows: list[dict[str, Any]],
    ) -> dict[str, int]:
        if not settings.database_enabled:
            return {"updated_phones": 0, "new_columns": 0}

        try:
            with self._session() as session:
                self.ensure_default_columns(session)

                new_columns = 0
                for label in new_column_labels:
                    _, created = self._add_column_in_session(session, label)
                    if created:
                        new_columns += 1

                valid_keys = self._column_keys(session)
                updated_phones = 0

                for item in rows:
                    phone = str(item.get("phone", "")).strip()
                    if not phone or phone not in phones:
                        continue
                    raw_fields = item.get("fields") or {}
                    if not isinstance(raw_fields, dict):
                        continue

                    row = self._get_or_create_meta(session, phone)
                    current = parse_custom_fields(row.custom_fields)
                    changed = False
                    for key, value in raw_fields.items():
                        key_text = str(key).strip()
                        if key_text not in valid_keys:
                            continue
                        value_text = str(value).strip()
                        if value_text:
                            current[key_text] = value_text[:MAX_FIELD_VALUE_LENGTH]
                            changed = True
                        elif key_text in current:
                            del current[key_text]
                            changed = True
                    if changed:
                        row.custom_fields = dump_custom_fields(current)
                        session.add(row)
                        updated_phones += 1

                session.commit()
                return {"updated_phones": updated_phones, "new_columns": new_columns}
        except Exception:
            logger.exception("RosterStore.import_rows failed")
            return {"updated_phones": 0, "new_columns": 0}


roster_store = RosterStore()