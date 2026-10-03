"""Link NovaFin cash moves to customers and vendors.

Revision ID: 20260930_0021
Revises: 20260930_0020
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260930_0021"
down_revision: str | None = "20260930_0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("novafin_cash_moves", sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("novafin_cash_moves", sa.Column("vendor_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_novafin_cash_moves_customer_id", "novafin_cash_moves", "novafin_customers", ["customer_id"], ["id"], ondelete="SET NULL"
    )
    op.create_foreign_key(
        "fk_novafin_cash_moves_vendor_id", "novafin_cash_moves", "novafin_vendors", ["vendor_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    op.drop_constraint("fk_novafin_cash_moves_vendor_id", "novafin_cash_moves", type_="foreignkey")
    op.drop_constraint("fk_novafin_cash_moves_customer_id", "novafin_cash_moves", type_="foreignkey")
    op.drop_column("novafin_cash_moves", "vendor_id")
    op.drop_column("novafin_cash_moves", "customer_id")
