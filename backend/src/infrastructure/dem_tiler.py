"""Project the LOLA south-polar DEM into ``local_enu`` patches and slopes (REQ-08).

The DEM is a south polar stereographic grid with the pole at the projection
offset. A ``local_enu`` patch therefore rotates against the pixel axes by the
site longitude; every sample is projected to its true latitude and longitude
before bilinear resampling, so ``0 deg = North`` and ``90 deg = East`` hold at
every site.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from src.domain.constants import MOON_RADIUS_M
from src.infrastructure.pds_dem import PdsLabel
from src.infrastructure.raycaster import destination_latlon

GRID_SIZE = 128
GRID_STEP = GRID_SIZE - 1
EXTENT_M = 40000.0
SPACING_M = EXTENT_M / GRID_STEP
MIN_COVERED_LATITUDE_DEG = -90.0
MAX_COVERED_LATITUDE_DEG = -80.0


class TilingError(ValueError):
    """Raised when a projection is unexpected or a sample leaves the DEM."""


@dataclass(frozen=True)
class SouthPolarGrid:
    """The pixel geometry of a verified south polar stereographic DEM."""

    lines: int
    samples: int
    map_scale_m: float
    line_offset: float
    sample_offset: float
    center_longitude_deg: float
    radius_m: float = MOON_RADIUS_M

    @classmethod
    def from_label(cls, label: PdsLabel, *, radius_m: float = MOON_RADIUS_M) -> SouthPolarGrid:
        """Build the grid geometry from a validated PDS3 label."""
        if label.map_projection_type != "POLAR STEREOGRAPHIC":
            raise TilingError(f"unexpected projection {label.map_projection_type!r}")
        if label.latitude_type != "PLANETOCENTRIC":
            raise TilingError(f"unexpected latitude type {label.latitude_type!r}")
        if abs(label.center_latitude_deg + 90.0) > 1e-9:
            raise TilingError("grid is not centred on the south pole")
        return cls(
            lines=label.lines,
            samples=label.line_samples,
            map_scale_m=label.map_scale_m_per_px,
            line_offset=label.line_projection_offset_px,
            sample_offset=label.sample_projection_offset_px,
            center_longitude_deg=label.center_longitude_deg,
            radius_m=radius_m,
        )


def latlon_to_pixel(
    grid: SouthPolarGrid,
    lat_deg: np.ndarray | float,
    lon_deg: np.ndarray | float,
) -> tuple[np.ndarray, np.ndarray]:
    """Return fractional ``(line, sample)`` for selenographic coordinates."""
    phi = np.radians(np.asarray(lat_deg, dtype=float))
    theta = np.radians(np.asarray(lon_deg, dtype=float) - grid.center_longitude_deg)
    radius = 2.0 * grid.radius_m * np.tan(np.pi / 4.0 + phi / 2.0)
    x_m = radius * np.sin(theta)
    y_m = radius * np.cos(theta)
    return grid.line_offset - y_m / grid.map_scale_m, grid.sample_offset + x_m / grid.map_scale_m


def pixel_to_latlon(
    grid: SouthPolarGrid,
    line: np.ndarray | float,
    sample: np.ndarray | float,
) -> tuple[np.ndarray, np.ndarray]:
    """Return selenographic ``(lat_deg, lon_deg)`` for fractional pixel coordinates."""
    x_m = (np.asarray(sample, dtype=float) - grid.sample_offset) * grid.map_scale_m
    y_m = (grid.line_offset - np.asarray(line, dtype=float)) * grid.map_scale_m
    radius = np.hypot(x_m, y_m)
    lat_deg = np.degrees(2.0 * np.arctan(radius / (2.0 * grid.radius_m))) - 90.0
    lon_deg = (np.degrees(np.arctan2(x_m, y_m)) + grid.center_longitude_deg + 180.0) % 360.0 - 180.0
    return lat_deg, lon_deg


def coverage_mask(
    grid: SouthPolarGrid,
    lat_deg: np.ndarray,
    lon_deg: np.ndarray,
) -> tuple[np.ndarray, tuple[np.ndarray, np.ndarray]]:
    """Return the in-coverage mask and the fractional pixel coordinates."""
    line, sample = latlon_to_pixel(grid, lat_deg, lon_deg)
    inside = (
        (lat_deg >= MIN_COVERED_LATITUDE_DEG)
        & (lat_deg <= MAX_COVERED_LATITUDE_DEG)
        & (line >= 0.0)
        & (line <= grid.lines - 1.0)
        & (sample >= 0.0)
        & (sample <= grid.samples - 1.0)
    )
    return np.asarray(inside, dtype=bool), (line, sample)


def bilinear(
    elevations_m: np.ndarray, line: np.ndarray | float, sample: np.ndarray | float
) -> np.ndarray:
    """Bilinearly resample the DEM at fractional pixel coordinates."""
    line = np.asarray(line, dtype=float)
    sample = np.asarray(sample, dtype=float)
    if np.any(line < 0.0) or np.any(line > elevations_m.shape[0] - 1.0):
        raise TilingError("line coordinate is outside the DEM")
    if np.any(sample < 0.0) or np.any(sample > elevations_m.shape[1] - 1.0):
        raise TilingError("sample coordinate is outside the DEM")
    line0 = np.floor(line).astype(np.intp)
    sample0 = np.floor(sample).astype(np.intp)
    line1 = np.minimum(line0 + 1, elevations_m.shape[0] - 1)
    sample1 = np.minimum(sample0 + 1, elevations_m.shape[1] - 1)
    frac_line = line - line0
    frac_sample = sample - sample0
    top = (
        elevations_m[line0, sample0] * (1.0 - frac_sample)
        + elevations_m[line0, sample1] * frac_sample
    )
    bottom = (
        elevations_m[line1, sample0] * (1.0 - frac_sample)
        + elevations_m[line1, sample1] * frac_sample
    )
    return np.asarray(top * (1.0 - frac_line) + bottom * frac_line)


def local_offsets(
    grid_size: int = GRID_SIZE, extent_m: float = EXTENT_M
) -> tuple[np.ndarray, np.ndarray]:
    """Return east and north metres for every patch cell, columns west-to-east."""
    spacing = extent_m / (grid_size - 1)
    steps = np.arange(grid_size, dtype=float) - (grid_size - 1) / 2.0
    return steps[None, :] * spacing, steps[:, None] * spacing


def sample_patch(
    elevations_m: np.ndarray,
    grid: SouthPolarGrid,
    lat_deg: float,
    lon_deg: float,
    *,
    grid_size: int = GRID_SIZE,
    extent_m: float = EXTENT_M,
) -> np.ndarray:
    """Return the ``rows x columns`` local patch, rows south-to-north."""
    east_m, north_m = local_offsets(grid_size, extent_m)
    distance_m = np.hypot(east_m, north_m)
    azimuth_deg = np.degrees(np.arctan2(east_m, north_m))
    patch_lat, patch_lon = destination_latlon(
        lat_deg, lon_deg, azimuth_deg, distance_m, grid.radius_m
    )
    inside, (line, sample) = coverage_mask(grid, patch_lat, patch_lon)
    if not np.all(inside):
        raise TilingError(f"patch at ({lat_deg}, {lon_deg}) leaves DEM coverage")
    return bilinear(elevations_m, line, sample)


def slope_deg(elevations_m: np.ndarray, spacing_m: float = SPACING_M) -> np.ndarray:
    """Return slope magnitude in degrees from the local elevation gradient."""
    gradient_row, gradient_column = np.gradient(np.asarray(elevations_m, dtype=float), spacing_m)
    return np.degrees(np.arctan(np.hypot(gradient_row, gradient_column)))
