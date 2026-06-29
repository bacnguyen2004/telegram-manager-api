import asyncio
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import FloodWaitError

from ...config import settings


class TelegramSessionService:
    def __init__(self, api_id: int, api_hash: str, session_dir: Path) -> None:
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_dir = session_dir
        self.session_dir.mkdir(parents=True, exist_ok=True)

    def list_phones_on_disk(self) -> list[str]:
        if not self.session_dir.exists():
            return []
        return sorted(path.stem for path in self.session_dir.glob("*.session"))

    def list_sessions(self) -> dict:
        sessions = self.list_phones_on_disk()
        return {"total": len(sessions), "sessions": sessions}

    def resolve_phones(self, phones: list[str] | None) -> list[str]:
        if phones:
            return [phone.strip() for phone in phones if phone.strip()]
        return self.list_phones_on_disk()

    async def get_me(self, phone: str) -> dict:
        settings.validate_telegram_config()

        phone = phone.strip()
        if not phone:
            return self._me_result("error", phone, message="Thieu phone")

        session_base = self.session_dir / phone
        session_file = session_base.with_suffix(".session")
        if not session_file.exists():
            return self._me_result(
                "error",
                phone,
                message=f"Khong tim thay file session: {session_file}",
            )

        client = TelegramClient(str(session_base), self.api_id, self.api_hash)
        await client.connect()
        try:
            if not await client.is_user_authorized():
                return self._me_result(
                    "unauthorized",
                    phone,
                    message="Session chua dang nhap hoac da het han",
                )

            me = await client.get_me()
            return {
                "status": "success",
                "phone": phone,
                "me_id": me.id,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "username": me.username,
                "message": "OK",
            }
        except FloodWaitError as exc:
            return self._me_result(
                "error",
                phone,
                message=f"Flood wait {exc.seconds}s",
            )
        except Exception as exc:
            return self._me_result("error", phone, message=str(exc))
        finally:
            await client.disconnect()

    async def check_sessions(self, phones: list[str] | None = None) -> dict:
        settings.validate_telegram_config()

        target_phones = self.resolve_phones(phones)
        results: list[dict] = []

        for index, phone in enumerate(target_phones):
            if index > 0:
                await asyncio.sleep(0.5)
            results.append(await self._check_one(phone))

        active = sum(1 for item in results if item["status"] == "active")
        unauthorized = sum(1 for item in results if item["status"] == "unauthorized")
        error = sum(1 for item in results if item["status"] == "error")

        return {
            "total": len(target_phones),
            "active": active,
            "unauthorized": unauthorized,
            "error": error,
            "sessions": results,
        }

    async def _check_one(self, phone: str) -> dict:
        session_base = self.session_dir / phone
        session_file = session_base.with_suffix(".session")
        if not session_file.exists():
            return self._result(
                phone,
                "error",
                str(session_file),
                message=f"Khong tim thay file session: {session_file}",
            )

        client = TelegramClient(str(session_base), self.api_id, self.api_hash)
        await client.connect()
        try:
            if not await client.is_user_authorized():
                return self._result(
                    phone,
                    "unauthorized",
                    str(session_file),
                    message="Session chua dang nhap hoac da het han",
                )

            me = await client.get_me()
            username = me.username
            display = " ".join(part for part in [me.first_name, me.last_name] if part).strip()
            message = f"Live: {display or phone}"
            if username:
                message += f" (@{username})"

            return {
                "phone": phone,
                "status": "active",
                "session_file": str(session_file),
                "me_id": me.id,
                "username": username,
                "message": message,
            }
        except FloodWaitError as exc:
            return self._result(
                phone,
                "error",
                str(session_file),
                message=f"Flood wait {exc.seconds}s",
            )
        except Exception as exc:
            return self._result(phone, "error", str(session_file), message=str(exc))
        finally:
            await client.disconnect()

    @staticmethod
    def _me_result(status: str, phone: str, *, message: str) -> dict:
        return {
            "status": status,
            "phone": phone,
            "message": message,
        }

    @staticmethod
    def _result(
        phone: str,
        status: str,
        session_file: str,
        *,
        message: str,
        me_id: int | None = None,
        username: str | None = None,
    ) -> dict:
        return {
            "phone": phone,
            "status": status,
            "session_file": session_file,
            "me_id": me_id,
            "username": username,
            "message": message,
        }


telegram_session_service = TelegramSessionService(
    settings.telegram_api_id,
    settings.telegram_api_hash,
    settings.session_dir,
)