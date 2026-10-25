"""NovaFin phase 0: gapless sequences, idempotency keys, ledger immutability.

- novafin_sequences / novafin_idempotency_keys tables
- indexes that keep the trial balance and reports fast as the ledger grows
- DB triggers: posted ledger lines can't be UPDATEd/DELETEd (post a reversal
  instead) and every voucher must balance debit == credit at commit time. The
  opening-balance screen, the one legitimate rewrite, opts in per transaction
  with `SET LOCAL novafin.allow_ledger_rewrite = 'on'`.

Revision ID: 20261025_0028
Revises: 20261007_0027
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261025_0028"
down_revision: str | None = "20261007_0027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "novafin_sequences",
        sa.Column("prefix", sa.String(20), primary_key=True),
        sa.Column("last_number", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "novafin_idempotency_keys",
        sa.Column("key_hash", sa.String(64), primary_key=True),
        sa.Column("method", sa.String(10), nullable=False),
        sa.Column("path", sa.String(300), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("content_type", sa.String(100), nullable=True),
        sa.Column("response_body", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_novafin_idempotency_keys_created_at", "novafin_idempotency_keys", ["created_at"])

    op.create_index("ix_novafin_journal_voucher_lines_account_id", "novafin_journal_voucher_lines", ["account_id"])
    op.create_index("ix_novafin_journal_vouchers_voucher_date", "novafin_journal_vouchers", ["voucher_date"])

    op.execute(
        "ALTER TABLE novafin_journal_voucher_lines "
        "ADD CONSTRAINT ck_novafin_lines_non_negative CHECK (debit >= 0 AND credit >= 0) NOT VALID"
    )

    op.execute(
        """
        CREATE FUNCTION novafin_block_ledger_rewrite() RETURNS trigger AS $$
        BEGIN
            IF current_setting('novafin.allow_ledger_rewrite', true) = 'on' THEN
                IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Posted ledger lines cannot be changed or deleted — post a reversing entry instead.';
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        CREATE TRIGGER novafin_lines_immutable
        BEFORE UPDATE OR DELETE ON novafin_journal_voucher_lines
        FOR EACH ROW EXECUTE FUNCTION novafin_block_ledger_rewrite()
        """
    )
    op.execute(
        """
        CREATE FUNCTION novafin_check_voucher_balanced() RETURNS trigger AS $$
        DECLARE diff numeric;
        BEGIN
            SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) INTO diff
            FROM novafin_journal_voucher_lines WHERE voucher_id = NEW.voucher_id;
            IF abs(diff) > 0.01 THEN
                RAISE EXCEPTION 'Journal voucher is unbalanced (debit - credit = %)', diff;
            END IF;
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        CREATE CONSTRAINT TRIGGER novafin_voucher_balanced
        AFTER INSERT ON novafin_journal_voucher_lines
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION novafin_check_voucher_balanced()
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS novafin_voucher_balanced ON novafin_journal_voucher_lines")
    op.execute("DROP FUNCTION IF EXISTS novafin_check_voucher_balanced()")
    op.execute("DROP TRIGGER IF EXISTS novafin_lines_immutable ON novafin_journal_voucher_lines")
    op.execute("DROP FUNCTION IF EXISTS novafin_block_ledger_rewrite()")
    op.execute("ALTER TABLE novafin_journal_voucher_lines DROP CONSTRAINT IF EXISTS ck_novafin_lines_non_negative")
    op.drop_index("ix_novafin_journal_vouchers_voucher_date", table_name="novafin_journal_vouchers")
    op.drop_index("ix_novafin_journal_voucher_lines_account_id", table_name="novafin_journal_voucher_lines")
    op.drop_index("ix_novafin_idempotency_keys_created_at", table_name="novafin_idempotency_keys")
    op.drop_table("novafin_idempotency_keys")
    op.drop_table("novafin_sequences")
