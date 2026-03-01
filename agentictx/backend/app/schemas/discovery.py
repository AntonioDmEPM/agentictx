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
    process_phase_id: uuid.UUID | None
    status: JTDStatus
    linked_cognitive_jtd_id: uuid.UUID | None
    source_message_id: uuid.UUID | None = None
    is_modified: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LivedJTDCreate(BaseModel):
    description: str = Field(..., min_length=1)
    system_context: str | None = None
    process_phase_id: uuid.UUID | None = None


class LivedJTDUpdate(BaseModel):
    description: str | None = Field(None, min_length=1)
    system_context: str | None = None
    process_phase_id: uuid.UUID | None = None
    status: JTDStatus | None = None
    linked_cognitive_jtd_id: uuid.UUID | None = None
    is_modified: bool | None = None


# ─── Cognitive JTD ───────────────────────────────────────────────────────────

class CognitiveJTDRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    description: str
    cognitive_zone: str | None
    load_intensity: int | None
    process_phase_id: uuid.UUID | None
    linked_lived_jtd_ids: list[str] | None
    status: JTDStatus
    source_message_id: uuid.UUID | None = None
    is_modified: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CognitiveJTDCreate(BaseModel):
    description: str = Field(..., min_length=1)
    cognitive_zone: str | None = None
    load_intensity: int | None = Field(None, ge=0, le=3)
    process_phase_id: uuid.UUID | None = None


class CognitiveJTDUpdate(BaseModel):
    description: str | None = Field(None, min_length=1)
    cognitive_zone: str | None = None
    load_intensity: int | None = Field(None, ge=0, le=3)
    process_phase_id: uuid.UUID | None = None
    linked_lived_jtd_ids: list[str] | None = None
    status: JTDStatus | None = None
    is_modified: bool | None = None


# ─── Delegation Cluster ───────────────────────────────────────────────────────

class DelegationClusterRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    name: str
    purpose: str | None
    cognitive_jtd_ids: list[uuid.UUID]
    lived_jtd_ids: list[uuid.UUID]
    suitability_scores: dict[str, int] | None
    delegation_mode: str | None
    status: ClusterStatus
    is_scored: bool
    created_at: datetime
    updated_at: datetime


class DelegationClusterUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    purpose: str | None = None
    delegation_mode: str | None = None
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


# ─── Process Visualisation ────────────────────────────────────────────────────

class ProcessStepCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    sequence_order: int = Field(..., ge=0)
    is_breakpoint: bool = False
    cognitive_load_intensity: int | None = Field(None, ge=0, le=3)


class ProcessStepUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    sequence_order: int | None = Field(None, ge=0)
    is_breakpoint: bool | None = None
    cognitive_load_intensity: int | None = Field(None, ge=0, le=3)


class ProcessStepRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    name: str
    description: str | None
    sequence_order: int
    is_breakpoint: bool
    cognitive_load_intensity: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClusterProcessStepRead(BaseModel):
    id: uuid.UUID
    cluster_id: uuid.UUID
    process_step_id: uuid.UUID

    model_config = {"from_attributes": True}


class ProcessFlowRead(BaseModel):
    use_case_id: uuid.UUID
    steps: list[ProcessStepRead]
    cluster_steps: list[ClusterProcessStepRead]
