"""Acquire the LOLA 80 m south-polar DEM and record its provenance.

Build-time only. Streams each artefact to a ``.part`` file, verifies size and
hash, renames atomically, then writes ``data/manifests/lola/manifest.json``.
Never imported at runtime.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml  # type: ignore[import-untyped]

from src.infrastructure.pds_dem import (
    PARSER_VERSION,
    DemVerificationError,
    PdsLabel,
    PdsLabelError,
    parse_label,
    sha256_file,
    verify_product,
)

TASK_ID = "DATA-002"
BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = Path(__file__).resolve().parents[3]
CONFIG_PATH = BACKEND_ROOT / "config" / "data_sources.yaml"
DOWNLOADS_DIR = REPO_ROOT / "data" / "downloads" / "lola"
MANIFEST_PATH = REPO_ROOT / "data" / "manifests" / "lola" / "manifest.json"
CHUNK_BYTES = 1 << 20
TIMEOUT_SECONDS = 300
USER_AGENT = "lunar-landing-navigator/DATA-002"


class AcquisitionError(RuntimeError):
    """Raised when a product cannot be acquired or fails verification."""


def utc_now() -> str:
    """Return the current UTC time in ISO-8601 Z form."""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_source_config(path: Path = CONFIG_PATH) -> dict[str, Any]:
    """Return the lola section of the data source configuration."""
    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or not isinstance(document.get("lola"), dict):
        raise AcquisitionError(f"{path} has no lola mapping")
    return document["lola"]


def download_to_part(url: str, part: Path, *, expected_bytes: int | None) -> dict[str, Any]:
    """Stream url into part and return the HTTP provenance of this request."""
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        status = int(response.status)
        final_url = response.geturl()
        retrieved_utc = utc_now()
        if status != 200:
            raise AcquisitionError(f"{url}: HTTP {status}")
        declared = response.headers.get("Content-Length")
        if expected_bytes is not None and declared is not None and int(declared) != expected_bytes:
            raise AcquisitionError(f"{url}: Content-Length {declared} != {expected_bytes}")
        written = 0
        with part.open("wb") as handle:
            while True:
                chunk = response.read(CHUNK_BYTES)
                if not chunk:
                    break
                handle.write(chunk)
                written += len(chunk)
    return {
        "original_url": url,
        "final_url": final_url,
        "retrieved_utc": retrieved_utc,
        "http_status": status,
        "bytes": written,
    }


def acquire(
    url: str,
    destination: Path,
    *,
    expected_bytes: int | None,
    prior: dict[str, Any] | None,
) -> dict[str, Any]:
    """Acquire one artefact, reusing a verified cache entry when possible."""
    prior_sha = None if prior is None else prior.get("sha256")
    if prior is not None and prior_sha and destination.is_file():
        cached_bytes = destination.stat().st_size
        if expected_bytes is None or cached_bytes == expected_bytes:
            cached_sha = sha256_file(destination)
            if cached_sha == prior_sha:
                return {**prior, "bytes": cached_bytes, "sha256": cached_sha, "cached": True}

    part = destination.with_name(f"{destination.name}.part")
    metadata = download_to_part(url, part, expected_bytes=expected_bytes)
    if expected_bytes is not None:
        verify_product(part, expected_bytes=expected_bytes)
    digest = sha256_file(part)
    if prior_sha is not None and digest != prior_sha:
        raise AcquisitionError(f"{destination.name}: sha256 {digest} != recorded {prior_sha}")
    os.replace(part, destination)
    return {**metadata, "sha256": digest, "cached": False}


def load_prior_manifest() -> dict[str, Any] | None:
    """Return the previous manifest as a mapping, or None when unusable."""
    if not MANIFEST_PATH.is_file():
        return None
    try:
        document = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return document if isinstance(document, dict) else None


def prior_artefact(manifest: dict[str, Any] | None, name: str) -> dict[str, Any] | None:
    """Return a previously recorded artefact entry, if any."""
    if not manifest:
        return None
    artefacts = manifest.get("artefacts")
    if not isinstance(artefacts, dict):
        return None
    entry = artefacts.get(name)
    return entry if isinstance(entry, dict) else None


def build_manifest(
    config: dict[str, Any],
    image: dict[str, Any],
    label_artefact: dict[str, Any],
    label: PdsLabel,
) -> dict[str, Any]:
    """Assemble the provenance manifest for the acquired product."""
    expected_bytes = int(config["expected_bytes"])
    return {
        "schema_version": 1,
        "task": TASK_ID,
        "parser_version": PARSER_VERSION,
        "product": Path(str(config["image"])).stem,
        "base_url": config["base_url"],
        "retrieved_utc": max(image["retrieved_utc"], label_artefact["retrieved_utc"]),
        "artefacts": {"image": image, "label": label_artefact},
        "label_metadata": asdict(label),
        "verification": {
            "expected_bytes": expected_bytes,
            "actual_bytes": image["bytes"],
            "size_matches": image["bytes"] == expected_bytes,
            "sha256": image["sha256"],
            "label_parsed": True,
        },
        "generated_outputs": [],
        "generated_output_notes": (
            "DATA-002 derives no files from the DEM; DATA-005 builds the terrain packs."
        ),
    }


def check_against_config(label: PdsLabel, config: dict[str, Any]) -> None:
    """Cross-check parsed label values against the locked source configuration."""
    expected_shape = config.get("expected_shape")
    if expected_shape is not None:
        shape = [int(value) for value in expected_shape]
        if [label.lines, label.line_samples] != shape:
            raise AcquisitionError(f"label shape {label.lines}x{label.line_samples} != {shape}")
    expected_scale = config.get("expected_scale_m_per_px")
    if expected_scale is not None and label.map_scale_m_per_px != float(expected_scale):
        raise AcquisitionError(
            f"label map scale {label.map_scale_m_per_px} != {float(expected_scale)}"
        )


def main() -> int:
    """Acquire both artefacts, verify them, and write the manifest."""
    config = load_source_config()
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    prior = load_prior_manifest()
    base_url = str(config["base_url"]).rstrip("/")
    image_name = str(config["image"])
    label_name = str(config["label"])
    expected_bytes = int(config["expected_bytes"])

    label_artefact = acquire(
        f"{base_url}/{label_name}",
        DOWNLOADS_DIR / label_name,
        expected_bytes=None,
        prior=prior_artefact(prior, "label"),
    )
    label = parse_label(DOWNLOADS_DIR / label_name)
    check_against_config(label, config)

    image = acquire(
        f"{base_url}/{image_name}",
        DOWNLOADS_DIR / image_name,
        expected_bytes=expected_bytes,
        prior=prior_artefact(prior, "image"),
    )
    verify_product(
        DOWNLOADS_DIR / image_name,
        expected_bytes=label.image_bytes,
        expected_sha256=image["sha256"],
    )

    manifest = build_manifest(config, image, label_artefact, label)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(f"OK    image {image_name}: {image['bytes']} bytes sha256={image['sha256']}")
    print(
        f"OK    label {label_name}: {label.lines}x{label.line_samples} "
        f"{label.sample_type} {label.sample_bits}-bit "
        f"{label.map_scale_m_per_px} m/pix {label.latitude_type} "
        f"centre_lon={label.center_longitude_deg} offset={label.offset_m}"
    )
    print(f"OK    manifest {MANIFEST_PATH.relative_to(REPO_ROOT)}")
    return 0


def run() -> int:
    """Run main with a closed failure contract."""
    try:
        return main()
    except (
        AcquisitionError,
        DemVerificationError,
        PdsLabelError,
        OSError,
        yaml.YAMLError,
    ) as exc:
        print(f"FAIL  {TASK_ID}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(run())
