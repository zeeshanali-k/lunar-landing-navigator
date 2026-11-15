"""Effective horizon geometry from precomputed 360-degree profiles (REQ-08).

A terrain pack stores three ``horizons`` entries, one per observer height, with
``azimuth_deg`` running ``[0, 1, ..., 359]`` and matching ``terrain_elev_deg`` and
``geometric_limb_deg`` arrays. The effective horizon at an azimuth is the larger of
the terrain silhouette and the geometric limb (REQ-08)::

    H(az) = max(terrain_elev_deg, geometric_limb_deg)

For a non-integer azimuth the profile is interpolated linearly around the 1-degree
wrap, so ``359.5 deg`` blends between azimuth ``359`` and ``0``.
"""

from __future__ import annotations

import math
from collections.abc import Sequence


def effective_horizon_elev_deg(terrain_elev_deg: float, geometric_limb_deg: float) -> float:
    """Return ``max(terrain_elev_deg, geometric_limb_deg)`` (REQ-08)."""
    return max(float(terrain_elev_deg), float(geometric_limb_deg))


def _interpolate_azimuth_series(azimuth_deg: float, values: Sequence[float]) -> float:
    """Linearly interpolate a 360-sample series at a wrapped azimuth in degrees."""
    if len(values) != 360:
        raise ValueError(f"horizon series must have 360 samples; got {len(values)}")
    wrapped = azimuth_deg % 360.0
    lower = math.floor(wrapped)
    upper = (lower + 1) % 360
    fraction = wrapped - lower
    return float(values[lower]) + fraction * (float(values[upper]) - float(values[lower]))


def horizon_elevation_at_azimuth_deg(
    azimuth_deg: float,
    terrain_elev_deg: Sequence[float],
    geometric_limb_deg: Sequence[float],
) -> float:
    """Return the effective horizon elevation at ``azimuth_deg`` (REQ-08)."""
    terrain = _interpolate_azimuth_series(azimuth_deg, terrain_elev_deg)
    limb = _interpolate_azimuth_series(azimuth_deg, geometric_limb_deg)
    return effective_horizon_elev_deg(terrain, limb)
