"""Pydantic v2 schemas for Contract A (SiteSummary) and Contract C (TerrainPatch).

These models are the single source of truth for the wire contract (REQ-06) and
are generated from, never hand-written alongside, any other artefact.

Terrain availability is modelled explicitly (REQ-05): a LOLA-covered site carries
measured elevation and slope, while a ``spherical_limb_only`` site carries
``None`` for both and answers a terrain request with 409 ``TERRAIN_NOT_AVAILABLE``.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from src.api.schemas.enums import ObserverHeightM, SiteCategory

GRID_SIZE = 128
EXTENT_M = 40000.0
SPACING_M = EXTENT_M / (GRID_SIZE - 1)


class ExternalLinksSchema(BaseModel):
    """External NASA mapping deep links centered on a lunar landing site."""

    quickmap_url: str
    moon_trek_url: str


class SiteSummarySchema(BaseModel):
    """Contract A response item describing a curated lunar landing site (REQ-05)."""

    id: str
    name: str
    category: SiteCategory
    agency: str
    lat_deg: float = Field(ge=-90.0, le=90.0)
    lon_deg: float = Field(ge=-180.0, le=180.0)
    elevation_m: float | None = None
    mean_slope_deg: float | None = None
    has_precomputed_terrain: bool
    summary: str
    external_links: ExternalLinksSchema


class CustomTerrainRequestSchema(BaseModel):
    """Request payload for custom-coordinate terrain (P1 only; not routed in P0)."""

    model_config = ConfigDict(extra="forbid")

    lat_deg: float = Field(ge=-90.0, le=90.0)
    lon_deg: float = Field(ge=-180.0, le=180.0)
    label: str | None = None


class HorizonProfileSchema(BaseModel):
    """Precomputed 360-degree horizon for one observer height (REQ-08)."""

    observer_height_m: ObserverHeightM
    azimuth_deg: list[float] = Field(min_length=360, max_length=360)
    terrain_elev_deg: list[float] = Field(min_length=360, max_length=360)
    geometric_limb_deg: list[float] = Field(min_length=360, max_length=360)


class TerrainPatchSchema(BaseModel):
    """Contract C ``local_enu`` terrain patch for a LOLA-covered site (REQ-08).

    ``elevations_m_flat`` and ``slopes_deg_flat`` hold ``grid_size**2`` values,
    flattened as ``index = row * grid_size + column`` with rows running
    south-to-north and columns west-to-east.
    """

    model_config = ConfigDict(extra="forbid")

    site_id: str
    model: Literal["lola_80s_80m"] = "lola_80s_80m"
    frame: Literal["local_enu"] = "local_enu"
    grid_size: Literal[128] = 128
    extent_m: float = EXTENT_M
    spacing_m: float = SPACING_M
    row_direction: Literal["south_to_north"] = "south_to_north"
    column_direction: Literal["west_to_east"] = "west_to_east"
    center_elevation_m: float
    min_elevation_m: float
    max_elevation_m: float
    elevations_m_flat: list[float] = Field(min_length=GRID_SIZE**2, max_length=GRID_SIZE**2)
    slopes_deg_flat: list[float] = Field(min_length=GRID_SIZE**2, max_length=GRID_SIZE**2)
    horizons: list[HorizonProfileSchema] = Field(min_length=3, max_length=3)
    psr_mask: None = None
