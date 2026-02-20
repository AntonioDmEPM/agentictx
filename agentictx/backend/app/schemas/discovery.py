import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.discovery import ClusterStatus, JTDStatus, MessageRole, RawInputType


# ─── Raw Input ───────────────────────────────────────────────────────────────

class RawInputRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    type: RawInputType
    content: str | None
    file_path: str | None
    file_name: str | None
    mime_type: str | None
    processed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Conversation Message ─────────────────────────────────────────────────────

class ConversationMessageRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    role: MessageRole
    content: Any  # list of Anthropic content blocks
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Lived JTD ───────────────────────────────────────────────────────────────

class LivedJTDRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    description: str
    system_context: str | None
    cognitive_load_score: int | None
    status: JTDStatus
    linked_cognitive_jtd_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LivedJTDUpdate(BaseModel):
    description: str | None = Field(None, min_length=1)
    system_context: str | None = None
    cognitive_load_score: int | None = Field(None, ge=0, le=3)
    status: JTDStatus | None = None
    linked_cognitive_jtd_id: uuid.UUID | None = None


# ─── Cognitive JTD ───────────────────────────────────────────────────────────

class CognitiveJTDRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    description: str
    cognitive_zone: str | None
    load_intensity: int | None
    linked_lived_jtd_ids: list[str] | None
    status: JTDStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CognitiveJTDUpdate(BaseModel):
    description: str | None = Field(None, min_length=1)
    cognitive_zone: str | None = None
    load_intensity: int | None = Field(None, ge=0, le=3)
    linked_lived_jtd_ids: list[str] | None = None
    status: JTDStatus | None = None


# ─── Delegation Cluster ───────────────────────────────────────────────────────

class DelegationClusterRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    name: str
    purpose: str | None
    cognitive_jtd_ids: list[str]
    lived_jtd_ids: list[str] | None
    suitability_scores: dict[str, int] | None
    status: ClusterStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DelegationClusterUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    purpose: str | None = None
    cognitive_jtd_ids: list[str] | None = None
    lived_jtd_ids: list[str] | None = None
    status: ClusterStatus | None = None


# ─── Cognitive Map (full GET response) ───────────────────────────────────────

class CognitiveMapRead(BaseModel):
    use_case_id: uuid.UUID
    raw_inputs: list[RawInputRead]
    conversation_messages: list[ConversationMessageRead]
    lived_jtds: list[LivedJTDRead]
    cognitive_jtds: list[CognitiveJTDRead]
    delegation_clusters: list[DelegationClusterRead]


# ─── Suitability Score ────────────────────────────────────────────────────────

SUITABILITY_DIMENSIONS = [
    "cognitive_load_intensity",
    "input_data_structure",
    "actionability_tool_coverage",
    "decision_determinism",
    "risk_compliance_sensitivity",
    "context_complexity",
    "exception_rate",
    "turn_taking_complexity",
    "latency_constraints",
]


class SuitabilityScores(BaseModel):
    cognitive_load_intensity: int = Field(..., ge=0, le=3)
    input_data_structure: int = Field(..., ge=0, le=3)
    actionability_tool_coverage: int = Field(..., ge=0, le=3)
    decision_determinism: int = Field(..., ge=0, le=3)
    risk_compliance_sensitivity: int = Field(..., ge=0, le=3)
    context_complexity: int = Field(..., ge=0, le=3)
    exception_rate: int = Field(..., ge=0, le=3)
    turn_taking_complexity: int = Field(..., ge=0, le=3)
    latency_constraints: int = Field(..., ge=0, le=3)
