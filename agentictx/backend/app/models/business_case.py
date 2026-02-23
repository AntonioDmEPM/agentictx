import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BusinessCase(Base):
    __tablename__ = "business_cases"
    __table_args__ = (UniqueConstraint("use_case_id", name="uq_business_cases_use_case_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    use_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("use_cases.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Modality Profile ──────────────────────────────────────────────────────
    has_voice: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_realtime_audio: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_image_processing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_text_only: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    stt_service: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tts_service: Mapped[str | None] = mapped_column(String(100), nullable=True)
    llm_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ivr_service: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ── Volume & FTE ──────────────────────────────────────────────────────────
    weekly_volume: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_duration_minutes: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    token_density_input: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    token_density_output: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    caching_ratio: Mapped[float] = mapped_column(Float, default=0.3, nullable=False)
    fte_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    avg_fte_annual_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fte_monthly_overhead: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # ── Coverage Ramp ─────────────────────────────────────────────────────────
    coverage_ramp: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # ── Cost Model ────────────────────────────────────────────────────────────
    implementation_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    implementation_amortization_months: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    monthly_infra_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    monthly_maintenance_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # ── Growth Rates ──────────────────────────────────────────────────────────
    volume_growth_rate_yoy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    complexity_growth_rate_yoy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    inflation_rate_yoy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    use_case: Mapped["UseCase"] = relationship(  # type: ignore[name-defined]
        "UseCase", back_populates="business_case"
    )
    scenarios: Mapped[list["BusinessCaseScenario"]] = relationship(
        "BusinessCaseScenario",
        back_populates="business_case",
        cascade="all, delete-orphan",
        order_by="BusinessCaseScenario.sort_order",
    )


class BusinessCaseScenario(Base):
    __tablename__ = "business_case_scenarios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("business_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # ── Pricing ───────────────────────────────────────────────────────────────
    llm_input_price_per_1k: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    llm_output_price_per_1k: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cached_input_price_per_1k: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    stt_price_per_minute: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tts_price_per_1k_chars: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    ivr_price_per_minute: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    image_price_per_image: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # ── Computed Results (JSON blob) ──────────────────────────────────────────
    results: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    business_case: Mapped["BusinessCase"] = relationship("BusinessCase", back_populates="scenarios")
