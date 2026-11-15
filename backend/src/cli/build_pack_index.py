"""Publish the site-pack index and the generated offline fixture tree (DATA-006).

Input:  ``backend/data/site_packs`` (16 ephemeris packs, 9 terrain packs).
Output: ``data/manifests/site_packs/index.json`` and the generated fixtures under
        ``contracts/fixtures`` plus the byte-identical mirror in
        ``frontend/public/data/fixtures``.

Only pack-derived data is generated here. An ``EvaluateResponse`` fixture needs
the REQ-09 physics owned by ``BE-002``; this task must not implement it a second
time, so evaluate/compare/windows remain the ARCH-002 contract samples.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import sys
from pathlib import Path
from typing import Any

from src.api.schemas.fixture_synth import _external_links
from src.api.schemas.site_schemas import SiteSummarySchema, TerrainPatchSchema
from src.cli.build_terrain_packs import validate_pack as validate_terrain_pack
from src.infrastructure.ephemeris_pack import load_ephemeris_pack
from src.infrastructure.site_registry_loader import load_curated_sites

REPO_ROOT = Path(__file__).resolve().parents[3]
PACK_DIR = REPO_ROOT / "backend" / "data" / "site_packs"
INDEX_PATH = REPO_ROOT / "data" / "manifests" / "site_packs" / "index.json"
FIXTURES_DIR = REPO_ROOT / "contracts" / "fixtures"
FIXTURES_MIRROR = REPO_ROOT / "frontend" / "public" / "data" / "fixtures"
REGISTRY_SIZE = 16
CLASS_A_CATEGORY = "artemis_iii"
CLASS_A_COUNT = 9
SYNTHETIC_NOTE = (
    "synthetic offline fixtures generated from validated site packs; "
    "not measured terrain and not an evaluation"
)


class PackIndexError(RuntimeError):
    """Raised when the packs, the registry, or the fixture tree disagree."""


def sha256_file(path: Path) -> str:
    """Return the SHA-256 of a file's bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_pack_bundle() -> list[dict[str, Any]]:
    """Load and validate every pack, keyed to the registry order."""
    sites = load_curated_sites()
    if len(sites) != REGISTRY_SIZE:
        raise PackIndexError(f"registry has {len(sites)} sites, expected {REGISTRY_SIZE}")
    bundle: list[dict[str, Any]] = []
    for site in sites:
        ephemeris_path = PACK_DIR / site.id / "ephemeris.json"
        terrain_path = PACK_DIR / site.id / "terrain.json"
        if not ephemeris_path.is_file():
            raise PackIndexError(f"missing ephemeris pack for {site.id}")
        ephemeris = load_ephemeris_pack(ephemeris_path)
        if ephemeris["site_id"] != site.id:
            raise PackIndexError(f"{ephemeris_path} describes {ephemeris['site_id']}")
        terrain = None
        if terrain_path.is_file():
            terrain = json.loads(terrain_path.read_text(encoding="utf-8"))
            validate_terrain_pack(terrain)
            if terrain["site_id"] != site.id:
                raise PackIndexError(f"{terrain_path} describes {terrain['site_id']}")
        elif site.category == CLASS_A_CATEGORY:
            raise PackIndexError(f"Class A site {site.id} has no terrain pack")
        bundle.append(
            {
                "site": site,
                "ephemeris": ephemeris,
                "terrain": terrain,
                "ephemeris_path": ephemeris_path,
                "terrain_path": terrain_path if terrain is not None else None,
            }
        )
    if sum(entry["terrain"] is not None for entry in bundle) != CLASS_A_COUNT:
        raise PackIndexError(f"expected {CLASS_A_COUNT} terrain packs")
    return bundle


def build_index(bundle: list[dict[str, Any]]) -> dict[str, Any]:
    """Return the pack index: presence flags and SHA-256 values for every site."""
    sites = []
    for entry in bundle:
        terrain = entry["terrain"]
        sites.append(
            {
                "site_id": entry["site"].id,
                "category": entry["site"].category,
                "has_precomputed_terrain": terrain is not None,
                "ephemeris_pack": entry["ephemeris_path"].relative_to(REPO_ROOT).as_posix(),
                "ephemeris_sha256": sha256_file(entry["ephemeris_path"]),
                "terrain_pack": (
                    entry["terrain_path"].relative_to(REPO_ROOT).as_posix()
                    if entry["terrain_path"] is not None
                    else None
                ),
                "terrain_sha256": (
                    sha256_file(entry["terrain_path"])
                    if entry["terrain_path"] is not None
                    else None
                ),
            }
        )
    return {
        "schema_version": 1,
        "task": "DATA-006",
        "site_count": len(sites),
        "ephemeris_pack_count": len(sites),
        "terrain_pack_count": sum(item["has_precomputed_terrain"] for item in sites),
        "sites": sites,
    }


