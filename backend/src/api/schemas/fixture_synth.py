"""Deterministic base fixtures for the wire contract (ARCH-002, REQ-06).

These are **schema-shape samples**, not evaluations. Their job is to prove the
contract is renderable and round-trippable; they are labelled synthetic in the
fixture manifest and are replaced from validated site packs by ``DATA-006``'s
``build_pack_index`` once real ephemeris and terrain packs exist.

No physics is implemented here. REQ-06 forbids a second implementation of the
power, illumination, DTE, or horizon formulas outside ``backend/src/domain/``,
so the terrain sample is a flat placeholder and the timeseries sample carries
hand-picked, internally simple values. Do not read meaning into these numbers.

Every value is derived from the registry or a fixed literal; no clock, no
randomness, and no network, so regeneration is byte-identical.
"""

from __future__ import annotations

from typing import Any

from src.api.schemas.site_schemas import GRID_SIZE
from src.domain.constants import MOON_RADIUS_KM
from src.infrastructure.site_registry_loader import load_curated_sites

SYNTHETIC_NOTE = "synthetic contract sample; not measured terrain and not an evaluation"


def _external_links(lat_deg: float, lon_deg: float) -> dict[str, str]:
    """Build the documented NASA mapping deep links for a site coordinate."""
    quickmap = f"https://quickmap.lroc.asu.edu/?lat={lat_deg:.4f}&lon={lon_deg:.4f}"
    trek = f"https://trek.nasa.gov/moon/#v=0.1&x={lon_deg:.4f}&y={lat_deg:.4f}"
    return {"quickmap_url": quickmap, "moon_trek_url": trek}


def build_sites_fixture() -> list[dict[str, Any]]:
    """Return all 16 registry sites in order as Contract A items.

    ``elevation_m`` and ``mean_slope_deg`` are ``null`` and
    ``has_precomputed_terrain`` is ``false`` because no terrain pack exists yet:
    REQ-05 requires these to reflect actual pack presence, never registry intent.
    """
    return [
        {
            "id": site.id,
            "name": site.name,
            "category": site.category,
            "agency": site.agency,
            "lat_deg": site.lat_deg,
            "lon_deg": site.lon_deg,
            "elevation_m": None,
            "mean_slope_deg": None,
            "has_precomputed_terrain": False,
            "summary": site.summary,
            "external_links": _external_links(site.lat_deg, site.lon_deg),
        }
        for site in load_curated_sites()
    ]


def build_terrain_fixture(site_id: str) -> dict[str, Any]:
    """Return a flat 128x128 Contract C placeholder of the production shape.

    Flat zeros are deliberate: any non-zero topography here would be invented
    lunar data. ``DATA-005``/``DATA-006`` replace this from the real LOLA packs.
    """
    cells = GRID_SIZE * GRID_SIZE
    return {
        "site_id": site_id,
        "model": "lola_80s_80m",
        "frame": "local_enu",
        "grid_size": GRID_SIZE,
        "extent_m": 40000.0,
        "spacing_m": 40000.0 / (GRID_SIZE - 1),
        "row_direction": "south_to_north",
        "column_direction": "west_to_east",
        "center_elevation_m": 0.0,
        "min_elevation_m": 0.0,
        "max_elevation_m": 0.0,
        "elevations_m_flat": [0.0] * cells,
        "slopes_deg_flat": [0.0] * cells,
        "horizons": [
            {
                "observer_height_m": height,
                "azimuth_deg": [float(az) for az in range(360)],
                "terrain_elev_deg": [0.0] * 360,
                "geometric_limb_deg": [0.0] * 360,
            }
            for height in (1.5, 2.0, 10.0)
        ],
        "psr_mask": None,
    }


def build_health_fixture() -> dict[str, Any]:
    """Return the Contract A health payload, with the radius sourced from the domain."""
    return {
        "status": "ok",
        "architecture": "clean-hexagonal",
        "frame": "local_enu",
        "moon_radius_km": MOON_RADIUS_KM,
    }


