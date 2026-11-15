"""Forward countdown detection over a uniform-step mission/lookahead grid (REQ-09).

Crossings are detected on continuous margin signals, not on the clamped
visibility booleans, so the crossing time can be interpolated linearly between
two bracketing samples:

- Solar transitions use ``sun_occultation_margin_deg``.
- DTE transitions use ``dte_margin_deg``.

Every returned time is measured in hours from the sample at ``start_index`` and
is ``None`` when no transition occurs inside the supplied grid.
"""

from __future__ import annotations

from collections.abc import Sequence


def next_crossing_hours(
    values: Sequence[float],
    start_index: int,
    step_hours: float,
    *,
    rising: bool,
    threshold: float = 0.0,
) -> float | None:
    """Return hours until the next crossing of ``threshold``, or ``None``.

    Args:
        values: Uniform-step signal, sampled at ``step_hours`` intervals.
        start_index: Index of the current sample; the crossing is strictly future.
        step_hours: Hours between adjacent samples.
        rising: When true, look for a transition from ``<= threshold`` to
            ``> threshold``; otherwise from ``> threshold`` to ``<= threshold``.
        threshold: Crossing value, ``0.0`` by default.

    Returns:
        Hours from ``values[start_index]`` to the crossing, or ``None``.
    """
    if step_hours <= 0:
        raise ValueError("step_hours must be positive")
    if start_index < 0 or start_index >= len(values):
        raise ValueError("start_index is outside the signal")

    for index in range(start_index, len(values) - 1):
        before = float(values[index]) - threshold
        after = float(values[index + 1]) - threshold
        if rising:
            if before <= 0.0 < after:
                fraction = -before / (after - before)
                return (index - start_index + fraction) * step_hours
        else:
            if before > 0.0 >= after:
                fraction = before / (before - after)
                return (index - start_index + fraction) * step_hours
    return None


def next_events_hours(
    sun_margin_deg: Sequence[float],
    dte_margin_deg: Sequence[float],
    start_index: int,
    step_hours: float,
) -> tuple[float | None, float | None, float | None, float | None]:
    """Return ``(sunset, sunrise, earthset, earthrise)`` hours from ``start_index``."""
    if len(sun_margin_deg) != len(dte_margin_deg):
        raise ValueError("sun and DTE margin signals must have equal length")
    sunset = next_crossing_hours(sun_margin_deg, start_index, step_hours, rising=False)
    sunrise = next_crossing_hours(sun_margin_deg, start_index, step_hours, rising=True)
    earthset = next_crossing_hours(dte_margin_deg, start_index, step_hours, rising=False)
    earthrise = next_crossing_hours(dte_margin_deg, start_index, step_hours, rising=True)
    return sunset, sunrise, earthset, earthrise
