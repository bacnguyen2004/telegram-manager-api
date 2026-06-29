from fastapi import APIRouter

from ..config import settings
from ..schemas.common import ApiEnvelope, HealthCheckData
from ..services.health import check_session_dir
from ..utils.responses import success_response


router = APIRouter(tags=["health"])


@router.get("/health", response_model=ApiEnvelope[HealthCheckData])
async def health() -> dict:
    session_dir = await check_session_dir()
    telegram_configured = bool(settings.telegram_api_id and settings.telegram_api_hash)
    status = "ok" if session_dir["exists"] and telegram_configured else "degraded"

    data = HealthCheckData(
        status=status,
        telegram_configured=telegram_configured,
        session_dir=session_dir,
    )
    return success_response(data.model_dump())