"""Tests for linear and circular ephemeris interpolation (BE-001)."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from src.domain.interpolation import (
    InterpolationError,
    interpolate_azimuth_deg,
    interpolate_grid,
    interpolate_linear,
    shortest_signed_azimuth_delta_deg,
)
from src.infrastructure.site_registry_loader import load_curated_sites

REPO_ROOT = Path(__file__).resolve().parents[3]
PACK_DIR = REPO_ROOT / "backend" / "data" / "site_packs"
REFERENCE_DIR = REPO_ROOT / "data" / "manifests" / "references" / "horizons"
SITE_IDS = [site.id for site in load_curated_sites()]
SOUTH_POLAR_SITES = [site.id for site in load_curated_sites() if site.category == "artemis_iii"]
BODIES = ("sun", "earth")


def _aware(value: str) -> datetime:
    return datetime.fromisoformat(value.removesuffix("Z")).replace(tzinfo=UTC)


def test_shortest_signed_delta_wraps_across_359_to_0() -> None:
    assert shortest_signed_azimuth_delta_deg(359.0, 0.0) == pytest.approx(1.0)
    assert shortest_signed_azimuth_delta_deg(0.0, 359.0) == pytest.approx(-1.0)
    assert shortest_signed_azimuth_delta_deg(350.0, 10.0) == pytest.approx(20.0)
    assert shortest_signed_azimuth_delta_deg(10.0, 350.0) == pytest.approx(-20.0)


def test_azimuth_interpolation_uses_shortest_arc() -> None:
    assert interpolate_azimuth_deg(359.0, 0.0, 0.5) == pytest.approx(359.5)
    assert interpolate_azimuth_deg(0.0, 359.0, 0.5) == pytest.approx(359.5)
    assert interpolate_azimuth_deg(10.0, 350.0, 0.5) == pytest.approx(0.0)


def test_linear_interpolation() -> None:
    assert interpolate_linear(0.0, 10.0, 0.25) == pytest.approx(2.5)


def test_grid_interpolation_reproduces_nodes_and_midpoints() -> None:
    start = datetime(2026, 1, 1, tzinfo=UTC)
    values = [0.0, 10.0, 20.0]
    assert interpolate_grid(start, start, 3600, values) == 0.0
    assert interpolate_grid(start + timedelta(hours=1), start, 3600, values) == 10.0
    assert interpolate_grid(start + timedelta(hours=2), start, 3600, values) == 20.0
    assert interpolate_grid(start + timedelta(minutes=30), start, 3600, values) == pytest.approx(
        5.0
    )


def test_circular_grid_interpolation_wraps_across_nodes() -> None:
    start = datetime(2026, 1, 1, tzinfo=UTC)
    values = [359.0, 0.0]
    assert interpolate_grid(
        start + timedelta(minutes=30), start, 3600, values, circular=True
    ) == pytest.approx(359.5)


def test_grid_interpolation_rejects_extrapolation() -> None:
    start = datetime(2026, 1, 1, tzinfo=UTC)
    values = [0.0, 10.0, 20.0]
    with pytest.raises(InterpolationError):
        interpolate_grid(start - timedelta(seconds=1), start, 3600, values)
    with pytest.raises(InterpolationError):
        interpolate_grid(start + timedelta(hours=3), start, 3600, values)


@pytest.mark.parametrize("site_id", SITE_IDS)
@pytest.mark.parametrize("body", BODIES)
def test_frozen_references_reproduce_on_grid(site_id: str, body: str) -> None:
    pack = json.loads((PACK_DIR / site_id / "ephemeris.json").read_text(encoding="utf-8"))
    reference = json.loads(
        (REFERENCE_DIR / f"{site_id}.{body}.reference.json").read_text(encoding="utf-8")
    )
    start = _aware(pack["start_utc"])
    step = int(pack["step_seconds"])
    azimuths = pack[f"{body}_az_deg"]
    elevations = pack[f"{body}_elev_deg"]
    for timestamp, az_deg, elev_deg in reference["rows"]:
        target = _aware(timestamp)
        assert interpolate_grid(target, start, step, azimuths, circular=True) == az_deg
        assert interpolate_grid(target, start, step, elevations) == elev_deg


@pytest.mark.parametrize("site_id", SOUTH_POLAR_SITES)
@pytest.mark.parametrize("body", BODIES)
def test_off_grid_interpolation_error_below_50_milliarcdeg(site_id: str, body: str) -> None:
    pack = json.loads((PACK_DIR / site_id / "ephemeris.json").read_text(encoding="utf-8"))
    reference = json.loads(
        (REFERENCE_DIR / f"{site_id}.{body}.reference.json").read_text(encoding="utf-8")
    )
    start = _aware(pack["start_utc"])
    step = int(pack["step_seconds"])
    azimuths = pack[f"{body}_az_deg"]
    elevations = pack[f"{body}_elev_deg"]
    for timestamp, az_deg, elev_deg in reference["rows"]:
        index = int((_aware(timestamp) - start).total_seconds() // step)
        if index == 0 or index == len(azimuths) - 1:
            continue
        # Off-grid midpoint between the two adjacent hourly samples; the frozen
        # reference row at `index` is the exact truth for that midpoint.
        est_az = interpolate_azimuth_deg(azimuths[index - 1], azimuths[index + 1], 0.5)
        est_elev = interpolate_linear(elevations[index - 1], elevations[index + 1], 0.5)
        assert abs(shortest_signed_azimuth_delta_deg(est_az, az_deg)) < 0.05
        assert abs(est_elev - elev_deg) < 0.05
