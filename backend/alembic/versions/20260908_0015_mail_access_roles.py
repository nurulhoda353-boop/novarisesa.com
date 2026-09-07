"""Add mail account roles (admin/member), change-request approval queue, and audit log.

Revision ID: 20260908_0015
Revises: 20260907_0014
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260908_0015"
down_revision: str | None = "20260907_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "mail_accounts",
        sa.Column("role", sa.String(length=20), nullable=False, server_default="member"),
    )
    # Exactly one admin mailbox for now; the owner picked this address.
    op.execute(
        "UPDATE mail_accounts SET role = 'admin' WHERE lower(address) = 'rabbani@novarisesa.com'"
    )

    op.create_table(
        "mail_change_requests",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_type", sa.String(length=20), nullable=False),
        sa.Column("payload_ciphertext", sa.Text(), nullable=True),
        sa.Column("payload_text", sa.String(length=500), nullable=True),
        sa.Column("payload_url", sa.String(length=1000), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("rejection_reason", sa.String(length=500), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by_account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["mail_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resolved_by_account_id"], ["mail_accounts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mail_change_requests_account_id", "mail_change_requests", ["account_id"])
    op.create_index("ix_mail_change_requests_status", "mail_change_requests", ["status"])

    op.create_table(
        "mail_audit_log",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("actor_account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("target_account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=60), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_account_id"], ["mail_accounts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["target_account_id"], ["mail_accounts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mail_audit_log_actor_account_id", "mail_audit_log", ["actor_account_id"])
    op.create_index("ix_mail_audit_log_target_account_id", "mail_audit_log", ["target_account_id"])


def downgrade() -> None:
    op.drop_index("ix_mail_audit_log_target_account_id", table_name="mail_audit_log")
    op.drop_index("ix_mail_audit_log_actor_account_id", table_name="mail_audit_log")
    op.drop_table("mail_audit_log")

    op.drop_index("ix_mail_change_requests_status", table_name="mail_change_requests")
    op.drop_index("ix_mail_change_requests_account_id", table_name="mail_change_requests")
    op.drop_table("mail_change_requests")

    op.drop_column("mail_accounts", "role")
