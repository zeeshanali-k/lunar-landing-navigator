"""Full mission evaluation use case (REQ-07, REQ-08, REQ-09)."""

from __future__ import annotations

import math
from datetime import UTC, datetime, timedelta
from typing import Any

from src.application.errors import SiteNotFoundError, SitePackInvalidError
from src.application.pack_repository import load_ephemeris, load_terrain
from src.application.scenario_summary import build_summary
from src.domain.comms_visibility import (
    dte_margin_deg,
    earth_clearance_deg,
    is_dte_geometric,
    is_solar_conjunction,
    sun_earth_separation_deg,
)
from src.domain.constants import MOON_RADIUS_M
from src.domain.countdown_detector import next_events_hours
from src.domain.feasibility_scorer import mean
from src.domain.horizon_geometry import horizon_elevation_at_azimuth_deg
from src.domain.interpolation import interpolate_grid
from src.domain.mission_time import (
    LOOKAHEAD_DAYS,
    NaiveTimestampError,
    mission_sample_count,
    sample_mission_times,
    validate_mission_window,
)
from src.domain.solar_power import (
    HORIZONTAL_FIXED,
    is_sunlit,
    solar_power_factor,
    sun_occultation_margin_deg,
    sun_visible_fraction,
)
from src.infrastructure.site_registry_loader import load_curated_sites


def _parse_utc(value: str) -> datetime:
    """Parse an ISO-8601 UTC timestamp, rejecting naive or offset timestamps."""
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise NaiveTimestampError(f"start_utc must be an ISO-8601 UTC timestamp; got {value!r}") from exc
    if parsed.tzinfo is None or parsed.utcoffset() != timedelta(0):
        raise NaiveTimestampError(f"start_utc must be UTC-aware; got {value!r}")
    return parsed.astimezone(UTC)


def _spherical_limb_deg(observer_height_m: float) -> float:
    """Return the geometric limb for a flat spherical body (REQ-08)."""
    return -math.degrees(math.acos(MOON_RADIUS_M / (MOON_RADIUS_M + observer_height_m)))


def _horizon_profile_for_height(terrain: dict[str, Any], observer_height_m: float) -> dict[str, Any]:
    for horizon in terrain["horizons"]:
        if horizon["observer_height_m"] == observer_height_m:
            return horizon
    raise SitePackInvalidError(f"terrain pack has no horizon for {observer_height_m} m")


def _interpolate_body(
    pack: dict[str, Any],
    body: str,
    target: datetime,
    start: datetime,
    step: int,
) -> tuple[float, float]:
    azimuth = interpolate_grid(target, start, step, pack[f"{body}_az_deg"], circular=True)
    elevation = interpolate_grid(target, start, step, pack[f"{body}_elev_deg"])
    return azimuth, elevation


