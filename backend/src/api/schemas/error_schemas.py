"""REQ-10 error envelope (returned by exception handlers, not a route model)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ErrorDetailSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorEnvelopeSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: ErrorDetailSchema
