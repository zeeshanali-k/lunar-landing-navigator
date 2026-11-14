"""Physical lunar constants and coordinate guardrails (ARCH-03).

Domain modules depend exclusively on Python's standard library.
Coordinate convention:
- Selenographic East-positive: lat_deg in [-90, +90], lon_deg in [-180, +180].
- Topocentric azimuth: 0 deg = Local North, 90 deg = Local East,
  180 deg = Local South, 270 deg = Local West.
"""

from __future__ import annotations

import math

MOON_RADIUS_KM: float = 1737.4
MOON_RADIUS_M: float = 1_737_400.0
SOLAR_CONSTANT_W_M2: float = 1361.0
SUN_ANGULAR_RADIUS_DEG: float = 0.267
EARTH_ANGULAR_RADIUS_DEG: float = 0.95
POLE_LAT_CLAMP_DEG: float = 89.9999
SOLAR_CONJUNCTION_THRESHOLD_DEG: float = 1.5
MIN_SUNLIT_DISK_FRACTION: float = 0.05


def clamp_lunar_latitude_deg(lat_deg: float) -> float:
    """Clamp latitude away from exact +-90 deg so local North remains well-defined.

    Args:
        lat_deg: Selenographic latitude in degrees [-90.0, +90.0].

    Returns:
        Clamped latitude in degrees within [-89.9999, +89.9999].
    """
    if lat_deg > POLE_LAT_CLAMP_DEG:
        return POLE_LAT_CLAMP_DEG
    if lat_deg < -POLE_LAT_CLAMP_DEG:
        return -POLE_LAT_CLAMP_DEG
    return float(lat_deg)


def validate_selenographic_coords(lat_deg: float, lon_deg: float) -> tuple[float, float]:
    """Validate selenographic coordinates (degrees) and clamp polar singularities.

    Args:
        lat_deg: Selenographic latitude in degrees [-90.0, +90.0].
        lon_deg: East-positive selenographic longitude in degrees [-180.0, +180.0].

    Returns:
        Tuple of (clamped_lat_deg, lon_deg) in degrees.

    Raises:
        ValueError: If coordinates fall outside valid selenographic bounds or are NaN/inf.
    """
    if not (math.isfinite(lat_deg) and math.isfinite(lon_deg)):
        raise ValueError("Coordinates must be finite floating-point degrees.")
    if lat_deg < -90.0 or lat_deg > 90.0:
        raise ValueError(f"lat_deg must be within [-90, 90] degrees; got {lat_deg}.")
    if lon_deg < -180.0 or lon_deg > 180.0:
        raise ValueError(f"lon_deg must be within [-180, 180] degrees; got {lon_deg}.")
    return clamp_lunar_latitude_deg(lat_deg), float(lon_deg)


def az_elev_to_enu_unit_vector(az_deg: float, elev_deg: float) -> tuple[float, float, float]:
    """Convert topocentric (azimuth_deg, elevation_deg) into a local ENU unit vector.

    Azimuth convention: 0 deg = Local North, 90 deg = Local East.

    Args:
        az_deg: Topocentric azimuth angle in degrees clockwise from Local North.
        elev_deg: Elevation angle above local horizontal plane in degrees.

    Returns:
        Unit vector (east, north, up) in meters/dimensionless local ENU components.
    """
    az_rad = math.radians(az_deg)
    elev_rad = math.radians(elev_deg)
    cos_elev = math.cos(elev_rad)
    east = cos_elev * math.sin(az_rad)
    north = cos_elev * math.cos(az_rad)
    up = math.sin(elev_rad)
    return east, north, up