def evaluate_scenario(
    *,
    site_id: str,
    start_utc: str,
    duration_days: float,
    step_minutes: int,
    solar_array_type: str,
    fixed_array_azimuth_deg: float,
    observer_height_m: float,
    min_comms_elev_deg: float,
) -> dict[str, Any]:
    """Evaluate one scenario and return an EvaluateResponse-shaped payload."""
    sites = {site.id: site for site in load_curated_sites()}
    site = sites.get(site_id)
    if site is None:
        raise SiteNotFoundError(f"unknown site_id: {site_id}")

    start = _parse_utc(start_utc)
    ephemeris = load_ephemeris(site_id)
    pack_start = _parse_utc(ephemeris["start_utc"])
    pack_stop = _parse_utc(ephemeris["stop_utc"])
    pack_step = int(ephemeris["step_seconds"])

    validate_mission_window(
        start,
        duration_days,
        coverage_start_utc=pack_start,
        coverage_stop_utc=pack_stop,
    )

    terrain = load_terrain(site_id)
    step_hours = step_minutes / 60.0
    mission_count = mission_sample_count(duration_days, step_minutes)
    extended_times = sample_mission_times(start, duration_days + LOOKAHEAD_DAYS, step_minutes)

    if terrain is None:
        limb = _spherical_limb_deg(observer_height_m)
        terrain_elev_deg: list[float] = []
        geometric_limb_deg: list[float] = []
    else:
        profile = _horizon_profile_for_height(terrain, observer_height_m)
        terrain_elev_deg = profile["terrain_elev_deg"]
        geometric_limb_deg = profile["geometric_limb_deg"]

    sun_azs: list[float] = []
    sun_elevs: list[float] = []
    sun_horizons: list[float] = []
    sun_fractions: list[float] = []
    sun_margins: list[float] = []
    powers: list[float] = []
    horizontal_powers: list[float] = []
    earth_azs: list[float] = []
    earth_elevs: list[float] = []
    earth_horizons: list[float] = []
    clearances: list[float] = []
    separations: list[float] = []
    dte_margins: list[float] = []
    dte_geometrics: list[bool] = []
    conjunctions: list[bool] = []
    dte_availables: list[bool] = []

    for target in extended_times:
        sun_az, sun_elev = _interpolate_body(ephemeris, "sun", target, pack_start, pack_step)
        earth_az, earth_elev = _interpolate_body(ephemeris, "earth", target, pack_start, pack_step)

        if terrain is None:
            sun_horizon = limb
            earth_horizon = limb
        else:
            sun_horizon = horizon_elevation_at_azimuth_deg(
                sun_az, terrain_elev_deg, geometric_limb_deg
            )
            earth_horizon = horizon_elevation_at_azimuth_deg(
                earth_az, terrain_elev_deg, geometric_limb_deg
            )

        visible = sun_visible_fraction(sun_elev, sun_horizon)
        margin = sun_occultation_margin_deg(sun_elev, sun_horizon)
        power = solar_power_factor(sun_elev, sun_az, solar_array_type, fixed_array_azimuth_deg, visible)
        horizontal_power = solar_power_factor(sun_elev, sun_az, HORIZONTAL_FIXED, 0.0, visible)
        clearance = earth_clearance_deg(earth_elev, earth_horizon)
        separation = sun_earth_separation_deg(sun_elev, earth_elev, sun_az, earth_az)
        dte_margin = dte_margin_deg(clearance, min_comms_elev_deg, separation)
        geometric = is_dte_geometric(clearance, min_comms_elev_deg)
        conjunction = is_solar_conjunction(separation)

        sun_azs.append(sun_az)
        sun_elevs.append(sun_elev)
        sun_horizons.append(sun_horizon)
        sun_fractions.append(visible)
        sun_margins.append(margin)
        powers.append(power)
        horizontal_powers.append(horizontal_power)
        earth_azs.append(earth_az)
        earth_elevs.append(earth_elev)
        earth_horizons.append(earth_horizon)
        clearances.append(clearance)
        separations.append(separation)
        dte_margins.append(dte_margin)
        dte_geometrics.append(geometric)
        conjunctions.append(conjunction)
        dte_availables.append(geometric and not conjunction)

    mission_slice = slice(mission_count)
    timeseries: list[dict[str, Any]] = []
    next_events_from_start: dict[str, float | None] = {}
    for index in range(mission_count):
        sunset, sunrise, earthset, earthrise = next_events_hours(
            sun_margins, dte_margins, index, step_hours
        )
        point = {
            "timestamp_utc": extended_times[index].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sun_az_deg": sun_azs[index],
            "sun_elev_deg": sun_elevs[index],
            "sun_horizon_elev_deg": sun_horizons[index],
            "sun_visible_fraction": sun_fractions[index],
            "is_sunlit": is_sunlit(sun_fractions[index]),
            "solar_power_factor": powers[index],
            "earth_az_deg": earth_azs[index],
            "earth_elev_deg": earth_elevs[index],
            "earth_horizon_elev_deg": earth_horizons[index],
            "earth_clearance_deg": clearances[index],
            "is_dte_geometric": dte_geometrics[index],
            "is_solar_conjunction": conjunctions[index],
            "is_dte_visible": dte_availables[index],
            "sun_earth_sep_deg": separations[index],
            "hours_to_next_sunset": sunset,
            "hours_to_next_sunrise": sunrise,
            "hours_to_next_earthset": earthset,
            "hours_to_next_earthrise": earthrise,
        }
        timeseries.append(point)
        if index == 0:
            next_events_from_start = {
                "hours_to_sunset": sunset,
                "hours_to_sunrise": sunrise,
                "hours_to_earthset": earthset,
                "hours_to_earthrise": earthrise,
            }

    sunlit_flags = [is_sunlit(value) for value in sun_fractions[mission_slice]]
    dte_flags = dte_availables[mission_slice]

    if terrain is None:
        mean_slope_deg = None
    else:
        mean_slope_deg = mean(terrain["slopes_deg"])

    summary = build_summary(
        sunlit_flags=sunlit_flags,
        dte_flags=dte_flags,
        powers=powers[mission_slice],
        horizontal_powers=horizontal_powers[mission_slice],
        sun_elevs=sun_elevs[mission_slice],
        mission_count=mission_count,
        step_hours=step_hours,
        mean_slope_deg=mean_slope_deg,
        next_events_from_start=next_events_from_start,
    )

    if terrain is None:
        horizon_profile: list[dict[str, float]] = []
    else:
        profile = _horizon_profile_for_height(terrain, observer_height_m)
        horizon_profile = [
            {
                "azimuth_deg": azimuth,
                "terrain_elev_deg": terrain_value,
                "geometric_limb_deg": limb_value,
            }
            for azimuth, terrain_value, limb_value in zip(
                profile["azimuth_deg"],
                profile["terrain_elev_deg"],
                profile["geometric_limb_deg"],
            )
        ]

    return {
        "site": {
            "id": site.id,
            "name": site.name,
            "category": site.category,
            "lat_deg": site.lat_deg,
            "lon_deg": site.lon_deg,
            "elevation_m": terrain["center_elevation_m"] if terrain else None,
            "mean_slope_deg": mean_slope_deg,
            "has_precomputed_terrain": terrain is not None,
        },
        "summary": summary,
        "horizon_profile": horizon_profile,
        "timeseries": timeseries,
    }
