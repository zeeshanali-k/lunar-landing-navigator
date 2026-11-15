"""Tests for the spherical, atmosphere-free raycast (DATA-005)."""

from __future__ import annotations

import numpy as np
import pytest

from src.domain.constants import MOON_RADIUS_M
from src.infrastructure.raycaster import (
    AZIMUTH_COUNT,
    MAX_RANGE_M,
    MIN_RANGE_M,
    RADIAL_SAMPLE_COUNT,
    RaycastError,
    apparent_elevation_deg,
    destination_latlon,
    geometric_limb_deg,
    horizon_elevation_deg,
    horizon_profile,
    radial_samples,
)

OBSERVER_HEIGHTS_M = (1.5, 2.0, 10.0)


def analytic_limb(observer_height_m: float) -> float:
    """Return the closed-form limb drop for a flat surface."""
    ratio = MOON_RADIUS_M / (MOON_RADIUS_M + observer_height_m)
    return float(-np.degrees(np.arccos(ratio)))


def test_radial_grid_is_log_spaced_and_capped() -> None:
    distances = radial_samples()
    assert distances.size == RADIAL_SAMPLE_COUNT
    assert distances[0] == pytest.approx(MIN_RANGE_M)
    assert distances[-1] == pytest.approx(MAX_RANGE_M)
    assert np.all(np.diff(distances) > 0.0)
    assert distances[-1] <= 120000.0


def test_radial_grid_rejects_beyond_the_ceiling() -> None:
    with pytest.raises(RaycastError):
        radial_samples(max_range_m=MAX_RANGE_M + 1.0)


def test_flat_terrain_returns_the_analytic_limb_for_every_height() -> None:
    distances = radial_samples()
    ground = -2500.0
    flat = np.full_like(distances, ground)
    for height_m in OBSERVER_HEIGHTS_M:
        recovered = horizon_elevation_deg(
            flat, distances, ground_elev_m=ground, observer_height_m=height_m
        )
        assert recovered == pytest.approx(analytic_limb(height_m), abs=1e-3)
        assert recovered < 0.0


def test_geometric_limb_matches_the_closed_form() -> None:
    for height_m in OBSERVER_HEIGHTS_M:
        assert geometric_limb_deg(0.0, height_m) == pytest.approx(analytic_limb(height_m), abs=1e-9)


def test_geometric_limb_rejects_an_observer_below_ground() -> None:
    with pytest.raises(RaycastError):
        geometric_limb_deg(10.0, 2.0)


def test_synthetic_crater_rim_recovers_the_analytic_horizon() -> None:
    distances = radial_samples()
    rim_index = 68
    rim_distance = float(distances[rim_index])
    ground = -1200.0
    rim_height = ground + 50.0
    heights = np.full_like(distances, ground)
    heights[:rim_index] = ground - 20.0
    heights[rim_index] = rim_height
    heights[rim_index + 1 :] = ground - 100.0
    observer_height = 2.0
    expected = float(
        apparent_elevation_deg(
            np.array([rim_height]), np.array([rim_distance]), ground + observer_height
        )[0]
    )
    recovered = horizon_elevation_deg(
        heights, distances, ground_elev_m=ground, observer_height_m=observer_height
    )
    assert recovered == pytest.approx(expected, abs=0.02)
    assert recovered > analytic_limb(observer_height)


def test_destination_moves_north_and_east_correctly() -> None:
    north_lat, north_lon = destination_latlon(-89.0, 0.0, 0.0, 1000.0)
    east_lat, east_lon = destination_latlon(-89.0, 0.0, 90.0, 1000.0)
    assert float(north_lat) > -89.0
    assert float(north_lon) == pytest.approx(0.0, abs=1e-9)
    assert float(east_lon) > 0.0
    assert float(east_lat) == pytest.approx(-89.0, abs=1e-3)


def test_longitude_is_returned_east_positive_in_range() -> None:
    _, lon = destination_latlon(-89.5, 179.999, 90.0, 1000.0)
    assert -180.0 <= float(lon) < 180.0
    assert float(lon) < 0.0


def test_horizon_profile_returns_three_sixty_finite_samples() -> None:
    def flat_surface(lat_deg: np.ndarray, lon_deg: np.ndarray):
        return np.zeros_like(lat_deg), np.ones_like(lat_deg, dtype=bool)

    profile = horizon_profile(
        flat_surface, lat_deg=-89.0, lon_deg=0.0, ground_elev_m=0.0, observer_height_m=2.0
    )
    assert list(profile["azimuth_deg"]) == [float(value) for value in range(AZIMUTH_COUNT)]
    assert profile["terrain_elev_deg"].shape == (AZIMUTH_COUNT,)
    assert np.all(np.isfinite(profile["terrain_elev_deg"]))
    assert np.allclose(profile["terrain_elev_deg"], analytic_limb(2.0), atol=1e-3)
    assert np.allclose(profile["geometric_limb_deg"], analytic_limb(2.0))


def test_horizon_profile_rejects_an_uncovered_azimuth() -> None:
    def one_sided_surface(lat_deg: np.ndarray, lon_deg: np.ndarray):
        valid = lon_deg >= 0.0
        return np.zeros_like(lat_deg), valid

    with pytest.raises(RaycastError):
        horizon_profile(
            one_sided_surface, lat_deg=-89.0, lon_deg=0.0, ground_elev_m=0.0, observer_height_m=2.0
        )
