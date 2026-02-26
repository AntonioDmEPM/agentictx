"""Agent spec extended fields + agent_handoffs table

Revision ID: 0005
Revises: 0004
Create Date: 2026-02-24

Additive extension to agent_specifications:
- model, maturity_score, prompt_requirements, input_channels,
  tool_stack, output_channels, assumptions

New table: agent_handoffs
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── agent_specifications: 7 new columns ───────────────────────────────────
    op.add_column(
        "agent_specifications",
        sa.Column("model", sa.String(100), nullable=True),
    )
    op.add_column(
        "agent_specifications",
        sa.Column("maturity_score", sa.Integer, nullable=True),
    )
    op.add_column(
        "agent_specifications",
        sa.Column(
            "prompt_requirements",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "agent_specifications",
        sa.Column(
            "input_channels",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "agent_specifications",
        sa.Column(
            "tool_stack",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "agent_specifications",
        sa.Column(
            "output_channels",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "agent_specifications",
        sa.Column(
            "assumptions",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )

    # ── agent_handoffs ────────────────────────────────────────────────────────
    op.create_table(
        "agent_handoffs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("use_case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_agent_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("to_agent_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("trigger_condition", sa.Text, nullable=True),
        sa.Column("payload_description", sa.Text, nullable=True),
        sa.Column("estimated_tokens", sa.Integer, nullable=False, server_default="0"),
        sa.Column("handoff_type", sa.String(50), nullable=False, server_default="sequential"),
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
        sa.ForeignKeyConstraint(
            ["from_agent_id"], ["agent_specifications.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["to_agent_id"], ["agent_specifications.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_agent_handoffs_use_case_id", "agent_handoffs", ["use_case_id"]
    )
    op.create_index(
        "ix_agent_handoffs_from_agent_id", "agent_handoffs", ["from_agent_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_agent_handoffs_from_agent_id", table_name="agent_handoffs")
    op.drop_index("ix_agent_handoffs_use_case_id", table_name="agent_handoffs")
    op.drop_table("agent_handoffs")

    op.drop_column("agent_specifications", "assumptions")
    op.drop_column("agent_specifications", "output_channels")
    op.drop_column("agent_specifications", "tool_stack")
    op.drop_column("agent_specifications", "input_channels")
    op.drop_column("agent_specifications", "prompt_requirements")
    op.drop_column("agent_specifications", "maturity_score")
    op.drop_column("agent_specifications", "model")
