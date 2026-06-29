from typing import Literal

from pydantic import BaseModel, Field


class SendCodeRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])


class SendCodeData(BaseModel):
    status: Literal["success", "info", "error"]
    message: str
    phone: str


class LoginRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    code: str = Field(..., examples=["12345"])
    password: str | None = Field(
        default=None,
        description="Mat khau 2FA neu tai khoan bat xac thuc 2 buoc",
    )


class LoginData(BaseModel):
    status: Literal["success", "need_2fa", "error"]
    message: str
    phone: str
    first_name: str = ""
    last_name: str = ""
    username: str = ""
    session_file: str = ""