"""Acquire and freeze JPL Horizons Sun/Earth tracks for the curated sites (build-time only)."""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import yaml  # type: ignore[import-untyped]

from src.cli.horizons_client import (
    PARSER_VERSION,
    EphemerisRow,
    FetchResult,
    HorizonsError,
    Site,
    build_request_params,
    build_url,
    canonical_request_json,
    fetch,
    parse_rows,
    parse_utc,
    reference_rows,
    step_seconds,
    validate_coverage,
)
from src.infrastructure.pds_dem import sha256_file

TASK_ID = "DATA-003"
BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = Path(__file__).resolve().parents[3]
CONFIG_PATH = BACKEND_ROOT / "config" / "data_sources.yaml"
REGISTRY_PATH = BACKEND_ROOT / "config" / "curated_sites.yaml"
RAW_DIR = REPO_ROOT / "data" / "downloads" / "horizons"
MANIFEST_DIR = REPO_ROOT / "data" / "manifests" / "horizons"
REFERENCE_DIR = REPO_ROOT / "data" / "manifests" / "references" / "horizons"
REQUEST_INTERVAL_SECONDS = 1.0
REFERENCE_EVERY = 24
FRAME = "MOON_ME"
FRAME_HORIZONS_LABEL = "MEAN_ME (high precision), East-longitude positive"


def load_horizons_config(path: Path = CONFIG_PATH) -> dict[str, Any]:
    """Return the jpl_horizons section of the data source configuration."""
    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or not isinstance(document.get("jpl_horizons"), dict):
        raise HorizonsError(f"{path} has no jpl_horizons mapping")
    return document["jpl_horizons"]


def load_sites(path: Path = REGISTRY_PATH) -> list[Site]:
    """Return the curated sites in registry order, with their observer altitude."""
    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    entries = document.get("sites") if isinstance(document, dict) else None
    if not isinstance(entries, list) or not entries:
        raise HorizonsError(f"{path} has no sites list")
    sites: list[Site] = []
    for entry in entries:
        elevation = entry.get("elevation_m")
        sites.append(
            Site(
                site_id=str(entry["id"]),
                lat_deg=float(entry["lat_deg"]),
                lon_deg=float(entry["lon_deg"]),
                elevation_m=float(elevation) if elevation is not None else 0.0,
                altitude_source=(
                    "registry elevation_m"
                    if elevation is not None
                    else "reference_sphere_zero: registry has no elevation_m"
                ),
            )
        )
    return sites


def cache_is_valid(prior: dict[str, Any], raw_path: Path, expected: int) -> bool:
    """Return True when the cached raw file still matches its manifest."""
    recorded = prior.get("raw_sha256")
    if int(prior.get("parsed_rows", -1)) != expected or not isinstance(recorded, str):
        return False
    return raw_path.is_file() and sha256_file(raw_path) == recorded


def write_raw(path: Path, body: bytes, digest: str) -> None:
    """Write raw bytes through a .part file and rename atomically after hashing."""
    part = path.with_name(f"{path.name}.part")
    part.write_bytes(body)
    actual = sha256_file(part)
    if actual != digest:
        raise HorizonsError(f"{path.name}: wrote sha256 {actual} but fetched {digest}")
    os.replace(part, path)


def write_reference(
    site: Site,
    body: str,
    rows: list[EphemerisRow],
    result: FetchResult,
    step: int,
    raw_path: Path,
) -> dict[str, str]:
    """Freeze full-precision reference rows and return their path and hash."""
    path = REFERENCE_DIR / f"{site.site_id}.{body}.reference.json"
    document = {
        "schema_version": 1,
        "task": TASK_ID,
        "site_id": site.site_id,
        "body": body,
        "frame": FRAME,
        "start_utc": rows[0].utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stop_utc": rows[-1].utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "step_seconds": step,
        "row_count": len(rows),
        "selection": f"hourly rows where index % {REFERENCE_EVERY} == 0, plus the final row",
        "raw_sha256": result.sha256,
        "rows": reference_rows(rows, every=REFERENCE_EVERY),
    }
    path.write_text(json.dumps(document, separators=(",", ":")) + "\n", encoding="utf-8")
    return {"path": str(path.relative_to(REPO_ROOT)), "sha256": sha256_file(path)}


