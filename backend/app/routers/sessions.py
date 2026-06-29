from fastapi import APIRouter

from ..schemas.common import ApiEnvelope
from ..schemas.sessions import (
    CheckSessionsData,
    CheckSessionsRequest,
    SessionMeData,
    SessionsData,
)
from ..services.telegram.sessions import telegram_session_service
from ..utils.responses import success_response


router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=ApiEnvelope[SessionsData])
async def list_sessions() -> dict:
    result = telegram_session_service.list_sessions()
    data = SessionsData(**result)
    return success_response(data.model_dump())


@router.get("/{phone}/me", response_model=ApiEnvelope[SessionMeData])
async def get_session_me(phone: str) -> dict:
    result = await telegram_session_service.get_me(phone)
    data = SessionMeData(**result)
    return success_response(data.model_dump())


@router.post("/check", response_model=ApiEnvelope[CheckSessionsData])
async def check_sessions(payload: CheckSessionsRequest | None = None) -> dict:
    phones = payload.phones if payload else None
    result = await telegram_session_service.check_sessions(phones)
    data = CheckSessionsData(**result)
    return success_response(data.model_dump())