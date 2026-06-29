import io
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import FloodWaitError

from ...config import settings
from .client import telethon_session


class TelegramMessageService:
    def __init__(self, api_id: int, api_hash: str, session_dir: Path) -> None:
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_dir = session_dir

    async def send_message(self, phone: str, peer_id: str, text: str) -> dict:
        return await self._send(phone, peer_id, text)

    async def delete_message(
        self,
        phone: str,
        peer_id: str,
        message_id: int,
    ) -> dict:
        phone = phone.strip()
        peer_ref = str(peer_id or "").strip()

        if not phone:
            return self._error(phone, peer_ref, "Thieu phone", message_id=message_id)
        if not peer_ref:
            return self._error(phone, peer_ref, "Thieu peer_id", message_id=message_id)
        if message_id < 1:
            return self._error(phone, peer_ref, "message_id khong hop le", message_id=message_id)

        try:
            settings.validate_telegram_config()
        except ValueError as exc:
            return self._error(phone, peer_ref, str(exc), message_id=message_id)

        session_file = self._session_file(phone)
        if not session_file.exists():
            return self._error(
                phone,
                peer_ref,
                f"Khong tim thay file session: {session_file}",
                message_id=message_id,
            )

        try:
            async with telethon_session(
                phone, self.api_id, self.api_hash, self.session_dir
            ) as client:
                if not await client.is_user_authorized():
                    return self._error(
                        phone,
                        peer_ref,
                        "Session chua dang nhap hoac da het han",
                        message_id=message_id,
                    )

                entity = await self._resolve_peer(client, peer_ref)
                await client.delete_messages(entity, message_id)

                return {
                    "status": "success",
                    "phone": phone,
                    "peer_id": peer_ref,
                    "message_id": message_id,
                    "reply_to_msg_id": None,
                    "message": "Da xoa tin nhan",
                }
        except FloodWaitError as exc:
            return self._error(
                phone, peer_ref, f"Flood wait {exc.seconds}s", message_id=message_id
            )
        except Exception as exc:
            return self._error(phone, peer_ref, str(exc), message_id=message_id)

    async def reply_message(
        self,
        phone: str,
        peer_id: str,
        text: str,
        reply_to_msg_id: int,
    ) -> dict:
        return await self._send(
            phone,
            peer_id,
            text,
            reply_to_msg_id=reply_to_msg_id,
            success_message="Da tra loi tin nhan",
        )

    async def send_media(
        self,
        phone: str,
        peer_id: str,
        file_bytes: bytes,
        filename: str,
        *,
        caption: str | None = None,
        reply_to_msg_id: int | None = None,
    ) -> dict:
        phone = phone.strip()
        peer_ref = str(peer_id or "").strip()
        caption = (caption or "").strip()
        filename = (filename or "image.jpg").strip() or "image.jpg"

        if not phone:
            return self._error(phone, peer_ref, "Thieu phone")
        if not peer_ref:
            return self._error(phone, peer_ref, "Thieu peer_id")
        if not file_bytes:
            return self._error(phone, peer_ref, "File rong")
        if reply_to_msg_id is not None and reply_to_msg_id < 1:
            return self._error(phone, peer_ref, "reply_to_msg_id khong hop le")
        if len(caption) > 1024:
            return self._error(phone, peer_ref, "Caption toi da 1024 ky tu")

        try:
            settings.validate_telegram_config()
        except ValueError as exc:
            return self._error(phone, peer_ref, str(exc))

        session_file = self._session_file(phone)
        if not session_file.exists():
            return self._error(
                phone,
                peer_ref,
                f"Khong tim thay file session: {session_file}",
            )

        try:
            async with telethon_session(
                phone, self.api_id, self.api_hash, self.session_dir
            ) as client:
                if not await client.is_user_authorized():
                    return self._error(
                        phone,
                        peer_ref,
                        "Session chua dang nhap hoac da het han",
                    )

                entity = await self._resolve_peer(client, peer_ref)
                buffer = io.BytesIO(file_bytes)
                buffer.name = filename
                sent = await client.send_file(
                    entity,
                    buffer,
                    caption=caption or None,
                    reply_to=reply_to_msg_id,
                    force_document=False,
                )

                return {
                    "status": "success",
                    "phone": phone,
                    "peer_id": peer_ref,
                    "message_id": getattr(sent, "id", None),
                    "reply_to_msg_id": reply_to_msg_id,
                    "message": "Da gui anh",
                }
        except FloodWaitError as exc:
            return self._error(phone, peer_ref, f"Flood wait {exc.seconds}s")
        except Exception as exc:
            return self._error(phone, peer_ref, str(exc))

    async def _send(
        self,
        phone: str,
        peer_id: str,
        text: str,
        *,
        reply_to_msg_id: int | None = None,
        success_message: str = "Da gui tin nhan",
    ) -> dict:
        phone = phone.strip()
        peer_ref = str(peer_id or "").strip()
        text = (text or "").strip()

        if not phone:
            return self._error(phone, peer_ref, "Thieu phone")
        if not peer_ref:
            return self._error(phone, peer_ref, "Thieu peer_id")
        if not text:
            return self._error(phone, peer_ref, "Thieu noi dung tin nhan")
        if reply_to_msg_id is not None and reply_to_msg_id < 1:
            return self._error(phone, peer_ref, "reply_to_msg_id khong hop le")

        try:
            settings.validate_telegram_config()
        except ValueError as exc:
            return self._error(phone, peer_ref, str(exc))

        session_file = self._session_file(phone)
        if not session_file.exists():
            return self._error(
                phone,
                peer_ref,
                f"Khong tim thay file session: {session_file}",
            )

        try:
            async with telethon_session(
                phone, self.api_id, self.api_hash, self.session_dir
            ) as client:
                if not await client.is_user_authorized():
                    return self._error(
                        phone,
                        peer_ref,
                        "Session chua dang nhap hoac da het han",
                    )

                entity = await self._resolve_peer(client, peer_ref)
                if reply_to_msg_id is not None:
                    sent = await client.send_message(
                        entity,
                        text,
                        reply_to=reply_to_msg_id,
                    )
                else:
                    sent = await client.send_message(entity, text)

                return {
                    "status": "success",
                    "phone": phone,
                    "peer_id": peer_ref,
                    "message_id": getattr(sent, "id", None),
                    "reply_to_msg_id": reply_to_msg_id,
                    "message": success_message,
                }
        except FloodWaitError as exc:
            return self._error(phone, peer_ref, f"Flood wait {exc.seconds}s")
        except Exception as exc:
            return self._error(phone, peer_ref, str(exc))

    async def _resolve_peer(self, client: TelegramClient, peer_ref: str):
        if peer_ref.lstrip("-").isdigit():
            return await client.get_entity(int(peer_ref))
        normalized = peer_ref.strip().rstrip("/")
        if "t.me/" in normalized:
            normalized = normalized.split("/")[-1]
        return await client.get_entity(normalized)

    def _session_file(self, phone: str) -> Path:
        return (self.session_dir / phone).with_suffix(".session")

    @staticmethod
    def _error(
        phone: str,
        peer_id: str,
        message: str,
        *,
        message_id: int | None = None,
    ) -> dict:
        return {
            "status": "error",
            "phone": phone,
            "peer_id": peer_id,
            "message_id": message_id,
            "reply_to_msg_id": None,
            "message": message,
        }


telegram_message_service = TelegramMessageService(
    settings.telegram_api_id,
    settings.telegram_api_hash,
    settings.session_dir,
)