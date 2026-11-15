import math

from src.infrastructure.site_registry_loader import load_curated_sites

EXPECTED_ORDER = [
    "artemis-cabeus-peak",
    "artemis-haworth",
    "artemis-malapert-massif",
    "artemis-mons-mouton-plateau",
    "artemis-mons-mouton",
    "artemis-nobile-rim-1",
    "artemis-nobile-rim-2",
    "artemis-degerlache-rim-2",
    "artemis-slater-plain",
    "clps-mare-crisium",
    "clps-gruithuisen-domes",
    "clps-lacus-mortis",
    "apollo-11-tranquillitatis",
    "apollo-15-hadley-rille",
    "isro-chandrayaan-3-shiv-shakti",
    "cnsa-change-4-von-karman",
]


def test_registry_order_and_uniqueness() -> None:
    sites = load_curated_sites()
    assert [site.id for site in sites] == EXPECTED_ORDER
    assert len({site.id for site in sites}) == 16
    assert len({site.name for site in sites}) == 16


def test_provenance_urls_are_https() -> None:
    for site in load_curated_sites():
        url = str(site.coordinate_source_url)
        assert url
        assert url.startswith("https://")


def test_coordinates_are_finite_and_in_range() -> None:
    for site in load_curated_sites():
        assert math.isfinite(site.lat_deg)
        assert math.isfinite(site.lon_deg)
        assert -90.0 <= site.lat_deg <= 90.0
        assert -180.0 <= site.lon_deg <= 180.0


def test_mons_mouton_regions_are_distinct_entries() -> None:
    ids = {site.id for site in load_curated_sites()}
    assert "artemis-mons-mouton" in ids
    assert "artemis-mons-mouton-plateau" in ids


def test_removed_artemis_regions_are_absent() -> None:
    ids = {site.id for site in load_curated_sites()}
    assert "artemis-shackleton-ridge" not in ids
    assert "artemis-faustini-rim-a" not in ids


def test_artemis_iii_sites_are_south_polar() -> None:
    artemis = [site for site in load_curated_sites() if site.category == "artemis_iii"]
    assert len(artemis) == 9
    assert all(site.lat_deg <= -80.0 for site in artemis)
