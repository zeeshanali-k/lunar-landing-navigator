"""Tests for UTC mission sampling and coverage validation (BE-001)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone

import pytest

from src.domain.mission_time import (
    LOOKAHEAD_DAYS,
    EphemerisRangeExceededError,
    MissionTimeError,
    NaiveTimestampError,
    mission_sample_count,
    sample_mission_times,
    validate_mission_window,
)

START = datetime(2026, 1, 1, tzinfo=UTC)
COVERAGE_START = datetime(2026, 1, 1, tzinfo=UTC)
COVERAGE_STOP = datetime(2029, 1, 1, tzinfo=UTC)


@pytest.mark.parametrize(
    ("duration_days", "step_minutes", "expected_count"),
    [
        (7.0, 60, 168),
        (14.0, 60, 336),
        (29.5, 60, 708),
        (7.0, 10, 1008),
        (14.0, 10, 2016),
        (29.5, 10, 4248),
    ],
)
def test_mission_sample_counts(duration_days: float, step_minutes: int, expected_count: int) -> None:
    assert mission_sample_count(duration_days, step_minutes) == expected_count
    assert len(sample_mission_times(START, duration_days, step_minutes)) == expected_count


def test_sampling_is_start_inclusive_and_end_exclusive() -> None:
    samples = sample_mission_times(START, 7.0, 60)
    assert samples[0] == START
    assert samples[-1] == START + timedelta(days=6, hours=23)
    assert all(sample < START + timedelta(days=7) for sample in samples)


def test_ten_minute_step_is_exact() -> None:
    samples = sample_mission_times(START, 7.0, 10)
    assert samples[1] == START + timedelta(minutes=10)
    assert samples[-1] == START + timedelta(days=6, hours=23, minutes=50)


def test_naive_timestamp_is_rejected_for_sampling() -> None:
    with pytest.raises(NaiveTimestampError):
        sample_mission_times(datetime(2026, 1, 1), 7.0, 60)


def test_naive_timestamp_is_rejected_for_window_validation() -> None:
    with pytest.raises(NaiveTimestampError):
        validate_mission_window(
            datetime(2026, 1, 1),
            7.0,
            coverage_start_utc=COVERAGE_START,
            coverage_stop_utc=COVERAGE_STOP,
        )


def test_non_utc_offset_is_rejected() -> None:
    offset = timezone(timedelta(hours=1))
    with pytest.raises(NaiveTimestampError):
        sample_mission_times(datetime(2026, 1, 1, tzinfo=offset), 7.0, 60)


def test_non_integral_sample_count_is_rejected() -> None:
    with pytest.raises(MissionTimeError):
        mission_sample_count(7.3, 60)


def test_valid_window_passes() -> None:
    validate_mission_window(
        datetime(2027, 11, 1, tzinfo=UTC),
        14.0,
        coverage_start_utc=COVERAGE_START,
        coverage_stop_utc=COVERAGE_STOP,
    )


def test_boundary_window_is_valid() -> None:
    start = COVERAGE_STOP - timedelta(days=7.0 + LOOKAHEAD_DAYS)
    validate_mission_window(
        start,
        7.0,
        coverage_start_utc=COVERAGE_START,
        coverage_stop_utc=COVERAGE_STOP,
    )


def test_start_before_coverage_start_raises() -> None:
    with pytest.raises(EphemerisRangeExceededError):
        validate_mission_window(
            COVERAGE_START - timedelta(seconds=1),
            7.0,
            coverage_start_utc=COVERAGE_START,
            coverage_stop_utc=COVERAGE_STOP,
        )


def test_mission_fits_but_lookahead_exceeds_coverage() -> None:
    start = COVERAGE_STOP - timedelta(days=8)
    assert start + timedelta(days=7) <= COVERAGE_STOP
    with pytest.raises(EphemerisRangeExceededError):
        validate_mission_window(
            start,
            7.0,
            coverage_start_utc=COVERAGE_START,
            coverage_stop_utc=COVERAGE_STOP,
        )


def test_window_just_past_lookahead_boundary_raises() -> None:
    start = COVERAGE_STOP - timedelta(days=7.0 + LOOKAHEAD_DAYS) + timedelta(seconds=1)
    with pytest.raises(EphemerisRangeExceededError):
        validate_mission_window(
            start,
            7.0,
            coverage_start_utc=COVERAGE_START,
            coverage_stop_utc=COVERAGE_STOP,
        )
