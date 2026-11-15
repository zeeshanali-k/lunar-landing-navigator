"""FastAPI exception handlers translating domain/application errors to REQ-10."""

from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.api.schemas.error_schemas import ErrorDetailSchema, ErrorEnvelopeSchema
from src.application.errors import ApplicationError
from src.domain.mission_time import EphemerisRangeExceededError, NaiveTimestampError


def _envelope(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return ErrorEnvelopeSchema(
        error=ErrorDetailSchema(code=code, message=message, details=details or {})
    ).model_dump()


async def application_error_handler(request: Request, exc: ApplicationError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_envelope(exc.code, exc.message, exc.details),
    )


async def naive_timestamp_handler(request: Request, exc: NaiveTimestampError) -> JSONResponse:
    return JSONResponse(status_code=422, content=_envelope("VALIDATION_ERROR", str(exc)))


async def ephemeris_range_handler(request: Request, exc: EphemerisRangeExceededError) -> JSONResponse:
    return JSONResponse(status_code=422, content=_envelope("EPHEMERIS_RANGE_EXCEEDED", str(exc)))


async def request_validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=_envelope("VALIDATION_ERROR", "Request validation failed.", {"errors": exc.errors()}),
    )


async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content=_envelope("INTERNAL_ERROR", "Unexpected internal error."))
