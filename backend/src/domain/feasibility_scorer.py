"""Mission aggregation and feasibility scoring (REQ-09).

Aggregates are computed only over mission samples; the countdown lookahead exists
solely for transition detection and is never included here. Streaks are clipped to
the mission window because they run over the supplied mission-sample array.

Class B (limb-only) sites have no terrain score, so ``terrain_score`` and
``feasibility_score`` are ``None``; ``P``, ``T``, and ``C`` are still reported.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

DARK_STREAK_WARNING_HOURS = 24.0
DTE_FRACTION_WARNING = 0.25
MEAN_SLOPE_WARNING_DEG = 10.0
HORIZONTAL_POWER_WARNING = 0.10
LOW_ELEVATION_WARNING_DEG = 5.0


def _clamp_unit(value: float) -> float:
    return 0.0 if value < 0.0 else 1.0 if value > 1.0 else float(value)


def hours_in_state(count: int, step_hours: float) -> float:
    """Return ``count * step_hours`` (REQ-09)."""
    return float(count) * float(step_hours)


def fraction(count: int, total: int) -> float:
    """Return ``count / total`` (REQ-09)."""
    if total <= 0:
        raise ValueError("total must be positive")
    return float(count) / float(total)


def longest_consecutive_run(values: Sequence[bool], target: bool = True) -> int:
    """Return the length of the longest consecutive run of ``target`` values."""
    longest = 0
    current = 0
    for value in values:
        if bool(value) is target:
            current += 1
            longest = max(longest, current)
        else:
            current = 0
    return longest


def mean(values: Sequence[float]) -> float:
    """Return the arithmetic mean over ``values`` (darkness included)."""
    if not values:
        raise ValueError("cannot average an empty sequence")
    return sum(float(value) for value in values) / len(values)


def power_score(sunlit_fraction: float, mean_solar_power_factor: float) -> float:
    """Return ``P = 100 * (0.5*sunlit_fraction + 0.5*mean_solar_power_factor)``."""
    return 100.0 * (0.5 * float(sunlit_fraction) + 0.5 * float(mean_solar_power_factor))


def thermal_score(longest_dark_streak_hours: float) -> float:
    """Return ``T = 100 * exp(-max(0, streak - 24) / 72)``."""
    excess = max(0.0, float(longest_dark_streak_hours) - DARK_STREAK_WARNING_HOURS)
    return 100.0 * math.exp(-excess / 72.0)


def comms_score(dte_fraction: float, overlap_fraction: float) -> float:
    """Return ``C = 100 * (0.75*dte_fraction + 0.25*overlap_fraction)``."""
    return 100.0 * (0.75 * float(dte_fraction) + 0.25 * float(overlap_fraction))


def terrain_score(mean_slope_deg: float | None) -> float | None:
    """Return ``R = 100 * clamp((15 - mean_slope) / 10, 0, 1)``, or ``None`` for Class B."""
    if mean_slope_deg is None:
        return None
    return 100.0 * _clamp_unit((15.0 - float(mean_slope_deg)) / 10.0)


def feasibility_score(
    power: float,
    thermal: float,
    comms: float,
    terrain: float | None,
) -> float | None:
    """Return the weighted feasibility score, or ``None`` when terrain is unavailable."""
    if terrain is None:
        return None
    return 0.35 * float(power) + 0.25 * float(thermal) + 0.25 * float(comms) + 0.15 * float(terrain)


def risk_warnings(
    *,
    longest_dark_streak_hours: float,
    dte_fraction: float,
    mean_slope_deg: float | None,
    mean_horizontal_power_factor: float | None,
    mean_sun_elevation_deg: float | None,
) -> list[str]:
    """Return fixed deterministic risk warnings for crossed REQ-09 thresholds."""
    warnings: list[str] = []
    if longest_dark_streak_hours > DARK_STREAK_WARNING_HOURS:
        warnings.append("Longest dark streak exceeds 24 hours.")
    if dte_fraction < DTE_FRACTION_WARNING:
        warnings.append("Direct-to-Earth fraction is below 0.25.")
    if mean_slope_deg is not None and mean_slope_deg > MEAN_SLOPE_WARNING_DEG:
        warnings.append("Mean slope exceeds 10 degrees.")
    if (
        mean_horizontal_power_factor is not None
        and mean_horizontal_power_factor < HORIZONTAL_POWER_WARNING
        and mean_sun_elevation_deg is not None
        and mean_sun_elevation_deg < LOW_ELEVATION_WARNING_DEG
    ):
        warnings.append("Horizontal array power is below 0.10 at low mean elevation.")
    return warnings
