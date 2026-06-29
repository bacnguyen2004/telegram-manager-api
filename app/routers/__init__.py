from fastapi import APIRouter

from . import auth, groups, sessions


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(sessions.router)
api_router.include_router(groups.router)