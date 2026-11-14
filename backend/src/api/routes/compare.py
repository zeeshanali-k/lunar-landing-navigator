"""Multi-scenario comparison endpoint (Contract D)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.api.dependencies import load_contract_fixture
from src.api.schemas.comparison_schemas import CompareRequestSchema, CompareResponseSchema

router = APIRouter(tags=["compare"])


@router.post("/compare", response_model=CompareResponseSchema)
def compare_scenarios(payload: CompareRequestSchema) -> CompareResponseSchema:
    """Compare scenarios side-by-side or across launch shifts (Contract D)."""
    if payload.baseline_index >= len(payload.scenarios):
        raise HTTPException(
            status_code=422,
            detail="baseline_index must reference an entry in scenarios.",
        )
    raw = load_contract_fixture("compare.sample.json")
    return CompareResponseSchema.model_validate(raw)
