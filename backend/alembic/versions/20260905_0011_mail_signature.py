"""Add signature column to mail_accounts.

Revision ID: 20260905_0011
Revises: 20260904_0010
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260905_0011"
down_revision: str | None = "20260904_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("mail_accounts", sa.Column("signature", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("mail_accounts", "signature")