def build_timeseries_point(index: int) -> dict[str, Any]:
    """Return one contract-shape timeseries sample for hour ``index``."""
    hour = index % 24
    return {
        "timestamp_utc": f"2027-11-01T{hour:02d}:00:00Z"
        if index < 24
        else f"2027-11-02T{hour:02d}:00:00Z",
        "sun_az_deg": float((index * 15) % 360),
        "sun_elev_deg": 0.0,
        "sun_horizon_elev_deg": 0.0,
        "sun_visible_fraction": 0.0,
        "is_sunlit": False,
        "solar_power_factor": 0.0,
        "earth_az_deg": 0.0,
        "earth_elev_deg": 0.0,
        "earth_horizon_elev_deg": 0.0,
        "earth_clearance_deg": 0.0,
        "is_dte_geometric": False,
        "is_solar_conjunction": False,
        "is_dte_visible": False,
        "sun_earth_sep_deg": 90.0,
        "hours_to_next_sunset": None,
        "hours_to_next_sunrise": None,
        "hours_to_next_earthset": None,
        "hours_to_next_earthrise": None,
    }


def build_evaluate_fixture(site_id: str) -> dict[str, Any]:
    """Return a Contract B sample response for ``site_id``."""
    sites = {site.id: site for site in load_curated_sites()}
    site = sites[site_id]
    return {
        "site": {
            "id": site.id,
            "name": site.name,
            "category": site.category,
            "lat_deg": site.lat_deg,
            "lon_deg": site.lon_deg,
            "elevation_m": None,
            "mean_slope_deg": None,
            "has_precomputed_terrain": False,
        },
        "summary": {
            "feasibility_score": None,
            "sub_scores": {
                "power_score": 0.0,
                "thermal_score": 0.0,
                "comms_score": 0.0,
                "terrain_score": None,
            },
            "sunlit_hours": 0.0,
            "sunlit_fraction": 0.0,
            "longest_dark_streak_hours": 0.0,
            "dte_comms_hours": 0.0,
            "dte_fraction": 0.0,
            "overlap_sun_and_dte_hours": 0.0,
            "overlap_fraction": 0.0,
            "longest_comms_blackout_hours": 0.0,
            "mean_solar_power_factor": 0.0,
            "mean_irradiance_w_m2": 0.0,
            "risk_warnings": [],
            "next_events_from_start": {
                "hours_to_sunset": None,
                "hours_to_sunrise": None,
                "hours_to_earthset": None,
                "hours_to_earthrise": None,
            },
        },
        "horizon_profile": [
            {"azimuth_deg": float(az), "terrain_elev_deg": 0.0, "geometric_limb_deg": 0.0}
            for az in range(360)
        ],
        "timeseries": [build_timeseries_point(index) for index in range(24)],
    }


def build_compare_fixture(site_ids: list[str]) -> dict[str, Any]:
    """Return a Contract D sample comparing two scenarios against the first."""
    deltas = {
        "feasibility_score_delta": 0.0,
        "sunlit_hours_delta": 0.0,
        "longest_dark_streak_hours_delta": 0.0,
        "dte_comms_hours_delta": 0.0,
    }
    return {
        "baseline_index": 0,
        "scenarios": [
            {
                "scenario_id": f"scenario-{position + 1}",
                "label": site_id,
                "evaluation": build_evaluate_fixture(site_id),
                "deltas_vs_baseline": dict(deltas),
            }
            for position, site_id in enumerate(site_ids)
        ],
        "recommended_scenario_id": "scenario-1",
    }


def build_windows_fixture(site_id: str) -> dict[str, Any]:
    """Return a Contract E sample with 12 candidate windows."""
    windows = [
        {
            "start_utc": f"2027-{month:02d}-01T00:00:00Z",
            "feasibility_score": 0.0,
            "sunlit_fraction": 0.0,
            "dte_fraction": 0.0,
            "longest_dark_streak_hours": 0.0,
        }
        for month in range(1, 13)
    ]
    top = [
        {
            "rank": rank,
            "start_utc": windows[rank - 1]["start_utc"],
            "feasibility_score": 0.0,
            "sunlit_fraction": 0.0,
            "dte_fraction": 0.0,
        }
        for rank in range(1, 6)
    ]
    return {
        "site_id": site_id,
        "mission_duration_days": 14,
        "solar_array_type": "vertical_tracking",
        "windows": windows,
        "top_windows": top,
    }


def build_fixture_manifest() -> dict[str, Any]:
    """Return the scenario-key manifest the offline fallback reads (REQ-10)."""
    return {
        "synthetic": True,
        "note": SYNTHETIC_NOTE,
        "scenarios": {
            "sites": {"file": "sites.sample.json"},
            "health": {"file": "health.sample.json"},
        },
    }
