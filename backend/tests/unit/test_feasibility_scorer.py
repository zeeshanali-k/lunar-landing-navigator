"""Tests for aggregation and feasibility scoring (BE-002)."""

from __future__ import annotations

import math

import pytest

from src.domain.feasibility_scorer import (
    comms_score,
    feasibility_score,
    fraction,
    hours_in_state,
    longest_consecutive_run,
    mean,
    power_score,
    risk_warnings,
    terrain_score,
    thermal_score,
)


def test_hours_in_state_is_count_times_step_hours() -> None:
    assert hours_in_state(5, 0.5) == pytest.approx(2.5)


def test_fraction_is_count_over_total() -> None:
    assert fraction(3, 6) == pytest.approx(0.5)


def test_longest_consecutive_run() -> None:
    assert longest_consecutive_run([True, True, False, True, True, True]) == 3
    assert longest_consecutive_run([True, False, True], target=False) == 1


def test_mean_over_mission_samples() -> None:
    assert mean([1.0, 2.0, 3.0]) == pytest.approx(2.0)


def test_power_score_golden() -> None:
    assert power_score(0.6, 0.4) == pytest.approx(50.0)


def test_thermal_score_golden() -> None:
    assert thermal_score(24.0) == pytest.approx(100.0)
    assert thermal_score(96.0) == pytest.approx(100.0 * math.exp(-1.0))


def test_comms_score_golden() -> None:
    assert comms_score(0.8, 0.4) == pytest.approx(70.0)


def test_terrain_score_golden() -> None:
    assert terrain_score(5.0) == pytest.approx(100.0)
    assert terrain_score(10.0) == pytest.approx(50.0)
    assert terrain_score(20.0) == pytest.approx(0.0)


def test_feasibility_score_golden() -> None:
    assert feasibility_score(50.0, 100.0, 70.0, 100.0) == pytest.approx(75.0)


def test_class_b_sites_return_null_terrain_and_feasibility() -> None:
    assert terrain_score(None) is None
    assert feasibility_score(50.0, 100.0, 70.0, None) is None
    assert power_score(0.6, 0.4) is not None
    assert thermal_score(24.0) is not None
    assert comms_score(0.8, 0.4) is not None


def test_risk_warnings_are_deterministic() -> None:
    warnings = risk_warnings(
        longest_dark_streak_hours=25.0,
        dte_fraction=0.2,
        mean_slope_deg=11.0,
        mean_horizontal_power_factor=0.05,
        mean_sun_elevation_deg=2.0,
    )
    assert warnings == [
        "Longest dark streak exceeds 24 hours.",
        "Direct-to-Earth fraction is below 0.25.",
        "Mean slope exceeds 10 degrees.",
        "Horizontal array power is below 0.10 at low mean elevation.",
    ]


def test_risk_warnings_stay_quiet_under_thresholds() -> None:
    warnings = risk_warnings(
        longest_dark_streak_hours=24.0,
        dte_fraction=0.25,
        mean_slope_deg=10.0,
        mean_horizontal_power_factor=0.10,
        mean_sun_elevation_deg=5.0,
    )
    assert warnings == []
