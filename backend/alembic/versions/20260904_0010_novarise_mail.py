"""Add Novarise Mail mobile application tables.

Revision ID: 20260904_0010
Revises: 20260820_0009
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260904_0010"
down_revision: str | None = "20260820_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mail_accounts",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("address", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("avatar_url", sa.String(length=1000), nullable=True),
        sa.Column("credential_ciphertext", sa.Text(), nullable=False),
        sa.Column("credential_type", sa.String(length=32), nullable=False),
        sa.Column("hostinger_order_id", sa.String(length=80), nullable=True),
        sa.Column("hostinger_mailbox_id", sa.String(length=80), nullable=True),
        sa.Column("cache_ttl_days", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("last_connected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("address"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_mail_accounts_address", "mail_accounts", ["address"], unique=True)
    op.create_index("ix_mail_accounts_user_id", "mail_accounts", ["user_id"], unique=True)
    op.create_index("ix_mail_accounts_hostinger_order_id", "mail_accounts", ["hostinger_order_id"])
    op.create_index("ix_mail_accounts_hostinger_mailbox_id", "mail_accounts", ["hostinger_mailbox_id"])

    op.create_table(
        "mail_message_cache",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("folder", sa.String(length=500), nullable=False),
        sa.Column("remote_uid", sa.BigInteger(), nullable=False),
        sa.Column("message_id", sa.String(length=1000), nullable=True),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("sender", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("recipients", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("preview", sa.Text(), nullable=False),
        sa.Column("flags", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("body_ciphertext", sa.Text(), nullable=True),
        sa.Column("retained_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["mail_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "folder", "remote_uid", name="uq_mail_cache_remote_message"),
    )
    op.create_index("ix_mail_message_cache_account_id", "mail_message_cache", ["account_id"])
    op.create_index("ix_mail_message_cache_message_id", "mail_message_cache", ["message_id"])
    op.create_index("ix_mail_message_cache_received_at", "mail_message_cache", ["received_at"])
    op.create_index("ix_mail_message_cache_retained_until", "mail_message_cache", ["retained_until"])
    op.create_index("ix_mail_cache_account_received", "mail_message_cache", ["account_id", "received_at"])

    op.create_table(
        "mail_contacts",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.String(length=1000), nullable=True),
        sa.Column("is_favorite", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["mail_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "email", name="uq_mail_contact_email"),
    )
    op.create_index("ix_mail_contacts_account_id", "mail_contacts", ["account_id"])

    op.create_table(
        "mail_drafts",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("recipients", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("text_body", sa.Text(), nullable=False),
        sa.Column("html_body", sa.Text(), nullable=True),
        sa.Column("attachments", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["mail_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mail_drafts_account_id", "mail_drafts", ["account_id"])

    op.create_table(
        "mail_devices",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("installation_id", sa.String(length=255), nullable=False),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("device_name", sa.String(length=255), nullable=True),
        sa.Column("apns_token", sa.Text(), nullable=True),
        sa.Column("notifications_enabled", sa.Boolean(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["mail_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "installation_id", name="uq_mail_device_installation"),
    )
    op.create_index("ix_mail_devices_account_id", "mail_devices", ["account_id"])


def downgrade() -> None:
    op.drop_table("mail_devices")
    op.drop_table("mail_drafts")
    op.drop_table("mail_contacts")
    op.drop_table("mail_message_cache")
    op.drop_table("mail_accounts")
