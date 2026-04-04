import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.discovery import (
    ActivityStatus,
    ClusterStatus,
    JTDStatus,
    MessageRole,
    RawInputType,
    ScopeStatus,
)


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


# ─── Activity (Job To Be Done) ──────────────────────────────────────────────

class ActivityRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    description: str
    system_context: str | None
    process_phase_id: uuid.UUID | None
    status: ActivityStatus
    linked_cognitive_jtd_id: uuid.UUID | None
    source_message_id: uuid.UUID | None = None
    is_modified: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Keep old name as alias for backward compatibility
LivedJTDRead = ActivityRead


class ActivityCreate(BaseModel):
    description: str = Field(..., min_length=1)
    system_context: str | None = None
    process_phase_id: uuid.UUID | None = None


# Keep old name as alias for backward compatibility
LivedJTDCreate = ActivityCreate


class ActivityUpdate(BaseModel):
    description: str | None = Field(None, min_length=1)
    system_context: str | None = None
    process_phase_id: uuid.UUID | None = None
    status: ActivityStatus | None = None
    linked_cognitive_jtd_id: uuid.UUID | None = None
    is_modified: bool | None = None


# Keep old name as alias for backward compatibility
LivedJTDUpdate = ActivityUpdate


# ─── Cognitive Load ──────────────────────────────────────────────────────────

class CognitiveLoadRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    description: str
    cognitive_zone: str | None
    load_intensity: int | None
    process_phase_id: uuid.UUID | None
    linked_lived_jtd_ids: list[str] | None
    status: ActivityStatus
    source_message_id: uuid.UUID | None = None
    is_modified: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Keep old name as alias for backward compatibility
CognitiveJTDRead = CognitiveLoadRead


class CognitiveLoadCreate(BaseModel):
    description: str = Field(..., min_length=1)
    cognitive_zone: str | None = None
    load_intensity: int | None = Field(None, ge=0, le=3)
    process_phase_id: uuid.UUID | None = None


# Keep old name as alias for backward compatibility
CognitiveJTDCreate = CognitiveLoadCreate


class CognitiveLoadUpdate(BaseModel):
    description: str | None = Field(None, min_length=1)
    cognitive_zone: str | None = None
    load_intensity: int | None = Field(None, ge=0, le=3)
    process_phase_id: uuid.UUID | None = None
    linked_lived_jtd_ids: list[str] | None = None
    status: ActivityStatus | None = None
    is_modified: bool | None = None


# Keep old name as alias for backward compatibility
CognitiveJTDUpdate = CognitiveLoadUpdate


# ─── Agent Scope (Delegation Cluster) ────────────────────────────────────────

class AgentScopeRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    name: str
    purpose: str | None
    cognitive_jtd_ids: list[uuid.UUID]
    lived_jtd_ids: list[uuid.UUID]
    suitability_scores: dict[str, int] | None
    delegation_mode: str | None
    status: ScopeStatus
    is_scored: bool
    created_at: datetime
    updated_at: datetime


# Keep old name as alias for backward compatibility
DelegationClusterRead = AgentScopeRead


class AgentScopeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    purpose: str | None = None
    delegation_mode: str | None = None
    status: ScopeStatus | None = None


# Keep old name as alias for backward compatibility
DelegationClusterUpdate = AgentScopeUpdate


# ─── Cognitive Map (full GET response) ───────────────────────────────────────

class CognitiveMapRead(BaseModel):
    use_case_id: uuid.UUID
    raw_inputs: list[RawInputRead]
    conversation_messages: list[ConversationMessageRead]
    lived_jtds: list[ActivityRead]
    cognitive_jtds: list[CognitiveLoadRead]
    delegation_clusters: list[AgentScopeRead]


# ─── Readiness Score ─────────────────────────────────────────────────────────

READINESS_DIMENSIONS = [
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

# Keep old name as alias for backward compatibility
SUITABILITY_DIMENSIONS = READINESS_DIMENSIONS


class ReadinessScores(BaseModel):
    cognitive_load_intensity: int = Field(..., ge=0, le=3)
    input_data_structure: int = Field(..., ge=0, le=3)
    actionability_tool_coverage: int = Field(..., ge=0, le=3)
    decision_determinism: int = Field(..., ge=0, le=3)
    risk_compliance_sensitivity: int = Field(..., ge=0, le=3)
    context_complexity: int = Field(..., ge=0, le=3)
    exception_rate: int = Field(..., ge=0, le=3)
    turn_taking_complexity: int = Field(..., ge=0, le=3)
    latency_constraints: int = Field(..., ge=0, le=3)


# Keep old name as alias for backward compatibility
SuitabilityScores = ReadinessScores


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


class ScopeProcessStepRead(BaseModel):
    """Links an agent scope to a process step."""
    id: uuid.UUID
    cluster_id: uuid.UUID
    process_step_id: uuid.UUID

    model_config = {"from_attributes": True}


# Keep old name as alias for backward compatibility
ClusterProcessStepRead = ScopeProcessStepRead


class ProcessFlowRead(BaseModel):
    use_case_id: uuid.UUID
    steps: list[ProcessStepRead]
    cluster_steps: list[ScopeProcessStepRead]
