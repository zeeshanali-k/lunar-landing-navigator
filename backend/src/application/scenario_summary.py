"""Aggregate a computed mission timeseries into the EvaluateResponse summary."""

from __future__ import annotations

from typing import Any

from src.domain.feasibility_scorer import (
    comms_score,
    feasibility_score,
    fraction,
    hours_in_state,
    longest_consecutive_run,
    mean,
    power_score,
    risk_warnings,
    terrain_score,
    thermal_score,
)
from src.domain.solar_power import irradiance_w_m2


def build_summary(
    sunlit_flags: list[bool],
    dte_flags: list[bool],
    powers: list[float],
    horizontal_powers: list[float],
    sun_elevs: list[float],
    mission_count: int,
    step_hours: float,
    mean_slope_deg: float | None,
    next_events_from_start: dict[str, float | None],
) -> dict[str, Any]:
    """Compute the feasibility scores and aggregate metrics for one scenario."""
    sunlit_count = sum(1 for value in sunlit_flags if value)
    dte_count = sum(1 for value in dte_flags if value)
    overlap_count = sum(1 for sun, dte in zip(sunlit_flags, dte_flags) if sun and dte)

    sunlit_fraction = fraction(sunlit_count, mission_count)
    dte_fraction = fraction(dte_count, mission_count)
    overlap_fraction = fraction(overlap_count, mission_count)
    mean_power = mean(powers)
    mean_horizontal_power = mean(horizontal_powers)
    mean_sun_elevation = mean(sun_elevs)

    power = power_score(sunlit_fraction, mean_power)
    thermal = thermal_score(longest_consecutive_run(sunlit_flags, target=False) * step_hours)
    comms = comms_score(dte_fraction, overlap_fraction)
    terrain_subscore = terrain_score(mean_slope_deg)
    overall = feasibility_score(power, thermal, comms, terrain_subscore)

    return {
        "feasibility_score": overall,
        "sub_scores": {
            "power_score": power,
            "thermal_score": thermal,
            "comms_score": comms,
            "terrain_score": terrain_subscore,
        },
        "sunlit_hours": hours_in_state(sunlit_count, step_hours),
        "sunlit_fraction": sunlit_fraction,
        "longest_dark_streak_hours": longest_consecutive_run(sunlit_flags, target=False)
        * step_hours,
        "dte_comms_hours": hours_in_state(dte_count, step_hours),
        "dte_fraction": dte_fraction,
        "overlap_sun_and_dte_hours": hours_in_state(overlap_count, step_hours),
        "overlap_fraction": overlap_fraction,
        "longest_comms_blackout_hours": longest_consecutive_run(dte_flags, target=False)
        * step_hours,
        "mean_solar_power_factor": mean_power,
        "mean_irradiance_w_m2": irradiance_w_m2(mean_power),
        "risk_warnings": risk_warnings(
            longest_dark_streak_hours=longest_consecutive_run(sunlit_flags, target=False)
            * step_hours,
            dte_fraction=dte_fraction,
            mean_slope_deg=mean_slope_deg,
            mean_horizontal_power_factor=mean_horizontal_power,
            mean_sun_elevation_deg=mean_sun_elevation,
        ),
        "next_events_from_start": next_events_from_start,
    }
