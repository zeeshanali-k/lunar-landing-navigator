"""Direct-to-Earth communication visibility (REQ-09).

``min_comms_elev_deg`` is clearance *above the effective horizon*, not elevation
above the horizontal plane. Clearance equality passes the geometric gate. DTE is
then suppressed during solar conjunction (Sun-Earth separation below 1.5 degrees).
"""

from __future__ import annotations

import math

from src.domain.constants import SOLAR_CONJUNCTION_THRESHOLD_DEG


def earth_clearance_deg(earth_elev_deg: float, horizon_elev_deg: float) -> float:
    """Return ``earth_elev - H(earth_az)``, the clearance above the effective horizon."""
    return float(earth_elev_deg) - float(horizon_elev_deg)


def is_dte_geometric(earth_clearance_deg: float, min_comms_elev_deg: float) -> bool:
    """Return whether clearance meets the threshold; equality passes (REQ-09)."""
    return float(earth_clearance_deg) >= float(min_comms_elev_deg)


def sun_earth_separation_deg(
    sun_elev_deg: float,
    earth_elev_deg: float,
    sun_az_deg: float,
    earth_az_deg: float,
) -> float:
    """Return the topocentric angular separation between the Sun and Earth."""
    sun_zenith_rad = math.radians(90.0 - float(sun_elev_deg))
    earth_zenith_rad = math.radians(90.0 - float(earth_elev_deg))
    az_delta_rad = math.radians(float(sun_az_deg) - float(earth_az_deg))

    cos_sep = math.cos(sun_zenith_rad) * math.cos(earth_zenith_rad) + math.sin(
        sun_zenith_rad
    ) * math.sin(earth_zenith_rad) * math.cos(az_delta_rad)
    cos_sep = max(-1.0, min(1.0, cos_sep))
    return math.degrees(math.acos(cos_sep))


def is_solar_conjunction(separation_deg: float) -> bool:
    """Return whether the Sun-Earth separation is below the conjunction threshold."""
    return float(separation_deg) < SOLAR_CONJUNCTION_THRESHOLD_DEG


def dte_margin_deg(
    earth_clearance_deg: float,
    min_comms_elev_deg: float,
    separation_deg: float,
) -> float:
    """Return the combined DTE availability margin (REQ-09).

    DTE is available when both ``clearance - min_comms`` and
    ``separation - conjunction_threshold`` are non-negative, so the binding margin
    is their minimum. Its zero-crossing marks earthset and earthrise.
    """
    clearance_margin = float(earth_clearance_deg) - float(min_comms_elev_deg)
    conjunction_margin = float(separation_deg) - SOLAR_CONJUNCTION_THRESHOLD_DEG
    return min(clearance_margin, conjunction_margin)


def is_dte_available(
    earth_clearance_deg: float,
    min_comms_elev_deg: float,
    separation_deg: float,
) -> bool:
    """Return whether DTE is geometrically clear and not in solar conjunction."""
    return is_dte_geometric(earth_clearance_deg, min_comms_elev_deg) and not is_solar_conjunction(
        separation_deg
    )
