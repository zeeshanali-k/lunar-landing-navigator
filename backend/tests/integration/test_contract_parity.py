"""Contract parity: Pydantic models, OpenAPI, generated types, and fixtures must agree.

This test is the drift gate for REQ-06. If a schema changes and the generated
artefacts are not regenerated, one of these assertions fails. It is deliberately
independent of the generator: it re-derives the OpenAPI document from the app and
compares it to the committed file, then parses the committed TypeScript and
fixtures through the real Pydantic models.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from src.api.main import app
from src.api.schemas.comparison_schemas import CompareResponseSchema
from src.api.schemas.evaluation_schemas import EvaluateRequestSchema, EvaluateResponseSchema
from src.api.schemas.site_schemas import SiteSummarySchema, TerrainPatchSchema
from src.api.schemas.window_schemas import WindowsResponseSchema
from src.infrastructure.site_registry_loader import load_curated_sites

REPO_ROOT = Path(__file__).resolve().parents[3]
OPENAPI_PATH = REPO_ROOT / "contracts" / "openapi.json"
TYPES_PATH = REPO_ROOT / "frontend" / "src" / "types" / "api.generated.ts"
FIXTURES_DIR = REPO_ROOT / "contracts" / "fixtures"
FIXTURES_MIRROR = REPO_ROOT / "frontend" / "public" / "data" / "fixtures"
DRAFT_PATH = REPO_ROOT / "contracts" / "openapi-draft.yaml"


def _load_fixture(name: str) -> object:
    """Read one committed fixture."""
    return json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))


def test_committed_openapi_matches_the_app() -> None:
    """The committed OpenAPI document must equal what the app generates now."""
    assert OPENAPI_PATH.is_file(), f"{OPENAPI_PATH} is missing; run the export command."
    committed = json.loads(OPENAPI_PATH.read_text(encoding="utf-8"))
    assert committed == app.openapi(), (
        "contracts/openapi.json is stale; regenerate it with "
        "`uv run --python 3.12 --frozen python -m src.cli.export_openapi`"
    )


def test_openapi_documents_the_p0_routes() -> None:
    """The four P0 paths are documented; removing the P1 route stubs is BE-003's task."""
    document = json.loads(OPENAPI_PATH.read_text(encoding="utf-8"))
    assert {
        "/api/v1/health",
        "/api/v1/sites",
        "/api/v1/sites/{site_id}/terrain",
        "/api/v1/evaluate",
    } <= set(document["paths"])


def test_generated_types_declare_every_component() -> None:
    """Every OpenAPI component appears as a TypeScript declaration."""
    document = json.loads(OPENAPI_PATH.read_text(encoding="utf-8"))
    source = TYPES_PATH.read_text(encoding="utf-8")
    declared = set(re.findall(r"^export (?:interface|type) (\w+)", source, flags=re.MULTILINE))
    expected = {name.removesuffix("Schema") for name in document["components"]["schemas"]}
    missing = sorted(expected - declared)
    assert not missing, f"{TYPES_PATH.name} is missing declarations: {missing}"


def test_generated_types_are_not_hand_edited() -> None:
    """The generated file carries its provenance banner and no local edits."""
    source = TYPES_PATH.read_text(encoding="utf-8")
    assert source.startswith("/* GENERATED FILE"), "generated types lost their provenance banner"
    assert "do not edit by hand" in source
    assert 'from "./' not in source, "generated types must not import hand-written modules"


def test_typescript_is_plain_ascii_outside_comments() -> None:
    """Guard against smart quotes in identifiers from a hand edit."""
    source = TYPES_PATH.read_text(encoding="utf-8")
    for bad in ("\u201c", "\u201d", "\u2018", "\u2019"):
        assert bad not in source


def test_sites_fixture_is_the_full_registry() -> None:
    """The sites fixture is generated from the 16-entry registry, in order."""
    registry_ids = [site.id for site in load_curated_sites()]
    payload = [
        SiteSummarySchema.model_validate(item) for item in _load_fixture("sites.sample.json")
    ]
    assert [item.id for item in payload] == registry_ids
    assert len(payload) == 16


def test_terrain_fixture_is_production_shape() -> None:
    """The terrain fixture is 128x128 with 16,384 values, not the legacy 16x16."""
    patch = TerrainPatchSchema.model_validate(_load_fixture("terrain.sample.json"))
    assert patch.grid_size == 128
    assert len(patch.elevations_m_flat) == 16384
    assert len(patch.slopes_deg_flat) == 16384
    assert patch.spacing_m == pytest.approx(40000.0 / 127)
    assert [h.observer_height_m for h in patch.horizons] == [1.5, 2.0, 10.0]
    assert patch.psr_mask is None


