from typing import Any, Generic, TypeVar

from pydantic import BaseModel


T = TypeVar("T")


class ApiEnvelope(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    error: str | None = None


def success_response(data: Any = None) -> dict[str, Any]:
    return {"success": True, "data": data, "error": None}


def error_response(message: str, data: Any = None) -> dict[str, Any]:
    return {"success": False, "data": data, "error": message}