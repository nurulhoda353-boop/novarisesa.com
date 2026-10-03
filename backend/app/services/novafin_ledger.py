"""Central double-entry posting engine for NovaFin.

Every NovaFin transaction (invoice, purchase, receipt, payment, return,
credit note, depreciation, opening balance, ...) posts through
`post_journal()` so the fiscal-year lock and the debit==credit check are
enforced in exactly one place, the same way the reference implementation's
`journal()` function worked.
"""

from collections.abc import Sequence
from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import NovaFinAccount, NovaFinFiscalYear, NovaFinJournalVoucher, NovaFinJournalVoucherLine

# code -> (name, account_type). Looked up / lazily created on first use so no
# separate seed migration or bootstrap step is needed.
SYSTEM_ACCOUNTS: dict[str, tuple[str, str]] = {
    "cash": ("Cash in Hand", "asset"),
    "ar": ("Accounts Receivable", "asset"),
    "ap": ("Accounts Payable", "liability"),
    "inventory": ("Inventory", "asset"),
    "cogs": ("Cost of Goods Sold", "expense"),
    "purchase_expense": ("Purchased Services", "expense"),
    "sales": ("Sales Revenue", "income"),
    "sales_return": ("Sales Returns", "income"),
    "credit_note": ("Credit Notes Issued", "income"),
    "vout": ("VAT Output (Payable)", "liability"),
    "vin": ("VAT Input (Receivable)", "asset"),
    "wages": ("Wages & Salaries", "expense"),
    "dep_exp": ("Depreciation Expense", "expense"),
    "capital": ("Owner's Capital", "equity"),
    "drawings": ("Owner's Drawings", "equity"),
    "opening_equity": ("Opening Balance Equity", "equity"),
}


def get_or_create_account(db: Session, code: str) -> NovaFinAccount:
    account = db.scalar(select(NovaFinAccount).where(NovaFinAccount.code == code))
    if account is not None:
        return account

    if code in SYSTEM_ACCOUNTS:
        name, account_type = SYSTEM_ACCOUNTS[code]
    elif code.startswith("bank:"):
        name, account_type = f"Bank Account ({code.split(':', 1)[1]})", "asset"
    elif code.startswith("asset:"):
        name, account_type = f"Fixed Asset ({code.split(':', 1)[1]})", "asset"
    elif code.startswith("inc:"):
        name, account_type = f"Other Income ({code.split(':', 1)[1]})", "income"
    elif code.startswith("exp:"):
        name, account_type = f"Other Expense ({code.split(':', 1)[1]})", "expense"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown ledger account code: {code}")

    account = NovaFinAccount(code=code, name=name, account_type=account_type, is_system=True)
    db.add(account)
    db.flush()
    return account


def is_period_locked(db: Session, entry_date: date) -> bool:
    closed = db.scalar(
        select(NovaFinFiscalYear).where(
            NovaFinFiscalYear.status == "closed",
            NovaFinFiscalYear.start_date <= entry_date,
            NovaFinFiscalYear.end_date >= entry_date,
        )
    )
    return closed is not None


def _next_voucher_code(db: Session, prefix: str) -> str:
    count = db.scalar(
        select(func.count()).select_from(NovaFinJournalVoucher).where(NovaFinJournalVoucher.code.like(f"{prefix}-%"))
    ) or 0
    return f"{prefix}-{count + 1:04d}"


def post_journal(
    db: Session,
    *,
    entry_date: date,
    narration: str,
    lines: Sequence[tuple[str, Decimal, Decimal]],
    code_prefix: str = "AUTO",
) -> NovaFinJournalVoucher:
    """`lines` is (account_code, debit, credit) tuples. Zero-value lines are
    dropped. Raises 422 if the date falls in a closed fiscal year or the
    debits and credits don't balance."""
    if is_period_locked(db, entry_date):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This date falls within a closed fiscal year — no new entry can be posted.",
        )

    real_lines = [line for line in lines if line[1] != 0 or line[2] != 0]
    total_debit = sum((line[1] for line in real_lines), Decimal("0"))
    total_credit = sum((line[2] for line in real_lines), Decimal("0"))
    if abs(total_debit - total_credit) > Decimal("0.01"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Debit and credit totals must match")
    if not real_lines:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A journal entry needs at least one line")

    voucher = NovaFinJournalVoucher(code=_next_voucher_code(db, code_prefix), voucher_date=entry_date, narration=narration)
    db.add(voucher)
    db.flush()
    for account_code, debit, credit in real_lines:
        account = get_or_create_account(db, account_code)
        db.add(NovaFinJournalVoucherLine(voucher_id=voucher.id, account_id=account.id, debit=debit, credit=credit))
    return voucher


def account_balance(db: Session, code: str) -> Decimal:
    """Raw debit-minus-credit balance for a code, 0 if the account has never been posted to."""
    account = db.scalar(select(NovaFinAccount).where(NovaFinAccount.code == code))
    if account is None:
        return Decimal("0")
    return account_balance_by_id(db, account.id)


def account_balance_by_id(db: Session, account_id) -> Decimal:
    row = db.execute(
        select(
            func.coalesce(func.sum(NovaFinJournalVoucherLine.debit), 0),
            func.coalesce(func.sum(NovaFinJournalVoucherLine.credit), 0),
        ).where(NovaFinJournalVoucherLine.account_id == account_id)
    ).one()
    return Decimal(row[0]) - Decimal(row[1])


def account_balance_as_of(db: Session, code: str, as_of: date) -> Decimal:
    account = db.scalar(select(NovaFinAccount).where(NovaFinAccount.code == code))
    if account is None:
        return Decimal("0")
    row = db.execute(
        select(
            func.coalesce(func.sum(NovaFinJournalVoucherLine.debit), 0),
            func.coalesce(func.sum(NovaFinJournalVoucherLine.credit), 0),
        )
        .join(NovaFinJournalVoucher, NovaFinJournalVoucher.id == NovaFinJournalVoucherLine.voucher_id)
        .where(NovaFinJournalVoucherLine.account_id == account.id, NovaFinJournalVoucher.voucher_date <= as_of)
    ).one()
    return Decimal(row[0]) - Decimal(row[1])


def display_balance(raw_balance: Decimal, account_type: str) -> Decimal:
    """Flip sign for liability/equity/income accounts so normal balances show positive."""
    if account_type in {"liability", "equity", "income"}:
        return -raw_balance
    return raw_balance


def cash_method_code(method: str) -> str:
    """'cash' stays 'cash'; anything else is treated as a bank:<id> method string as-is."""
    return method if method else "cash"
