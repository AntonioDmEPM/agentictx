import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RawInputType(str, Enum):
    transcript = "transcript"
    document = "document"
    image = "image"
    note = "note"


class JTDStatus(str, Enum):
    proposed = "proposed"
    confirmed = "confirmed"
    rejected = "rejected"


class ClusterStatus(str, Enum):
    proposed = "proposed"
    confirmed = "confirmed"
    scored = "scored"


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"


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


class LivedJTD(Base):
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
    cognitive_load_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[JTDStatus] = mapped_column(
        String(50), default=JTDStatus.proposed, nullable=False
    )
    # Advisory link — set by consultant or agent suggestion, not derived hierarchy
    linked_cognitive_jtd_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
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

    use_case: Mapped["UseCase"] = relationship("UseCase", back_populates="lived_jtds")  # type: ignore[name-defined]


class CognitiveJTD(Base):
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
    # Advisory associations — optional metadata linking to related Lived JTDs
    linked_lived_jtd_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    status: Mapped[JTDStatus] = mapped_column(
        String(50), default=JTDStatus.proposed, nullable=False
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

    use_case: Mapped["UseCase"] = relationship("UseCase", back_populates="cognitive_jtds")  # type: ignore[name-defined]


class DelegationCluster(Base):
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
    # Primary references — Cognitive JTDs are the main clustering unit
    cognitive_jtd_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    # Optional associated Lived JTDs
    lived_jtd_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Suitability scores: {dimension: score} — populated by suitability agent
    suitability_scores: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[ClusterStatus] = mapped_column(
        String(50), default=ClusterStatus.proposed, nullable=False
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

    use_case: Mapped["UseCase"] = relationship("UseCase", back_populates="delegation_clusters")  # type: ignore[name-defined]
