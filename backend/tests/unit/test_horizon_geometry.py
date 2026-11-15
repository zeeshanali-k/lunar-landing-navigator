"""Tests for effective horizon geometry (BE-002)."""

from __future__ import annotations

import pytest

from src.domain.horizon_geometry import (
    effective_horizon_elev_deg,
    horizon_elevation_at_azimuth_deg,
)


def _constant_profile(value: float) -> list[float]:
    return [value] * 360


def test_effective_horizon_is_the_maximum() -> None:
    assert effective_horizon_elev_deg(5.0, -0.087) == 5.0
    assert effective_horizon_elev_deg(-0.5, -0.087) == -0.087
    assert effective_horizon_elev_deg(-0.087, -0.087) == -0.087


def test_horizon_uses_terrain_when_terrain_wins() -> None:
    terrain = _constant_profile(3.0)
    limb = _constant_profile(-0.2)
    assert horizon_elevation_at_azimuth_deg(123.0, terrain, limb) == pytest.approx(3.0)


def test_horizon_uses_limb_when_limb_wins() -> None:
    terrain = _constant_profile(-1.0)
    limb = _constant_profile(-0.2)
    assert horizon_elevation_at_azimuth_deg(250.0, terrain, limb) == pytest.approx(-0.2)


def test_horizon_interpolates_around_the_359_to_0_wrap() -> None:
    terrain = [0.0] * 360
    terrain[359] = 0.0
    terrain[0] = 10.0
    limb = _constant_profile(-1.0)
    assert horizon_elevation_at_azimuth_deg(359.5, terrain, limb) == pytest.approx(5.0)
    assert horizon_elevation_at_azimuth_deg(0.0, terrain, limb) == pytest.approx(10.0)


def test_horizon_rejects_a_non_360_series() -> None:
    with pytest.raises(ValueError):
        horizon_elevation_at_azimuth_deg(0.0, [0.0] * 359, [0.0] * 360)
