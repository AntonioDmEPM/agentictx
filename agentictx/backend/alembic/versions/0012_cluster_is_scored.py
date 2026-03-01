"""Add is_scored boolean to delegation_clusters, migrate scored status values.

Revision ID: 0012
Revises: 0011
Create Date: 2026-03-01

Scored is a flag, not a lifecycle status. A cluster can be Proposed+Scored
or Confirmed+Scored. This migration adds is_scored as a proper boolean
column and migrates any existing 'scored' status values back to 'confirmed'.
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    # 1. Add is_scored boolean column (default False)
    op.add_column(
        "delegation_clusters",
        sa.Column("is_scored", sa.Boolean, nullable=False, server_default=sa.text("false")),
    )

    conn = op.get_bind()

    # 2. Mark clusters that currently have status='scored' as is_scored=True
    conn.execute(sa.text(
        "UPDATE delegation_clusters SET is_scored = true WHERE status = 'scored'"
    ))

    # 3. Move scored clusters back to confirmed (they were confirmable before scoring)
    conn.execute(sa.text(
        "UPDATE delegation_clusters SET status = 'confirmed' WHERE status = 'scored'"
    ))


def downgrade() -> None:
    conn = op.get_bind()

    # Restore scored status for clusters that were is_scored + confirmed
    conn.execute(sa.text(
        "UPDATE delegation_clusters SET status = 'scored' WHERE is_scored = true AND status = 'confirmed'"
    ))

    op.drop_column("delegation_clusters", "is_scored")
