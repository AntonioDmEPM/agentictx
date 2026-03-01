"""Add source_message_id and is_modified to lived_jtds and cognitive_jtds.

Revision ID: 0009
Revises: 0008
Create Date: 2026-02-27

Supports card provenance (Section 14.9): every agent-generated card carries a
reference to the conversation turn that produced it.  is_modified flags manual
edits so provenance + modification state are both visible on the card.

No migration needed for 'replaced' cluster status — status is stored as
String(50), not a Postgres enum.
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lived_jtds",
        sa.Column("source_message_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "lived_jtds",
        sa.Column("is_modified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "cognitive_jtds",
        sa.Column("source_message_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "cognitive_jtds",
        sa.Column("is_modified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("cognitive_jtds", "is_modified")
    op.drop_column("cognitive_jtds", "source_message_id")
    op.drop_column("lived_jtds", "is_modified")
    op.drop_column("lived_jtds", "source_message_id")
