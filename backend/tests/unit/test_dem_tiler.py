"""Tests for the south-polar DEM projection, tiling, and slopes (DATA-005)."""

from __future__ import annotations

import numpy as np
import pytest

from src.domain.constants import MOON_RADIUS_M
from src.infrastructure.dem_tiler import (
    GRID_SIZE,
    SPACING_M,
    SouthPolarGrid,
    TilingError,
    bilinear,
    coverage_mask,
    latlon_to_pixel,
    pixel_to_latlon,
    sample_patch,
    slope_deg,
)

SMALL_OFFSET = 200.0
SMALL_SCALE = 80.0
SMALL_SITE_LAT = -89.6
PATCH_EXTENT_M = 4000.0


def small_grid() -> SouthPolarGrid:
    """Return a compact polar grid covering roughly 16 km from the south pole."""
    return SouthPolarGrid(
        lines=401,
        samples=401,
        map_scale_m=SMALL_SCALE,
        line_offset=SMALL_OFFSET,
        sample_offset=SMALL_OFFSET,
        center_longitude_deg=0.0,
        radius_m=MOON_RADIUS_M,
    )


def full_grid() -> SouthPolarGrid:
    """Return the geometry of the real 7600 x 7600 LOLA product."""
    return SouthPolarGrid(
        lines=7600,
        samples=7600,
        map_scale_m=80.0,
        line_offset=3799.5,
        sample_offset=3799.5,
        center_longitude_deg=0.0,
        radius_m=MOON_RADIUS_M,
    )


def plane(grid: SouthPolarGrid, axis: str) -> np.ndarray:
    """Return a DEM whose elevation is the projected east or north coordinate."""
    lines = np.arange(grid.lines, dtype=float)[:, None]
    samples = np.arange(grid.samples, dtype=float)[None, :]
    if axis == "east":
        values = (samples - grid.sample_offset) * grid.map_scale_m
    else:
        values = (grid.line_offset - lines) * grid.map_scale_m
    return np.broadcast_to(values, (grid.lines, grid.samples))


def test_the_pole_sits_at_the_projection_offset() -> None:
    lat, lon = pixel_to_latlon(full_grid(), 3799.5, 3799.5)
    assert float(lat) == pytest.approx(-90.0, abs=1e-9)
    assert float(lon) == pytest.approx(0.0, abs=1e-9)


def test_probed_pixels_place_east_right_and_west_left() -> None:
    grid = full_grid()
    east_lat, east_lon = pixel_to_latlon(grid, 3799.5, 3899.5)
    west_lat, west_lon = pixel_to_latlon(grid, 3799.5, 3699.5)
    north_lat, north_lon = pixel_to_latlon(grid, 3699.5, 3799.5)
    assert float(east_lon) == pytest.approx(90.0, abs=1e-9)
    assert float(west_lon) == pytest.approx(-90.0, abs=1e-9)
    assert float(north_lon) == pytest.approx(0.0, abs=1e-9)
    assert float(east_lat) == pytest.approx(-89.7362, abs=1e-4)
    assert float(west_lat) == pytest.approx(float(north_lat), abs=1e-12)


def test_latitude_pixel_round_trip() -> None:
    grid = full_grid()
    for lat_deg, lon_deg in ((-82.26, -54.58), (-88.48, -88.34), (-85.28, 53.27)):
        line, sample = latlon_to_pixel(grid, lat_deg, lon_deg)
        back_lat, back_lon = pixel_to_latlon(grid, line, sample)
        assert float(back_lat) == pytest.approx(lat_deg, abs=1e-9)
        assert float(back_lon) == pytest.approx(lon_deg, abs=1e-9)


def test_coverage_stops_at_eighty_degrees_south() -> None:
    grid = full_grid()
    inside, _ = coverage_mask(grid, np.array([-80.1, -79.9]), np.array([0.0, 0.0]))
    assert bool(inside[0]) is True
    assert bool(inside[1]) is False


def test_bilinear_hits_corners_and_midpoint() -> None:
    elevations = np.array([[0.0, 2.0], [4.0, 6.0]])
    assert float(bilinear(elevations, 0.0, 0.0)) == 0.0
    assert float(bilinear(elevations, 1.0, 1.0)) == 6.0
    assert float(bilinear(elevations, 0.5, 0.5)) == 3.0


def test_bilinear_rejects_out_of_bounds_coordinates() -> None:
    elevations = np.zeros((2, 2))
    with pytest.raises(TilingError):
        bilinear(elevations, -0.1, 0.0)
    with pytest.raises(TilingError):
        bilinear(elevations, 0.0, 2.5)


def test_patch_columns_follow_local_east() -> None:
    grid = small_grid()
    patch = sample_patch(
        plane(grid, "east"),
        grid,
        SMALL_SITE_LAT,
        0.0,
        grid_size=GRID_SIZE,
        extent_m=PATCH_EXTENT_M,
    )
    assert patch.shape == (GRID_SIZE, GRID_SIZE)
    row = patch[GRID_SIZE // 2]
    assert np.all(np.diff(row) > 0.0)
    east_delta = row[100] - row[28]
    assert east_delta == pytest.approx(
        36.5 * PATCH_EXTENT_M / 127 + 35.5 * PATCH_EXTENT_M / 127, rel=0.01
    )


def test_patch_rows_follow_local_north() -> None:
    grid = small_grid()
    patch = sample_patch(
        plane(grid, "north"),
        grid,
        SMALL_SITE_LAT,
        0.0,
        grid_size=GRID_SIZE,
        extent_m=PATCH_EXTENT_M,
    )
    column = patch[:, GRID_SIZE // 2]
    assert np.all(np.diff(column) > 0.0)


def test_patch_rows_do_not_mirror_east() -> None:
    grid = small_grid()
    patch = sample_patch(
        plane(grid, "east"),
        grid,
        SMALL_SITE_LAT,
        0.0,
        grid_size=GRID_SIZE,
        extent_m=PATCH_EXTENT_M,
    )
    assert patch[GRID_SIZE // 2, 100] > patch[GRID_SIZE // 2, 28]
    assert patch[100, GRID_SIZE // 2] == pytest.approx(patch[28, GRID_SIZE // 2], abs=5.0)


def test_patch_outside_coverage_raises() -> None:
    with pytest.raises(TilingError):
        sample_patch(np.zeros((401, 401)), small_grid(), -89.0, 0.0, grid_size=8, extent_m=20000.0)


def test_slope_recovers_a_constant_gradient() -> None:
    spacing = 2.0
    columns = np.arange(10, dtype=float) * spacing
    ramp = np.tile(columns * 0.5, (6, 1))
    slopes = slope_deg(ramp, spacing)
    assert np.allclose(slopes, np.degrees(np.arctan(0.5)), atol=1e-9)
    assert slopes.shape == ramp.shape


def test_default_spacing_matches_the_closed_definition() -> None:
    assert SPACING_M == pytest.approx(40000.0 / 127.0)
