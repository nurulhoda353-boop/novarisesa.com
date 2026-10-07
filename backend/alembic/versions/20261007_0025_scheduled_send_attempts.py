"""Track failed-send attempts on mail_scheduled_sends so the poll loop can
give up instead of retrying a permanently-broken credential forever.

Revision ID: 20261007_0025
Revises: 20261007_0024
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261007_0025"
down_revision: str | None = "20261007_0024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "mail_scheduled_sends",
        sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "mail_scheduled_sends",
        sa.Column("last_error", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("mail_scheduled_sends", "last_error")
    op.drop_column("mail_scheduled_sends", "failed_attempts")
