import hashlib
from pathlib import Path

import numpy as np
import pytest

from src.infrastructure.pds_dem import (
    DemVerificationError,
    PdsLabelError,
    parse_label,
    parse_label_text,
    read_elevations,
    sha256_file,
    verify_product,
)

LABEL_TEXT = """
PDS_VERSION_ID        = "PDS3"
PRODUCT_VERSION_ID    = "V2.0"
OBJECT                = UNCOMPRESSED_FILE
  FILE_NAME           = "DEM.IMG"
  RECORD_TYPE         = FIXED_LENGTH
  FILE_RECORDS        = 2
  RECORD_BYTES        = 4
  ^IMAGE              = "DEM.IMG"
  OBJECT              = IMAGE
    NAME              = HEIGHT
    DESCRIPTION       = "Each sample represents height relative to a
      reference radius and is generated with SCALING_FACTOR = 0.5.
      This continuation line must not be parsed as a keyword."
    LINES             = 2
    LINE_SAMPLES      = 2
    SAMPLE_TYPE       = LSB_INTEGER
    SAMPLE_BITS       = 16
    UNIT              = METER
    SCALING_FACTOR    = 0.5
    OFFSET            = 1737400.
  END_OBJECT          = IMAGE
END_OBJECT            = UNCOMPRESSED_FILE
OBJECT                = IMAGE_MAP_PROJECTION
  MAP_PROJECTION_TYPE = "POLAR STEREOGRAPHIC"
  KEYWORD_LATITUDE_TYPE = "PLANETOCENTRIC"
  CENTER_LATITUDE     = -90 <deg>
  CENTER_LONGITUDE    = 0 <deg>
  MAP_SCALE           = 80 <m/pix>
  MINIMUM_LATITUDE    = -90 <deg>
  MAXIMUM_LATITUDE    = -80 <deg>
  LINE_PROJECTION_OFFSET = 3799.5 <pix>
  SAMPLE_PROJECTION_OFFSET = 3799.5 <pix>
END_OBJECT            = IMAGE_MAP_PROJECTION
END
"""


def write_label(tmp_path: Path, text: str = LABEL_TEXT) -> Path:
    path = tmp_path / "dem.lbl"
    path.write_text(text, encoding="utf-8")
    return path


def write_image(tmp_path: Path, values: list[int], dtype: str = "<i2") -> Path:
    path = tmp_path / "dem.img"
    np.asarray(values, dtype=dtype).tofile(path)
    return path


def test_parse_label_reads_shape_and_projection(tmp_path: Path) -> None:
    label = parse_label(write_label(tmp_path))
    assert (label.lines, label.line_samples) == (2, 2)
    assert label.sample_type == "LSB_INTEGER"
    assert label.sample_bits == 16
    assert label.scaling_factor == 0.5
    assert label.offset_m == 1737400.0
    assert label.map_projection_type == "POLAR STEREOGRAPHIC"
    assert label.latitude_type == "PLANETOCENTRIC"
    assert label.center_latitude_deg == -90.0
    assert label.center_longitude_deg == 0.0
    assert label.map_scale_m_per_px == 80.0
    assert label.minimum_latitude_deg == -90.0
    assert label.maximum_latitude_deg == -80.0
    assert label.line_projection_offset_px == 3799.5
    assert label.sample_projection_offset_px == 3799.5
    assert label.sample_count == 4
    assert label.image_bytes == 8


def test_parse_label_text_ignores_description_continuations() -> None:
    label = parse_label_text(LABEL_TEXT)
    assert label.image_name == "HEIGHT"
    assert label.file_name == "DEM.IMG"
    assert label.unit == "METER"
    assert label.record_bytes * label.file_records == label.image_bytes


def test_parse_label_rejects_unexpected_sample_type(tmp_path: Path) -> None:
    text = LABEL_TEXT.replace("LSB_INTEGER", "PC_REAL")
    assert "PC_REAL" in text
    with pytest.raises(PdsLabelError):
        parse_label(write_label(tmp_path, text))


def test_parse_label_rejects_inconsistent_record_size(tmp_path: Path) -> None:
    text = LABEL_TEXT.replace("= 4", "= 5")
    assert "= 5" in text
    with pytest.raises(PdsLabelError):
        parse_label(write_label(tmp_path, text))


def test_parse_label_rejects_inverted_latitudes(tmp_path: Path) -> None:
    text = LABEL_TEXT.replace("-90 <deg>", "-70 <deg>")
    assert "-70 <deg>" in text
    with pytest.raises(PdsLabelError):
        parse_label(write_label(tmp_path, text))


def test_verify_product_accepts_matching_size_and_hash(tmp_path: Path) -> None:
    image = write_image(tmp_path, [0, 2, 4, -2])
    digest = hashlib.sha256(image.read_bytes()).hexdigest()
    assert verify_product(image, expected_bytes=8, expected_sha256=digest) == digest
    assert sha256_file(image) == digest


def test_verify_product_rejects_byte_count_mismatch(tmp_path: Path) -> None:
    image = write_image(tmp_path, [0, 2, 4])
    with pytest.raises(DemVerificationError):
        verify_product(image, expected_bytes=8)


def test_verify_product_rejects_hash_mismatch(tmp_path: Path) -> None:
    image = write_image(tmp_path, [0, 2, 4, -2])
    with pytest.raises(DemVerificationError):
        verify_product(image, expected_bytes=8, expected_sha256="0" * 64)


def test_read_elevations_applies_label_scaling(tmp_path: Path) -> None:
    label = parse_label(write_label(tmp_path))
    image = write_image(tmp_path, [0, 2, 4, -2])
    elevations = read_elevations(image, label)
    assert elevations.shape == (2, 2)
    expected = np.array([[0.0, 1.0], [2.0, -1.0]], dtype=np.float32)
    np.testing.assert_array_equal(elevations, expected)


def test_read_elevations_rejects_truncated_file(tmp_path: Path) -> None:
    label = parse_label(write_label(tmp_path))
    image = write_image(tmp_path, [0, 2, 4])
    with pytest.raises(DemVerificationError):
        read_elevations(image, label)
