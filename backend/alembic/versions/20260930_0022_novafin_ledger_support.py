"""Add NovaFin general ledger support: system accounts, fiscal year status, bank clears, asset funding.

Revision ID: 20260930_0022
Revises: 20260930_0021
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260930_0022"
down_revision: str | None = "20260930_0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "novafin_bank_clears",
        sa.Column("bank_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("journal_voucher_line_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("cleared_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.ForeignKeyConstraint(["bank_id"], ["novafin_banks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["journal_voucher_line_id"], ["novafin_journal_voucher_lines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("journal_voucher_line_id", name="uq_novafin_bank_clears_line"),
    )
    op.create_index("ix_novafin_bank_clears_bank_id", "novafin_bank_clears", ["bank_id"])

    op.add_column("novafin_accounts", sa.Column("is_system", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("novafin_accounts", sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column(
        "novafin_assets", sa.Column("funding_method", sa.String(length=60), server_default="cash", nullable=False)
    )
    op.add_column("novafin_assets", sa.Column("last_depreciation_period", sa.String(length=7), nullable=True))
    op.add_column(
        "novafin_fiscal_years", sa.Column("status", sa.String(length=10), server_default="open", nullable=False)
    )
    op.add_column("novafin_fiscal_years", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("novafin_fiscal_years", sa.Column("net_profit_snapshot", sa.Numeric(precision=14, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column("novafin_fiscal_years", "net_profit_snapshot")
    op.drop_column("novafin_fiscal_years", "closed_at")
    op.drop_column("novafin_fiscal_years", "status")
    op.drop_column("novafin_assets", "last_depreciation_period")
    op.drop_column("novafin_assets", "funding_method")
    op.drop_column("novafin_accounts", "is_active")
    op.drop_column("novafin_accounts", "is_system")
    op.drop_index("ix_novafin_bank_clears_bank_id", table_name="novafin_bank_clears")
    op.drop_table("novafin_bank_clears")
