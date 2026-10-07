"""Track failed-wake attempts on mail_snoozes, same reason as
mail_scheduled_sends.failed_attempts (20261007_0025): the wake poll loop
retried a broken credential every 30s forever with no cap.

Revision ID: 20261007_0027
Revises: 20261007_0026
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261007_0027"
down_revision: str | None = "20261007_0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "mail_snoozes",
        sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "mail_snoozes",
        sa.Column("last_error", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("mail_snoozes", "last_error")
    op.drop_column("mail_snoozes", "failed_attempts")
