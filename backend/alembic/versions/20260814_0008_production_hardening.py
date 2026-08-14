"""Add persistent rate-limit events.

Revision ID: 20260814_0008
Revises: 20260814_0007
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260814_0008"
down_revision: str | None = "20260814_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rate_limit_events",
        sa.Column("scope", sa.String(80), nullable=False),
        sa.Column("key_hash", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_rate_limit_events_lookup",
        "rate_limit_events",
        ["scope", "key_hash", "created_at"],
    )
    op.create_index(
        "ix_rate_limit_events_created_at", "rate_limit_events", ["created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_rate_limit_events_created_at", table_name="rate_limit_events")
    op.drop_index("ix_rate_limit_events_lookup", table_name="rate_limit_events")
    op.drop_table("rate_limit_events")
