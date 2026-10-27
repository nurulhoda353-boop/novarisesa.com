"""NovaFin phase 2A: tax category on invoices and bills, supplier invoice details, filed VAT returns.

Additive only. Every existing invoice and bill becomes Standard-rated (15%), which is
what they all were.

Revision ID: 20261027_0030
Revises: 20261026_0029
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261027_0030"
down_revision: str | None = "20261026_0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("novafin_invoices", sa.Column("tax_category", sa.String(20), nullable=False, server_default="standard"))
    op.add_column("novafin_purchases", sa.Column("tax_category", sa.String(20), nullable=False, server_default="standard"))
    op.add_column("novafin_purchases", sa.Column("supplier_invoice_no", sa.String(60), nullable=True))
    op.add_column("novafin_purchases", sa.Column("supplier_invoice_date", sa.Date(), nullable=True))
    op.add_column("novafin_purchases", sa.Column("vat_recoverable", sa.Boolean(), nullable=False, server_default=sa.true()))

    op.create_table(
        "novafin_vat_returns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("frequency", sa.String(12), nullable=False),
        sa.Column("output_vat", sa.Numeric(14, 2), nullable=False),
        sa.Column("input_vat", sa.Numeric(14, 2), nullable=False),
        sa.Column("net_vat", sa.Numeric(14, 2), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("filed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("filed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("settlement_voucher_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("settled_on", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(["settlement_voucher_id"], ["novafin_journal_vouchers.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("period_start", "period_end", name="uq_novafin_vat_returns_period"),
    )


def downgrade() -> None:
    op.drop_table("novafin_vat_returns")
    op.drop_column("novafin_purchases", "vat_recoverable")
    op.drop_column("novafin_purchases", "supplier_invoice_date")
    op.drop_column("novafin_purchases", "supplier_invoice_no")
    op.drop_column("novafin_purchases", "tax_category")
    op.drop_column("novafin_invoices", "tax_category")
