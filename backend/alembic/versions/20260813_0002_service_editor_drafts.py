"""Add service portfolio content and durable editor drafts.

Revision ID: 20260813_0002
Revises: 20260813_0001
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision: str = "20260813_0002"
down_revision: str | None = "20260813_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("services", sa.Column("portfolio", pg.JSONB(), nullable=True))
    op.create_table(
        "service_drafts",
        sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("service_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("payload", pg.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("service_id", name="uq_service_draft_service"),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("service_drafts")
    op.drop_column("services", "portfolio")
