"""FastAPI dependency helpers for Track 0 fixture loading and shared configuration."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES_DIR = REPO_ROOT / "contracts" / "fixtures"


@lru_cache(maxsize=16)
def load_contract_fixture(filename: str) -> Any:
    """Load and cache a JSON contract sample fixture from contracts/fixtures/."""
    fixture_path = FIXTURES_DIR / filename
    if not fixture_path.is_file():
        raise FileNotFoundError(f"Contract fixture not found: {fixture_path}")
    return json.loads(fixture_path.read_text(encoding="utf-8"))
