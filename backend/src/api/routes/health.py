"""Health check and reference-constant endpoint.

`GET /health` reports liveness. It also carries the physical reference constants the
frontend needs for pure rendering geometry (for example the lunar radius used by the
map projection), so that no scientific constant is duplicated in the client. The
backend keeps ownership of every constant; see REQ-06.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from src.domain.constants import MOON_RADIUS_KM

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Service liveness plus the reference constants the client may use for layout."""

    status: str
    architecture: str
    frame: str
    moon_radius_km: float


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return service liveness, coordinate frame, and reference constants."""
    return HealthResponse(
        status="ok",
        architecture="clean-hexagonal",
        frame="local_enu",
        moon_radius_km=MOON_RADIUS_KM,
    )
