"""Unit tests for domain lunar constants and coordinate guardrails (ARCH-03)."""

from __future__ import annotations

import math

import pytest

from src.domain.constants import (
    MOON_RADIUS_KM,
    POLE_LAT_CLAMP_DEG,
    SOLAR_CONSTANT_W_M2,
    SUN_ANGULAR_RADIUS_DEG,
    az_elev_to_enu_unit_vector,
    clamp_lunar_latitude_deg,
    validate_selenographic_coords,
)


def test_lunar_physical_constants() -> None:
    """Verify canonical NASA/IAU lunar constants match specification."""
    assert MOON_RADIUS_KM == pytest.approx(1737.4)
    assert SOLAR_CONSTANT_W_M2 == pytest.approx(1361.0)
    assert SUN_ANGULAR_RADIUS_DEG == pytest.approx(0.267)


def test_exact_south_and_north_pole_clamping() -> None:
    """Clamp +-90.0 deg away from pole singularity to +-89.9999 deg."""
    assert clamp_lunar_latitude_deg(-90.0) == pytest.approx(-POLE_LAT_CLAMP_DEG)
    assert clamp_lunar_latitude_deg(90.0) == pytest.approx(POLE_LAT_CLAMP_DEG)
    assert clamp_lunar_latitude_deg(-89.45) == pytest.approx(-89.45)


def test_validate_selenographic_coords_bounds() -> None:
    """Reject out-of-range or non-finite selenographic coordinates."""
    lat, lon = validate_selenographic_coords(-90.0, 180.0)
    assert lat == pytest.approx(-89.9999)
    assert lon == pytest.approx(180.0)

    with pytest.raises(ValueError):
        validate_selenographic_coords(-90.5, 0.0)
    with pytest.raises(ValueError):
        validate_selenographic_coords(0.0, 181.0)
    with pytest.raises(ValueError):
        validate_selenographic_coords(math.nan, 10.0)


def test_az_elev_to_enu_unit_vector_cardinal_axes() -> None:
    """Verify 0 deg = Local North (+Y ENU) and 90 deg = Local East (+X ENU)."""
    e_n, n_n, u_n = az_elev_to_enu_unit_vector(0.0, 0.0)
    assert (e_n, n_n, u_n) == pytest.approx((0.0, 1.0, 0.0), abs=1e-9)

    e_e, n_e, u_e = az_elev_to_enu_unit_vector(90.0, 0.0)
    assert (e_e, n_e, u_e) == pytest.approx((1.0, 0.0, 0.0), abs=1e-9)

    e_z, n_z, u_z = az_elev_to_enu_unit_vector(123.0, 90.0)
    assert (e_z, n_z, u_z) == pytest.approx((0.0, 0.0, 1.0), abs=1e-9)
