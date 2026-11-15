"""Read and validate committed site packs and the pack index (REQ-06)."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from src.application.errors import SitePackInvalidError, SitePackUnavailableError
from src.infrastructure.ephemeris_pack import EphemerisPackError, load_ephemeris_pack

REPO_ROOT = Path(__file__).resolve().parents[3]
PACK_DIR = REPO_ROOT / "backend" / "data" / "site_packs"
INDEX_PATH = REPO_ROOT / "data" / "manifests" / "site_packs" / "index.json"
GRID_SIZE = 128
OBSERVER_HEIGHTS = (1.5, 2.0, 10.0)


def load_pack_index() -> dict[str, Any]:
    """Return the committed pack index."""
    if not INDEX_PATH.is_file():
        raise SitePackUnavailableError(f"pack index missing: {INDEX_PATH}")
    try:
        index = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SitePackInvalidError("pack index is not valid JSON") from exc
    if not isinstance(index, dict):
        raise SitePackInvalidError("pack index is not a JSON object")
    return index


def load_ephemeris(site_id: str) -> dict[str, Any]:
    """Load and validate one ephemeris pack, mapping pack errors to 503 codes."""
    path = PACK_DIR / site_id / "ephemeris.json"
    if not path.is_file():
        raise SitePackUnavailableError(f"ephemeris pack missing for {site_id}")
    try:
        return load_ephemeris_pack(path)
    except (EphemerisPackError, json.JSONDecodeError, OSError) as exc:
        raise SitePackInvalidError(f"ephemeris pack invalid for {site_id}: {exc}") from exc


def _validate_terrain_pack(pack: dict[str, Any], site_id: str) -> None:
    """Validate the REQ-06 TerrainPack invariants that the API relies on."""
    if pack.get("schema_version") != 1:
        raise SitePackInvalidError(f"terrain pack schema_version is not 1 for {site_id}")
    if pack.get("grid_size") != GRID_SIZE:
        raise SitePackInvalidError(f"terrain pack grid_size is not {GRID_SIZE} for {site_id}")
    for key in ("elevations_m", "slopes_deg"):
        values = pack.get(key)
        if not isinstance(values, list) or len(values) != GRID_SIZE * GRID_SIZE:
            raise SitePackInvalidError(f"terrain pack {key} is not {GRID_SIZE * GRID_SIZE} long")
        if not all(isinstance(value, (int, float)) and math.isfinite(value) for value in values):
            raise SitePackInvalidError(f"terrain pack {key} contains a non-finite value")
    horizons = pack.get("horizons")
    if not isinstance(horizons, list) or len(horizons) != 3:
        raise SitePackInvalidError(f"terrain pack must have 3 horizons for {site_id}")
    for horizon in horizons:
        if horizon.get("observer_height_m") not in OBSERVER_HEIGHTS:
            raise SitePackInvalidError("terrain pack has an unknown observer height")
        for key in ("azimuth_deg", "terrain_elev_deg", "geometric_limb_deg"):
            values = horizon.get(key)
            if not isinstance(values, list) or len(values) != 360:
                raise SitePackInvalidError(f"terrain pack horizon {key} is not 360 long")
    if pack.get("psr_mask") is not None:
        raise SitePackInvalidError("terrain pack psr_mask must be null in P0")


def load_terrain(site_id: str) -> dict[str, Any] | None:
    """Load a terrain pack if present, or return ``None`` for a limb-only site."""
    path = PACK_DIR / site_id / "terrain.json"
    if not path.is_file():
        return None
    try:
        pack = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SitePackInvalidError(f"terrain pack invalid for {site_id}: {exc}") from exc
    if not isinstance(pack, dict):
        raise SitePackInvalidError(f"terrain pack is not a JSON object for {site_id}")
    _validate_terrain_pack(pack, site_id)
    return pack
