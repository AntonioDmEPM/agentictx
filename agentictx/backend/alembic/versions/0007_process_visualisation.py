"""Add process visualisation tables.

Revision ID: 0007
Revises: 0006
Create Date: 2026-02-25

Three new tables:
  process_steps           — ordered steps in a use case process flow
  process_step_jtd_links  — links JTDs (lived or cognitive) to a step
  cluster_process_steps   — assigns process steps to delegation clusters
"""
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "process_steps",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "use_case_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("use_cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("sequence_order", sa.Integer, nullable=False),
        sa.Column(
            "is_breakpoint",
            sa.Boolean,
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column("cognitive_load_intensity", sa.Integer, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "process_step_jtd_links",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "process_step_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("process_steps.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("jtd_type", sa.String(20), nullable=False),  # 'lived' | 'cognitive'
        sa.Column("jtd_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sequence_within_step", sa.Integer, nullable=False),
    )

    op.create_table(
        "cluster_process_steps",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "cluster_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("delegation_clusters.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "process_step_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("process_steps.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "cluster_id", "process_step_id", name="uq_cluster_process_step"
        ),
    )


def downgrade() -> None:
    op.drop_table("cluster_process_steps")
    op.drop_table("process_step_jtd_links")
    op.drop_table("process_steps")
