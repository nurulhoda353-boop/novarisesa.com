"""Add project hero media and durable editor drafts.

Revision ID: 20260813_0001
Revises: 20260808_0001
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

from alembic import op

revision: str = "20260813_0001"
down_revision: str | None = "20260808_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("hero_media_id", pg.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_projects_hero_media_id_media_assets",
        "projects",
        "media_assets",
        ["hero_media_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_table(
        "project_drafts",
        sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("project_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("payload", pg.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", name="uq_project_draft_project"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("project_drafts")
    op.drop_constraint("fk_projects_hero_media_id_media_assets", "projects", type_="foreignkey")
    op.drop_column("projects", "hero_media_id")
