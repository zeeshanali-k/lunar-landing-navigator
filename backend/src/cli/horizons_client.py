"""Build, fetch, and parse JPL Horizons topocentric Sun and Earth tracks."""

from __future__ import annotations

import hashlib
import itertools
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

PARSER_VERSION = "horizons/1.0.0"
PARAM_ORDER = (
    "format",
    "COMMAND",
    "OBJ_DATA",
    "MAKE_EPHEM",
    "EPHEM_TYPE",
    "CENTER",
    "COORD_TYPE",
    "SITE_COORD",
    "QUANTITIES",
    "START_TIME",
    "STOP_TIME",
    "STEP_SIZE",
)
RETRY_STATUSES = frozenset({429, 500, 502, 503, 504})
MAX_ATTEMPTS = 4
BACKOFF_SECONDS = (2.0, 4.0, 8.0)
REQUEST_TIMEOUT_SECONDS = 300
USER_AGENT = "lunar-landing-navigator/DATA-003"
MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}
FLAG_PATTERN = re.compile(r"\*?[im]?")
STEP_PATTERN = re.compile(r"(\d+)([mhd])")
STEP_UNITS = {"m": 60, "h": 3600, "d": 86400}


class HorizonsError(RuntimeError):
    """Raised when a Horizons request or response is unusable."""


@dataclass(frozen=True)
class Site:
    """A curated site and the observer coordinate used for Horizons."""

    site_id: str
    lat_deg: float
    lon_deg: float
    elevation_m: float
    altitude_source: str

    @property
    def altitude_km(self) -> float:
        """Return the observer altitude in kilometres."""
        return self.elevation_m / 1000.0


@dataclass(frozen=True)
class EphemerisRow:
    """One full-precision Horizons sample."""

    utc: datetime
    az_deg: float
    elev_deg: float


@dataclass(frozen=True)
class FetchResult:
    """A fetched response with its HTTP provenance."""

    text: str
    raw_bytes: bytes
    http_status: int
    final_url: str
    retrieved_utc: str
    sha256: str


def utc_now() -> str:
    """Return the current UTC time in ISO-8601 Z form."""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_utc(text: str) -> datetime:
    """Parse an ISO-8601 UTC timestamp, requiring an explicit offset or Z."""
    value = text.strip().removesuffix("Z")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise HorizonsError(f"invalid UTC timestamp {text!r}") from exc
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)


def step_seconds(step: str) -> int:
    """Convert a Horizons step string such as '1h' to seconds."""
    match = STEP_PATTERN.fullmatch(step.strip())
    if match is None:
        raise HorizonsError(f"unsupported step {step!r}")
    return int(match.group(1)) * STEP_UNITS[match.group(2)]


def build_request_params(
    site: Site,
    *,
    command: str,
    center: str,
    coord_type: str,
    quantities: str,
    start: str,
    stop: str,
    step: str,
) -> dict[str, str]:
    """Build the locked Horizons parameter set in a fixed order."""
    values = {
        "format": "text",
        "COMMAND": f"'{command}'",
        "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": f"'{center}'",
        "COORD_TYPE": f"'{coord_type}'",
        "SITE_COORD": f"'{site.lon_deg},{site.lat_deg},{site.altitude_km}'",
        "QUANTITIES": f"'{quantities}'",
        "START_TIME": f"'{start}'",
        "STOP_TIME": f"'{stop}'",
        "STEP_SIZE": f"'{step}'",
    }
    return {key: values[key] for key in PARAM_ORDER}


def canonical_request_json(params: dict[str, str]) -> str:
    """Return the canonical request JSON with the declared parameter order."""
    return json.dumps(params, separators=(",", ":"))


def build_url(api_url: str, params: dict[str, str]) -> str:
    """Return the exact request URL for a parameter set."""
    return f"{api_url}?{urllib.parse.urlencode(params)}"


