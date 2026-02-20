"""Discovery schema — raw_inputs, conversation_messages, lived_jtds, cognitive_jtds, delegation_clusters

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── raw_inputs ────────────────────────────────────────────────────────────
    op.create_table(
        "raw_inputs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("use_case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("content", sa.Text, nullable=True),
        sa.Column("file_path", sa.String(1024), nullable=True),
        sa.Column("file_name", sa.String(512), nullable=True),
        sa.Column("mime_type", sa.String(255), nullable=True),
        sa.Column("processed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["use_case_id"],
            ["use_cases.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_raw_inputs_use_case_id", "raw_inputs", ["use_case_id"])

    # ── conversation_messages ─────────────────────────────────────────────────
    op.create_table(
        "conversation_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("use_case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["use_case_id"],
            ["use_cases.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_conversation_messages_use_case_id",
        "conversation_messages",
        ["use_case_id"],
    )

    # ── lived_jtds ────────────────────────────────────────────────────────────
    op.create_table(
        "lived_jtds",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("use_case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("system_context", sa.Text, nullable=True),
        sa.Column("cognitive_load_score", sa.Integer, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="proposed"),
        sa.Column("linked_cognitive_jtd_id", postgresql.UUID(as_uuid=True), nullable=True),
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
            ["use_case_id"],
            ["use_cases.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lived_jtds_use_case_id", "lived_jtds", ["use_case_id"])
    op.create_index("ix_lived_jtds_status", "lived_jtds", ["status"])

    # ── cognitive_jtds ────────────────────────────────────────────────────────
    op.create_table(
        "cognitive_jtds",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("use_case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("cognitive_zone", sa.String(255), nullable=True),
        sa.Column("load_intensity", sa.Integer, nullable=True),
        sa.Column(
            "linked_lived_jtd_ids",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("status", sa.String(50), nullable=False, server_default="proposed"),
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
            ["use_case_id"],
            ["use_cases.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cognitive_jtds_use_case_id", "cognitive_jtds", ["use_case_id"])
    op.create_index("ix_cognitive_jtds_status", "cognitive_jtds", ["status"])

    # ── delegation_clusters ───────────────────────────────────────────────────
    op.create_table(
        "delegation_clusters",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("use_case_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("purpose", sa.Text, nullable=True),
        sa.Column(
            "cognitive_jtd_ids",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "lived_jtd_ids",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "suitability_scores",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("status", sa.String(50), nullable=False, server_default="proposed"),
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
            ["use_case_id"],
            ["use_cases.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_delegation_clusters_use_case_id", "delegation_clusters", ["use_case_id"]
    )
    op.create_index("ix_delegation_clusters_status", "delegation_clusters", ["status"])


def downgrade() -> None:
    op.drop_table("delegation_clusters")
    op.drop_table("cognitive_jtds")
    op.drop_table("lived_jtds")
    op.drop_table("conversation_messages")
    op.drop_table("raw_inputs")
