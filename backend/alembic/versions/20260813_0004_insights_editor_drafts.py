"""Add durable editor drafts for article and event management.

Revision ID: 20260813_0004
Revises: 20260813_0003
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision: str = "20260813_0004"
down_revision: str | None = "20260813_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for table, foreign_key, target, constraint in (
        ("post_drafts", "post_id", "posts", "uq_post_draft_post"),
        ("event_drafts", "event_id", "events", "uq_event_draft_event"),
    ):
        op.create_table(
            table,
            sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column(foreign_key, pg.UUID(as_uuid=True), nullable=False),
            sa.Column("payload", pg.JSONB(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(foreign_key, name=constraint),
            sa.ForeignKeyConstraint([foreign_key], [f"{target}.id"], ondelete="CASCADE"),
        )


def downgrade() -> None:
    op.drop_table("event_drafts")
    op.drop_table("post_drafts")
