from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db.session import get_db
from ..schemas.common import ApiEnvelope, HealthCheckData
from ..services.health import check_database, check_redis, check_session_dirs
from ..utils.responses import success_response


router = APIRouter(tags=["health"])


@router.get("/health", response_model=ApiEnvelope[HealthCheckData])
async def health(db: AsyncSession = Depends(get_db)) -> dict:
    database = await check_database(db)
    redis = await check_redis()
    session_dirs = await check_session_dirs()

    checks_ok = database["ok"] and redis["ok"] and session_dirs["active"]["exists"]
    status = "ok" if checks_ok else "degraded"

    data = HealthCheckData(
        status=status,
        telegram_configured=bool(settings.telegram_api_id and settings.telegram_api_hash),
        database=database,
        redis=redis,
        session_dirs=session_dirs,
    )
    return success_response(data.model_dump())