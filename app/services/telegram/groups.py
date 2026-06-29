import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Literal
from urllib.parse import parse_qs, urlparse

from telethon.errors import (
    ChannelsTooMuchError,
    FloodWaitError,
    InviteHashEmptyError,
    InviteHashExpiredError,
    InviteHashInvalidError,
    UserAlreadyParticipantError,
)
from telethon.tl.functions.channels import JoinChannelRequest
from telethon.tl.functions.messages import ImportChatInviteRequest

from ...config import settings
from ...utils.session_lock import SessionBusyError
from .client import connect_client


TargetKind = Literal["public", "invite"]


@dataclass(frozen=True)
class JoinTarget:
    kind: TargetKind
    value: str


class TelegramJoinService:
    def __init__(self, api_id: int, api_hash: str, session_dir: Path) -> None:
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_dir = session_dir
        self.session_dir.mkdir(parents=True, exist_ok=True)

    async def join_group(self, phone: str, group_link: str) -> dict:
        phone = phone.strip()
        group_link = group_link.strip()

        if not phone:
            return self._result("error", "Thieu phone", phone, group_link)
        if not group_link:
            return self._result("error", "Thieu group_link", phone, group_link)

        try:
            settings.validate_telegram_config()
            target = parse_join_target(group_link)
        except ValueError as exc:
            return self._result("error", str(exc), phone, group_link)

        session_file = (self.session_dir / phone).with_suffix(".session")
        if not session_file.exists():
            return self._result(
                "error",
                "Chua co session. Dang nhap Telegram app chua du — "
                "hay goi POST /api/auth/send-code roi POST /api/auth/login de tao file .session.",
                phone,
                group_link,
            )

        try:
            client, _session_lock = await connect_client(phone, self.session_dir)
        except SessionBusyError as exc:
            return self._result("error", str(exc), phone, group_link)

        try:
            if not await client.is_user_authorized():
                return self._result("error", "Session chua dang nhap", phone, group_link)

            if target.kind == "invite":
                await client(ImportChatInviteRequest(target.value))
            else:
                await client(JoinChannelRequest(target.value))

            return self._result("success", "Da join group/channel", phone, group_link)
        except UserAlreadyParticipantError:
            return self._result("info", "Tai khoan da o trong group/channel", phone, group_link)
        except ChannelsTooMuchError:
            return self._result(
                "error", "Tai khoan da tham gia qua nhieu group/channel", phone, group_link
            )
        except InviteHashEmptyError:
            return self._result("error", "Invite hash rong", phone, group_link)
        except InviteHashExpiredError:
            return self._result("error", "Invite link da het han", phone, group_link)
        except InviteHashInvalidError:
            return self._result("error", "Invite link khong hop le", phone, group_link)
        except FloodWaitError as exc:
            return self._result("error", f"Flood wait {exc.seconds}s", phone, group_link)
        except Exception as exc:
            return self._result("error", str(exc), phone, group_link)
        finally:
            await client.disconnect()


def parse_join_target(raw: str) -> JoinTarget:
    value = raw.strip()
    if not value:
        raise ValueError("Group link rong")

    if value.startswith("tg://join"):
        query = parse_qs(urlparse(value).query)
        invite = (query.get("invite") or [""])[0].strip()
        if not invite:
            raise ValueError("Khong doc duoc invite hash tu tg://join")
        return JoinTarget("invite", invite)

    if value.startswith("+"):
        return JoinTarget("invite", value[1:].strip())

    parsed = urlparse(value if "://" in value else f"https://{value}")
    host = parsed.netloc.lower()
    path_parts = [part for part in parsed.path.split("/") if part]

    if host in {"t.me", "telegram.me"}:
        if not path_parts:
            raise ValueError("Link Telegram thieu username/invite")

        first = path_parts[0]
        if first.startswith("+"):
            return JoinTarget("invite", first[1:])
        if first == "joinchat" and len(path_parts) > 1:
            return JoinTarget("invite", path_parts[1])
        if first == "c":
            raise ValueError("Link t.me/c/... la link noi bo, khong dung de join")
        return JoinTarget("public", first.lstrip("@"))

    return JoinTarget("public", value.lstrip("@"))


telegram_join_service = TelegramJoinService(
    settings.telegram_api_id,
    settings.telegram_api_hash,
    settings.session_dir,
)