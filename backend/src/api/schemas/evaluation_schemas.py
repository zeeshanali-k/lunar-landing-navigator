"""Pydantic v2 schemas for Contract B (EvaluateRequest and EvaluateResponse).

These models are the single source of truth for the wire contract (REQ-06).
Request models set ``extra="forbid"`` so a misspelled field fails validation
instead of silently taking a default, and every value is restricted to the
REQ-06 allowlists.
"""

from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from src.api.schemas.enums import (
    DurationDays,
    ObserverHeightM,
    SiteCategory,
    SolarArrayType,
    StepMinutes,
)


class CustomCoordsSchema(BaseModel):
    """Custom selenographic coordinates (P1 only; never accepted by a P0 request)."""

    model_config = ConfigDict(extra="forbid")

    lat_deg: Annotated[float, Field(ge=-90.0, le=90.0)]
    lon_deg: Annotated[float, Field(ge=-180.0, le=180.0)]
    label: str | None = None


class EvaluateRequestSchema(BaseModel):
    """Contract B evaluation request payload (P0: curated sites only)."""

    model_config = ConfigDict(extra="forbid")

    site_id: str
    start_utc: str
    duration_days: DurationDays = DurationDays.D14
    step_minutes: StepMinutes = StepMinutes.M60
    solar_array_type: SolarArrayType = SolarArrayType.VERTICAL_TRACKING
    fixed_array_azimuth_deg: Annotated[float, Field(ge=0.0, lt=360.0)] = 0.0
    observer_height_m: ObserverHeightM = ObserverHeightM.H2_0
    min_comms_elev_deg: Annotated[float, Field(ge=-5.0, le=45.0)] = 5.0


class EvaluatedSiteSchema(BaseModel):
    """Site metadata block inside Contract B EvaluateResponse."""

    id: str
    name: str
    category: SiteCategory
    lat_deg: float
    lon_deg: float
    elevation_m: float | None = None
    mean_slope_deg: float | None = None
    has_precomputed_terrain: bool


class SubScoresSchema(BaseModel):
    """Breakdown sub-scores (0-100) for feasibility evaluation."""

    power_score: float
    thermal_score: float
    comms_score: float
    terrain_score: float | None = None


class NextEventsSchema(BaseModel):
    """Hours from mission start until next solar/DTE transition."""

    hours_to_sunset: float | None = None
    hours_to_sunrise: float | None = None
    hours_to_earthset: float | None = None
    hours_to_earthrise: float | None = None


class EvaluationSummarySchema(BaseModel):
    """Aggregate mission summary metrics and risk warnings (REQ-09)."""

    feasibility_score: float | None = None
    sub_scores: SubScoresSchema
    sunlit_hours: float
    sunlit_fraction: float
    longest_dark_streak_hours: float
    dte_comms_hours: float
    dte_fraction: float
    overlap_sun_and_dte_hours: float
    overlap_fraction: float
    longest_comms_blackout_hours: float
    mean_solar_power_factor: float
    mean_irradiance_w_m2: float
    risk_warnings: list[str]
    next_events_from_start: NextEventsSchema


class HorizonProfilePointSchema(BaseModel):
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
    is_dte_geometric: bool
    is_solar_conjunction: bool
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
    horizon_profile: list[HorizonProfilePointSchema]
    timeseries: list[TimeseriesPointSchema]
