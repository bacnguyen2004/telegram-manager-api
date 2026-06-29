from pathlib import Path

from telethon import TelegramClient
from telethon.errors import (
    PhoneCodeExpiredError,
    PhoneCodeInvalidError,
    PhoneNumberBannedError,
    PhoneNumberInvalidError,
    SessionPasswordNeededError,
)

from ...config import settings


class TelegramAuthService:
    def __init__(self, api_id: int, api_hash: str, session_dir: Path) -> None:
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_dir = session_dir
        self.session_dir.mkdir(parents=True, exist_ok=True)

    async def send_code(self, phone: str) -> dict:
        phone = phone.strip()
        if not phone:
            return self._result("error", "Thieu phone", phone)

        try:
            settings.validate_telegram_config()
        except ValueError as exc:
            return self._result("error", str(exc), phone)

        session_base = self.session_dir / phone
        client = TelegramClient(str(session_base), self.api_id, self.api_hash)
        await client.connect()
        try:
            if await client.is_user_authorized():
                return self._result(
                    "info",
                    "Session da dang nhap san. Co the dung join-group ngay.",
                    phone,
                )
            await client.send_code_request(phone)
            return self._result(
                "success",
                "Da gui ma OTP qua Telegram app. Tiep theo goi POST /api/auth/login",
                phone,
            )
        except PhoneNumberBannedError:
            return self._result("error", "So dien thoai da bi cam", phone)
        except PhoneNumberInvalidError:
            return self._result("error", "So dien thoai khong hop le", phone)
        except Exception as exc:
            return self._result("error", str(exc), phone)
        finally:
            await client.disconnect()

    async def login(self, phone: str, code: str, password: str | None = None) -> dict:
        phone = phone.strip()
        code = code.strip()
        password = (password or "").strip() or None

        if not phone:
            return self._result("error", "Thieu phone", phone)
        if not code:
            return self._result("error", "Thieu code", phone)

        try:
            settings.validate_telegram_config()
        except ValueError as exc:
            return self._result("error", str(exc), phone)

        session_base = self.session_dir / phone
        session_file = session_base.with_suffix(".session")
        if not session_file.exists():
            return self._result(
                "error",
                "Chua gui OTP. Hay goi POST /api/auth/send-code truoc.",
                phone,
            )

        client = TelegramClient(str(session_base), self.api_id, self.api_hash)
        await client.connect()
        try:
            try:
                await client.sign_in(phone, code)
            except SessionPasswordNeededError:
                if not password:
                    return self._result(
                        "need_2fa",
                        "Tai khoan bat 2FA. Gui lai POST /api/auth/login kem password.",
                        phone,
                    )
                await client.sign_in(password=password)

            me = await client.get_me()
            return {
                "status": "success",
                "message": "Dang nhap thanh cong, da tao file .session",
                "phone": phone,
                "first_name": me.first_name or "",
                "last_name": me.last_name or "",
                "username": me.username or "",
                "session_file": str(session_file),
            }
        except PhoneCodeInvalidError:
            return self._result("error", "Ma OTP khong hop le", phone)
        except PhoneCodeExpiredError:
            return self._result("error", "Ma OTP da het han. Hay gui lai send-code.", phone)
        except PhoneNumberBannedError:
            return self._result("error", "So dien thoai da bi cam", phone)
        except Exception as exc:
            return self._result("error", str(exc), phone)
        finally:
            await client.disconnect()

    @staticmethod
    def _result(status: str, message: str, phone: str) -> dict:
        return {"status": status, "message": message, "phone": phone}


telegram_auth_service = TelegramAuthService(
    settings.telegram_api_id,
    settings.telegram_api_hash,
    settings.session_dir,
)