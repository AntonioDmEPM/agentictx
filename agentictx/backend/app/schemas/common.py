from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ResponseEnvelope(BaseModel, Generic[T]):
    data: T | None = None
    error: str | None = None
    meta: dict[str, Any] | None = None
