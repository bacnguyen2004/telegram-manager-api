from typing import Literal

from pydantic import BaseModel, Field


class JoinGroupRequest(BaseModel):
    phone: str = Field(..., examples=["+849xxxxxxxx"])
    group_link: str = Field(
        ...,
        examples=["https://t.me/example_group", "https://t.me/+invite_hash"],
    )


class JoinGroupData(BaseModel):
    status: Literal["success", "info", "error"]
    message: str
    phone: str
    group_link: str