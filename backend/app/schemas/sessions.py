from typing import Literal

from pydantic import BaseModel, Field


class SessionsData(BaseModel):
    total: int
    sessions: list[str]


class CheckSessionsRequest(BaseModel):
    phones: list[str] | None = Field(
        default=None,
        description="Danh sach so dien thoai can check. De trong hoac null de check tat ca.",
    )


class CheckSessionItem(BaseModel):
    phone: str
    status: str
    session_file: str
    me_id: int | None = None
    username: str | None = None
    message: str | None = None


class CheckSessionsData(BaseModel):
    total: int
    active: int
    unauthorized: int
    error: int
    sessions: list[CheckSessionItem]


class SessionMeData(BaseModel):
    status: Literal["success", "unauthorized", "error"]
    phone: str
    me_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    message: str = ""


class SessionGroupScanSummary(BaseModel):
    total: int
    group_count: int
    channel_count: int
    scanned_at: str


class SessionAuditItem(BaseModel):
    action: str
    resource: str | None = None
    status: str
    created_at: str


class SessionDbMetadata(BaseModel):
    telegram_user_id: int | None = None
    username: str | None = None
    display_name: str | None = None
    first_login_at: str | None = None
    last_login_at: str | None = None
    login_count: int = 0
    last_group_scan: SessionGroupScanSummary | None = None
    recent_audit: list[SessionAuditItem] = []


class SessionDetailData(BaseModel):
    status: Literal["success", "not_found"]
    phone: str
    exists: bool
    session_file: str
    size_bytes: int | None = None
    modified_at: str | None = None
    has_journal: bool = False
    message: str = ""
    db_metadata: SessionDbMetadata | None = None


class DeleteSessionData(BaseModel):
    status: Literal["success", "error"]
    phone: str
    deleted_files: list[str] = []
    pending_auth_cleared: bool = False
    message: str = ""