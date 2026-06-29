from fastapi import APIRouter

from ..schemas.common import ApiEnvelope
from ..schemas.groups import JoinGroupData, JoinGroupRequest
from ..services.telegram import telegram_join_service
from ..utils.responses import success_response


router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("/join", response_model=ApiEnvelope[JoinGroupData])
async def join_group(payload: JoinGroupRequest) -> dict:
    result = await telegram_join_service.join_group(payload.phone, payload.group_link)
    data = JoinGroupData(**result)
    return success_response(data.model_dump())