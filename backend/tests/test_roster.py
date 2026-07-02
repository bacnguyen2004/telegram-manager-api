import pytest
from sqlmodel import Session, select

from app.config import settings
from app.db import roster_store
from app.db.engine import get_engine, init_db, reset_engine
from app.db.models import RosterColumn, SessionMeta


@pytest.fixture(autouse=True)
def roster_db(tmp_path, monkeypatch):
    db_file = tmp_path / "roster_test.db"
    monkeypatch.setattr(settings, "database_url", f"sqlite:///{db_file.as_posix()}")
    monkeypatch.setattr(settings, "database_enabled", True)
    reset_engine()
    init_db()


def test_get_sheet_seeds_default_columns():
    sheet = roster_store.get_sheet(["+84901112233"])
    assert sheet["database_enabled"] is True
    assert len(sheet["columns"]) == 4
    keys = [item["column_key"] for item in sheet["columns"]]
    assert keys == ["btse_uid", "btse_email", "binance_uid", "note"]
    assert len(sheet["rows"]) == 1
    assert sheet["rows"][0]["phone"] == "+84901112233"
    assert sheet["rows"][0]["custom_fields"] == {}


def test_patch_row_creates_session_meta_and_persists_fields():
    updated = roster_store.patch_row(
        "+84901112233",
        {"btse_uid": "12345", "note": "Event T7"},
    )
    assert updated == {"btse_uid": "12345", "note": "Event T7"}

    with Session(get_engine()) as session:
        row = session.get(SessionMeta, "+84901112233")
        assert row is not None
        assert '"btse_uid": "12345"' in row.custom_fields


def test_add_and_remove_column():
    created = roster_store.add_column("Discord")
    assert created is not None
    assert created["column_key"] == "discord"
    assert created["label"] == "Discord"

    roster_store.patch_row("+84901112233", {"discord": "user#1"})
    assert roster_store.remove_column("discord") is True

    with Session(get_engine()) as session:
        row = session.get(SessionMeta, "+84901112233")
        assert row is not None
        assert "discord" not in row.custom_fields
        assert session.exec(
            select(RosterColumn).where(RosterColumn.column_key == "discord")
        ).first() is None


def test_rename_column_keeps_data_key():
    roster_store.patch_row("+84901112233", {"btse_uid": "keep-me"})
    renamed = roster_store.rename_column("btse_uid", "BTSE ID")
    assert renamed is not None
    assert renamed["column_key"] == "btse_uid"
    assert renamed["label"] == "BTSE ID"

    sheet = roster_store.get_sheet(["+84901112233"])
    assert sheet["rows"][0]["custom_fields"]["btse_uid"] == "keep-me"
    labels = [item["label"] for item in sheet["columns"]]
    assert "BTSE ID" in labels
    assert "BTSE UID" not in labels


def test_import_rows_adds_columns_and_updates_phones():
    phones = {"+84901112233", "+84909998877"}
    result = roster_store.import_rows(
        phones,
        new_column_labels=["WhatsApp"],
        rows=[
            {
                "phone": "+84901112233",
                "fields": {"whatsapp": "+84111", "btse_uid": "99"},
            }
        ],
    )
    assert result["new_columns"] == 1
    assert result["updated_phones"] == 1

    sheet = roster_store.get_sheet(["+84901112233"])
    fields = sheet["rows"][0]["custom_fields"]
    assert fields["whatsapp"] == "+84111"
    assert fields["btse_uid"] == "99"