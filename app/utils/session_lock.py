import hashlib
import json
import logging
import os
import random
import re
import time
from pathlib import Path

from ..config import settings


logger = logging.getLogger(__name__)


class SessionBusyError(RuntimeError):
    pass


class SessionFileLock:
    """Cross-process lock for one Telethon session file."""

    def __init__(
        self,
        lock_path: str | Path,
        timeout: float = 180,
        stale_seconds: float = 1800,
    ) -> None:
        self.lock_path = str(lock_path)
        self.timeout = max(float(timeout or 0), 0.0)
        self.stale_seconds = max(float(stale_seconds or 0), 60.0)
        self.fd: int | None = None

    def acquire(self) -> "SessionFileLock":
        os.makedirs(os.path.dirname(self.lock_path), exist_ok=True)
        deadline = time.time() + self.timeout
        while True:
            try:
                self.fd = os.open(self.lock_path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
                payload = {"pid": os.getpid(), "created_at": time.time()}
                os.write(self.fd, json.dumps(payload).encode("utf-8"))
                return self
            except FileExistsError:
                if self._is_stale():
                    try:
                        os.remove(self.lock_path)
                        continue
                    except FileNotFoundError:
                        continue
                    except OSError:
                        pass
                if time.time() >= deadline:
                    raise SessionBusyError(
                        "Session dang duoc task khac su dung, thu lai sau"
                    )
                time.sleep(random.uniform(0.15, 0.45))

    def _is_stale(self) -> bool:
        try:
            return (time.time() - os.path.getmtime(self.lock_path)) > self.stale_seconds
        except OSError:
            return False

    def release(self) -> None:
        fd = self.fd
        self.fd = None
        if fd is not None:
            try:
                os.close(fd)
            except OSError:
                pass
        try:
            os.remove(self.lock_path)
        except FileNotFoundError:
            pass
        except OSError as exc:
            logger.warning("Cannot remove session lock %s: %s", self.lock_path, exc)


def build_session_lock(phone: str, session_base: Path) -> SessionFileLock:
    safe_phone = re.sub(r"[^0-9A-Za-z_+-]+", "_", str(phone or "session"))
    session_key = hashlib.sha1(str(session_base.resolve()).encode("utf-8")).hexdigest()[:12]
    lock_path = settings.session_lock_dir / f"{safe_phone}_{session_key}.lock"
    return SessionFileLock(
        lock_path,
        timeout=settings.session_lock_timeout,
        stale_seconds=settings.session_lock_stale_seconds,
    )