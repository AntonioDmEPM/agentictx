import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RawInputType(str, Enum):
    transcript = "transcript"
    document = "document"
    image = "image"
    note = "note"


class ActivityStatus(str, Enum):
    """Status for activities and cognitive load items."""
    proposed = "proposed"
    confirmed = "confirmed"
    rejected = "rejected"


# Keep old name as alias for backward compatibility with DB enum values
JTDStatus = ActivityStatus


class ScopeStatus(str, Enum):
    """Status for agent scopes (delegation clusters)."""
    proposed = "proposed"
    confirmed = "confirmed"
    replaced = "replaced"


# Keep old name as alias for backward compatibility with DB enum values
ClusterStatus = ScopeStatus


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class RawInput(Base):
    __tablename__ = "raw_inputs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    use_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("use_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[RawInputType] = mapped_column(String(50), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    use_case: Mapped["UseCase"] = relationship("UseCase", back_populates="raw_inputs")  # type: ignore[name-defined]


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    use_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("use_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[MessageRole] = mapped_column(String(20), nullable=False)
    # Stores full Anthropic message content (list of blocks: text, tool_use, tool_result)
    content: Mapped[dict | list] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    use_case: Mapped["UseCase"] = relationship("UseCase", back_populates="conversation_messages")  # type: ignore[name-defined]


class Activity(Base):
    """An activity (Job To Be Done) — what humans physically do."""
    __tablename__ = "lived_jtds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    use_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("use_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    system_context: Mapped[str | None] = mapped_column(Text, nullable=True)
    process_phase_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("process_steps.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[ActivityStatus] = mapped_column(
        String(50), default=ActivityStatus.proposed, nullable=False
    )
    # Advisory link — set by consultant or agent suggestion, not derived hierarchy
    linked_cognitive_jtd_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    # Provenance — link to the conversation turn that created this card
    source_message_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    is_modified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    use_case: Mapped["UseCase"] = relationship("UseCase", back_populates="activities")  # type: ignore[name-defined]


# Keep old name as alias so existing imports continue to work
LivedJTD = Activity


class CognitiveLoad(Base):
    """A cognitive load item — the mental effort behind activities."""
    __tablename__ = "cognitive_jtds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    use_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("use_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    cognitive_zone: Mapped[str | None] = mapped_column(String(255), nullable=True)
    load_intensity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    process_phase_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("process_steps.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Advisory associations — optional metadata linking to related activities
    linked_lived_jtd_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    status: Mapped[ActivityStatus] = mapped_column(
        String(50), default=ActivityStatus.proposed, nullable=False
    )
    # Provenance — link to the conversation turn that created this card
    source_message_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    is_modified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    use_case: Mapped["UseCase"] = relationship("UseCase", back_populates="cognitive_load_items")  # type: ignore[name-defined]


# Keep old name as alias so existing imports continue to work
CognitiveJTD = CognitiveLoad


class AgentScope(Base):
    """A delegation cluster / agent scope — groups activities for a single agent."""
    __tablename__ = "delegation_clusters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    use_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("use_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Readiness scores: {dimension: score} — populated by readiness agent
    suitability_scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Consultant-confirmed delegation mode (Full Delegation | Supervised Execution | Assisted Mode | Human Only)
    delegation_mode: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[ScopeStatus] = mapped_column(
        String(50), default=ScopeStatus.proposed, nullable=False
    )
    is_scored: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    use_case: Mapped["UseCase"] = relationship("UseCase", back_populates="agent_scopes")  # type: ignore[name-defined]
    activity_links: Mapped[list["ClusterJTDLink"]] = relationship(
        "ClusterJTDLink", back_populates="scope", cascade="all, delete-orphan"
    )
    cognitive_links: Mapped[list["ClusterCognitiveLink"]] = relationship(
        "ClusterCognitiveLink", back_populates="scope", cascade="all, delete-orphan"
    )


# Keep old name as alias so existing imports continue to work
DelegationCluster = AgentScope


# ─── Scope Link Tables ──────────────────────────────────────────────────────

class ClusterJTDLink(Base):
    """Links an activity to an agent scope (many-to-many)."""
    __tablename__ = "cluster_jtd_links"
    __table_args__ = (UniqueConstraint("cluster_id", "jtd_id", name="uq_cluster_jtd"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cluster_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("delegation_clusters.id", ondelete="CASCADE"),
        nullable=False,
    )
    jtd_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lived_jtds.id", ondelete="CASCADE"),
        nullable=False,
    )

    scope: Mapped["AgentScope"] = relationship("AgentScope", back_populates="activity_links")


class ClusterCognitiveLink(Base):
    """Links a cognitive load item to an agent scope (many-to-many)."""
    __tablename__ = "cluster_cognitive_links"
    __table_args__ = (UniqueConstraint("cluster_id", "cognitive_load_id", name="uq_cluster_cognitive"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cluster_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("delegation_clusters.id", ondelete="CASCADE"),
        nullable=False,
    )
    cognitive_load_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cognitive_jtds.id", ondelete="CASCADE"),
        nullable=False,
    )

    scope: Mapped["AgentScope"] = relationship("AgentScope", back_populates="cognitive_links")


# ─── Process Visualisation ────────────────────────────────────────────────────

class ProcessStep(Base):
    """A process phase — the backbone structure activities and cognitive load attach to."""
    __tablename__ = "process_steps"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    use_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("use_cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    is_breakpoint: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cognitive_load_intensity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    use_case: Mapped["UseCase"] = relationship("UseCase", back_populates="process_steps")  # type: ignore[name-defined]
    cluster_steps: Mapped[list["ClusterProcessStep"]] = relationship(
        "ClusterProcessStep", back_populates="process_step", cascade="all, delete-orphan"
    )


class ClusterProcessStep(Base):
    __tablename__ = "cluster_process_steps"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    cluster_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("delegation_clusters.id", ondelete="CASCADE"),
        nullable=False,
    )
    process_step_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("process_steps.id", ondelete="CASCADE"),
        nullable=False,
    )

    process_step: Mapped["ProcessStep"] = relationship("ProcessStep", back_populates="cluster_steps")
