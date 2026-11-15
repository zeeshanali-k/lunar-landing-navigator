"""Parse, verify, and read the LOLA 80 m south-polar DEM (PDS3 product)."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np

PARSER_VERSION = "pds_dem/1.0.0"
_HASH_CHUNK_BYTES = 1 << 20
_KEY_PATTERN = re.compile(r"[A-Z][A-Z0-9_]*")
_SAMPLE_TYPE = "LSB_INTEGER"
_SAMPLE_BITS = 16
_SAMPLE_DTYPE = np.dtype("<i2")
_MAP_PROJECTION = "POLAR STEREOGRAPHIC"
_LATITUDE_TYPE = "PLANETOCENTRIC"


class PdsLabelError(ValueError):
    """Raised when a PDS3 label is incomplete or describes an unexpected product."""


class DemVerificationError(RuntimeError):
    """Raised when a DEM product does not match its declared byte count or SHA-256."""


@dataclass(frozen=True)
class PdsLabel:
    """Verified metadata from a LOLA DEM PDS3 label."""

    file_name: str
    record_bytes: int
    file_records: int
    image_name: str
    lines: int
    line_samples: int
    sample_type: str
    sample_bits: int
    unit: str
    scaling_factor: float
    offset_m: float
    map_projection_type: str
    latitude_type: str
    center_latitude_deg: float
    center_longitude_deg: float
    map_scale_m_per_px: float
    minimum_latitude_deg: float
    maximum_latitude_deg: float
    line_projection_offset_px: float
    sample_projection_offset_px: float

    @property
    def sample_count(self) -> int:
        """Return the total number of grid samples."""
        return self.lines * self.line_samples

    @property
    def image_bytes(self) -> int:
        """Return the byte length implied by the grid and sample size."""
        return self.sample_count * (self.sample_bits // 8)


def _scalar(raw: str) -> str:
    """Strip a PDS3 unit suffix and surrounding quotes from a value."""
    value = raw.split("<", 1)[0].strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def _blocks(text: str) -> dict[str, dict[str, str]]:
    """Collect the OBJECT blocks of a PDS3 label keyed by object name."""
    stack: list[tuple[str, dict[str, str]]] = [("<root>", {})]
    blocks: dict[str, dict[str, str]] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith(("/*", "#")):
            continue
        if line.upper() == "END":
            break
        key, separator, value = line.partition("=")
        key = key.strip()
        if not separator or not _KEY_PATTERN.fullmatch(key):
            continue
        value = value.strip()
        if key == "OBJECT":
            stack.append((_scalar(value), {}))
        elif key == "END_OBJECT":
            if len(stack) <= 1:
                raise PdsLabelError("END_OBJECT without a matching OBJECT")
            name, block = stack.pop()
            blocks[name] = block
        else:
            stack[-1][1][key] = value
    if len(stack) != 1:
        raise PdsLabelError("unterminated OBJECT block in label")
    return blocks


def _text(block: dict[str, str], key: str, where: str) -> str:
    """Return a required textual keyword from a label block."""
    if key not in block:
        raise PdsLabelError(f"{where}: missing {key}")
    return _scalar(block[key])


def _number(block: dict[str, str], key: str, where: str) -> float:
    """Return a required numeric keyword from a label block."""
    raw = _text(block, key, where)
    try:
        return float(raw)
    except ValueError as exc:
        raise PdsLabelError(f"{where}: {key}={raw!r} is not numeric") from exc


def _validate(label: PdsLabel) -> None:
    """Reject a label that does not describe the locked 80 m south-polar product."""
    if label.sample_type != _SAMPLE_TYPE:
        raise PdsLabelError(f"unexpected SAMPLE_TYPE {label.sample_type!r}")
    if label.sample_bits != _SAMPLE_BITS:
        raise PdsLabelError(f"unexpected SAMPLE_BITS {label.sample_bits}")
    if label.lines != label.line_samples:
        raise PdsLabelError(f"non-square grid {label.lines}x{label.line_samples}")
    if label.map_projection_type != _MAP_PROJECTION:
        raise PdsLabelError(f"unexpected MAP_PROJECTION_TYPE {label.map_projection_type!r}")
    if label.latitude_type != _LATITUDE_TYPE:
        raise PdsLabelError(f"unexpected KEYWORD_LATITUDE_TYPE {label.latitude_type!r}")
    if label.record_bytes != label.line_samples * (label.sample_bits // 8):
        raise PdsLabelError("RECORD_BYTES does not match LINE_SAMPLES x SAMPLE_BITS")
    if label.record_bytes * label.file_records != label.image_bytes:
        raise PdsLabelError("FILE_RECORDS x RECORD_BYTES does not match the image extent")
    if label.maximum_latitude_deg <= label.minimum_latitude_deg:
        raise PdsLabelError("latitude bounds are inverted")
    if label.maximum_latitude_deg > -80.0 or label.minimum_latitude_deg < -90.0:
        raise PdsLabelError("label does not cover 80S to 90S")


def parse_label_text(text: str) -> PdsLabel:
    """Parse and validate a LOLA DEM PDS3 label from text."""
    blocks = _blocks(text)
    container = blocks.get("UNCOMPRESSED_FILE")
    image = blocks.get("IMAGE")
    projection = blocks.get("IMAGE_MAP_PROJECTION")
    if container is None or image is None or projection is None:
        raise PdsLabelError("label lacks UNCOMPRESSED_FILE, IMAGE, or IMAGE_MAP_PROJECTION")

    label = PdsLabel(
        file_name=_text(container, "FILE_NAME", "UNCOMPRESSED_FILE"),
        record_bytes=int(_number(container, "RECORD_BYTES", "UNCOMPRESSED_FILE")),
        file_records=int(_number(container, "FILE_RECORDS", "UNCOMPRESSED_FILE")),
        image_name=_text(image, "NAME", "IMAGE"),
        lines=int(_number(image, "LINES", "IMAGE")),
        line_samples=int(_number(image, "LINE_SAMPLES", "IMAGE")),
        sample_type=_text(image, "SAMPLE_TYPE", "IMAGE"),
        sample_bits=int(_number(image, "SAMPLE_BITS", "IMAGE")),
        unit=_text(image, "UNIT", "IMAGE"),
        scaling_factor=_number(image, "SCALING_FACTOR", "IMAGE"),
        offset_m=_number(image, "OFFSET", "IMAGE"),
        map_projection_type=_text(projection, "MAP_PROJECTION_TYPE", "IMAGE_MAP_PROJECTION"),
        latitude_type=_text(projection, "KEYWORD_LATITUDE_TYPE", "IMAGE_MAP_PROJECTION"),
        center_latitude_deg=_number(projection, "CENTER_LATITUDE", "IMAGE_MAP_PROJECTION"),
        center_longitude_deg=_number(projection, "CENTER_LONGITUDE", "IMAGE_MAP_PROJECTION"),
        map_scale_m_per_px=_number(projection, "MAP_SCALE", "IMAGE_MAP_PROJECTION"),
        minimum_latitude_deg=_number(projection, "MINIMUM_LATITUDE", "IMAGE_MAP_PROJECTION"),
        maximum_latitude_deg=_number(projection, "MAXIMUM_LATITUDE", "IMAGE_MAP_PROJECTION"),
        line_projection_offset_px=_number(
            projection, "LINE_PROJECTION_OFFSET", "IMAGE_MAP_PROJECTION"
        ),
        sample_projection_offset_px=_number(
            projection, "SAMPLE_PROJECTION_OFFSET", "IMAGE_MAP_PROJECTION"
        ),
    )
    _validate(label)
    return label


def parse_label(path: Path) -> PdsLabel:
    """Parse and validate a LOLA DEM PDS3 label from disk."""
    return parse_label_text(path.read_text(encoding="utf-8"))


def sha256_file(path: Path, chunk_bytes: int = _HASH_CHUNK_BYTES) -> str:
    """Return the lowercase SHA-256 hex digest of a file."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_bytes), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_product(path: Path, *, expected_bytes: int, expected_sha256: str | None = None) -> str:
    """Verify a product's byte count and optional SHA-256, returning the digest."""
    if not path.is_file():
        raise DemVerificationError(f"missing product: {path}")
    actual_bytes = path.stat().st_size
    if actual_bytes != expected_bytes:
        raise DemVerificationError(
            f"{path.name}: expected {expected_bytes} bytes, found {actual_bytes}"
        )
    digest = sha256_file(path)
    if expected_sha256 is not None and digest != expected_sha256:
        raise DemVerificationError(
            f"{path.name}: expected sha256 {expected_sha256}, found {digest}"
        )
    return digest


def read_elevations(
    path: Path, label: PdsLabel, *, expected_sha256: str | None = None
) -> np.ndarray:
    """Verify the image and return elevations in metres as a rows x samples array."""
    verify_product(path, expected_bytes=label.image_bytes, expected_sha256=expected_sha256)
    samples = np.fromfile(path, dtype=_SAMPLE_DTYPE)
    if samples.size != label.sample_count:
        raise DemVerificationError(f"{path.name}: decoded {samples.size} samples from label")
    elevations = samples.astype(np.float32) * np.float32(label.scaling_factor)
    return elevations.reshape(label.lines, label.line_samples)
