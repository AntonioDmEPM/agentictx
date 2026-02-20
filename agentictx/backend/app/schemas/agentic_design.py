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
    status: AgentSpecStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentSpecificationUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    purpose: str | None = None
    autonomy_level: AutonomyLevel | None = None
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
    status: AgentSpecStatus | None = None


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
