"""Muqeem portal: soft-delete (archive) and a public verification code per record.

Revision ID: 20261123_0032
Revises: 20261122_0031
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261123_0032"
down_revision: str | None = "20261122_0031"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("muqeem_records", sa.Column("verify_code", sa.String(16), nullable=True))
    op.add_column("muqeem_records", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    # Unique, unguessable code for rows that already exist (md5 of two random values, 10 hex chars).
    op.execute("UPDATE muqeem_records SET verify_code = substr(md5(random()::text || id::text), 1, 10)")
    op.alter_column("muqeem_records", "verify_code", nullable=False)
    op.create_index("ix_muqeem_records_verify_code", "muqeem_records", ["verify_code"], unique=True)
    op.create_index("ix_muqeem_records_archived_at", "muqeem_records", ["archived_at"])


def downgrade() -> None:
    op.drop_index("ix_muqeem_records_archived_at", table_name="muqeem_records")
    op.drop_index("ix_muqeem_records_verify_code", table_name="muqeem_records")
    op.drop_column("muqeem_records", "archived_at")
    op.drop_column("muqeem_records", "verify_code")
