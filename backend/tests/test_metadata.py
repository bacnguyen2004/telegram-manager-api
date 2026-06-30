from sqlmodel import Session, select

from app.db import metadata_store
from app.db.models import AuditLog, GroupScan, SessionMeta
from app.db.engine import get_engine


def test_record_login_creates_session_meta():
    metadata_store.record_login(
        "+84901112233",
        telegram_user_id=12345,
        username="demo_user",
        first_name="Demo",
        last_name="User",
    )

    with Session(get_engine()) as session:
        row = session.get(SessionMeta, "+84901112233")
        assert row is not None
        assert row.telegram_user_id == 12345
        assert row.username == "demo_user"
        assert row.display_name == "Demo User"
        assert row.login_count == 1

        audits = session.exec(
            select(AuditLog).where(AuditLog.phone == "+84901112233")
        ).all()
        assert len(audits) == 1
        assert audits[0].action == "auth.login"


def test_record_login_increments_login_count():
    phone = "+84909998877"
    for _ in range(2):
        metadata_store.record_login(
            phone,
            telegram_user_id=99,
            username="repeat",
            first_name="A",
            last_name="B",
        )

    with Session(get_engine()) as session:
        row = session.get(SessionMeta, phone)
        assert row is not None
        assert row.login_count == 2


def test_record_group_scan_and_snapshot():
    phone = "+84901234567"
    metadata_store.record_login(
        phone,
        telegram_user_id=1,
        username="scan_user",
        first_name="Scan",
        last_name="",
    )
    metadata_store.record_group_scan(
        phone,
        [
            {"is_channel": False, "title": "Group A"},
            {"is_channel": True, "title": "Channel B"},
        ],
    )

    snapshot = metadata_store.get_session_snapshot(phone)
    assert snapshot is not None
    assert snapshot["login_count"] == 1
    assert snapshot["last_group_scan"]["total"] == 2
    assert snapshot["last_group_scan"]["group_count"] == 1
    assert snapshot["last_group_scan"]["channel_count"] == 1
    assert len(snapshot["recent_audit"]) >= 2

    with Session(get_engine()) as session:
        scans = session.exec(select(GroupScan).where(GroupScan.phone == phone)).all()
        assert len(scans) == 1


def test_remove_session_meta_keeps_audit_history():
    phone = "+84907654321"
    metadata_store.record_login(
        phone,
        telegram_user_id=7,
        username=None,
        first_name="X",
        last_name=None,
    )
    metadata_store.record_audit(
        phone,
        action="sessions.delete",
        resource=phone,
        status="success",
    )
    metadata_store.remove_session_meta(phone)

    with Session(get_engine()) as session:
        assert session.get(SessionMeta, phone) is None
        audits = session.exec(select(AuditLog).where(AuditLog.phone == phone)).all()
        assert len(audits) >= 2