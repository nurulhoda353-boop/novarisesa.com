"""link_website_leads_to_novafin_customer

Revision ID: 5f496bb7e7c2
Revises: 20260930_0023
Create Date: 2026-10-03 21:10:38.765831
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '5f496bb7e7c2'
down_revision: Union[str, Sequence[str], None] = '20260930_0023'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('contact_submissions', sa.Column('novafin_customer_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_contact_submissions_novafin_customer_id'), 'contact_submissions', ['novafin_customer_id'], unique=False)
    op.create_foreign_key(None, 'contact_submissions', 'novafin_customers', ['novafin_customer_id'], ['id'], ondelete='SET NULL')
    op.add_column('rfq_submissions', sa.Column('novafin_customer_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_rfq_submissions_novafin_customer_id'), 'rfq_submissions', ['novafin_customer_id'], unique=False)
    op.create_foreign_key(None, 'rfq_submissions', 'novafin_customers', ['novafin_customer_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint(None, 'rfq_submissions', type_='foreignkey')
    op.drop_index(op.f('ix_rfq_submissions_novafin_customer_id'), table_name='rfq_submissions')
    op.drop_column('rfq_submissions', 'novafin_customer_id')
    op.drop_constraint(None, 'contact_submissions', type_='foreignkey')
    op.drop_index(op.f('ix_contact_submissions_novafin_customer_id'), table_name='contact_submissions')
    op.drop_column('contact_submissions', 'novafin_customer_id')
