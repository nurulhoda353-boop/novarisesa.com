"""Add the simple HR application status and notification hand-off state.

Revision ID: 20260813_0006
Revises: 20260813_0005
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260813_0006"
down_revision: str | None = "20260813_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("requirement_applications", sa.Column("operational_status", sa.String(24), server_default="pending", nullable=False))
    op.add_column("requirement_applications", sa.Column("notification_status", sa.String(32), server_default="not_required", nullable=False))
    op.add_column("requirement_applications", sa.Column("notification_requested_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_requirement_applications_operational_status", "requirement_applications", ["operational_status"])


def downgrade() -> None:
    op.drop_index("ix_requirement_applications_operational_status", table_name="requirement_applications")
    op.drop_column("requirement_applications", "notification_requested_at")
    op.drop_column("requirement_applications", "notification_status")
    op.drop_column("requirement_applications", "operational_status")
