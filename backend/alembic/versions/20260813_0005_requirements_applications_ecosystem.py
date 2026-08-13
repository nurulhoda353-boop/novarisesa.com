"""Add requirement editor drafts and recruitment application workflow.

Revision ID: 20260813_0005
Revises: 20260813_0004
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision: str = "20260813_0005"
down_revision: str | None = "20260813_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "requirement_drafts",
        sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("requirement_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("payload", pg.JSONB(), nullable=False),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("requirement_id", name="uq_requirement_draft_requirement"),
    )
    op.add_column("requirement_applications", sa.Column("application_stage", sa.String(40), server_default="new", nullable=False))
    op.add_column("requirement_applications", sa.Column("internal_notes", sa.Text(), nullable=True))
    op.add_column("requirement_applications", sa.Column("follow_up_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("requirement_applications", sa.Column("interview_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("requirement_applications", sa.Column("documents", pg.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False))
    op.create_index("ix_requirement_applications_application_stage", "requirement_applications", ["application_stage"])
    op.create_table(
        "application_activities",
        sa.Column("id", pg.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("application_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", pg.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("details", pg.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["requirement_applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_application_activities_application_id", "application_activities", ["application_id"])
    op.create_index("ix_application_activities_actor_id", "application_activities", ["actor_id"])


def downgrade() -> None:
    op.drop_table("application_activities")
    op.drop_index("ix_requirement_applications_application_stage", table_name="requirement_applications")
    for column in ("documents", "interview_at", "follow_up_at", "internal_notes", "application_stage"):
        op.drop_column("requirement_applications", column)
    op.drop_table("requirement_drafts")
