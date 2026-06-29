from fastapi import APIRouter

from ..schemas.common import ApiEnvelope
from ..schemas.messages import (
    ReplyMessageRequest,
    SendMessageData,
    SendMessageRequest,
)
from ..services.telegram.messages import telegram_message_service
from ..utils.responses import success_response


router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("/send", response_model=ApiEnvelope[SendMessageData])
async def send_message(payload: SendMessageRequest) -> dict:
    result = await telegram_message_service.send_message(
        payload.phone,
        payload.peer_id,
        payload.text,
    )
    data = SendMessageData(**result)
    return success_response(data.model_dump())


@router.post("/reply", response_model=ApiEnvelope[SendMessageData])
async def reply_message(payload: ReplyMessageRequest) -> dict:
    result = await telegram_message_service.reply_message(
        payload.phone,
        payload.peer_id,
        payload.text,
        payload.reply_to_msg_id,
    )
    data = SendMessageData(**result)
    return success_response(data.model_dump())