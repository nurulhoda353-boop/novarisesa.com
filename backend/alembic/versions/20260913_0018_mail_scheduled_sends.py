"""Add mail_scheduled_sends table for send-later and undo-send.

Revision ID: 20260913_0018
Revises: 20260911_0017
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260913_0018"
down_revision: str | None = "20260911_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mail_scheduled_sends",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subject", sa.String(length=998), nullable=False, server_default=""),
        sa.Column("to_addresses", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("send_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["mail_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mail_scheduled_sends_account_id", "mail_scheduled_sends", ["account_id"])
    op.create_index("ix_mail_scheduled_sends_send_at", "mail_scheduled_sends", ["send_at"])


def downgrade() -> None:
    op.drop_index("ix_mail_scheduled_sends_send_at", table_name="mail_scheduled_sends")
    op.drop_index("ix_mail_scheduled_sends_account_id", table_name="mail_scheduled_sends")
    op.drop_table("mail_scheduled_sends")
