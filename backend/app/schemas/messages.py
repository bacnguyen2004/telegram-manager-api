from typing import Literal

from pydantic import BaseModel, Field


class SendMessageRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    peer_id: str = Field(
        ...,
        description="Dialog id, username hoac link t.me",
        examples=["123456789", "@username"],
    )
    text: str = Field(..., min_length=1, max_length=4096)


class ReplyMessageRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    peer_id: str = Field(
        ...,
        description="Dialog id, username hoac link t.me",
        examples=["123456789", "@username"],
    )
    reply_to_msg_id: int = Field(..., ge=1, description="ID tin nhan can tra loi")
    text: str = Field(..., min_length=1, max_length=4096)


class MessageActionData(BaseModel):
    status: Literal["success", "error"]
    phone: str
    peer_id: str
    message_id: int | None = None
    reply_to_msg_id: int | None = None
    message: str


class SendMessageData(MessageActionData):
    pass


class ForwardMessageRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    from_peer_id: str = Field(
        ...,
        description="Dialog nguon (id hoac username)",
        examples=["123456789", "@username"],
    )
    to_peer_id: str = Field(
        ...,
        description="Dialog dich (id hoac username)",
        examples=["987654321", "@other"],
    )
    message_id: int = Field(..., ge=1, description="ID tin nhan can forward")


class ForwardMessagesRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    from_peer_id: str = Field(..., description="Dialog nguon")
    to_peer_id: str = Field(..., description="Dialog dich")
    message_ids: list[int] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Danh sach ID tin can forward",
    )


class ForwardMessageData(MessageActionData):
    from_peer_id: str
    to_peer_id: str


class ForwardMessagesData(MessageActionData):
    from_peer_id: str
    to_peer_id: str
    forwarded_count: int = 0
    message_ids: list[int] = Field(default_factory=list)


class EditMessageRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    peer_id: str = Field(..., description="Dialog id hoac username")
    message_id: int = Field(..., ge=1, description="ID tin nhan can sua")
    text: str = Field(..., min_length=1, max_length=4096)


class DeleteMessagesRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    peer_id: str = Field(..., description="Dialog id hoac username")
    message_ids: list[int] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Danh sach ID tin can xoa",
    )


class DeleteMessagesData(MessageActionData):
    deleted_count: int = 0
    message_ids: list[int] = Field(default_factory=list)


class PinMessageRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    peer_id: str = Field(
        ...,
        description="Dialog id hoac username",
        examples=["123456789", "@username"],
    )
    message_id: int = Field(..., ge=1, description="ID tin nhan can ghim")
    unpin: bool = Field(False, description="True de bo ghim")


class PinMessageData(MessageActionData):
    pinned: bool = False


class ReactMessageRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    peer_id: str = Field(
        ...,
        description="Dialog id, username hoac link t.me",
        examples=["123456789", "@username"],
    )
    message_id: int = Field(..., ge=1, description="ID tin nhan can react")
    emoji: str = Field(
        ...,
        min_length=1,
        max_length=16,
        description="Emoji reaction, vi du: thumbs up",
        examples=["👍", "❤️", "🔥"],
    )


class ReactMessageData(MessageActionData):
    emoji: str | None = None


class VotePollRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    peer_id: str = Field(
        ...,
        description="Dialog id, username hoac link t.me",
        examples=["123456789", "@username"],
    )
    message_id: int = Field(..., ge=1, description="ID tin nhan chua poll")
    option: str = Field(
        "",
        max_length=256,
        description="Lua chon don: so thu tu, text, option_hex, hoac bo trong neu link co ?option=",
        examples=["1", "Co", "32"],
    )
    options: list[str] | None = Field(
        None,
        description="Nhieu lua chon: danh sach option_hex (poll) hoac todo_item_id (todo)",
    )
    link: str | None = Field(
        None,
        description="Link day du t.me/... co the kem ?option= (base64)",
    )


class VotePollData(MessageActionData):
    option: str | None = None


class CancelPollVoteRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    peer_id: str = Field(
        ...,
        description="Dialog id, username hoac link t.me",
        examples=["123456789", "@username"],
    )
    message_id: int = Field(..., ge=1, description="ID tin nhan chua poll")
    link: str | None = Field(
        None,
        description="Link day du t.me/... de fetch poll",
    )
    options: list[str] | None = Field(
        None,
        description="Todo: bo chon muc cu the (todo_item_id). Bo trong = huy toan bo vote",
    )


class CancelPollVoteData(MessageActionData):
    option: str | None = None


class AddPollOptionRequest(BaseModel):
    phone: str = Field(..., examples=["+84901234567"])
    peer_id: str = Field(
        ...,
        description="Dialog id, username hoac link t.me",
        examples=["123456789", "@username"],
    )
    message_id: int = Field(..., ge=1, description="ID tin nhan chua poll")
    label: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Noi dung dap an moi can them",
    )
    link: str | None = Field(
        None,
        description="Link day du t.me/... de fetch poll",
    )
    vote_after: bool = Field(
        False,
        description="Tu dong vote dap an vua them",
    )


class AddPollOptionData(MessageActionData):
    label: str | None = None
    option_hex: str | None = None
    todo_item_id: int | None = None
    voted: bool = False


class PollOptionItem(BaseModel):
    index: int = Field(..., ge=1, description="So thu tu lua chon (1-based)")
    label: str = Field(..., min_length=1, max_length=256)
    option_hex: str = Field(
        "",
        description="ID on dinh cua dap an poll (bytes hex), dung de vote",
    )
    todo_item_id: int | None = Field(
        None,
        description="ID muc todo neu la MessageMediaToDo",
    )
    chosen: bool = Field(
        False,
        description="Acc hien tai da chon dap an nay",
    )
    voters: int | None = Field(
        None,
        description="So luot vote (neu Telegram cho xem thong ke)",
    )


class PollInfoData(BaseModel):
    status: Literal["success", "error"]
    phone: str
    peer_id: str
    message_id: int | None = None
    question: str = ""
    kind: Literal["poll", "todo"] = "poll"
    multiple_choice: bool = False
    open_answers: bool = False
    shuffle_answers: bool = False
    revoting_allowed: bool = True
    closed: bool = False
    quiz: bool = False
    public_voters: bool = False
    close_date: str | None = None
    options: list[PollOptionItem] = Field(default_factory=list)
    suggested_option_index: int | None = None
    user_voted: bool = Field(
        False,
        description="Acc hien tai da vote / tick it nhat mot dap an",
    )
    total_voters: int | None = Field(
        None,
        description="Tong so nguoi da vote (neu co)",
    )
    can_view_stats: bool = Field(
        False,
        description="Co the hien thi so vote tung dap an",
    )
    message: str
