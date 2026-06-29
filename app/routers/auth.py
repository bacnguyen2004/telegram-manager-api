from fastapi import APIRouter

from ..schemas.auth import LoginData, LoginRequest, SendCodeData, SendCodeRequest
from ..schemas.common import ApiEnvelope
from ..services.telegram.auth import telegram_auth_service
from ..utils.responses import success_response


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/send-code", response_model=ApiEnvelope[SendCodeData])
async def send_code(payload: SendCodeRequest) -> dict:
    result = await telegram_auth_service.send_code(payload.phone)
    data = SendCodeData(**result)
    return success_response(data.model_dump())


@router.post("/login", response_model=ApiEnvelope[LoginData])
async def login(payload: LoginRequest) -> dict:
    result = await telegram_auth_service.login(
        payload.phone, payload.code, payload.password
    )
    data = LoginData(**result)
    return success_response(data.model_dump())