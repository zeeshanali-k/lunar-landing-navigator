"""Build TerrainPacks and 360-degree horizons for LOLA-covered sites (DATA-005).

Only the nine ``artemis_iii`` sites receive a pack; the seven Class B sites are
``spherical_limb_only`` and must not have a terrain pack (REQ-05, REQ-08).
Every pack is derived from the DEM whose bytes and label match the DATA-002
manifest; ``psr_mask`` is always null because PSR is out of scope in P0.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

from src.cli.download_lola import load_source_config
from src.infrastructure.dem_tiler import (
    GRID_SIZE,
    SPACING_M,
    SouthPolarGrid,
    TilingError,
    bilinear,
    coverage_mask,
    latlon_to_pixel,
    sample_patch,
    slope_deg,
)
from src.infrastructure.pds_dem import (
    DemVerificationError,
    PdsLabel,
    PdsLabelError,
    parse_label,
    read_elevations,
    sha256_file,
)
from src.infrastructure.raycaster import (
    AZIMUTH_COUNT,
    MAX_RANGE_M,
    RaycastError,
    horizon_profile,
    radial_samples,
)
from src.infrastructure.site_registry_loader import load_curated_sites

REPO_ROOT = Path(__file__).resolve().parents[3]
DOWNLOADS_DIR = REPO_ROOT / "data" / "downloads" / "lola"
MANIFEST_PATH = REPO_ROOT / "data" / "manifests" / "lola" / "manifest.json"
PACK_DIR = REPO_ROOT / "backend" / "data" / "site_packs"
CLASS_A_CATEGORY = "artemis_iii"
CLASS_A_COUNT = 9
OBSERVER_HEIGHTS_M = (1.5, 2.0, 10.0)
PACK_FIELDS = (
    "schema_version",
    "site_id",
    "model",
    "source_manifest_sha256",
    "frame",
    "grid_size",
    "extent_m",
    "spacing_m",
    "row_direction",
    "column_direction",
    "center_elevation_m",
    "elevations_m",
    "slopes_deg",
    "horizons",
    "psr_mask",
)


class TerrainBuildError(RuntimeError):
    """Raised when the DEM or a built pack violates the TerrainPack contract."""


def class_a_sites():
    """Return the nine LOLA-covered sites in registry order."""
    sites = [site for site in load_curated_sites() if site.category == CLASS_A_CATEGORY]
    if len(sites) != CLASS_A_COUNT:
        raise TerrainBuildError(
            f"registry has {len(sites)} Class A sites, expected {CLASS_A_COUNT}"
        )
    for site in sites:
        if site.lat_deg > -80.0:
            raise TerrainBuildError(f"{site.id} is outside the 80S-90S DEM coverage")
    return sites


def load_dem() -> tuple[np.ndarray, PdsLabel, SouthPolarGrid, str]:
    """Verify and read the DEM, returning elevations, label, grid, and manifest hash."""
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    config = load_source_config()
    label_path = DOWNLOADS_DIR / str(config["label"])
    image_path = DOWNLOADS_DIR / str(config["image"])
    label_sha256 = sha256_file(label_path)
    if label_sha256 != manifest["artefacts"]["label"]["sha256"]:
        raise TerrainBuildError(f"{label_path.name} SHA-256 does not match the manifest")
    label = parse_label(label_path)
    elevations = read_elevations(
        image_path, label, expected_sha256=manifest["artefacts"]["image"]["sha256"]
    )
    return elevations, label, SouthPolarGrid.from_label(label), sha256_file(MANIFEST_PATH)


def make_sampler(elevations_m: np.ndarray, grid: SouthPolarGrid):
    """Return a sampler that marks every out-of-DEM point invalid."""

    def sample_surface(lat_deg: np.ndarray, lon_deg: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        valid, (line, sample) = coverage_mask(grid, lat_deg, lon_deg)
        heights = np.full(lat_deg.shape, np.nan, dtype=float)
        if np.any(valid):
            heights[valid] = bilinear(elevations_m, line[valid], sample[valid])
        return heights, valid

    return sample_surface


def build_horizons(
    sampler,
    *,
    lat_deg: float,
    lon_deg: float,
    center_elev_m: float,
) -> list[dict[str, Any]]:
    """Return the three observer-height horizon profiles."""
    distances = radial_samples()
    if distances[-1] > MAX_RANGE_M:
        raise TerrainBuildError("radial sample grid exceeds the 120 km ceiling")
    horizons = []
    for height_m in OBSERVER_HEIGHTS_M:
        profile = horizon_profile(
            sampler,
            lat_deg=lat_deg,
            lon_deg=lon_deg,
            ground_elev_m=center_elev_m,
            observer_height_m=height_m,
            distances_m=distances,
        )
        horizons.append(
            {
                "observer_height_m": height_m,
                "azimuth_deg": [float(value) for value in profile["azimuth_deg"]],
                "terrain_elev_deg": [float(value) for value in profile["terrain_elev_deg"]],
                "geometric_limb_deg": [float(value) for value in profile["geometric_limb_deg"]],
            }
        )
    return horizons


def build_site_pack(
    site,
    elevations_m: np.ndarray,
    grid: SouthPolarGrid,
    manifest_sha256: str,
) -> dict[str, Any]:
    """Build and validate one site's TerrainPack."""
    patch = sample_patch(elevations_m, grid, site.lat_deg, site.lon_deg)
    line, sample = latlon_to_pixel(grid, site.lat_deg, site.lon_deg)
    center_elev_m = float(bilinear(elevations_m, line, sample))
    pack = {
        "schema_version": 1,
        "site_id": site.id,
        "model": "lola_80s_80m",
        "source_manifest_sha256": manifest_sha256,
        "frame": "local_enu",
        "grid_size": GRID_SIZE,
        "extent_m": 40000.0,
        "spacing_m": SPACING_M,
        "row_direction": "south_to_north",
        "column_direction": "west_to_east",
        "center_elevation_m": center_elev_m,
        "elevations_m": [float(value) for value in patch.ravel()],
        "slopes_deg": [float(value) for value in slope_deg(patch).ravel()],
        "horizons": build_horizons(
            make_sampler(elevations_m, grid),
            lat_deg=site.lat_deg,
            lon_deg=site.lon_deg,
            center_elev_m=center_elev_m,
        ),
        "psr_mask": None,
    }
    validate_pack(pack)
    return pack


