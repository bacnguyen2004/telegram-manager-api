from fastapi import APIRouter

from . import groups, health, sessions


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(sessions.router)
api_router.include_router(groups.router)