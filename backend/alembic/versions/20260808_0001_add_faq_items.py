"""Add faq_items and faq_item_translations tables.

Revision ID: 20260808_0001
Revises: 20260804_0001
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from alembic import op

revision: str = "20260808_0001"
down_revision: str | None = "20260804_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "faq_items",
        sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column(
            "status",
            pg.ENUM("draft", "published", "archived", name="publish_status", create_type=False),
            nullable=False,
        ),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "faq_item_translations",
        sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("faq_item_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("locale", sa.String(length=10), nullable=False),
        sa.Column("question", sa.String(length=500), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("faq_item_id", "locale", name="uq_faq_item_translation_locale"),
        sa.ForeignKeyConstraint(["faq_item_id"], ["faq_items.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("faq_item_translations")
    op.drop_table("faq_items")
