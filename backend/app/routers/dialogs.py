from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from ..schemas.common import ApiEnvelope
from ..schemas.dialogs import (
    DialogMessagesData,
    DialogsData,
    MarkDialogReadData,
    MarkDialogReadRequest,
)
from ..services.telegram.dialogs import telegram_dialog_service
from ..utils.responses import success_response


router = APIRouter(prefix="/dialogs", tags=["dialogs"])


@router.get("/{phone}/messages/{message_id}/photo")
async def get_message_photo(
    phone: str,
    message_id: int,
    peer_id: str = Query(..., description="Dialog id hoac username"),
) -> Response:
    result = await telegram_dialog_service.get_message_photo(
        phone,
        peer_id,
        message_id,
    )
    if isinstance(result, dict):
        raise HTTPException(status_code=404, detail=result.get("message", "Not found"))
    content, mime_type = result
    return Response(content=content, media_type=mime_type)


@router.get("/{phone}/messages", response_model=ApiEnvelope[DialogMessagesData])
async def get_dialog_messages(
    phone: str,
    peer_id: str = Query(..., description="Dialog id hoac username"),
    limit: int = Query(default=40, ge=1, le=100),
    offset_id: int = Query(
        default=0,
        ge=0,
        description="Lay tin cu hon message id nay (0 = moi nhat)",
    ),
) -> dict:
    result = await telegram_dialog_service.get_messages(
        phone,
        peer_id,
        limit,
        offset_id,
    )
    data = DialogMessagesData(**result)
    return success_response(data.model_dump())


@router.get("/{phone}", response_model=ApiEnvelope[DialogsData])
async def list_dialogs(
    phone: str,
    limit: int = Query(default=200, ge=1, le=500),
) -> dict:
    result = await telegram_dialog_service.list_dialogs(phone, limit)
    data = DialogsData(**result)
    return success_response(data.model_dump())


@router.post("/{phone}/read", response_model=ApiEnvelope[MarkDialogReadData])
async def mark_dialog_read(phone: str, payload: MarkDialogReadRequest) -> dict:
    result = await telegram_dialog_service.mark_dialog_read(
        phone,
        payload.peer_id,
        payload.max_id,
    )
    data = MarkDialogReadData(**result)
    return success_response(data.model_dump())