"""Muqeem portal: hand-entered Resident Information records.

Revision ID: 20261122_0031
Revises: 20261027_0030
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261122_0031"
down_revision: str | None = "20261027_0030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (column, length, server default; None = required)
TEXT_COLUMNS = [
    ("report_date", 10, None),
    ("operator_id", 20, ""),
    ("location", 60, "Muqeem Portal"),
    ("iqama_number", 20, None),
    ("version_number", 6, "1"),
    ("gender", 12, "Male"),
    ("name", 120, None),
    ("translated_name", 120, ""),
    ("birth_date", 10, ""),
    ("birth_country", 60, ""),
    ("marital_status", 30, ""),
    ("religion", 30, ""),
    ("occupation", 80, ""),
    ("status", 30, "Valid"),
    ("entry_date", 10, ""),
    ("entry_location", 80, ""),
    ("passport_number", 30, ""),
    ("passport_nationality", 60, ""),
    ("passport_issue_date", 10, ""),
    ("passport_expiry_date", 10, ""),
    ("passport_issue_location", 80, ""),
    ("iqama_issue_date", 10, ""),
    ("iqama_expiry_date", 10, ""),
    ("iqama_issue_location", 80, ""),
    ("employer_number", 20, ""),
    ("employer_name", 160, ""),
]


def upgrade() -> None:
    columns: list[sa.Column] = [
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")
        )
    ]
    for name, length, default in TEXT_COLUMNS:
        kwargs = {} if default is None else {"server_default": default}
        columns.append(sa.Column(name, sa.String(length), nullable=False, **kwargs))
    columns += [
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]
    op.create_table("muqeem_records", *columns)
    op.create_index("ix_muqeem_records_iqama_number", "muqeem_records", ["iqama_number"])


def downgrade() -> None:
    op.drop_index("ix_muqeem_records_iqama_number", table_name="muqeem_records")
    op.drop_table("muqeem_records")
