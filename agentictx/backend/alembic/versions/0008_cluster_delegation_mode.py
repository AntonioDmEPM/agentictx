"""Add delegation_mode column to delegation_clusters.

Revision ID: 0008
Revises: 0007
Create Date: 2026-02-27

Stores the consultant-confirmed delegation mode for each cluster:
Full Delegation | Supervised Execution | Assisted Mode | Human Only
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "delegation_clusters",
        sa.Column("delegation_mode", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("delegation_clusters", "delegation_mode")
