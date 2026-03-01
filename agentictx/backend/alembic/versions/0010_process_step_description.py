"""Add description column to process_steps.

Revision ID: 0010
Revises: 0009
Create Date: 2026-02-27

The Discovery Agent needs to persist process phase descriptions when it
identifies phases during conversation.  The description is optional free
text — the agent supplies it, the consultant can edit it later.
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "process_steps",
        sa.Column("description", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("process_steps", "description")
