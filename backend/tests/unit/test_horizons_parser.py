import pytest

from src.cli.download_horizons import load_sites
from src.cli.horizons_client import (
    PARAM_ORDER,
    EphemerisRow,
    HorizonsError,
    Site,
    build_request_params,
    canonical_request_json,
    parse_rows,
    parse_utc,
    reference_rows,
    step_seconds,
    validate_coverage,
)

BODY = """header
$$SOE
 2026-Jan-01 00:00 *i  102.590575  80.731161
 2026-Jan-01 01:00  i  103.305349  81.223771
 2026-Jan-01 02:00 *   104.104980  81.714846
 2026-Jan-01 03:00 *m  105.000000  -0.500000
 2026-Jan-01 04:00   106.000000  -1.000000
$$EOE
legend
"""


def slater() -> Site:
    return Site("artemis-slater-plain", -88.08, 111.29, 0.0, "test")


def make_rows(times: list[str]) -> list[EphemerisRow]:
    return [EphemerisRow(utc=parse_utc(time), az_deg=0.0, elev_deg=0.0) for time in times]


def params() -> dict[str, str]:
    return build_request_params(
        slater(),
        command="10",
        center="coord@301",
        coord_type="GEODETIC",
        quantities="4",
        start="2026-01-01",
        stop="2029-01-01",
        step="1h",
    )


def test_build_request_params_uses_locked_values_and_order() -> None:
    request = params()
    assert list(request) == list(PARAM_ORDER)
    assert request["format"] == "text"
    assert request["COMMAND"] == "'10'"
    assert request["CENTER"] == "'coord@301'"
    assert request["COORD_TYPE"] == "'GEODETIC'"
    assert request["QUANTITIES"] == "'4'"
    assert request["EPHEM_TYPE"] == "'OBSERVER'"
    assert request["OBJ_DATA"] == "'NO'"
    assert request["START_TIME"] == "'2026-01-01'"
    assert request["STOP_TIME"] == "'2029-01-01'"
    assert request["STEP_SIZE"] == "'1h'"


def test_site_coord_is_east_positive_and_altitude_in_kilometres() -> None:
    assert params()["SITE_COORD"] == "'111.29,-88.08,0.0'"
    apollo = Site("apollo-15-hadley-rille", 25.72, 3.15, 1234.0, "test")
    request = build_request_params(
        apollo,
        command="399",
        center="coord@301",
        coord_type="GEODETIC",
        quantities="4",
        start="2026-01-01",
        stop="2029-01-01",
        step="1h",
    )
    assert request["COMMAND"] == "'399'"
    assert request["SITE_COORD"] == "'3.15,25.72,1.234'"


def test_canonical_request_json_preserves_order() -> None:
    documented = canonical_request_json(params())
    assert documented.startswith('{"format":"text","COMMAND":"\'10\'"')
    assert canonical_request_json(params()) == documented


def test_parse_rows_accepts_every_marker_variant() -> None:
    rows = parse_rows(BODY)
    assert [row.az_deg for row in rows] == [102.590575, 103.305349, 104.10498, 105.0, 106.0]
    assert [row.elev_deg for row in rows] == [80.731161, 81.223771, 81.714846, -0.5, -1.0]
    assert rows[0].utc == parse_utc("2026-01-01T00:00:00Z")
    assert rows[-1].utc == parse_utc("2026-01-01T04:00:00Z")


def test_parse_rows_rejects_non_numeric_values() -> None:
    broken = BODY.replace("103.305349", "n.a.")
    with pytest.raises(HorizonsError):
        parse_rows(broken)


def test_parse_rows_rejects_unexpected_marker() -> None:
    broken = BODY.replace("*i  102.590575", "*z  102.590575")
    with pytest.raises(HorizonsError):
        parse_rows(broken)


def test_parse_rows_requires_markers() -> None:
    with pytest.raises(HorizonsError):
        parse_rows("no markers here")


def test_validate_coverage_accepts_the_locked_window() -> None:
    rows = make_rows(["2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z", "2026-01-01T02:00:00Z"])
    validate_coverage(
        rows,
        start_utc=parse_utc("2026-01-01T00:00:00Z"),
        stop_utc=parse_utc("2026-01-01T02:00:00Z"),
        step_seconds_value=3600,
        expected_samples=3,
    )


def test_validate_coverage_rejects_wrong_row_count() -> None:
    rows = make_rows(["2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z"])
    with pytest.raises(HorizonsError):
        validate_coverage(
            rows,
            start_utc=parse_utc("2026-01-01T00:00:00Z"),
            stop_utc=parse_utc("2026-01-01T01:00:00Z"),
            step_seconds_value=3600,
            expected_samples=26305,
        )


def test_validate_coverage_rejects_wrong_stop() -> None:
    rows = make_rows(["2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z"])
    with pytest.raises(HorizonsError):
        validate_coverage(
            rows,
            start_utc=parse_utc("2026-01-01T00:00:00Z"),
            stop_utc=parse_utc("2029-01-01T00:00:00Z"),
            step_seconds_value=3600,
            expected_samples=2,
        )


def test_validate_coverage_rejects_a_missing_hour() -> None:
    rows = make_rows(["2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z", "2026-01-01T03:00:00Z"])
    with pytest.raises(HorizonsError):
        validate_coverage(
            rows,
            start_utc=parse_utc("2026-01-01T00:00:00Z"),
            stop_utc=parse_utc("2026-01-01T03:00:00Z"),
            step_seconds_value=3600,
            expected_samples=3,
        )


def test_reference_rows_sample_every_interval_and_keep_the_last_row() -> None:
    times = [f"2026-01-01T0{hour}:00:00Z" for hour in range(6)]
    rows = make_rows(times)
    sampled = reference_rows(rows, every=4)
    assert len(sampled) == 3
    assert [item[0] for item in sampled] == [
        "2026-01-01T00:00:00Z",
        "2026-01-01T04:00:00Z",
        "2026-01-01T05:00:00Z",
    ]


def test_step_seconds_parses_supported_units() -> None:
    assert step_seconds("1h") == 3600
    assert step_seconds("30m") == 1800
    assert step_seconds("1d") == 86400
    with pytest.raises(HorizonsError):
        step_seconds("1y")


def test_load_sites_reads_registry_order_and_reference_altitude() -> None:
    sites = load_sites()
    assert len(sites) == 16
    assert sites[0].site_id == "artemis-cabeus-peak"
    assert sites[-1].site_id == "cnsa-change-4-von-karman"
    assert all(site.elevation_m == 0.0 for site in sites)
    assert all(site.altitude_source.startswith("reference_sphere_zero") for site in sites)
    slater_plain = next(site for site in sites if site.site_id == "artemis-slater-plain")
    assert slater_plain.lon_deg == 111.29
