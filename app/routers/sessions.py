from fastapi import APIRouter

from ..config import settings
from ..schemas.common import ApiEnvelope
from ..schemas.sessions import SessionsData
from ..utils.responses import success_response


router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=ApiEnvelope[SessionsData])
async def list_sessions() -> dict:
    session_dir = settings.session_dir
    sessions: list[str] = []
    if session_dir.exists():
        sessions = sorted(path.stem for path in session_dir.glob("*.session"))

    data = SessionsData(
        session_dir=str(session_dir),
        inactive_session_dir=str(settings.inactive_session_dir),
        count=len(sessions),
        sessions=sessions,
    )
    return success_response(data.model_dump())