def validate_pack(pack: dict[str, Any]) -> None:
    """Raise TerrainBuildError if a REQ-06 TerrainPack invariant is violated."""
    if set(pack) != set(PACK_FIELDS):
        raise TerrainBuildError("pack keys differ from the REQ-06 TerrainPack schema")
    if pack["grid_size"] != GRID_SIZE or pack["extent_m"] != 40000.0:
        raise TerrainBuildError("grid_size or extent_m differs from REQ-08")
    if abs(pack["spacing_m"] - SPACING_M) > 1e-12:
        raise TerrainBuildError("spacing_m differs from 40000/127")
    if pack["row_direction"] != "south_to_north" or pack["column_direction"] != "west_to_east":
        raise TerrainBuildError("row or column direction differs from REQ-08")
    if pack["psr_mask"] is not None:
        raise TerrainBuildError("psr_mask must be null in P0")
    for key in ("elevations_m", "slopes_deg"):
        values = np.asarray(pack[key], dtype=float)
        if values.size != GRID_SIZE**2 or not np.all(np.isfinite(values)):
            raise TerrainBuildError(f"{key} must hold {GRID_SIZE**2} finite values")
    if len(pack["horizons"]) != len(OBSERVER_HEIGHTS_M):
        raise TerrainBuildError("a pack needs exactly three horizon profiles")
    for horizon, height_m in zip(pack["horizons"], OBSERVER_HEIGHTS_M, strict=True):
        if horizon["observer_height_m"] != height_m:
            raise TerrainBuildError("horizon observer heights differ from REQ-08")
        for key in ("azimuth_deg", "terrain_elev_deg", "geometric_limb_deg"):
            values = np.asarray(horizon[key], dtype=float)
            if values.size != AZIMUTH_COUNT or not np.all(np.isfinite(values)):
                raise TerrainBuildError(f"{key} must hold {AZIMUTH_COUNT} finite values")
        if list(horizon["azimuth_deg"]) != [float(value) for value in range(AZIMUTH_COUNT)]:
            raise TerrainBuildError("azimuth_deg must be exactly 0..359")


def write_pack(pack: dict[str, Any]) -> str:
    """Write a validated pack deterministically and return its SHA-256."""
    payload = json.dumps(pack, separators=(",", ":"), allow_nan=False) + "\n"
    path = PACK_DIR / pack["site_id"] / "terrain.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload, encoding="utf-8")
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def main() -> int:
    """Build every Class A terrain pack and reject any limb-only pack."""
    sites = class_a_sites()
    elevations, label, grid, manifest_sha256 = load_dem()
    if (grid.lines, grid.samples) != (label.lines, label.line_samples):
        raise TerrainBuildError("grid shape does not match the label")
    for site in sites:
        pack = build_site_pack(site, elevations, grid, manifest_sha256)
        digest = write_pack(pack)
        print(
            f"{site.id}: center_elevation_m={pack['center_elevation_m']:.2f} "
            f"-> backend/data/site_packs/{site.id}/terrain.json sha256={digest}"
        )
    existing = {path.parent.name for path in PACK_DIR.glob("*/terrain.json")}
    stray = existing - {site.id for site in sites}
    if stray:
        raise TerrainBuildError(f"terrain packs exist for non-Class-A sites: {sorted(stray)}")
    print(f"built {len(sites)} terrain packs; no Class B terrain pack exists")
    return 0


def run() -> int:
    """Run main with a closed failure contract."""
    try:
        return main()
    except (
        TerrainBuildError,
        TilingError,
        RaycastError,
        DemVerificationError,
        PdsLabelError,
        OSError,
    ) as exc:
        print(f"FAIL  DATA-005: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(run())
