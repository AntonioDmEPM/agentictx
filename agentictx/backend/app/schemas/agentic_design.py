import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.agentic_design import AgentSpecStatus, AutonomyLevel, DesignMessageRole


# ─── Agent Specification ──────────────────────────────────────────────────────

class AgentSpecificationRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    delegation_cluster_id: uuid.UUID | None
    name: str
    purpose: str | None
    autonomy_level: str | None
    # Phase 5a fields
    model: str | None
    maturity_score: int | None
    activities: list[str]
    supervised_activities: list[dict[str, Any]]
    out_of_scope: list[str]
    data_sources: list[dict[str, Any]]
    mcp_servers: list[dict[str, Any]]
    tools_apis: list[dict[str, Any]]
    input_definition: dict[str, Any]
    output_definition: dict[str, Any]
    hitl_design: dict[str, Any]
    compliance: dict[str, Any]
    open_questions: list[str]
    # Phase 5a: diagram structured fields
    prompt_requirements: dict[str, Any]
    input_channels: list[dict[str, Any]]
    tool_stack: list[dict[str, Any]]
    output_channels: list[dict[str, Any]]
    assumptions: list[dict[str, Any]]
    # Phase 5b: persisted node positions
    node_positions: dict[str, Any]
    status: AgentSpecStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentSpecificationUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    purpose: str | None = None
    autonomy_level: AutonomyLevel | None = None
    # Phase 5a fields
    model: str | None = None
    maturity_score: int | None = None
    activities: list[str] | None = None
    supervised_activities: list[dict[str, Any]] | None = None
    out_of_scope: list[str] | None = None
    data_sources: list[dict[str, Any]] | None = None
    mcp_servers: list[dict[str, Any]] | None = None
    tools_apis: list[dict[str, Any]] | None = None
    input_definition: dict[str, Any] | None = None
    output_definition: dict[str, Any] | None = None
    hitl_design: dict[str, Any] | None = None
    compliance: dict[str, Any] | None = None
    open_questions: list[str] | None = None
    # Phase 5a: diagram structured fields
    prompt_requirements: dict[str, Any] | None = None
    input_channels: list[dict[str, Any]] | None = None
    tool_stack: list[dict[str, Any]] | None = None
    output_channels: list[dict[str, Any]] | None = None
    assumptions: list[dict[str, Any]] | None = None
    # Phase 5b: persisted node positions
    node_positions: dict[str, Any] | None = None
    status: AgentSpecStatus | None = None


# ─── Agent Handoff ────────────────────────────────────────────────────────────

class AgentHandoffCreate(BaseModel):
    from_agent_id: uuid.UUID
    to_agent_id: uuid.UUID
    trigger_condition: str | None = None
    payload_description: str | None = None
    estimated_tokens: int = 0
    handoff_type: str = "sequential"


class AgentHandoffUpdate(BaseModel):
    trigger_condition: str | None = None
    payload_description: str | None = None
    estimated_tokens: int | None = None
    handoff_type: str | None = None


class AgentHandoffRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    from_agent_id: uuid.UUID
    to_agent_id: uuid.UUID
    trigger_condition: str | None
    payload_description: str | None
    estimated_tokens: int
    handoff_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Agentic Design Message ───────────────────────────────────────────────────

class AgenticDesignMessageRead(BaseModel):
    id: uuid.UUID
    use_case_id: uuid.UUID
    role: DesignMessageRole
    content: Any  # list of Anthropic content blocks
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Cross-Agent Opportunity ──────────────────────────────────────────────────

class CrossAgentOpportunity(BaseModel):
    resource_type: str  # data_source | mcp_server | tool_api
    resource_name: str
    shared_by_agents: list[str]
    reuse_recommendation: str


# ─── Full Agentic Design Map (GET response) ───────────────────────────────────

class AgenticDesignMap(BaseModel):
    use_case_id: uuid.UUID
    agent_specifications: list[AgentSpecificationRead]
    messages: list[AgenticDesignMessageRead]
    cross_agent_opportunities: list[CrossAgentOpportunity]
    handoffs: list[AgentHandoffRead]
