import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, func
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
    # Advisory reference to the delegation cluster this spec was built from
    delegation_cluster_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    autonomy_level: Mapped[str | None] = mapped_column(String(50), nullable=True)

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
