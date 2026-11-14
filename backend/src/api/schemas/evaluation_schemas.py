"""Pydantic v2 schemas for Contract B (EvaluateRequest and EvaluateResponse)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

SolarArrayType = Literal["horizontal_fixed", "vertical_fixed", "vertical_tracking"]


class CustomCoordsSchema(BaseModel):
    """Custom selenographic landing coordinates in degrees."""

    lat_deg: float = Field(ge=-90.0, le=90.0)
    lon_deg: float = Field(ge=-180.0, le=180.0)
    label: str | None = None


class EvaluateRequestSchema(BaseModel):
    """Contract B evaluation request payload."""

    site_id: str | None = None
    custom_coords: CustomCoordsSchema | None = None
    start_utc: str
    duration_days: float = Field(gt=0.0, le=366.0, default=14.0)
    step_minutes: int = Field(ge=5, le=1440, default=60)
    solar_array_type: SolarArrayType = "vertical_tracking"
    observer_height_m: float = Field(ge=0.1, le=100.0, default=2.0)
    min_comms_elev_deg: float = Field(ge=-5.0, le=45.0, default=5.0)


class EvaluatedSiteSchema(BaseModel):
    """Site metadata block inside Contract B EvaluateResponse."""

    id: str
    name: str
    lat_deg: float
    lon_deg: float
    elevation_m: float
    mean_slope_deg: float


class SubScoresSchema(BaseModel):
    """Breakdown sub-scores (0-100) for feasibility evaluation."""

    power_score: float
    thermal_score: float
    comms_score: float
    terrain_score: float


class NextEventsSchema(BaseModel):
    """Hours from mission start until next solar/DTE transition."""

    hours_to_sunset: float | None = None
    hours_to_sunrise: float | None = None
    hours_to_earthset: float | None = None
    hours_to_earthrise: float | None = None


class EvaluationSummarySchema(BaseModel):
    """Aggregate mission summary metrics and risk warnings."""

    feasibility_score: float
    sub_scores: SubScoresSchema
    sunlit_hours: float
    sunlit_fraction: float
    longest_dark_streak_hours: float
    dte_comms_hours: float
    dte_fraction: float
    overlap_sun_and_dte_hours: float
    mean_solar_power_factor: float
    mean_irradiance_w_m2: float
    risk_warnings: list[str]
    next_events_from_start: NextEventsSchema


class HorizonPointSchema(BaseModel):
    """Single azimuth sample of the 360-degree lunar horizon mask."""

    azimuth_deg: float
    terrain_elev_deg: float
    geometric_limb_deg: float


class TimeseriesPointSchema(BaseModel):
    """Single UTC timestep sample of Sun, Earth, power, and countdown state."""

    timestamp_utc: str
    sun_az_deg: float
    sun_elev_deg: float
    sun_horizon_elev_deg: float
    sun_visible_fraction: float
    is_sunlit: bool
    solar_power_factor: float
    earth_az_deg: float
    earth_elev_deg: float
    earth_horizon_elev_deg: float
    earth_clearance_deg: float
    is_dte_visible: bool
    sun_earth_sep_deg: float
    hours_to_next_sunset: float | None = None
    hours_to_next_sunrise: float | None = None
    hours_to_next_earthset: float | None = None
    hours_to_next_earthrise: float | None = None


class EvaluateResponseSchema(BaseModel):
    """Contract B full evaluation response."""

    site: EvaluatedSiteSchema
    summary: EvaluationSummarySchema
    horizon_profile: list[HorizonPointSchema]
    timeseries: list[TimeseriesPointSchema]
