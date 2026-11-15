"""Scenario evaluation endpoint (Contract B)."""

from __future__ import annotations

from fastapi import APIRouter

from src.api.schemas.enums import DurationDays, ObserverHeightM, SolarArrayType, StepMinutes
from src.api.schemas.evaluation_schemas import EvaluateRequestSchema, EvaluateResponseSchema
from src.application.evaluation_service import evaluate_scenario

router = APIRouter(tags=["evaluate"])


@router.post("/evaluate", response_model=EvaluateResponseSchema)
def evaluate_scenario_endpoint(payload: EvaluateRequestSchema) -> EvaluateResponseSchema:
    """Evaluate illumination, DTE comms, countdowns, and score for a scenario."""
    result = evaluate_scenario(
        site_id=payload.site_id,
        start_utc=payload.start_utc,
        duration_days=float(DurationDays(payload.duration_days).value),
        step_minutes=int(StepMinutes(payload.step_minutes).value),
        solar_array_type=str(SolarArrayType(payload.solar_array_type).value),
        fixed_array_azimuth_deg=float(payload.fixed_array_azimuth_deg),
        observer_height_m=float(ObserverHeightM(payload.observer_height_m).value),
        min_comms_elev_deg=float(payload.min_comms_elev_deg),
    )
    return EvaluateResponseSchema.model_validate(result)
