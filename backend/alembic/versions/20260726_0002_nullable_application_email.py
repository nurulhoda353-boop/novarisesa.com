"""Allow job applications without an email address.

Revision ID: 20260726_0002
Revises: 20260726_0001
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260726_0002"
down_revision: str | None = "20260726_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "requirement_applications",
        "email",
        existing_type=sa.String(length=320),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "requirement_applications",
        "email",
        existing_type=sa.String(length=320),
        nullable=False,
    )
