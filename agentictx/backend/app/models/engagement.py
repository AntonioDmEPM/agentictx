import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EngagementStatus(str, Enum):
    active = "active"
    archived = "archived"


class UseCaseStatus(str, Enum):
    pending = "pending"
    discovery = "discovery"
    agentic_design = "agentic_design"
    business_case = "business_case"
    complete = "complete"


class Engagement(Base):
    __tablename__ = "engagements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    engagement_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[EngagementStatus] = mapped_column(
        String(50), default=EngagementStatus.active, nullable=False
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

    use_cases: Mapped[list["UseCase"]] = relationship(
        "UseCase", back_populates="engagement", cascade="all, delete-orphan"
    )


class UseCase(Base):
    __tablename__ = "use_cases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("engagements.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[UseCaseStatus] = mapped_column(
        String(50), default=UseCaseStatus.pending, nullable=False
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

    engagement: Mapped["Engagement"] = relationship("Engagement", back_populates="use_cases")

    # Discovery relationships (defined in discovery.py, referenced here for back_populates)
    raw_inputs: Mapped[list["RawInput"]] = relationship(  # type: ignore[name-defined]
        "RawInput", back_populates="use_case", cascade="all, delete-orphan"
    )
    conversation_messages: Mapped[list["ConversationMessage"]] = relationship(  # type: ignore[name-defined]
        "ConversationMessage", back_populates="use_case", cascade="all, delete-orphan"
    )
    lived_jtds: Mapped[list["LivedJTD"]] = relationship(  # type: ignore[name-defined]
        "LivedJTD", back_populates="use_case", cascade="all, delete-orphan"
    )
    cognitive_jtds: Mapped[list["CognitiveJTD"]] = relationship(  # type: ignore[name-defined]
        "CognitiveJTD", back_populates="use_case", cascade="all, delete-orphan"
    )
    delegation_clusters: Mapped[list["DelegationCluster"]] = relationship(  # type: ignore[name-defined]
        "DelegationCluster", back_populates="use_case", cascade="all, delete-orphan"
    )

    # Agentic design relationships (defined in agentic_design.py)
    agent_specifications: Mapped[list["AgentSpecification"]] = relationship(  # type: ignore[name-defined]
        "AgentSpecification", back_populates="use_case", cascade="all, delete-orphan"
    )
    agentic_design_messages: Mapped[list["AgenticDesignMessage"]] = relationship(  # type: ignore[name-defined]
        "AgenticDesignMessage", back_populates="use_case", cascade="all, delete-orphan"
    )

    # Business case relationship (defined in business_case.py)
    business_case: Mapped["BusinessCase | None"] = relationship(  # type: ignore[name-defined]
        "BusinessCase", back_populates="use_case", cascade="all, delete-orphan", uselist=False
    )
