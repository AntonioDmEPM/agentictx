"""Business case schema — business_cases + business_case_scenarios tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── business_cases ────────────────────────────────────────────────────────
    op.create_table(
        "business_cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("use_case_id", postgresql.UUID(as_uuid=True), nullable=False),
        # Modality
        sa.Column("has_voice", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("has_realtime_audio", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("has_image_processing", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("has_text_only", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("stt_service", sa.String(100), nullable=True),
        sa.Column("tts_service", sa.String(100), nullable=True),
        sa.Column("llm_model", sa.String(100), nullable=True),
        sa.Column("ivr_service", sa.String(100), nullable=True),
        # Volume & FTE
        sa.Column("weekly_volume", sa.Integer, nullable=False, server_default="0"),
        sa.Column("avg_duration_minutes", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("token_density_input", sa.Integer, nullable=False, server_default="0"),
        sa.Column("token_density_output", sa.Integer, nullable=False, server_default="0"),
        sa.Column("caching_ratio", sa.Float, nullable=False, server_default="0.3"),
        sa.Column("fte_count", sa.Integer, nullable=False, server_default="1"),
        sa.Column("avg_fte_annual_cost", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("fte_monthly_overhead", sa.Float, nullable=False, server_default="0.0"),
        # Coverage ramp
        sa.Column(
            "coverage_ramp",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        # Cost model
        sa.Column("implementation_cost", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("implementation_amortization_months", sa.Integer, nullable=False, server_default="12"),
        sa.Column("monthly_infra_cost", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("monthly_maintenance_cost", sa.Float, nullable=False, server_default="0.0"),
        # Growth rates
        sa.Column("volume_growth_rate_yoy", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("complexity_growth_rate_yoy", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("inflation_rate_yoy", sa.Float, nullable=False, server_default="0.0"),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["use_case_id"], ["use_cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("use_case_id", name="uq_business_cases_use_case_id"),
    )
    op.create_index("ix_business_cases_use_case_id", "business_cases", ["use_case_id"])

    # ── business_case_scenarios ───────────────────────────────────────────────
    op.create_table(
        "business_case_scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        # Pricing
        sa.Column("llm_input_price_per_1k", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("llm_output_price_per_1k", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("cached_input_price_per_1k", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("stt_price_per_minute", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("tts_price_per_1k_chars", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("ivr_price_per_minute", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("image_price_per_image", sa.Float, nullable=False, server_default="0.0"),
        # Results
        sa.Column(
            "results",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["business_case_id"], ["business_cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_business_case_scenarios_business_case_id",
        "business_case_scenarios",
        ["business_case_id"],
    )


def downgrade() -> None:
    op.drop_table("business_case_scenarios")
    op.drop_table("business_cases")
