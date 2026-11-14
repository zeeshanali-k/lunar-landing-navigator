"""Pydantic v2 schemas for Contract E (WindowsRequest and WindowsResponse)."""

from __future__ import annotations

from pydantic import BaseModel, Field

from src.api.schemas.evaluation_schemas import SolarArrayType


class WindowsRequestSchema(BaseModel):
    """Contract E 12-month optimal landing window scan request."""

    site_id: str
    year: int = Field(ge=1950, le=2100, default=2027)
    mission_duration_days: int = Field(ge=1, le=90, default=14)
    solar_array_type: SolarArrayType = "vertical_tracking"


class CandidateWindowSchema(BaseModel):
    """Single candidate landing window summary."""

    start_utc: str
    feasibility_score: float
    sunlit_fraction: float
    dte_fraction: float
    longest_dark_streak_hours: float


class TopWindowSchema(BaseModel):
    """Ranked top-performing landing window."""

    rank: int = Field(ge=1)
    start_utc: str
    feasibility_score: float
    sunlit_fraction: float
    dte_fraction: float


class WindowsResponseSchema(BaseModel):
    """Contract E 12-month window heatmap response."""

    site_id: str
    mission_duration_days: int
    solar_array_type: SolarArrayType
    windows: list[CandidateWindowSchema]
    top_windows: list[TopWindowSchema]
