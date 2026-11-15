"""Tests for direct-to-Earth visibility (BE-002)."""

from __future__ import annotations

import pytest

from src.domain.comms_visibility import (
    dte_margin_deg,
    earth_clearance_deg,
    is_dte_available,
    is_dte_geometric,
    is_solar_conjunction,
    sun_earth_separation_deg,
)


def test_earth_clearance_is_elevation_above_the_effective_horizon() -> None:
    assert earth_clearance_deg(6.0, 1.0) == pytest.approx(5.0)


def test_clearance_equality_passes_the_geometric_gate() -> None:
    assert is_dte_geometric(5.0, 5.0) is True
    assert is_dte_geometric(5.0 - 1e-9, 5.0) is False


def test_sun_earth_separation_golden_cases() -> None:
    assert sun_earth_separation_deg(30.0, 30.0, 45.0, 45.0) == pytest.approx(0.0, abs=1e-9)
    assert sun_earth_separation_deg(90.0, 0.0, 0.0, 0.0) == pytest.approx(90.0, abs=1e-9)
    assert sun_earth_separation_deg(0.0, 0.0, 0.0, 180.0) == pytest.approx(180.0, abs=1e-9)


def test_solar_conjunction_uses_a_strict_below_threshold() -> None:
    assert is_solar_conjunction(1.499) is True
    assert is_solar_conjunction(1.5) is False


def test_dte_is_geometrically_clear_and_not_in_conjunction() -> None:
    assert is_dte_available(5.0, 5.0, 3.0) is True
    assert is_dte_available(5.0, 5.0, 1.4) is False
    assert is_dte_available(4.9, 5.0, 3.0) is False


def test_dte_margin_is_the_binding_constraint() -> None:
    assert dte_margin_deg(10.0, 5.0, 3.0) == pytest.approx(1.5)
    assert dte_margin_deg(6.0, 5.0, 20.0) == pytest.approx(1.0)
