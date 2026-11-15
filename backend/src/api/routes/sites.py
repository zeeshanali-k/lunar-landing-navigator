"""Curated site registry and local_enu terrain patch endpoints (Contracts A and C)."""

from __future__ import annotations

from fastapi import APIRouter

from src.api.schemas.site_schemas import SiteSummarySchema, TerrainPatchSchema
from src.application.site_service import get_terrain_patch, list_sites

router = APIRouter(tags=["sites"])


@router.get("/sites", response_model=list[SiteSummarySchema])
def list_sites_endpoint() -> list[SiteSummarySchema]:
    """Return the 16 curated sites in registry order."""
    return [SiteSummarySchema.model_validate(item) for item in list_sites()]


@router.get("/sites/{site_id}/terrain", response_model=TerrainPatchSchema)
def get_site_terrain(site_id: str) -> TerrainPatchSchema:
    """Return a LOLA terrain patch, or 404/409 for unknown or limb-only sites."""
    return TerrainPatchSchema.model_validate(get_terrain_patch(site_id))
