"""Linear and circular interpolation over a fixed-step ephemeris grid (REQ-07).

Elevation is interpolated linearly. Azimuth uses the shortest signed angular
delta so a wrap across 359 degrees to 0 degrees interpolates through 359.5
degrees rather than swinging through 180 degrees.

No extrapolation is performed: a target outside ``[start, start + (n-1)*step]``
raises :class:`InterpolationError`.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from datetime import datetime, timedelta


class InterpolationError(ValueError):
    """Raised when interpolation is requested outside the sample grid."""


def shortest_signed_azimuth_delta_deg(start_deg: float, end_deg: float) -> float:
    """Return the shortest signed angular delta from ``start_deg`` to ``end_deg``.

    The result is in ``(-180, 180]``, so a positive value means clockwise and a
    negative value means counter-clockwise.
    """
    return (end_deg - start_deg + 180.0) % 360.0 - 180.0


def interpolate_linear(start_value: float, end_value: float, fraction: float) -> float:
    """Linearly interpolate ``fraction`` of the way from start to end."""
    return start_value + fraction * (end_value - start_value)


def interpolate_azimuth_deg(start_az_deg: float, end_az_deg: float, fraction: float) -> float:
    """Interpolate azimuth along the shortest signed arc and normalise to ``[0, 360)``."""
    delta_deg = shortest_signed_azimuth_delta_deg(start_az_deg, end_az_deg)
    return (start_az_deg + fraction * delta_deg) % 360.0


def interpolate_grid(
    target_utc: datetime,
    start_utc: datetime,
    step_seconds: int,
    values: Sequence[float],
    *,
    circular: bool = False,
) -> float:
    """Interpolate a fixed-step grid at ``target_utc``.

    Args:
        target_utc: Evaluation time; must lie inside the grid.
        start_utc: Timestamp of ``values[0]``.
        step_seconds: Seconds between adjacent grid samples.
        values: Ordered grid samples.
        circular: When true, interpolate azimuth using the shortest signed arc.

    Returns:
        The interpolated value, or an exact endpoint when ``target_utc`` lands on a node.

    Raises:
        InterpolationError: If the target is before the first sample or after the last.
    """
    if step_seconds <= 0:
        raise InterpolationError(f"step_seconds must be positive; got {step_seconds!r}")
    if not values:
        raise InterpolationError("values must not be empty")

    offset_seconds = (target_utc - start_utc).total_seconds()
    last_seconds = (len(values) - 1) * step_seconds
    if offset_seconds < 0.0 or offset_seconds > last_seconds:
        stop_utc = start_utc + timedelta(seconds=last_seconds)
        raise InterpolationError(
            f"target {target_utc.isoformat()} is outside the grid "
            f"{start_utc.isoformat()}..{stop_utc.isoformat()}"
        )

    index = offset_seconds / step_seconds
    lower = math.floor(index)
    if lower >= len(values) - 1:
        return float(values[-1])

    fraction = index - lower
    if circular:
        return interpolate_azimuth_deg(float(values[lower]), float(values[lower + 1]), fraction)
    return interpolate_linear(float(values[lower]), float(values[lower + 1]), fraction)
