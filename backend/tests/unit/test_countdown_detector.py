"""Tests for forward countdown detection (BE-002)."""

from __future__ import annotations

import pytest

from src.domain.countdown_detector import next_crossing_hours, next_events_hours


def test_rising_crossing_is_linearly_interpolated() -> None:
    assert next_crossing_hours([-1.0, -0.5, 0.5, 1.0], 0, 1.0, rising=True) == pytest.approx(1.5)


def test_falling_crossing_is_linearly_interpolated() -> None:
    assert next_crossing_hours([1.0, 0.5, -0.5, -1.0], 0, 1.0, rising=False) == pytest.approx(1.5)


def test_crossing_is_measured_from_the_current_sample() -> None:
    assert next_crossing_hours([1.0, 1.0, 0.0, 0.0], 1, 1.0, rising=False) == pytest.approx(1.0)


def test_step_hours_scale_the_result() -> None:
    assert next_crossing_hours([-1.0, -0.5, 0.5, 1.0], 0, 0.5, rising=True) == pytest.approx(0.75)


def test_missing_transition_returns_none() -> None:
    assert next_crossing_hours([1.0, 1.0, 1.0], 0, 1.0, rising=False) is None
    assert next_crossing_hours([1.0, 1.0, 1.0], 0, 1.0, rising=True) is None


def test_next_events_uses_sun_and_dte_margins() -> None:
    sun_margin = [1.0, 0.5, -0.5, -1.0, 0.0, 1.0]
    dte_margin = [1.0, 0.5, -0.5, -1.0, 0.0, 1.0]
    sunset, sunrise, earthset, earthrise = next_events_hours(sun_margin, dte_margin, 0, 1.0)
    assert sunset == pytest.approx(1.5)
    assert sunrise == pytest.approx(4.0)
    assert earthset == pytest.approx(1.5)
    assert earthrise == pytest.approx(4.0)


def test_invalid_arguments_are_rejected() -> None:
    with pytest.raises(ValueError):
        next_crossing_hours([0.0, 1.0], 0, 0.0, rising=True)
    with pytest.raises(ValueError):
        next_crossing_hours([0.0, 1.0], 5, 1.0, rising=True)
    with pytest.raises(ValueError):
        next_events_hours([0.0, 1.0], [0.0], 0, 1.0)
