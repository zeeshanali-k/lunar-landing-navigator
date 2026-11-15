"""FastAPI application factory and P0 router registration."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from src.api.errors import (
    application_error_handler,
    ephemeris_range_handler,
    internal_error_handler,
    naive_timestamp_handler,
    request_validation_handler,
)
from src.api.routes import evaluate, health, sites
from src.application.errors import ApplicationError
from src.domain.mission_time import EphemerisRangeExceededError, NaiveTimestampError

API_V1_PREFIX = "/api/v1"


def create_app() -> FastAPI:
    """Create and configure the FastAPI application with only the P0 routes."""
    application = FastAPI(
        title="Lunar Landing Site Navigator API",
        version="0.1.0",
        description="Clean-architecture lunar solar illumination, DTE comms, and terrain API.",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(health.router, prefix=API_V1_PREFIX)
    application.include_router(sites.router, prefix=API_V1_PREFIX)
    application.include_router(evaluate.router, prefix=API_V1_PREFIX)

    application.add_exception_handler(ApplicationError, application_error_handler)  # type: ignore[arg-type]
    application.add_exception_handler(NaiveTimestampError, naive_timestamp_handler)  # type: ignore[arg-type]
    application.add_exception_handler(EphemerisRangeExceededError, ephemeris_range_handler)  # type: ignore[arg-type]
    application.add_exception_handler(RequestValidationError, request_validation_handler)  # type: ignore[arg-type]
    application.add_exception_handler(Exception, internal_error_handler)
    return application


app = create_app()
