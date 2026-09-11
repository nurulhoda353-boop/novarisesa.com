"""Add MailAccount.provider - which real mailbox service (hostinger/google) a mailbox's IMAP/SMTP traffic goes to.

Revision ID: 20260911_0017
Revises: 20260908_0016
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260911_0017"
down_revision: str | None = "20260908_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "mail_accounts",
        sa.Column("provider", sa.String(length=20), nullable=False, server_default="hostinger"),
    )


def downgrade() -> None:
    op.drop_column("mail_accounts", "provider")
