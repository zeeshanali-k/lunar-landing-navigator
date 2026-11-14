"""FastAPI application factory and router registration for Lunar Landing Site Navigator."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import compare, evaluate, health, sites, windows

API_V1_PREFIX = "/api/v1"


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
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
    application.include_router(compare.router, prefix=API_V1_PREFIX)
    application.include_router(windows.router, prefix=API_V1_PREFIX)
    return application


app = create_app()
