from collections.abc import Generator
from typing import Any

from sqlmodel import Session, SQLModel, create_engine

from ..config import settings

_engine = None


def _engine_kwargs(url: str) -> dict[str, Any]:
    kwargs: dict[str, Any] = {"echo": False}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    return kwargs


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(
            settings.database_url,
            **_engine_kwargs(settings.database_url),
        )
    return _engine


def reset_engine() -> None:
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None


def init_db() -> None:
    if not settings.database_enabled:
        return
    SQLModel.metadata.create_all(get_engine())


def get_session() -> Generator[Session, None, None]:
    with Session(get_engine()) as session:
        yield session


def ping_database() -> tuple[bool, str]:
    if not settings.database_enabled:
        return False, "Database disabled (DATABASE_ENABLED=false)"

    try:
        with Session(get_engine()) as session:
            session.connection().exec_driver_sql("SELECT 1")
        return True, "OK"
    except Exception as exc:
        return False, str(exc)