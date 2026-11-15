"""Load and validate the curated lunar landing-site registry."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field, HttpUrl

Category = Literal["artemis_iii", "clps_commercial", "apollo_historic", "international"]
REGISTRY_PATH = Path(__file__).resolve().parents[2] / "config" / "curated_sites.yaml"


class CuratedSite(BaseModel):
    model_config = {"extra": "forbid"}

    id: str
    name: str
    category: Category
    agency: str
    lat_deg: float = Field(ge=-90.0, le=90.0)
    lon_deg: float = Field(ge=-180.0, le=180.0)
    coordinate_source_url: HttpUrl
    summary: str


def load_curated_sites(path: Path = REGISTRY_PATH) -> list[CuratedSite]:
    """Return the curated sites in file order, validated."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return [CuratedSite.model_validate(item) for item in raw["sites"]]
