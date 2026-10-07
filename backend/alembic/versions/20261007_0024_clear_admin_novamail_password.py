"""Clear the stray Novamail-only password on the admin mailbox.

rabbani@novarisesa.com (the sole mail_accounts.role='admin' mailbox) had a
novamail_password_hash set at some point, which made login check that
instead of the real Hostinger mailbox password - breaking the intended
design where the admin always authenticates with the live Hostinger
password. There is no API path to clear this (admin_set_password only
*sets* a new one, and calling it requires an already-authenticated admin
session, which this very bug prevents) - this is a one-off data fix.

Revision ID: 20261007_0024
Revises: 5f496bb7e7c2
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261007_0024"
down_revision: str | None = "5f496bb7e7c2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "UPDATE mail_accounts SET novamail_password_hash = NULL "
        "WHERE lower(address) = 'rabbani@novarisesa.com'"
    )


def downgrade() -> None:
    # The original hash isn't recoverable - nothing to restore.
    pass
