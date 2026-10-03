"""Add NovaFin accounting module tables.

Revision ID: 20260929_0019
Revises: 20260913_0018
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260929_0019"
down_revision: str | None = "20260913_0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "novafin_company_profile",
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("vat_number", sa.String(length=40), nullable=True),
        sa.Column("cr_number", sa.String(length=40), nullable=True),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("vat_rate", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "novafin_customers",
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("vat_number", sa.String(length=40), nullable=True),
        sa.Column("credit_limit", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("opening_balance", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_novafin_customers_name", "novafin_customers", ["name"])
    op.create_table(
        "novafin_items",
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM("product", "service", name="novafin_item_kind"),
            nullable=False,
        ),
        sa.Column("unit", sa.String(length=40), nullable=False),
        sa.Column("cost", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("price", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("opening_qty", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("min_level", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_novafin_items_name", "novafin_items", ["name"])
    op.create_table(
        "novafin_vendors",
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("vat_number", sa.String(length=40), nullable=True),
        sa.Column("opening_balance", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_novafin_vendors_name", "novafin_vendors", ["name"])
    op.create_table(
        "novafin_invoices",
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("invoice_date", sa.Date(), nullable=False),
        sa.Column("mode", sa.String(length=10), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM("draft", "posted", "cancelled", name="novafin_invoice_status"),
            nullable=False,
        ),
        sa.Column("vat_rate", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("subtotal", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("vat_amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("grand_total", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["novafin_customers.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_novafin_invoices_code"),
    )
    op.create_index("ix_novafin_invoices_code", "novafin_invoices", ["code"])
    op.create_index("ix_novafin_invoices_customer_id", "novafin_invoices", ["customer_id"])
    op.create_table(
        "novafin_purchases",
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=False),
        sa.Column("mode", sa.String(length=10), nullable=False),
        sa.Column("vat_rate", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column("subtotal", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("vat_amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("grand_total", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["vendor_id"], ["novafin_vendors.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_novafin_purchases_code"),
    )
    op.create_index("ix_novafin_purchases_code", "novafin_purchases", ["code"])
    op.create_index("ix_novafin_purchases_vendor_id", "novafin_purchases", ["vendor_id"])
    op.create_table(
        "novafin_stock_moves",
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("delta", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("move_date", sa.Date(), nullable=False),
        sa.Column("reference", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.ForeignKeyConstraint(["item_id"], ["novafin_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_novafin_stock_moves_item_id", "novafin_stock_moves", ["item_id"])
    op.create_table(
        "novafin_invoice_lines",
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name_snapshot", sa.String(length=200), nullable=False),
        sa.Column("unit", sa.String(length=40), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("rate", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.ForeignKeyConstraint(["invoice_id"], ["novafin_invoices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["item_id"], ["novafin_items.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_novafin_invoice_lines_invoice_id", "novafin_invoice_lines", ["invoice_id"])
    op.create_table(
        "novafin_purchase_lines",
        sa.Column("purchase_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name_snapshot", sa.String(length=200), nullable=False),
        sa.Column("unit", sa.String(length=40), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column("rate", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.ForeignKeyConstraint(["item_id"], ["novafin_items.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["purchase_id"], ["novafin_purchases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_novafin_purchase_lines_purchase_id", "novafin_purchase_lines", ["purchase_id"])


def downgrade() -> None:
    op.drop_index("ix_novafin_purchase_lines_purchase_id", table_name="novafin_purchase_lines")
    op.drop_table("novafin_purchase_lines")
    op.drop_index("ix_novafin_invoice_lines_invoice_id", table_name="novafin_invoice_lines")
    op.drop_table("novafin_invoice_lines")
    op.drop_index("ix_novafin_stock_moves_item_id", table_name="novafin_stock_moves")
    op.drop_table("novafin_stock_moves")
    op.drop_index("ix_novafin_purchases_vendor_id", table_name="novafin_purchases")
    op.drop_index("ix_novafin_purchases_code", table_name="novafin_purchases")
    op.drop_table("novafin_purchases")
    op.drop_index("ix_novafin_invoices_customer_id", table_name="novafin_invoices")
    op.drop_index("ix_novafin_invoices_code", table_name="novafin_invoices")
    op.drop_table("novafin_invoices")
    op.drop_index("ix_novafin_vendors_name", table_name="novafin_vendors")
    op.drop_table("novafin_vendors")
    op.drop_index("ix_novafin_items_name", table_name="novafin_items")
    op.drop_table("novafin_items")
    op.drop_index("ix_novafin_customers_name", table_name="novafin_customers")
    op.drop_table("novafin_customers")
    op.drop_table("novafin_company_profile")
    sa.Enum(name="novafin_invoice_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="novafin_item_kind").drop(op.get_bind(), checkfirst=True)
