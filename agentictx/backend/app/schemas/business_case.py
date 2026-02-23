"""Pydantic schemas for the Business Case module."""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ─── Monthly Result ───────────────────────────────────────────────────────────

class MonthlyResult(BaseModel):
    month: int
    monthly_volume: float
    ai_cases: float
    human_cases: float
    coverage_pct: float
    token_cost_per_case: float
    voice_cost_per_case: float
    image_cost_per_case: float
    ai_cost_per_case: float
    ai_total_cost: float
    manual_labor_cost: float
    monthly_savings: float
    cumulative_savings: float
    remaining_fte: float
    freed_capacity_fte: float


# ─── Scenario Results ─────────────────────────────────────────────────────────

class ScenarioResults(BaseModel):
    monthly: list[MonthlyResult] = Field(default_factory=list)
    break_even_month: int | None = None
    roi_12m: float = 0.0
    roi_24m: float = 0.0
    roi_36m: float = 0.0
    roi_48m: float = 0.0
    total_savings_48m: float = 0.0
    cost_savings_pct: float = 0.0
    total_ai_investment_48m: float = 0.0
    total_manual_cost_48m: float = 0.0
    remaining_fte: float = 0.0
    freed_capacity_fte: float = 0.0


# ─── Scenario Schemas ─────────────────────────────────────────────────────────

class BusinessCaseScenarioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    llm_input_price_per_1k: float = 0.0
    llm_output_price_per_1k: float = 0.0
    cached_input_price_per_1k: float = 0.0
    stt_price_per_minute: float = 0.0
    tts_price_per_1k_chars: float = 0.0
    ivr_price_per_minute: float = 0.0
    image_price_per_image: float = 0.0


class BusinessCaseScenarioUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    llm_input_price_per_1k: float | None = None
    llm_output_price_per_1k: float | None = None
    cached_input_price_per_1k: float | None = None
    stt_price_per_minute: float | None = None
    tts_price_per_1k_chars: float | None = None
    ivr_price_per_minute: float | None = None
    image_price_per_image: float | None = None


class BusinessCaseScenarioRead(BaseModel):
    id: uuid.UUID
    business_case_id: uuid.UUID
    name: str
    sort_order: int
    llm_input_price_per_1k: float
    llm_output_price_per_1k: float
    cached_input_price_per_1k: float
    stt_price_per_minute: float
    tts_price_per_1k_chars: float
    ivr_price_per_minute: float
    image_price_per_image: float
    results: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Business Case Schemas ────────────────────────────────────────────────────

class ModalityUpdate(BaseModel):
    has_voice: bool | None = None
    has_realtime_audio: bool | None = None
    has_image_processing: bool | None = None
    has_text_only: bool | None = None
    stt_service: str | None = None
    tts_service: str | None = None
    llm_model: str | None = None
    ivr_service: str | None = None


class AssumptionsUpdate(BaseModel):
    weekly_volume: int | None = None
    avg_duration_minutes: float | None = None
    token_density_input: int | None = None
    token_density_output: int | None = None
    caching_ratio: float | None = None
    fte_count: int | None = None
    avg_fte_annual_cost: float | None = None
    fte_monthly_overhead: float | None = None
    coverage_ramp: list[float] | None = None
    implementation_cost: float | None = None
    implementation_amortization_months: int | None = None
    monthly_infra_cost: float | None = None
    monthly_maintenance_cost: float | None = None
    volume_growth_rate_yoy: float | None = None
    complexity_growth_rate_yoy: float | None = None
    inflation_rate_yoy: float | None = None

    @field_validator("coverage_ramp")
    @classmethod
    def validate_ramp_length(cls, v: list[float] | None) -> list[float] | None:
        if v is not None and len(v) > 48:
            raise ValueError("coverage_ramp cannot have more than 48 entries")
        return v


class BusinessCaseRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID

    # Modality
    has_voice: bool
    has_realtime_audio: bool
    has_image_processing: bool
    has_text_only: bool
    stt_service: str | None
    tts_service: str | None
    llm_model: str | None
    ivr_service: str | None

    # Volume & FTE
    weekly_volume: int
    avg_duration_minutes: float
    token_density_input: int
    token_density_output: int
    caching_ratio: float
    fte_count: int
    avg_fte_annual_cost: float
    fte_monthly_overhead: float
    coverage_ramp: list[float]

    # Cost model
    implementation_cost: float
    implementation_amortization_months: int
    monthly_infra_cost: float
    monthly_maintenance_cost: float

    # Growth rates
    volume_growth_rate_yoy: float
    complexity_growth_rate_yoy: float
    inflation_rate_yoy: float

    # Scenarios
    scenarios: list[BusinessCaseScenarioRead]

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