def build_manifest(
    site: Site,
    body: str,
    config: dict[str, Any],
    params: dict[str, str],
    request_json: str,
    result: FetchResult,
    rows: list[EphemerisRow],
    reference: dict[str, str],
    raw_path: Path,
    step: int,
) -> dict[str, Any]:
    """Assemble the provenance manifest for one site and body."""
    url = build_url(str(config["api_url"]), params)
    return {
        "schema_version": 1,
        "task": TASK_ID,
        "parser_version": PARSER_VERSION,
        "site_id": site.site_id,
        "body": body,
        "command": params["COMMAND"],
        "center": params["CENTER"],
        "coord_type": params["COORD_TYPE"],
        "site_coord": params["SITE_COORD"],
        "quantities": params["QUANTITIES"],
        "ephem_type": params["EPHEM_TYPE"],
        "obj_data": params["OBJ_DATA"],
        "frame": FRAME,
        "frame_horizons_label": FRAME_HORIZONS_LABEL,
        "longitude_convention": "east_positive",
        "azimuth_convention": "clockwise_from_north",
        "start_utc": config["coverage"]["start_utc"],
        "stop_utc": config["coverage"]["stop_utc"],
        "step_seconds": step,
        "request_params": params,
        "request_params_ordered": [[key, params[key]] for key in params],
        "request_json": request_json,
        "request_url": url,
        "original_url": url,
        "final_url": result.final_url,
        "retrieved_utc": result.retrieved_utc,
        "http_status": result.http_status,
        "bytes": len(result.raw_bytes),
        "raw_path": str(raw_path.relative_to(REPO_ROOT)),
        "raw_sha256": result.sha256,
        "parsed_rows": len(rows),
        "site_coord_used": {
            "lon_deg_east_positive": site.lon_deg,
            "lat_deg": site.lat_deg,
            "altitude_km": site.altitude_km,
            "altitude_source": site.altitude_source,
        },
        "generated_outputs": [reference],
        "generated_pack_sha256": None,
        "generated_pack_note": "DATA-004 builds EphemerisPacks from these rows.",
    }


def acquire_pair(site: Site, body: str, config: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    """Acquire one site/body track, reusing a matching cached response."""
    coverage = config["coverage"]
    start_text = str(coverage["start_utc"])
    stop_text = str(coverage["stop_utc"])
    step_text = str(coverage["step"])
    expected = int(coverage["expected_samples"])
    step = step_seconds(step_text)
    params = build_request_params(
        site,
        command=str(config["bodies"][body]),
        center=str(config["center"]),
        coord_type=str(config["coord_type"]),
        quantities=str(config["quantities"]),
        start=start_text,
        stop=stop_text,
        step=step_text,
    )
    request_json = canonical_request_json(params)
    raw_path = RAW_DIR / f"{site.site_id}.{body}.txt"
    manifest_path = MANIFEST_DIR / f"{site.site_id}.{body}.json"

    prior: dict[str, Any] | None = None
    if manifest_path.is_file():
        try:
            loaded = json.loads(manifest_path.read_text(encoding="utf-8"))
            prior = loaded if isinstance(loaded, dict) else None
        except (json.JSONDecodeError, OSError):
            prior = None
    if (
        prior is not None
        and prior.get("request_json") == request_json
        and cache_is_valid(prior, raw_path, expected)
    ):
        return prior, False

    result = fetch(build_url(str(config["api_url"]), params))
    rows = parse_rows(result.text)
    validate_coverage(
        rows,
        start_utc=parse_utc(start_text),
        stop_utc=parse_utc(stop_text),
        step_seconds_value=step,
        expected_samples=expected,
    )
    write_raw(raw_path, result.raw_bytes, result.sha256)
    reference = write_reference(site, body, rows, result, step, raw_path)
    manifest = build_manifest(
        site, body, config, params, request_json, result, rows, reference, raw_path, step
    )
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest, True


def main() -> int:
    """Acquire every site/body track, validating coverage before bulk fetching."""
    config = load_horizons_config()
    sites = load_sites()
    bodies = [str(name) for name in config["bodies"]]
    for directory in (RAW_DIR, MANIFEST_DIR, REFERENCE_DIR):
        directory.mkdir(parents=True, exist_ok=True)

    fetched = reused = 0
    for index, site in enumerate(sites):
        for body in bodies:
            manifest, did_fetch = acquire_pair(site, body, config)
            fetched, reused = fetched + did_fetch, reused + (not did_fetch)
            print(
                f"OK    {site.site_id}.{body}: {manifest['parsed_rows']} rows "
                f"sha256={manifest['raw_sha256'][:12]}"
            )
            if index == 0 and body == bodies[0]:
                print(
                    f"OK    coverage check: {manifest['parsed_rows']} rows at "
                    f"{manifest['step_seconds']}s from {manifest['start_utc']} "
                    f"to {manifest['stop_utc']}"
                )
            if did_fetch:
                time.sleep(REQUEST_INTERVAL_SECONDS)
    print(f"OK    {len(sites)} sites x {len(bodies)} bodies: {fetched} fetched, {reused} reused")
    return 0


def run() -> int:
    """Run main with a closed failure contract."""
    try:
        return main()
    except (HorizonsError, OSError, yaml.YAMLError) as exc:
        print(f"FAIL  {TASK_ID}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(run())
