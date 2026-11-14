"""Health check endpoint for API liveness verification."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def get_health() -> dict[str, str]:
    """Return service liveness, architecture style, and coordinate frame standard."""
    return {
        "status": "ok",
        "architecture": "clean-hexagonal",
        "frame": "local_enu",
    }
