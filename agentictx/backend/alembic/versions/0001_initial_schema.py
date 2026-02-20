"""Initial schema — engagements and use_cases

Revision ID: 0001
Revises:
Create Date: 2026-02-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "engagements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_name", sa.String(255), nullable=False),
        sa.Column("industry", sa.String(255), nullable=True),
        sa.Column("engagement_type", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_engagements_status", "engagements", ["status"])
    op.create_index("ix_engagements_updated_at", "engagements", ["updated_at"])

    op.create_table(
        "use_cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("engagement_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
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
        sa.ForeignKeyConstraint(
            ["engagement_id"],
            ["engagements.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_use_cases_engagement_id", "use_cases", ["engagement_id"])
    op.create_index("ix_use_cases_status", "use_cases", ["status"])


def downgrade() -> None:
    op.drop_table("use_cases")
    op.drop_table("engagements")
