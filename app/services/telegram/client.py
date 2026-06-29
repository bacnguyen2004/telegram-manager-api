import asyncio
import inspect
import weakref
from pathlib import Path

from telethon import TelegramClient

from ...config import settings
from ...utils.session_lock import SessionFileLock, build_session_lock


def attach_session_lock(client: TelegramClient, session_lock: SessionFileLock) -> None:
    original_disconnect = client.disconnect
    released = {"done": False}
    finalizer = weakref.finalize(client, session_lock.release)

    async def disconnect_with_lock(*args, **kwargs):
        try:
            result = original_disconnect(*args, **kwargs)
            if inspect.isawaitable(result):
                return await result
            return result
        finally:
            if not released["done"]:
                released["done"] = True
                if finalizer.alive:
                    finalizer.detach()
                session_lock.release()

    client.disconnect = disconnect_with_lock


async def connect_client(phone: str, session_dir: Path) -> tuple[TelegramClient, SessionFileLock]:
    session_base = session_dir / phone
    session_lock = build_session_lock(phone, session_base)
    await asyncio.to_thread(session_lock.acquire)
    try:
        client = TelegramClient(
            str(session_base),
            settings.telegram_api_id,
            settings.telegram_api_hash,
        )
        attach_session_lock(client, session_lock)
        await client.connect()
        return client, session_lock
    except Exception:
        session_lock.release()
        raise