"""Tests for the published pack index and generated offline fixtures (DATA-006)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from src.api.schemas.site_schemas import SiteSummarySchema, TerrainPatchSchema
from src.cli.build_pack_index import (
    FIXTURES_DIR,
    FIXTURES_MIRROR,
    INDEX_PATH,
    PACK_DIR,
    build_fixture_payloads,
    build_index,
    load_pack_bundle,
    sha256_file,
)
from src.infrastructure.site_registry_loader import load_curated_sites

REPO_ROOT = Path(__file__).resolve().parents[3]
REGISTRY = load_curated_sites()
CLASS_A = [site.id for site in REGISTRY if site.category == "artemis_iii"]
CLASS_B = [site.id for site in REGISTRY if site.category != "artemis_iii"]
METADATA_KEYS = {"note", "scenarios", "synthetic"}


def load_json(path: Path) -> Any:
    """Read a JSON file."""
    return json.loads(path.read_text(encoding="utf-8"))


def fixture(name: str) -> Any:
    """Read one canonical fixture."""
    return load_json(FIXTURES_DIR / name)


def test_index_lists_every_registry_site_in_order() -> None:
    index = load_json(INDEX_PATH)
    assert index["site_count"] == 16
    assert index["ephemeris_pack_count"] == 16
    assert index["terrain_pack_count"] == 9
    assert [entry["site_id"] for entry in index["sites"]] == [site.id for site in REGISTRY]


def test_index_presence_and_hashes_match_the_pack_files() -> None:
    index = load_json(INDEX_PATH)
    for entry in index["sites"]:
        site_id = entry["site_id"]
        assert entry["has_precomputed_terrain"] == (PACK_DIR / site_id / "terrain.json").is_file()
        assert entry["ephemeris_sha256"] == sha256_file(REPO_ROOT / entry["ephemeris_pack"])
        if entry["terrain_pack"] is None:
            assert entry["terrain_sha256"] is None
        else:
            assert entry["terrain_sha256"] == sha256_file(REPO_ROOT / entry["terrain_pack"])


def test_class_b_sites_have_no_terrain_pack_or_fixture() -> None:
    index = {entry["site_id"]: entry for entry in load_json(INDEX_PATH)["sites"]}
    assert len(CLASS_B) == 7
    for site_id in CLASS_B:
        assert index[site_id]["has_precomputed_terrain"] is False
        assert index[site_id]["terrain_pack"] is None
        assert not (PACK_DIR / site_id / "terrain.json").exists()
        assert not (FIXTURES_DIR / f"terrain.{site_id}.json").exists()


def test_sites_fixture_derives_terrain_values_from_the_packs() -> None:
    items = [SiteSummarySchema.model_validate(item) for item in fixture("sites.sample.json")]
    assert [item.id for item in items] == [site.id for site in REGISTRY]
    for item in items:
        if item.id in CLASS_A:
            pack = load_json(PACK_DIR / item.id / "terrain.json")
            slopes = pack["slopes_deg"]
            assert item.has_precomputed_terrain is True
            assert item.elevation_m == pytest.approx(pack["center_elevation_m"])
            assert item.mean_slope_deg == pytest.approx(sum(slopes) / len(slopes))
        else:
            assert item.has_precomputed_terrain is False
            assert item.elevation_m is None
            assert item.mean_slope_deg is None


@pytest.mark.parametrize("site_id", CLASS_A)
def test_terrain_fixture_matches_the_pack(site_id: str) -> None:
    patch = TerrainPatchSchema.model_validate(fixture(f"terrain.{site_id}.json"))
    pack = load_json(PACK_DIR / site_id / "terrain.json")
    assert patch.site_id == site_id
    assert patch.elevations_m_flat == pack["elevations_m"]
    assert patch.slopes_deg_flat == pack["slopes_deg"]
    assert patch.center_elevation_m == pytest.approx(pack["center_elevation_m"])
    assert patch.min_elevation_m == pytest.approx(min(pack["elevations_m"]))
    assert patch.max_elevation_m == pytest.approx(max(pack["elevations_m"]))
    assert len(patch.elevations_m_flat) == 16384
    assert [horizon.observer_height_m for horizon in patch.horizons] == [1.5, 2.0, 10.0]
    assert patch.psr_mask is None


def test_manifest_matches_the_frontend_scenario_keys() -> None:
    manifest = fixture("manifest.json")
    assert manifest["synthetic"] is True
    assert "synthetic" in manifest["note"]
    expected = {"sites", "health"} | {f"terrain:{site_id}" for site_id in CLASS_A}
    flat_keys = {key for key in manifest if key not in METADATA_KEYS}
    assert flat_keys == expected
    assert set(manifest["scenarios"]) == expected
    for key in expected:
        assert (FIXTURES_DIR / manifest[key]["file"]).is_file()


def test_fixture_mirror_is_byte_identical() -> None:
    canonical = {path.name: path.read_bytes() for path in FIXTURES_DIR.glob("*.json")}
    mirror = {path.name: path.read_bytes() for path in FIXTURES_MIRROR.glob("*.json")}
    assert set(canonical) == set(mirror)
    assert canonical == mirror


def test_committed_index_and_fixtures_equal_a_fresh_build() -> None:
    bundle = load_pack_bundle()
    assert load_json(INDEX_PATH) == build_index(bundle)
    for filename, payload in build_fixture_payloads(bundle).items():
        expected = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        assert (FIXTURES_DIR / filename).read_text(encoding="utf-8") == expected