def fetch(url: str, *, attempts: int = MAX_ATTEMPTS) -> FetchResult:
    """Fetch a Horizons response, retrying transient failures with backoff."""
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                status = int(response.status)
                final_url = response.geturl()
                retrieved_utc = utc_now()
                body = response.read()
            if status != 200:
                raise HorizonsError(f"HTTP {status} from {url}")
            return FetchResult(
                text=body.decode("utf-8"),
                raw_bytes=body,
                http_status=status,
                final_url=final_url,
                retrieved_utc=retrieved_utc,
                sha256=hashlib.sha256(body).hexdigest(),
            )
        except urllib.error.HTTPError as exc:
            if exc.code not in RETRY_STATUSES or attempt == attempts - 1:
                raise HorizonsError(f"HTTP {exc.code} from {url}") from exc
            last_error = exc
        except urllib.error.URLError as exc:
            if attempt == attempts - 1:
                raise HorizonsError(f"network error for {url}: {exc.reason}") from exc
            last_error = exc
        time.sleep(BACKOFF_SECONDS[min(attempt, len(BACKOFF_SECONDS) - 1)])
    raise HorizonsError(f"exhausted retries for {url}: {last_error}")


def _parse_row(tokens: list[str], original: str) -> EphemerisRow:
    """Parse one SOE row, tolerating every documented marker variant."""
    if len(tokens) == 5:
        flag, az_token, elev_token = tokens[2], tokens[3], tokens[4]
    elif len(tokens) == 4:
        flag, az_token, elev_token = "", tokens[2], tokens[3]
    else:
        raise HorizonsError(f"unparsable row: {original!r}")
    if FLAG_PATTERN.fullmatch(flag) is None:
        raise HorizonsError(f"unexpected marker {flag!r} in row: {original!r}")
    try:
        az_deg = float(az_token)
        elev_deg = float(elev_token)
    except ValueError as exc:
        raise HorizonsError(f"non-numeric azimuth/elevation in row: {original!r}") from exc
    return EphemerisRow(
        utc=_parse_row_time(tokens[0], tokens[1], original), az_deg=az_deg, elev_deg=elev_deg
    )


def _parse_row_time(date_token: str, time_token: str, original: str) -> datetime:
    """Parse a Horizons 'YYYY-Mon-DD' and 'HH:MM[:SS]' pair as UTC."""
    parts = date_token.split("-")
    clock = time_token.split(":")
    if len(parts) != 3 or len(clock) not in (2, 3):
        raise HorizonsError(f"unparsable timestamp in row: {original!r}")
    year, month_name, day = parts
    month = MONTHS.get(month_name.lower())
    if month is None or not year.isdigit() or not day.isdigit():
        raise HorizonsError(f"unparsable date in row: {original!r}")
    seconds = int(float(clock[2])) if len(clock) == 3 else 0
    return datetime(int(year), month, int(day), int(clock[0]), int(clock[1]), seconds, tzinfo=UTC)


def parse_rows(text: str) -> list[EphemerisRow]:
    """Parse the rows between the $$SOE and $$EOE markers."""
    start = text.find("$$SOE")
    end = text.find("$$EOE")
    if start < 0 or end < 0 or end <= start:
        raise HorizonsError("response is missing $$SOE/$$EOE markers")
    rows: list[EphemerisRow] = []
    for line in text[start + len("$$SOE") : end].splitlines():
        stripped = line.strip()
        if stripped:
            rows.append(_parse_row(stripped.split(), line))
    if not rows:
        raise HorizonsError("no ephemeris rows between $$SOE and $$EOE")
    return rows


def validate_coverage(
    rows: list[EphemerisRow],
    *,
    start_utc: datetime,
    stop_utc: datetime,
    step_seconds_value: int,
    expected_samples: int,
) -> None:
    """Prove the response covers the locked window at the locked step."""
    if len(rows) != expected_samples:
        raise HorizonsError(f"expected {expected_samples} rows, found {len(rows)}")
    if rows[0].utc != start_utc:
        raise HorizonsError(f"first row {rows[0].utc} != coverage start {start_utc}")
    if rows[-1].utc != stop_utc:
        raise HorizonsError(f"last row {rows[-1].utc} != coverage stop {stop_utc}")
    for previous, current in itertools.pairwise(rows):
        delta = (current.utc - previous.utc).total_seconds()
        if delta != step_seconds_value:
            raise HorizonsError(f"step {delta}s at {current.utc} != {step_seconds_value}s")


def reference_rows(rows: list[EphemerisRow], *, every: int) -> list[list[Any]]:
    """Return full-precision reference rows sampled every `every` rows plus the last."""
    if every <= 0:
        raise HorizonsError("reference interval must be positive")
    selected = [row for index, row in enumerate(rows) if index % every == 0]
    if rows and rows[-1] not in selected:
        selected.append(rows[-1])
    return [[row.utc.strftime("%Y-%m-%dT%H:%M:%SZ"), row.az_deg, row.elev_deg] for row in selected]
