"""Widen NovaFin account code column so bank:<uuid>/asset:<uuid> codes fit.

Revision ID: 20260930_0023
Revises: 20260930_0022
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260930_0023"
down_revision: str | None = "20260930_0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("novafin_accounts", "code", type_=sa.String(length=80), existing_type=sa.String(length=30))


def downgrade() -> None:
    op.alter_column("novafin_accounts", "code", type_=sa.String(length=30), existing_type=sa.String(length=80))