def test_terrain_fixture_makes_no_terrain_claim() -> None:
    """A placeholder fixture must not fabricate topography or claim a PSR."""
    patch = TerrainPatchSchema.model_validate(_load_fixture("terrain.sample.json"))
    assert set(patch.elevations_m_flat) == {0.0}
    assert set(patch.slopes_deg_flat) == {0.0}


def test_evaluate_and_window_fixtures_validate() -> None:
    """Every non-site fixture validates through its declared response model."""
    evaluate = EvaluateResponseSchema.model_validate(_load_fixture("evaluate.sample.json"))
    assert evaluate.site.has_precomputed_terrain is False
    assert evaluate.summary.feasibility_score is None
    assert evaluate.summary.sub_scores.terrain_score is None
    assert len(evaluate.horizon_profile) == 360

    compare = CompareResponseSchema.model_validate(_load_fixture("compare.sample.json"))
    assert len(compare.scenarios) == 2

    windows = WindowsResponseSchema.model_validate(_load_fixture("windows.sample.json"))
    assert len(windows.windows) == 12
    assert windows.top_windows[0].rank == 1


def test_fixtures_are_labelled_synthetic() -> None:
    """The manifest marks the tree synthetic so it is never mistaken for measured data."""
    manifest = _load_fixture("manifest.json")
    assert isinstance(manifest, dict)
    assert manifest["synthetic"] is True
    assert "synthetic" in manifest["note"]
    for entry in manifest["scenarios"].values():
        assert (FIXTURES_DIR / entry["file"]).is_file()


def test_fixture_mirror_matches_when_present() -> None:
    """If the frontend mirror exists, it is byte-identical to the canonical tree.

    The mirror is generated by ``DATA-006``. When it is absent this task has nothing
    to compare; when it exists the planning check requires an exact match.
    """
    if not FIXTURES_MIRROR.exists():
        pytest.skip("frontend fixture mirror is generated by DATA-006")
    canonical = sorted(path.name for path in FIXTURES_DIR.glob("*.json"))
    mirrored = sorted(path.name for path in FIXTURES_MIRROR.glob("*.json"))
    assert canonical == mirrored
    for name in canonical:
        assert (FIXTURES_DIR / name).read_bytes() == (FIXTURES_MIRROR / name).read_bytes(), (
            f"{name} diverges between contracts/fixtures and frontend/public/data/fixtures"
        )


def test_requests_forbid_unknown_fields() -> None:
    """A misspelled request field must fail rather than silently take a default."""
    valid = {"site_id": "artemis-cabeus-peak", "start_utc": "2027-11-01T00:00:00Z"}
    with pytest.raises(ValueError):
        EvaluateRequestSchema.model_validate({**valid, "durration_days": 7})


def test_requests_enforce_the_req06_allowlists() -> None:
    """Values outside the allowlists are rejected."""
    base = {"site_id": "artemis-cabeus-peak", "start_utc": "2027-11-01T00:00:00Z"}
    for bad in (
        {"duration_days": 10},
        {"step_minutes": 30},
        {"observer_height_m": 3.0},
        {"solar_array_type": "tracking_v2"},
        {"fixed_array_azimuth_deg": 360.0},
        {"min_comms_elev_deg": 60.0},
        {"site_id": "artemis-shackleton-ridge"},
    ):
        with pytest.raises(ValueError):
            EvaluateRequestSchema.model_validate({**base, **bad})


def test_custom_coordinates_are_not_accepted_in_p0() -> None:
    """P0 evaluates curated sites only; a custom-coordinate key is a validation error."""
    with pytest.raises(ValueError):
        EvaluateRequestSchema.model_validate(
            {
                "site_id": "artemis-cabeus-peak",
                "start_utc": "2027-11-01T00:00:00Z",
                "custom_coords": {"lat_deg": -89.9, "lon_deg": 0.0},
            }
        )


def test_hand_written_draft_is_gone() -> None:
    """openapi.json replaces the hand-maintained draft; it must not linger."""
    assert not DRAFT_PATH.exists(), (
        "contracts/openapi-draft.yaml must be removed once openapi.json exists"
    )
