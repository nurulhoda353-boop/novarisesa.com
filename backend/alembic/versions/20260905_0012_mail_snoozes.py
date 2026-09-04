"""Add mail_snoozes table for server-side email snoozing.

Revision ID: 20260905_0012
Revises: 20260905_0011
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260905_0012"
down_revision: str | None = "20260905_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mail_snoozes",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("message_id", sa.String(length=1000), nullable=False),
        sa.Column("subject", sa.String(length=998), nullable=False, server_default=""),
        sa.Column("original_folder", sa.String(length=500), nullable=False),
        sa.Column("snoozed_folder", sa.String(length=500), nullable=False),
        sa.Column("wake_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("woken_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["mail_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mail_snoozes_account_id", "mail_snoozes", ["account_id"])
    op.create_index("ix_mail_snoozes_wake_at", "mail_snoozes", ["wake_at"])


def downgrade() -> None:
    op.drop_index("ix_mail_snoozes_wake_at", table_name="mail_snoozes")
    op.drop_index("ix_mail_snoozes_account_id", table_name="mail_snoozes")
    op.drop_table("mail_snoozes")