def build_sites_fixture(bundle: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return Contract A items with elevation and slope derived from the packs (REQ-05)."""
    items = []
    for entry in bundle:
        site = entry["site"]
        terrain = entry["terrain"]
        if terrain is None:
            elevation_m = None
            mean_slope_deg = None
        else:
            slopes = terrain["slopes_deg"]
            elevation_m = terrain["center_elevation_m"]
            mean_slope_deg = sum(slopes) / len(slopes)
        items.append(
            {
                "id": site.id,
                "name": site.name,
                "category": site.category,
                "agency": site.agency,
                "lat_deg": site.lat_deg,
                "lon_deg": site.lon_deg,
                "elevation_m": elevation_m,
                "mean_slope_deg": mean_slope_deg,
                "has_precomputed_terrain": terrain is not None,
                "summary": site.summary,
                "external_links": _external_links(site.lat_deg, site.lon_deg),
            }
        )
    for item in items:
        SiteSummarySchema.model_validate(item)
    return items


def to_terrain_patch(entry: dict[str, Any]) -> dict[str, Any]:
    """Map a TerrainPack to the Contract C wire shape and validate it."""
    pack = entry["terrain"]
    elevations = pack["elevations_m"]
    patch = {
        "site_id": pack["site_id"],
        "model": pack["model"],
        "frame": pack["frame"],
        "grid_size": pack["grid_size"],
        "extent_m": pack["extent_m"],
        "spacing_m": pack["spacing_m"],
        "row_direction": pack["row_direction"],
        "column_direction": pack["column_direction"],
        "center_elevation_m": pack["center_elevation_m"],
        "min_elevation_m": min(elevations),
        "max_elevation_m": max(elevations),
        "elevations_m_flat": elevations,
        "slopes_deg_flat": pack["slopes_deg"],
        "horizons": pack["horizons"],
        "psr_mask": pack["psr_mask"],
    }
    TerrainPatchSchema.model_validate(patch)
    return patch


def scenario_files(bundle: list[dict[str, Any]]) -> dict[str, dict[str, str]]:
    """Return the exact scenario keys the frontend requests (REQ-10)."""
    entries = {
        "sites": {"file": "sites.sample.json"},
        "health": {"file": "health.sample.json"},
    }
    for entry in bundle:
        if entry["terrain"] is not None:
            entries[f"terrain:{entry['site'].id}"] = {"file": f"terrain.{entry['site'].id}.json"}
    return entries


def build_manifest(bundle: list[dict[str, Any]]) -> dict[str, Any]:
    """Return the fixture manifest in both shapes the repository consumes.

    ``httpClient`` reads canonical scenario keys at the top level; the ARCH-002
    parity test reads the ``scenarios`` mapping. Both describe the same files.
    """
    entries = scenario_files(bundle)
    manifest: dict[str, Any] = {
        "synthetic": True,
        "note": SYNTHETIC_NOTE,
        **entries,
        "scenarios": dict(entries),
    }
    return manifest


def build_fixture_payloads(bundle: list[dict[str, Any]]) -> dict[str, Any]:
    """Return every file this task generates, keyed by fixture filename."""
    payloads: dict[str, Any] = {
        "sites.sample.json": build_sites_fixture(bundle),
        "manifest.json": build_manifest(bundle),
    }
    for entry in bundle:
        if entry["terrain"] is not None:
            payloads[f"terrain.{entry['site'].id}.json"] = to_terrain_patch(entry)
    return payloads


def write_json(path: Path, payload: Any) -> None:
    """Write deterministic, sorted, indented JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_fixture_tree(payloads: dict[str, Any], site_ids: list[str]) -> list[str]:
    """Write the canonical fixtures, prune stale generated ones, and mirror them."""
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    for filename, payload in payloads.items():
        write_json(FIXTURES_DIR / filename, payload)
    for site_id in site_ids:
        stale = FIXTURES_DIR / f"terrain.{site_id}.json"
        if stale.name not in payloads:
            stale.unlink(missing_ok=True)

    generated = {path.name for path in FIXTURES_DIR.glob("*.json")}
    FIXTURES_MIRROR.mkdir(parents=True, exist_ok=True)
    for stale in FIXTURES_MIRROR.glob("*.json"):
        if stale.name not in generated:
            stale.unlink()
    written = []
    for path in sorted(FIXTURES_DIR.glob("*.json")):
        target = FIXTURES_MIRROR / path.name
        shutil.copyfile(path, target)
        written.append(target.relative_to(REPO_ROOT).as_posix())
    return written


def main() -> int:
    """Write the index and the fixture tree."""
    bundle = load_pack_bundle()
    index = build_index(bundle)
    write_json(INDEX_PATH, index)
    payloads = build_fixture_payloads(bundle)
    mirrored = write_fixture_tree(payloads, [entry["site"].id for entry in bundle])
    terrain_count = index["terrain_pack_count"]
    print(
        f"{INDEX_PATH.relative_to(REPO_ROOT)}: {index['site_count']} sites, "
        f"{terrain_count} terrain packs"
    )
    print(f"contracts/fixtures: {len(payloads)} generated, {len(mirrored)} mirrored files")
    return 0


def run() -> int:
    """Run main with a closed failure contract."""
    try:
        return main()
    except (PackIndexError, ValueError, OSError) as exc:
        print(f"FAIL  DATA-006: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(run())
