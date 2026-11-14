"""Pydantic v2 schemas for Contract D (CompareRequest and CompareResponse)."""

from __future__ import annotations

from pydantic import BaseModel, Field

from src.api.schemas.evaluation_schemas import EvaluateRequestSchema, EvaluateResponseSchema


class CompareScenarioInputSchema(BaseModel):
    """Single scenario input entry in a multi-scenario comparison request."""

    scenario_id: str
    label: str
    request: EvaluateRequestSchema


class CompareRequestSchema(BaseModel):
    """Contract D comparison request payload (2 to 4 scenarios)."""

    baseline_index: int = Field(ge=0, default=0)
    scenarios: list[CompareScenarioInputSchema] = Field(min_length=1, max_length=4)


class ScenarioDeltasSchema(BaseModel):
    """Delta metrics relative to the baseline scenario."""

    feasibility_score_delta: float
    sunlit_hours_delta: float
    longest_dark_streak_hours_delta: float
    dte_comms_hours_delta: float


class ComparedScenarioSchema(BaseModel):
    """Single evaluated scenario with baseline comparison deltas."""

    scenario_id: str
    label: str
    evaluation: EvaluateResponseSchema
    deltas_vs_baseline: ScenarioDeltasSchema


class CompareResponseSchema(BaseModel):
    """Contract D comparison response."""

    baseline_index: int
    scenarios: list[ComparedScenarioSchema]
    recommended_scenario_id: str
