"""roster columns and session_meta custom_fields

Revision ID: 004
Revises: 003
Create Date: 2026-07-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "session_meta",
        sa.Column("custom_fields", sa.Text(), nullable=False, server_default="{}"),
    )
    op.create_table(
        "roster_columns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("column_key", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=128), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("column_key"),
    )
    op.create_index(
        op.f("ix_roster_columns_column_key"),
        "roster_columns",
        ["column_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_roster_columns_column_key"), table_name="roster_columns")
    op.drop_table("roster_columns")
    op.drop_column("session_meta", "custom_fields")