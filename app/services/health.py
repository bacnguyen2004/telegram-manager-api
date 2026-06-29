import asyncio
from pathlib import Path
from typing import Any

from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings


async def check_database(db: AsyncSession) -> dict[str, Any]:
    try:
        await db.execute(text("SELECT 1"))
        return {"ok": True, "url": settings.database_url}
    except Exception as exc:
        return {"ok": False, "url": settings.database_url, "error": str(exc)}


async def check_redis() -> dict[str, Any]:
    broker_url = settings.celery_broker_url
    try:
        client = Redis.from_url(broker_url, socket_connect_timeout=2)
        try:
            pong = await client.ping()
            return {"ok": bool(pong), "broker_url": broker_url}
        finally:
            await client.aclose()
    except Exception as exc:
        return {"ok": False, "broker_url": broker_url, "error": str(exc)}


def _collect_dir_status(path: Path) -> dict[str, Any]:
    path.mkdir(parents=True, exist_ok=True)
    session_count = len(list(path.glob("*.session")))
    writable = False
    try:
        probe = path / ".write_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        writable = True
    except OSError:
        writable = False
    return {
        "path": str(path),
        "exists": path.exists(),
        "writable": writable,
        "session_count": session_count,
    }


async def check_session_dirs() -> dict[str, Any]:
    active, inactive = await asyncio.gather(
        asyncio.to_thread(_collect_dir_status, settings.session_dir),
        asyncio.to_thread(_collect_dir_status, settings.inactive_session_dir),
    )
    return {"active": active, "inactive": inactive}