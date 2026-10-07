"""Diagnostic-only: print which mailboxes own the two account ids seen
hammering Hostinger with stale credentials in production logs
(3cb159da-1454-43b2-b4a2-b952aa42e89f, 5329c9ce-fcd1-4d92-b1c7-6bae7381506f),
so an admin can be told to log in again with their new password. No schema
or data change - this is read-only, shows up in the deploy log, and is
safe to leave applied (it's a no-op on any later re-run / already applied
on redeploy, same as every other migration).

Revision ID: 20261007_0026
Revises: 20261007_0025
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261007_0026"
down_revision: str | None = "20261007_0025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TARGET_IDS = (
    "3cb159da-1454-43b2-b4a2-b952aa42e89f",
    "5329c9ce-fcd1-4d92-b1c7-6bae7381506f",
)


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            "SELECT id, address, role, provider, last_connected_at "
            "FROM mail_accounts WHERE id = ANY(:ids)"
        ),
        {"ids": list(_TARGET_IDS)},
    ).fetchall()
    print("=== STALE-CREDENTIAL ACCOUNT LOOKUP ===", flush=True)
    for row in rows:
        print(f"  {row}", flush=True)
    print("=== END LOOKUP ===", flush=True)


def downgrade() -> None:
    pass
