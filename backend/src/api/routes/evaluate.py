"""Scenario evaluation endpoint (Contract B)."""

from __future__ import annotations

from copy import deepcopy

from fastapi import APIRouter, HTTPException

from src.api.dependencies import load_contract_fixture
from src.api.schemas.evaluation_schemas import EvaluateRequestSchema, EvaluateResponseSchema
from src.domain.constants import validate_selenographic_coords

router = APIRouter(tags=["evaluate"])


@router.post("/evaluate", response_model=EvaluateResponseSchema)
def evaluate_scenario(payload: EvaluateRequestSchema) -> EvaluateResponseSchema:
    """Evaluate illumination, DTE comms, countdowns, and score for a scenario (Contract B)."""
    if payload.site_id is None and payload.custom_coords is None:
        raise HTTPException(
            status_code=422,
            detail="Either site_id or custom_coords must be provided.",
        )

    result = deepcopy(load_contract_fixture("evaluate.sample.json"))
    if payload.custom_coords is not None:
        lat_clamped, lon_deg = validate_selenographic_coords(
            payload.custom_coords.lat_deg,
            payload.custom_coords.lon_deg,
        )
        result["site"]["id"] = f"custom-{lat_clamped:.4f}_{lon_deg:.4f}"
        result["site"]["name"] = payload.custom_coords.label or "Custom Landing Coordinates"
        result["site"]["lat_deg"] = lat_clamped
        result["site"]["lon_deg"] = lon_deg

    return EvaluateResponseSchema.model_validate(result)
