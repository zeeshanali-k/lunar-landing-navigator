"""Spherical, atmosphere-free horizon raycasting (REQ-08).

All geometry is closed form: straight lines of sight over a sphere of radius
``MOON_RADIUS_M``. There is no refraction, no atmosphere, and no extrapolation
beyond either the radial sample grid or the DEM footprint.
"""

from __future__ import annotations

import numpy as np

from src.domain.constants import MOON_RADIUS_M

AZIMUTH_COUNT = 360
RADIAL_SAMPLE_COUNT = 240
MIN_RANGE_M = 150.0
MAX_RANGE_M = 120000.0


class RaycastError(ValueError):
    """Raised when geometry is impossible or an input grid is malformed."""


def radial_samples(
    count: int = RADIAL_SAMPLE_COUNT,
    min_range_m: float = MIN_RANGE_M,
    max_range_m: float = MAX_RANGE_M,
) -> np.ndarray:
    """Return the logarithmically spaced radial sample distances in metres."""
    if count < 2 or min_range_m <= 0.0 or max_range_m <= min_range_m:
        raise RaycastError("radial sample grid needs count >= 2 and 0 < min < max")
    if max_range_m > MAX_RANGE_M:
        raise RaycastError(f"maximum range {max_range_m} m exceeds the {MAX_RANGE_M} m ceiling")
    return np.geomspace(min_range_m, max_range_m, count)


def destination_latlon(
    lat_deg: np.ndarray | float,
    lon_deg: np.ndarray | float,
    azimuth_deg: np.ndarray | float,
    distance_m: np.ndarray | float,
    radius_m: float = MOON_RADIUS_M,
) -> tuple[np.ndarray, np.ndarray]:
    """Return the great-circle destination from a start point along an initial bearing.

    Azimuth is clockwise from local North (0 = North, 90 = East). Longitude is
    returned east-positive in ``[-180, 180)``.
    """
    phi1 = np.radians(np.asarray(lat_deg, dtype=float))
    lam1 = np.radians(np.asarray(lon_deg, dtype=float))
    bearing = np.radians(np.asarray(azimuth_deg, dtype=float))
    delta = np.asarray(distance_m, dtype=float) / radius_m
    sin_phi2 = np.sin(phi1) * np.cos(delta) + np.cos(phi1) * np.sin(delta) * np.cos(bearing)
    phi2 = np.arcsin(np.clip(sin_phi2, -1.0, 1.0))
    lam2 = lam1 + np.arctan2(
        np.sin(bearing) * np.sin(delta) * np.cos(phi1),
        np.cos(delta) - np.sin(phi1) * sin_phi2,
    )
    lon2 = (np.degrees(lam2) + 180.0) % 360.0 - 180.0
    return np.degrees(phi2), lon2


def apparent_elevation_deg(
    heights_m: np.ndarray,
    distances_m: np.ndarray,
    observer_elev_m: float,
    radius_m: float = MOON_RADIUS_M,
) -> np.ndarray:
    """Return the apparent elevation of surface samples seen from the observer."""
    psi = np.asarray(distances_m, dtype=float) / radius_m
    surface_radius = radius_m + np.asarray(heights_m, dtype=float)
    numerator = surface_radius * np.cos(psi) - (radius_m + observer_elev_m)
    denominator = surface_radius * np.sin(psi)
    return np.degrees(np.arctan2(numerator, denominator))


def geometric_limb_deg(
    ground_elev_m: float,
    observer_elev_m: float,
    radius_m: float = MOON_RADIUS_M,
) -> float:
    """Return the spherical limb drop for an observer standing on the ground.

    The limb is evaluated from the observer's local ground elevation, so it is
    constant across azimuths and independent of the terrain beyond the observer.
    """
    if observer_elev_m < ground_elev_m:
        raise RaycastError("observer must not be below the local ground")
    ratio = (radius_m + ground_elev_m) / (radius_m + observer_elev_m)
    return float(-np.degrees(np.arccos(np.clip(ratio, -1.0, 1.0))))


def horizon_elevation_deg(
    heights_m: np.ndarray,
    distances_m: np.ndarray,
    *,
    ground_elev_m: float,
    observer_height_m: float,
    radius_m: float = MOON_RADIUS_M,
) -> float:
    """Return the maximum apparent elevation over a radial surface profile."""
    observer_elev = ground_elev_m + observer_height_m
    angles = apparent_elevation_deg(heights_m, distances_m, observer_elev, radius_m)
    finite = angles[np.isfinite(angles)]
    if finite.size == 0:
        raise RaycastError("no finite raycast samples in this direction")
    return float(np.max(finite))


def horizon_profile(
    sample_surface,
    *,
    lat_deg: float,
    lon_deg: float,
    ground_elev_m: float,
    observer_height_m: float,
    azimuth_deg: np.ndarray | None = None,
    distances_m: np.ndarray | None = None,
    radius_m: float = MOON_RADIUS_M,
) -> dict[str, np.ndarray]:
    """Return the 360-degree terrain horizon and spherical limb for one observer height.

    ``sample_surface(lat, lon)`` returns ``(heights_m, valid)``. Samples outside
    the source DEM are marked invalid and are never counted.
    """
    azimuths = np.arange(AZIMUTH_COUNT, dtype=float) if azimuth_deg is None else azimuth_deg
    distances = radial_samples() if distances_m is None else distances_m
    grid_lat, grid_lon = destination_latlon(
        lat_deg, lon_deg, azimuths[:, None], distances[None, :], radius_m
    )
    heights, valid = sample_surface(grid_lat, grid_lon)
    if not np.any(valid):
        raise RaycastError("the surface sampler rejected every radial sample")
    observer_elev = ground_elev_m + observer_height_m
    angles = apparent_elevation_deg(
        np.where(valid, heights, np.nan), distances[None, :], observer_elev, radius_m
    )
    covered = np.any(valid, axis=1)
    if not np.all(covered):
        raise RaycastError("a horizon azimuth has no radial sample inside the source DEM")
    terrain = np.nanmax(angles, axis=1)
    limb = geometric_limb_deg(ground_elev_m, observer_elev, radius_m)
    return {
        "azimuth_deg": azimuths,
        "terrain_elev_deg": terrain,
        "geometric_limb_deg": np.full(azimuths.shape, limb),
    }
