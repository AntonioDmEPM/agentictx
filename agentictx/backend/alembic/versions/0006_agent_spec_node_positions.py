"""Add node_positions to agent_specifications.

Revision ID: 0006
Revises: 0005
Create Date: 2026-02-24

Stores per-node x/y positions as a JSON map keyed by node id,
enabling consultants to drag nodes and have their layout persist.
"""
from typing import Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "agent_specifications",
        sa.Column(
            "node_positions",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )


def downgrade() -> None:
    op.drop_column("agent_specifications", "node_positions")
