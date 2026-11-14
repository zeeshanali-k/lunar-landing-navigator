"""Pydantic v2 schemas for Contracts A (SiteSummary) and C (TerrainPatch)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ExternalLinksSchema(BaseModel):
    """External NASA mapping deep links centered on a lunar landing site."""

    quickmap_url: str
    moon_trek_url: str


class SiteSummarySchema(BaseModel):
    """Contract A response item describing a curated lunar landing site."""

    id: str
    name: str
    category: Literal["artemis_iii", "clps_commercial", "apollo_historic", "international"]
    agency: str
    lat_deg: float = Field(ge=-90.0, le=90.0)
    lon_deg: float = Field(ge=-180.0, le=180.0)
    elevation_m: float
    mean_slope_deg: float = Field(ge=0.0)
    has_precomputed_terrain: bool
    summary: str
    external_links: ExternalLinksSchema


class CustomTerrainRequestSchema(BaseModel):
    """Request payload for dynamic local_enu terrain generation at custom coordinates."""

    lat_deg: float = Field(ge=-90.0, le=90.0)
    lon_deg: float = Field(ge=-180.0, le=180.0)
    label: str | None = None


class TerrainPatchSchema(BaseModel):
    """Contract C local topocentric East-North-Up (ENU) terrain heightmap patch."""

    site_id: str
    frame: Literal["local_enu"]
    grid_size: int = Field(ge=2)
    patch_radius_km: float = Field(gt=0.0)
    center_elevation_m: float
    min_elevation_m: float
    max_elevation_m: float
    elevations_m_flat: list[float]
    slopes_deg_flat: list[float]
    psr_mask_flat: list[int]
