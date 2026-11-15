"""Tests for solar illumination and array power (BE-002)."""

from __future__ import annotations

import math

import pytest

from src.domain.solar_power import (
    HORIZONTAL_FIXED,
    VERTICAL_FIXED,
    VERTICAL_TRACKING,
    irradiance_w_m2,
    is_sunlit,
    solar_power_factor,
    sun_occultation_margin_deg,
    sun_visible_fraction,
)


def test_sun_visible_fraction_zero_partial_and_full_occultation() -> None:
    assert sun_visible_fraction(-0.267, 0.0) == pytest.approx(0.0)
    assert sun_visible_fraction(0.0, 0.0) == pytest.approx(0.5)
    assert sun_visible_fraction(0.1335, 0.0) == pytest.approx(0.75)
    assert sun_visible_fraction(0.267, 0.0) == pytest.approx(1.0)


def test_is_sunlit_requires_a_visible_disk() -> None:
    assert is_sunlit(0.0) is False
    assert is_sunlit(1e-9) is True


def test_sun_occultation_margin_matches_f_sun_zero_crossing() -> None:
    assert sun_occultation_margin_deg(-0.267, 0.0) == pytest.approx(0.0)
    assert sun_visible_fraction(-0.267, 0.0) == pytest.approx(0.0)


def test_horizontal_fixed_power_golden() -> None:
    factor = solar_power_factor(30.0, 0.0, HORIZONTAL_FIXED, 0.0, 1.0)
    assert factor == pytest.approx(math.sin(math.radians(30.0)))


def test_vertical_tracking_power_golden() -> None:
    factor = solar_power_factor(30.0, 0.0, VERTICAL_TRACKING, 0.0, 1.0)
    assert factor == pytest.approx(math.cos(math.radians(30.0)))


def test_vertical_fixed_power_golden() -> None:
    assert solar_power_factor(30.0, 0.0, VERTICAL_FIXED, 0.0, 1.0) == pytest.approx(
        math.cos(math.radians(30.0))
    )
    assert solar_power_factor(30.0, 90.0, VERTICAL_FIXED, 0.0, 1.0) == pytest.approx(0.0)
    assert solar_power_factor(60.0, 0.0, VERTICAL_FIXED, 0.0, 0.5) == pytest.approx(0.25)


def test_solar_power_factor_is_clamped() -> None:
    assert solar_power_factor(90.0, 0.0, HORIZONTAL_FIXED, 0.0, 2.0) == pytest.approx(1.0)
    assert solar_power_factor(-90.0, 0.0, VERTICAL_TRACKING, 0.0, 1.0) == pytest.approx(0.0)


def test_irradiance_uses_the_solar_constant() -> None:
    assert irradiance_w_m2(0.5) == pytest.approx(680.5)


def test_unknown_array_type_is_rejected() -> None:
    with pytest.raises(ValueError):
        solar_power_factor(30.0, 0.0, "not_an_array", 0.0, 1.0)
