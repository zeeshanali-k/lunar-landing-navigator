"""Build one EphemerisPack per curated site from the tracked Horizons manifests.

Input:  ``data/manifests/horizons/{site}.{sun,earth}.json`` plus the raw responses
        they point at under ``data/downloads/horizons/``.
Output: ``backend/data/site_packs/{site}/ephemeris.json``.

The generator verifies each raw response against the SHA-256 and row count in its
manifest before parsing, so a rebuilt pack is always derived from verified bytes.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.cli.horizons_client import (
    EphemerisRow,
    HorizonsError,
    parse_rows,
    parse_utc,
    validate_coverage,
)
from src.infrastructure.ephemeris_pack import (
    build_ephemeris_pack,
    combined_manifest_sha256,
    sha256_file,
    write_ephemeris_pack,
)
from src.infrastructure.site_registry_loader import load_curated_sites

REPO_ROOT = Path(__file__).resolve().parents[3]
MANIFEST_DIR = REPO_ROOT / "data" / "manifests" / "horizons"
PACK_DIR = REPO_ROOT / "backend" / "data" / "site_packs"
BODIES = ("sun", "earth")
REGISTRY_SIZE = 16


def manifest_path(site_id: str, body: str) -> Path:
    """Return the tracked manifest path for one site and body."""
    return MANIFEST_DIR / f"{site_id}.{body}.json"


def load_manifest(site_id: str, body: str) -> dict[str, Any]:
    """Read a manifest and prove it describes the requested site and body."""
    path = manifest_path(site_id, body)
    if not path.exists():
        raise HorizonsError(f"missing Horizons manifest: {path.relative_to(REPO_ROOT)}")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("site_id") != site_id or manifest.get("body") != body:
        raise HorizonsError(f"{path.name} does not describe {site_id}.{body}")
    return manifest


def verified_rows(manifest: dict[str, Any]) -> list[EphemerisRow]:
    """Verify the raw response against its manifest, then parse and prove coverage."""
    raw_path = REPO_ROOT / manifest["raw_path"]
    if not raw_path.exists():
        raise HorizonsError(f"missing raw Horizons response: {manifest['raw_path']}")
    actual_sha256 = sha256_file(raw_path)
    if actual_sha256 != manifest["raw_sha256"]:
        raise HorizonsError(
            f"{manifest['raw_path']} SHA-256 {actual_sha256} != manifest {manifest['raw_sha256']}"
        )
    rows = parse_rows(raw_path.read_text(encoding="utf-8"))
    if len(rows) != manifest["parsed_rows"]:
        raise HorizonsError(
            f"{manifest['raw_path']} parsed {len(rows)} rows, manifest claims {manifest['parsed_rows']}"
        )
    validate_coverage(
        rows,
        start_utc=parse_utc(manifest["start_utc"]),
        stop_utc=parse_utc(manifest["stop_utc"]),
        step_seconds_value=manifest["step_seconds"],
        expected_samples=manifest["parsed_rows"],
    )
    return rows


def site_coord(manifest: dict[str, Any]) -> dict[str, float]:
    """Return the pack's ``site_coord_used`` block from a manifest."""
    coord = manifest["site_coord_used"]
    return {
        "lon_deg": float(coord["lon_deg_east_positive"]),
        "lat_deg": float(coord["lat_deg"]),
        "altitude_km": float(coord["altitude_km"]),
    }


def build_site(site_id: str) -> tuple[Path, str]:
    """Build and write one site's pack, returning its path and SHA-256."""
    manifests = {body: load_manifest(site_id, body) for body in BODIES}
    for body in BODIES:
        if manifests[body]["start_utc"] != manifests["sun"]["start_utc"]:
            raise HorizonsError(f"{site_id}.{body} coverage start disagrees with the Sun track")
        if manifests[body]["stop_utc"] != manifests["sun"]["stop_utc"]:
            raise HorizonsError(f"{site_id}.{body} coverage stop disagrees with the Sun track")
        if manifests[body]["step_seconds"] != manifests["sun"]["step_seconds"]:
            raise HorizonsError(f"{site_id}.{body} step disagrees with the Sun track")
        if site_coord(manifests[body]) != site_coord(manifests["sun"]):
            raise HorizonsError(
                f"{site_id}.{body} observer coordinate disagrees with the Sun track"
            )

    rows = {body: verified_rows(manifests[body]) for body in BODIES}
    pack = build_ephemeris_pack(
        site_id=site_id,
        sun_rows=rows["sun"],
        earth_rows=rows["earth"],
        start_utc=parse_utc(manifests["sun"]["start_utc"]),
        stop_utc=parse_utc(manifests["sun"]["stop_utc"]),
        step_seconds=manifests["sun"]["step_seconds"],
        source_manifest_sha256=combined_manifest_sha256(
            [manifest_path(site_id, body) for body in BODIES]
        ),
        site_coord_used=site_coord(manifests["sun"]),
    )
    output = PACK_DIR / site_id / "ephemeris.json"
    return output, write_ephemeris_pack(output, pack)


def main() -> int:
    """Build every site's EphemerisPack in registry order."""
    sites = load_curated_sites()
    if len(sites) != REGISTRY_SIZE:
        raise HorizonsError(f"registry has {len(sites)} sites, expected {REGISTRY_SIZE}")
    for site in sites:
        output, digest = build_site(site.id)
        pack = json.loads(output.read_text(encoding="utf-8"))
        print(
            f"{site.id}: sample_count={pack['sample_count']} "
            f"-> {output.relative_to(REPO_ROOT)} sha256={digest}"
        )
    print(f"built {len(sites)} ephemeris packs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
