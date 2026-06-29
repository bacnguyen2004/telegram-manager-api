from typing import Any, Generic, TypeVar

from pydantic import BaseModel


T = TypeVar("T")


class ApiEnvelope(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    error: str | None = None


class HealthCheckData(BaseModel):
    status: str
    telegram_configured: bool
    database: dict[str, Any]
    redis: dict[str, Any]
    session_dirs: dict[str, Any]