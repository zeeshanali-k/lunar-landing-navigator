"""Solar illumination and array power using the REQ-09 linear approximation."""

from __future__ import annotations

import math

from src.domain.constants import SOLAR_CONSTANT_W_M2, SUN_ANGULAR_RADIUS_DEG

HORIZONTAL_FIXED = "horizontal_fixed"
VERTICAL_FIXED = "vertical_fixed"
VERTICAL_TRACKING = "vertical_tracking"
_ARRAY_TYPES = {HORIZONTAL_FIXED, VERTICAL_FIXED, VERTICAL_TRACKING}


def _clamp_unit(value: float) -> float:
    """Clamp a value into the inclusive ``[0, 1]`` range."""
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return float(value)


def sun_occultation_margin_deg(sun_elev_deg: float, horizon_elev_deg: float) -> float:
    """Return ``sun_elev - H(sun_az) + r_sun``.

    The margin is positive while the Sun has any visible disk, and zero or negative
    once the disk is fully occulted; it is the continuous signal whose zero-crossing
    marks sunrise and sunset (REQ-09).
    """
    return float(sun_elev_deg) - float(horizon_elev_deg) + SUN_ANGULAR_RADIUS_DEG


def sun_visible_fraction(sun_elev_deg: float, horizon_elev_deg: float) -> float:
    """Return ``f_sun`` from the REQ-09 linear occultation approximation."""
    fraction = sun_occultation_margin_deg(sun_elev_deg, horizon_elev_deg) / (
        2.0 * SUN_ANGULAR_RADIUS_DEG
    )
    return _clamp_unit(fraction)


def is_sunlit(sun_visible_fraction: float) -> bool:
    """Return whether the Sun has any visible disk (``f_sun > 0``)."""
    return float(sun_visible_fraction) > 0.0


def solar_power_factor(
    sun_elev_deg: float,
    sun_az_deg: float,
    array_type: str,
    fixed_array_azimuth_deg: float,
    sun_visible_fraction: float,
) -> float:
    """Return the REQ-09 solar power factor for a solar-array mode."""
    if array_type not in _ARRAY_TYPES:
        raise ValueError(f"unknown solar_array_type {array_type!r}")

    f_sun = float(sun_visible_fraction)
    elev_rad = math.radians(sun_elev_deg)
    if array_type == HORIZONTAL_FIXED:
        factor = f_sun * max(0.0, math.sin(elev_rad))
    elif array_type == VERTICAL_FIXED:
        az_delta_rad = math.radians(sun_az_deg - fixed_array_azimuth_deg)
        factor = f_sun * max(0.0, math.cos(elev_rad) * math.cos(az_delta_rad))
    else:  # VERTICAL_TRACKING
        factor = f_sun * max(0.0, math.cos(elev_rad))
    return _clamp_unit(factor)


def irradiance_w_m2(solar_power_factor: float) -> float:
    """Return ``1361 * solar_power_factor`` (REQ-09)."""
    return SOLAR_CONSTANT_W_M2 * float(solar_power_factor)
