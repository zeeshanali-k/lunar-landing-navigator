"""Integration tests for FastAPI health and Contracts A-E endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.schemas.comparison_schemas import CompareResponseSchema
from src.api.schemas.evaluation_schemas import EvaluateResponseSchema
from src.api.schemas.site_schemas import SiteSummarySchema, TerrainPatchSchema
from src.api.schemas.window_schemas import WindowsResponseSchema

client = TestClient(app)


def test_health_endpoint() -> None:
    """Verify GET /api/v1/health returns 200 OK with expected metadata."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "architecture": "clean-hexagonal",
        "frame": "local_enu",
    }


def test_contract_a_sites_endpoint() -> None:
    """Verify GET /api/v1/sites validates against Contract A SiteSummarySchema."""
    response = client.get("/api/v1/sites")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 5
    sites = [SiteSummarySchema.model_validate(item) for item in payload]
    assert any(site.id == "artemis-shackleton-ridge" for site in sites)


def test_contract_c_terrain_endpoints() -> None:
    """Verify GET /sites/{id}/terrain and POST /terrain/custom return valid TerrainPatch."""
    curated = client.get("/api/v1/sites/artemis-shackleton-ridge/terrain")
    assert curated.status_code == 200
    patch = TerrainPatchSchema.model_validate(curated.json())
    assert patch.frame == "local_enu"
    assert len(patch.elevations_m_flat) == patch.grid_size * patch.grid_size

    custom = client.post(
        "/api/v1/terrain/custom",
        json={"lat_deg": -90.0, "lon_deg": 45.0, "label": "Exact South Pole"},
    )
    assert custom.status_code == 200
    custom_patch = TerrainPatchSchema.model_validate(custom.json())
    assert custom_patch.site_id == "custom--89.9999_45.0000"

    missing = client.get("/api/v1/sites/does-not-exist/terrain")
    assert missing.status_code == 404


def test_contract_b_evaluate_endpoint() -> None:
    """Verify POST /api/v1/evaluate validates against Contract B EvaluateResponseSchema."""
    response = client.post(
        "/api/v1/evaluate",
        json={
            "site_id": "artemis-shackleton-ridge",
            "custom_coords": None,
            "start_utc": "2027-11-01T00:00:00Z",
            "duration_days": 14,
            "step_minutes": 60,
            "solar_array_type": "vertical_tracking",
            "observer_height_m": 2.0,
            "min_comms_elev_deg": 5.0,
        },
    )
    assert response.status_code == 200
    evaluated = EvaluateResponseSchema.model_validate(response.json())
    assert evaluated.site.id == "artemis-shackleton-ridge"
    assert len(evaluated.horizon_profile) >= 1
    assert len(evaluated.timeseries) >= 1


def test_contract_d_compare_endpoint() -> None:
    """Verify POST /api/v1/compare validates against Contract D CompareResponseSchema."""
    base_req = {
        "site_id": "artemis-shackleton-ridge",
        "start_utc": "2027-11-01T00:00:00Z",
        "duration_days": 14,
    }
    response = client.post(
        "/api/v1/compare",
        json={
            "baseline_index": 0,
            "scenarios": [
                {"scenario_id": "scen-1", "label": "Baseline", "request": base_req},
                {
                    "scenario_id": "scen-2",
                    "label": "Backup",
                    "request": {**base_req, "site_id": "artemis-mons-mouton"},
                },
            ],
        },
    )
    assert response.status_code == 200
    compared = CompareResponseSchema.model_validate(response.json())
    assert compared.recommended_scenario_id == "scen-1"
    assert len(compared.scenarios) == 2


def test_contract_e_windows_endpoint() -> None:
    """Verify POST /api/v1/windows validates against Contract E WindowsResponseSchema."""
    response = client.post(
        "/api/v1/windows",
        json={
            "site_id": "artemis-shackleton-ridge",
            "year": 2027,
            "mission_duration_days": 14,
            "solar_array_type": "vertical_tracking",
        },
    )
    assert response.status_code == 200
    windows = WindowsResponseSchema.model_validate(response.json())
    assert len(windows.windows) >= 12
    assert windows.top_windows[0].rank == 1
