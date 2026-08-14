"""Add contact and RFQ management workflows.

Revision ID: 20260814_0007
Revises: 20260813_0006
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260814_0007"
down_revision: str | None = "20260813_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("contact_submissions", sa.Column("operational_status", sa.String(24), nullable=False, server_default="pending"))
    op.add_column("contact_submissions", sa.Column("notification_status", sa.String(32), nullable=False, server_default="not_required"))
    op.add_column("contact_submissions", sa.Column("notification_requested_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("contact_submissions", sa.Column("follow_up_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("contact_submissions", sa.Column("response_summary", sa.Text(), nullable=True))
    op.add_column("contact_submissions", sa.Column("converted_rfq_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_contact_submissions_operational_status", "contact_submissions", ["operational_status"])
    op.create_index("ix_contact_submissions_converted_rfq_id", "contact_submissions", ["converted_rfq_id"])
    op.create_foreign_key("fk_contact_submissions_converted_rfq_id", "contact_submissions", "rfq_submissions", ["converted_rfq_id"], ["id"], ondelete="SET NULL")

    op.add_column("rfq_submissions", sa.Column("operational_status", sa.String(24), nullable=False, server_default="pending"))
    op.add_column("rfq_submissions", sa.Column("commercial_stage", sa.String(32), nullable=False, server_default="new"))
    op.add_column("rfq_submissions", sa.Column("notification_status", sa.String(32), nullable=False, server_default="not_required"))
    op.add_column("rfq_submissions", sa.Column("notification_requested_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("rfq_submissions", sa.Column("follow_up_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("rfq_submissions", sa.Column("meeting_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("rfq_submissions", sa.Column("qualification", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.add_column("rfq_submissions", sa.Column("proposal", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.create_index("ix_rfq_submissions_operational_status", "rfq_submissions", ["operational_status"])
    op.create_index("ix_rfq_submissions_commercial_stage", "rfq_submissions", ["commercial_stage"])

    op.create_table(
        "inbox_activities",
        sa.Column("entity_type", sa.String(24), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inbox_activities_entity", "inbox_activities", ["entity_type", "entity_id"])
    op.create_index("ix_inbox_activities_actor_id", "inbox_activities", ["actor_id"])


def downgrade() -> None:
    op.drop_index("ix_inbox_activities_actor_id", table_name="inbox_activities")
    op.drop_index("ix_inbox_activities_entity", table_name="inbox_activities")
    op.drop_table("inbox_activities")
    op.drop_index("ix_rfq_submissions_commercial_stage", table_name="rfq_submissions")
    op.drop_index("ix_rfq_submissions_operational_status", table_name="rfq_submissions")
    for column in ("proposal", "qualification", "meeting_at", "follow_up_at", "notification_requested_at", "notification_status", "commercial_stage", "operational_status"):
        op.drop_column("rfq_submissions", column)
    op.drop_constraint("fk_contact_submissions_converted_rfq_id", "contact_submissions", type_="foreignkey")
    op.drop_index("ix_contact_submissions_converted_rfq_id", table_name="contact_submissions")
    op.drop_index("ix_contact_submissions_operational_status", table_name="contact_submissions")
    for column in ("converted_rfq_id", "response_summary", "follow_up_at", "notification_requested_at", "notification_status", "operational_status"):
        op.drop_column("contact_submissions", column)
