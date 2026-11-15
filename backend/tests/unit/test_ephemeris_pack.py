"""Tests for the EphemerisPack builder and the generated packs (DATA-004)."""

from __future__ import annotations

import copy
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import NamedTuple

import pytest

from src.infrastructure.ephemeris_pack import (
    EphemerisPackError,
    build_ephemeris_pack,
    combined_manifest_sha256,
    load_ephemeris_pack,
    validate_ephemeris_pack,
    write_ephemeris_pack,
)
from src.infrastructure.site_registry_loader import load_curated_sites

REPO_ROOT = Path(__file__).resolve().parents[3]
PACK_DIR = REPO_ROOT / "backend" / "data" / "site_packs"
MANIFEST_DIR = REPO_ROOT / "data" / "manifests" / "horizons"
REFERENCE_DIR = REPO_ROOT / "data" / "manifests" / "references" / "horizons"
START = datetime(2026, 1, 1, tzinfo=UTC)
STEP_SECONDS = 3600
SAMPLE_COUNT = 26305
SITE_IDS = [site.id for site in load_curated_sites()]
BODIES = ("sun", "earth")
COORD = {"lon_deg": 0.0, "lat_deg": -89.0, "altitude_km": 0.0}


class Row(NamedTuple):
    """Synthetic track row compatible with the builder's sample protocol."""

    utc: datetime
    az_deg: float
    elev_deg: float


def make_rows(count: int = 3, *, az_deg: float = 12.5, elev_deg: float = 30.0) -> list[Row]:
    """Return an hourly track of `count` rows starting at the coverage start."""
    return [
        Row(START + timedelta(seconds=STEP_SECONDS * i), az_deg, elev_deg) for i in range(count)
    ]


def make_pack(
    *, count: int = 3, sun: list[Row] | None = None, earth: list[Row] | None = None
) -> dict:
    """Build a three-sample pack, overriding a track when a test needs to."""
    return build_ephemeris_pack(
        site_id="test-site",
        sun_rows=make_rows(count) if sun is None else sun,
        earth_rows=make_rows(count) if earth is None else earth,
        start_utc=START,
        stop_utc=START + timedelta(seconds=STEP_SECONDS * (count - 1)),
        step_seconds=STEP_SECONDS,
        source_manifest_sha256="a" * 64,
        site_coord_used=COORD,
    )


def test_builds_the_documented_pack_shape() -> None:
    pack = make_pack()
    assert pack["schema_version"] == 1
    assert pack["site_id"] == "test-site"
    assert pack["frame"] == "MOON_ME"
    assert pack["longitude_convention"] == "east_positive"
    assert pack["azimuth_convention"] == "clockwise_from_north"
    assert pack["start_utc"] == "2026-01-01T00:00:00Z"
    assert pack["stop_utc"] == "2026-01-01T02:00:00Z"
    assert pack["step_seconds"] == STEP_SECONDS
    assert pack["sample_count"] == 3
    assert pack["sun_az_deg"] == [12.5, 12.5, 12.5]
    assert pack["earth_elev_deg"] == [30.0, 30.0, 30.0]
    assert pack["source_manifest_sha256"] == "a" * 64
    assert pack["site_coord_used"] == COORD


def test_rejects_an_azimuth_outside_the_half_open_range() -> None:
    with pytest.raises(EphemerisPackError):
        make_pack(sun=make_rows(az_deg=360.0))


def test_rejects_an_elevation_outside_range() -> None:
    with pytest.raises(EphemerisPackError):
        make_pack(earth=make_rows(elev_deg=90.5))


def test_rejects_a_non_finite_sample() -> None:
    with pytest.raises(EphemerisPackError):
        make_pack(sun=make_rows(az_deg=float("nan")))


def test_rejects_an_off_grid_timestamp() -> None:
    off_grid = make_rows()
    off_grid[1] = Row(START + timedelta(seconds=STEP_SECONDS + 1), 12.5, 30.0)
    with pytest.raises(EphemerisPackError):
        make_pack(sun=off_grid)


def test_rejects_mismatched_track_lengths() -> None:
    with pytest.raises(EphemerisPackError):
        make_pack(earth=make_rows(2))


def test_validator_rejects_a_wrong_sample_count() -> None:
    pack = copy.deepcopy(make_pack())
    pack["sample_count"] = 4
    with pytest.raises(EphemerisPackError):
        validate_ephemeris_pack(pack)


def test_validator_rejects_a_truncated_array() -> None:
    pack = copy.deepcopy(make_pack())
    pack["sun_elev_deg"].pop()
    with pytest.raises(EphemerisPackError):
        validate_ephemeris_pack(pack)


def test_write_and_load_round_trip(tmp_path: Path) -> None:
    pack = make_pack()
    path = tmp_path / "site" / "ephemeris.json"
    digest = write_ephemeris_pack(path, pack)
    assert len(digest) == 64
    assert load_ephemeris_pack(path) == pack


@pytest.mark.parametrize("site_id", SITE_IDS)
def test_every_pack_validates_and_records_provenance(site_id: str) -> None:
    pack = load_ephemeris_pack(PACK_DIR / site_id / "ephemeris.json")
    assert pack["sample_count"] == SAMPLE_COUNT
    for key in ("sun_az_deg", "sun_elev_deg", "earth_az_deg", "earth_elev_deg"):
        assert len(pack[key]) == SAMPLE_COUNT
        assert all(isinstance(value, float) for value in pack[key])
    expected = combined_manifest_sha256(
        [MANIFEST_DIR / f"{site_id}.{body}.json" for body in BODIES]
    )
    assert pack["source_manifest_sha256"] == expected


@pytest.mark.parametrize("site_id", SITE_IDS)
@pytest.mark.parametrize("body", BODIES)
def test_direct_samples_reproduce_frozen_horizons_rows(site_id: str, body: str) -> None:
    pack = json.loads((PACK_DIR / site_id / "ephemeris.json").read_text(encoding="utf-8"))
    reference = json.loads(
        (REFERENCE_DIR / f"{site_id}.{body}.reference.json").read_text(encoding="utf-8")
    )
    azimuths = pack[f"{body}_az_deg"]
    elevations = pack[f"{body}_elev_deg"]
    assert len(reference["rows"]) > 0
    for timestamp, az_deg, elev_deg in reference["rows"]:
        moment = datetime.fromisoformat(timestamp.removesuffix("Z")).replace(tzinfo=UTC)
        index = int((moment - START).total_seconds() // pack["step_seconds"])
        assert 0 <= index < pack["sample_count"]
        assert azimuths[index] == az_deg
        assert elevations[index] == elev_deg
