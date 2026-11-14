"""Site registry and local_enu terrain patch endpoints (Contracts A and C)."""

from __future__ import annotations

from copy import deepcopy

from fastapi import APIRouter, HTTPException

from src.api.dependencies import load_contract_fixture
from src.api.schemas.site_schemas import (
    CustomTerrainRequestSchema,
    SiteSummarySchema,
    TerrainPatchSchema,
)
from src.domain.constants import validate_selenographic_coords

router = APIRouter(tags=["sites"])


@router.get("/sites", response_model=list[SiteSummarySchema])
def list_sites() -> list[SiteSummarySchema]:
    """Return curated lunar landing sites matching Contract A."""
    raw_sites = load_contract_fixture("sites.sample.json")
    return [SiteSummarySchema.model_validate(item) for item in raw_sites]


@router.get("/sites/{site_id}/terrain", response_model=TerrainPatchSchema)
def get_site_terrain(site_id: str) -> TerrainPatchSchema:
    """Return local_enu terrain patch for a curated landing site (Contract C)."""
    raw_sites = load_contract_fixture("sites.sample.json")
    known_ids = {item["id"] for item in raw_sites}
    if site_id not in known_ids:
        raise HTTPException(status_code=404, detail=f"Unknown site_id: {site_id}")

    patch = deepcopy(load_contract_fixture("terrain.sample.json"))
    patch["site_id"] = site_id
    return TerrainPatchSchema.model_validate(patch)


@router.post("/terrain/custom", response_model=TerrainPatchSchema)
def create_custom_terrain(payload: CustomTerrainRequestSchema) -> TerrainPatchSchema:
    """Return local_enu terrain patch for custom selenographic coordinates (Contract C)."""
    lat_clamped, lon_deg = validate_selenographic_coords(payload.lat_deg, payload.lon_deg)
    patch = deepcopy(load_contract_fixture("terrain.sample.json"))
    patch["site_id"] = f"custom-{lat_clamped:.4f}_{lon_deg:.4f}"
    return TerrainPatchSchema.model_validate(patch)
