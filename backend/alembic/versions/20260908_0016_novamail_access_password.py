"""Add a Novamail-only access password, separate from the real Hostinger mailbox credential.

Revision ID: 20260908_0016
Revises: 20260908_0015
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260908_0016"
down_revision: str | None = "20260908_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "mail_accounts",
        sa.Column("novamail_password_hash", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("mail_accounts", "novamail_password_hash")
