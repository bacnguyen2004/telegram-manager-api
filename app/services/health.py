import asyncio
from pathlib import Path
from typing import Any

from ..config import settings


def _collect_session_dir_status(path: Path) -> dict[str, Any]:
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


async def check_session_dir() -> dict[str, Any]:
    return await asyncio.to_thread(_collect_session_dir_status, settings.session_dir)