"""12-month optimal landing window scan endpoint (Contract E)."""

from __future__ import annotations

from copy import deepcopy

from fastapi import APIRouter

from src.api.dependencies import load_contract_fixture
from src.api.schemas.window_schemas import WindowsRequestSchema, WindowsResponseSchema

router = APIRouter(tags=["windows"])


@router.post("/windows", response_model=WindowsResponseSchema)
def scan_windows(payload: WindowsRequestSchema) -> WindowsResponseSchema:
    """Return 12-month candidate landing windows for a site (Contract E)."""
    raw = deepcopy(load_contract_fixture("windows.sample.json"))
    raw["site_id"] = payload.site_id
    raw["mission_duration_days"] = payload.mission_duration_days
    raw["solar_array_type"] = payload.solar_array_type
    return WindowsResponseSchema.model_validate(raw)
