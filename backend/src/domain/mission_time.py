"""UTC mission-time sampling and coverage validation (REQ-07).

Mission samples are timezone-aware UTC only. Sampling is start-inclusive and
end-exclusive::

    t[i] = start + i * step          for i = 0 .. N-1
    N    = duration_days * 1440 / step_minutes

A mission window is valid only when it stays inside ephemeris coverage including
the 15-day countdown lookahead (REQ-07):

    start >= coverage_start
    start + duration_days + LOOKAHEAD_DAYS <= coverage_stop

Anything else raises :class:`EphemerisRangeExceededError`.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta

MINUTES_PER_DAY = 1440
SECONDS_PER_MINUTE = 60
LOOKAHEAD_DAYS: float = 15.0


class MissionTimeError(ValueError):
    """Base class for mission-time validation failures."""


class NaiveTimestampError(MissionTimeError):
    """Raised when a mission timestamp is not UTC-aware (REQ-07)."""


class EphemerisRangeExceededError(MissionTimeError):
    """Raised when a mission window exceeds ephemeris coverage (REQ-07)."""


def _require_utc(value: datetime, label: str) -> None:
    """Reject naive or non-UTC timestamps; every mission time is UTC-only."""
    if value.tzinfo is None or value.utcoffset() != timedelta(0):
        raise NaiveTimestampError(f"{label} must be a UTC-aware datetime; got {value!r}")


def mission_sample_count(duration_days: float, step_minutes: int) -> int:
    """Return ``N = duration_days * 1440 / step_minutes`` for a valid allowlisted pair.

    The REQ-06 allowlists guarantee the result is integral; this function still
    rejects a non-integral count so a bad caller cannot silently truncate it.
    """
    if not math.isfinite(duration_days) or duration_days <= 0:
        raise MissionTimeError(
            f"duration_days must be a positive finite number; got {duration_days!r}"
        )
    if step_minutes <= 0:
        raise MissionTimeError(f"step_minutes must be positive; got {step_minutes!r}")
    samples = duration_days * MINUTES_PER_DAY / step_minutes
    count = int(samples)
    if not math.isclose(samples, count, rel_tol=0.0, abs_tol=1e-9):
        raise MissionTimeError(
            f"duration_days={duration_days} and step_minutes={step_minutes} "
            "do not yield an integral sample count"
        )
    return count


def sample_mission_times(
    start_utc: datetime, duration_days: float, step_minutes: int
) -> list[datetime]:
    """Return the mission sample timestamps, start-inclusive and end-exclusive."""
    _require_utc(start_utc, "start_utc")
    count = mission_sample_count(duration_days, step_minutes)
    step_seconds = step_minutes * SECONDS_PER_MINUTE
    return [start_utc + timedelta(seconds=i * step_seconds) for i in range(count)]


def validate_mission_window(
    start_utc: datetime,
    duration_days: float,
    *,
    coverage_start_utc: datetime,
    coverage_stop_utc: datetime,
) -> None:
    """Validate that a mission, including its 15-day lookahead, fits inside coverage."""
    _require_utc(start_utc, "start_utc")
    _require_utc(coverage_start_utc, "coverage_start_utc")
    _require_utc(coverage_stop_utc, "coverage_stop_utc")

    mission_end_utc = start_utc + timedelta(days=duration_days)
    lookahead_end_utc = mission_end_utc + timedelta(days=LOOKAHEAD_DAYS)
    if start_utc < coverage_start_utc or lookahead_end_utc > coverage_stop_utc:
        raise EphemerisRangeExceededError(
            f"mission window {start_utc.isoformat()}..{mission_end_utc.isoformat()} "
            f"with {LOOKAHEAD_DAYS:g}-day lookahead exceeds coverage "
            f"{coverage_start_utc.isoformat()}..{coverage_stop_utc.isoformat()}"
        )
