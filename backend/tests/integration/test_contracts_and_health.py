"""Integration tests for the real P0 endpoints and the REQ-10 error envelope."""

from __future__ import annotations

import socket

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.schemas.evaluation_schemas import EvaluateResponseSchema
from src.api.schemas.site_schemas import SiteSummarySchema, TerrainPatchSchema

client = TestClient(app)

CLASS_A_SITE = "artemis-cabeus-peak"
CLASS_B_SITE = "apollo-11-tranquillitatis"


def _error(response) -> dict:
    return response.json()["error"]


def test_health_endpoint() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["architecture"] == "clean-hexagonal"
    assert payload["frame"] == "local_enu"
    assert payload["moon_radius_km"] == 1737.4


def test_sites_endpoint_lists_16_sites() -> None:
    response = client.get("/api/v1/sites")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 16
    sites = [SiteSummarySchema.model_validate(item) for item in payload]
    by_id = {site.id: site for site in sites}
    assert by_id[CLASS_A_SITE].has_precomputed_terrain is True
    assert by_id[CLASS_A_SITE].elevation_m is not None
    assert by_id[CLASS_B_SITE].has_precomputed_terrain is False
    assert by_id[CLASS_B_SITE].elevation_m is None


def test_terrain_class_a_returns_real_patch() -> None:
    response = client.get(f"/api/v1/sites/{CLASS_A_SITE}/terrain")
    assert response.status_code == 200
    patch = TerrainPatchSchema.model_validate(response.json())
    assert patch.grid_size == 128
    assert len(patch.elevations_m_flat) == 128 * 128
    assert len(patch.slopes_deg_flat) == 128 * 128
    assert len(patch.horizons) == 3
    assert patch.psr_mask is None


def test_terrain_class_b_returns_409() -> None:
    response = client.get(f"/api/v1/sites/{CLASS_B_SITE}/terrain")
    assert response.status_code == 409
    assert _error(response)["code"] == "TERRAIN_NOT_AVAILABLE"


def test_terrain_unknown_site_returns_404() -> None:
    response = client.get("/api/v1/sites/does-not-exist/terrain")
    assert response.status_code == 404
    assert _error(response)["code"] == "SITE_NOT_FOUND"


def test_evaluate_class_a_returns_full_timeseries() -> None:
    response = client.post(
        "/api/v1/evaluate",
        json={
            "site_id": CLASS_A_SITE,
            "start_utc": "2027-11-01T00:00:00Z",
            "duration_days": 7,
            "step_minutes": 60,
            "solar_array_type": "vertical_tracking",
            "observer_height_m": 2.0,
            "min_comms_elev_deg": 5.0,
        },
    )
    assert response.status_code == 200
    evaluated = EvaluateResponseSchema.model_validate(response.json())
    assert evaluated.site.has_precomputed_terrain is True
    assert len(evaluated.timeseries) == 168
    assert len(evaluated.horizon_profile) == 360
    assert evaluated.summary.feasibility_score is not None


def test_evaluate_class_b_returns_null_terrain_scores() -> None:
    response = client.post(
        "/api/v1/evaluate",
        json={
            "site_id": CLASS_B_SITE,
            "start_utc": "2027-11-01T00:00:00Z",
            "duration_days": 7,
            "step_minutes": 60,
        },
    )
    assert response.status_code == 200
    evaluated = EvaluateResponseSchema.model_validate(response.json())
    assert evaluated.site.has_precomputed_terrain is False
    assert evaluated.summary.feasibility_score is None
    assert evaluated.summary.sub_scores.terrain_score is None
    assert evaluated.horizon_profile == []
    assert evaluated.summary.sub_scores.power_score is not None
    assert evaluated.summary.sub_scores.thermal_score is not None
    assert evaluated.summary.sub_scores.comms_score is not None


def test_next_events_from_start_matches_timeseries_zero() -> None:
    response = client.post(
        "/api/v1/evaluate",
        json={"site_id": CLASS_A_SITE, "start_utc": "2027-11-01T00:00:00Z", "duration_days": 7},
    )
    assert response.status_code == 200
    evaluated = EvaluateResponseSchema.model_validate(response.json())
    first = evaluated.timeseries[0]
    assert evaluated.summary.next_events_from_start.hours_to_sunset == first.hours_to_next_sunset
    assert evaluated.summary.next_events_from_start.hours_to_sunrise == first.hours_to_next_sunrise
    assert (
        evaluated.summary.next_events_from_start.hours_to_earthset == first.hours_to_next_earthset
    )
    assert (
        evaluated.summary.next_events_from_start.hours_to_earthrise == first.hours_to_next_earthrise
    )


def test_evaluate_naive_start_returns_422() -> None:
    response = client.post(
        "/api/v1/evaluate",
        json={"site_id": CLASS_A_SITE, "start_utc": "2027-11-01T00:00:00", "duration_days": 7},
    )
    assert response.status_code == 422
    assert _error(response)["code"] == "VALIDATION_ERROR"


def test_evaluate_out_of_range_returns_422() -> None:
    response = client.post(
        "/api/v1/evaluate",
        json={"site_id": CLASS_A_SITE, "start_utc": "2029-01-01T00:00:00Z", "duration_days": 7},
    )
    assert response.status_code == 422
    assert _error(response)["code"] == "EPHEMERIS_RANGE_EXCEEDED"


def test_evaluate_unknown_site_returns_404() -> None:
    response = client.post(
        "/api/v1/evaluate",
        json={"site_id": "does-not-exist", "start_utc": "2027-11-01T00:00:00Z"},
    )
    assert response.status_code == 404
    assert _error(response)["code"] == "SITE_NOT_FOUND"


def test_unregistered_p1_routes_return_404() -> None:
    assert client.post("/api/v1/compare", json={}).status_code == 404
    assert client.post("/api/v1/windows", json={}).status_code == 404
    assert client.post("/api/v1/terrain/custom", json={}).status_code == 404


def test_api_works_with_sockets_disabled(monkeypatch) -> None:
    real_socket = socket.socket

    def _no_network(*args, **kwargs):
        family = args[0] if args else kwargs.get("family", socket.AF_INET)
        if family in (socket.AF_INET, socket.AF_INET6):
            raise RuntimeError("network access is disabled")
        return real_socket(*args, **kwargs)

    monkeypatch.setattr(socket, "socket", _no_network)

    assert client.get("/api/v1/health").status_code == 200
    assert client.get("/api/v1/sites").status_code == 200
    assert client.get(f"/api/v1/sites/{CLASS_A_SITE}/terrain").status_code == 200
    assert (
        client.post(
            "/api/v1/evaluate",
            json={"site_id": CLASS_A_SITE, "start_utc": "2027-11-01T00:00:00Z", "duration_days": 7},
        ).status_code
        == 200
    )


def test_api_application_and_domain_never_import_download_clients() -> None:
    from pathlib import Path

    root = Path(__file__).resolve().parents[3] / "backend" / "src"
    forbidden = (
        "from src.cli",
        "import src.cli",
        "horizons_client",
        "download_lola",
        "download_horizons",
    )
    for module_dir in ("api", "application", "domain"):
        for path in (root / module_dir).rglob("*.py"):
            text = path.read_text(encoding="utf-8")
            for token in forbidden:
                assert token not in text, f"{path} imports a download client: {token}"
