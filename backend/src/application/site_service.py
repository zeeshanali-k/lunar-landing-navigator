"""Curated-site summaries and terrain patches derived from the committed packs."""

from __future__ import annotations

from typing import Any

from src.application.errors import SiteNotFoundError, TerrainNotAvailableError
from src.application.pack_repository import load_terrain
from src.infrastructure.site_registry_loader import CuratedSite, load_curated_sites


def _registry_by_id() -> dict[str, CuratedSite]:
    return {site.id: site for site in load_curated_sites()}


def _require_site(site_id: str) -> CuratedSite:
    site = _registry_by_id().get(site_id)
    if site is None:
        raise SiteNotFoundError(f"unknown site_id: {site_id}")
    return site


def _external_links(lat_deg: float, lon_deg: float) -> dict[str, str]:
    return {
        "quickmap_url": f"https://quickmap.lroc.asu.edu/?lat={lat_deg:.4f}&lon={lon_deg:.4f}",
        "moon_trek_url": f"https://trek.nasa.gov/moon/#v=0.1&x={lon_deg:.4f}&y={lat_deg:.4f}",
    }


def _mean(values: list[float]) -> float:
    return sum(values) / len(values)


def list_sites() -> list[dict[str, Any]]:
    """Return every registry site as a Contract A summary."""
    payload: list[dict[str, Any]] = []
    for site in load_curated_sites():
        terrain = load_terrain(site.id)
        payload.append(
            {
                "id": site.id,
                "name": site.name,
                "category": site.category,
                "agency": site.agency,
                "lat_deg": site.lat_deg,
                "lon_deg": site.lon_deg,
                "elevation_m": terrain["center_elevation_m"] if terrain else None,
                "mean_slope_deg": _mean(terrain["slopes_deg"]) if terrain else None,
                "has_precomputed_terrain": terrain is not None,
                "summary": site.summary,
                "external_links": _external_links(site.lat_deg, site.lon_deg),
            }
        )
    return payload


def get_terrain_patch(site_id: str) -> dict[str, Any]:
    """Return a Contract C terrain patch, or raise 404/409 for Class B sites."""
    _require_site(site_id)
    terrain = load_terrain(site_id)
    if terrain is None:
        raise TerrainNotAvailableError(
            f"terrain is not available for {site_id}; it is a spherical-limb-only site"
        )

    elevations = terrain["elevations_m"]
    return {
        "site_id": site_id,
        "model": terrain["model"],
        "frame": terrain["frame"],
        "grid_size": terrain["grid_size"],
        "extent_m": terrain["extent_m"],
        "spacing_m": terrain["spacing_m"],
        "row_direction": terrain["row_direction"],
        "column_direction": terrain["column_direction"],
        "center_elevation_m": terrain["center_elevation_m"],
        "min_elevation_m": min(elevations),
        "max_elevation_m": max(elevations),
        "elevations_m_flat": elevations,
        "slopes_deg_flat": terrain["slopes_deg"],
        "horizons": terrain["horizons"],
        "psr_mask": terrain["psr_mask"],
    }
