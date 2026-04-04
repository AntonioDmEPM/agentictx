import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AgentSpecStatus(str, Enum):
    draft = "draft"
    approved = "approved"


class AutonomyLevel(str, Enum):
    full_delegation = "full_delegation"
    supervised_execution = "supervised_execution"
    assisted_mode = "assisted_mode"


class DesignMessageRole(str, Enum):
    user = "user"
    assistant = "assistant"


class AgentSpecification(Base):
    __tablename__ = "agent_specifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    use_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("use_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Advisory reference to the agent scope (delegation cluster) this spec was built from
    delegation_cluster_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    autonomy_level: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Phase 5a: LLM model identifier + maturity score
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    maturity_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Fully delegated activities (list of strings)
    activities: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # Supervised activities: [{activity, hitl_trigger, human_action}]
    supervised_activities: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # Out of scope activities (list of strings)
    out_of_scope: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Data sources: [{name, type, availability, access_method}]
    data_sources: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # MCP servers: [{name, purpose}]
    mcp_servers: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # Tools and APIs: [{name, type, endpoint}]
    tools_apis: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Input/output definitions as structured dicts
    input_definition: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    output_definition: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # HITL design: {trigger_conditions, escalation_path, human_role}
    hitl_design: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # Compliance: {eu_ai_act_class, gdpr_implications, audit_requirements, guardrails}
    compliance: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Open questions and blockers (list of strings)
    open_questions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Phase 5a: structured diagram fields
    # {system_prompt: {...}, dynamic_context: [...], few_shot_examples: {...}, guardrails: [...]}
    prompt_requirements: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # [{name, type, icon, estimated_tokens_per_call, description}]
    input_channels: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # [{name, node_prefix, type, status, build_effort, input_tokens_per_call,
    #   output_tokens_per_call, output_cache_hit_pct, used_by_agents,
    #   backward_impact, connected_systems}]
    tool_stack: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # [{type, name, destination, format, estimated_tokens, latency_requirement_ms}]
    output_channels: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # [{id, description, linked_to, risk_level, owner, resolution_status}]
    assumptions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Phase 5b: persisted node positions — {"node-id": {"x": float, "y": float}}
    node_positions: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    status: Mapped[AgentSpecStatus] = mapped_column(
        String(50), default=AgentSpecStatus.draft, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    use_case: Mapped["UseCase"] = relationship("UseCase", back_populates="agent_specifications")  # type: ignore[name-defined]
    handoffs_from: Mapped[list["AgentHandoff"]] = relationship(
        "AgentHandoff",
        foreign_keys="AgentHandoff.from_agent_id",
        back_populates="from_agent",
        cascade="all, delete-orphan",
    )
    handoffs_to: Mapped[list["AgentHandoff"]] = relationship(
        "AgentHandoff",
        foreign_keys="AgentHandoff.to_agent_id",
        back_populates="to_agent",
        cascade="all, delete-orphan",
    )


class AgentHandoff(Base):
    __tablename__ = "agent_handoffs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    use_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("use_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    from_agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agent_specifications.id", ondelete="CASCADE"),
        nullable=False,
    )
    to_agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agent_specifications.id", ondelete="CASCADE"),
        nullable=False,
    )
    trigger_condition: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    handoff_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="sequential"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    from_agent: Mapped[AgentSpecification] = relationship(
        "AgentSpecification",
        foreign_keys=[from_agent_id],
        back_populates="handoffs_from",
    )
    to_agent: Mapped[AgentSpecification] = relationship(
        "AgentSpecification",
        foreign_keys=[to_agent_id],
        back_populates="handoffs_to",
    )


class AgenticDesignMessage(Base):
    __tablename__ = "agentic_design_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    use_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("use_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[DesignMessageRole] = mapped_column(String(20), nullable=False)
    # Full Anthropic content blocks (same pattern as ConversationMessage)
    content: Mapped[dict | list] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    use_case: Mapped["UseCase"] = relationship("UseCase", back_populates="agentic_design_messages")  # type: ignore[name-defined]
