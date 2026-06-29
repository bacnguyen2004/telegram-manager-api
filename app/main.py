from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import settings
from .db.session import init_db
from .routers import api_router
from .utils.exceptions import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.ensure_runtime_dirs()
    await init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
register_exception_handlers(app)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/")
async def root() -> dict:
    return {
        "app": settings.app_name,
        "docs": "/docs",
        "api_prefix": settings.api_prefix,
    }