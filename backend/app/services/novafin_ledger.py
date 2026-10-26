"""Central double-entry posting engine for NovaFin.

Every NovaFin transaction (invoice, purchase, receipt, payment, return,
credit note, depreciation, opening balance, ...) posts through
`post_journal()` so the period lock, the debit==credit check and the
customer / project tagging rules are enforced in exactly one place.
"""

import uuid
from collections.abc import Sequence
from dataclasses import dataclass, replace
from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    NovaFinAccount,
    NovaFinFiscalYear,
    NovaFinJournalVoucher,
    NovaFinJournalVoucherLine,
    NovaFinPeriodLock,
)
from app.services.novafin_chart import NUMBER_RANGES, PROJECT_REQUIRED_RANGE
from app.services.novafin_sequences import next_code

# code -> (name, account_type). Looked up / lazily created on first use. The migration
# pre-creates every one of these with its chart number and Arabic name.
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
    "retained_earnings": ("Retained Earnings", "equity"),
    "bad_debt": ("Bad Debt Expense", "expense"),
}

CLOSING_PREFIX = "CLOSE"


@dataclass(frozen=True)
class Dims:
    """Who and what a posted amount belongs to. Every field is optional."""

    customer_id: uuid.UUID | None = None
    vendor_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    cost_center_id: uuid.UUID | None = None
    branch_id: uuid.UUID | None = None

    def merged_over(self, base: "Dims") -> "Dims":
        """This line's own tags win; anything it leaves empty falls back to the voucher's."""
        return Dims(
            customer_id=self.customer_id or base.customer_id,
            vendor_id=self.vendor_id or base.vendor_id,
            project_id=self.project_id or base.project_id,
            cost_center_id=self.cost_center_id or base.cost_center_id,
            branch_id=self.branch_id or base.branch_id,
        )


NO_DIMS = Dims()


def _next_free_number(db: Session, range_key: str) -> tuple[str | None, uuid.UUID | None]:
    first, last, parent_number = NUMBER_RANGES[range_key]
    parent_id = db.scalar(select(NovaFinAccount.id).where(NovaFinAccount.number == parent_number))
    taken = set(db.scalars(select(NovaFinAccount.number).where(NovaFinAccount.number.is_not(None))))
    for candidate in range(first, last + 1):
        if str(candidate) not in taken:
            return str(candidate), parent_id
    return None, parent_id


def get_or_create_account(db: Session, code: str) -> NovaFinAccount:
    account = db.scalar(select(NovaFinAccount).where(NovaFinAccount.code == code))
    if account is not None:
        return account

    range_key: str | None = None
    if code in SYSTEM_ACCOUNTS:
        name, account_type = SYSTEM_ACCOUNTS[code]
    elif code.startswith("bank:"):
        name, account_type, range_key = f"Bank Account ({code.split(':', 1)[1]})", "asset", "bank"
    elif code.startswith("asset:"):
        name, account_type, range_key = f"Fixed Asset ({code.split(':', 1)[1]})", "asset", "asset"
    elif code.startswith("inc:"):
        name, account_type, range_key = f"Other Income ({code.split(':', 1)[1]})", "income", "inc"
    elif code.startswith("exp:"):
        name, account_type, range_key = f"Other Expense ({code.split(':', 1)[1]})", "expense", "exp"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown ledger account code: {code}")

    number, parent_id = (None, None)
    if range_key:
        number, parent_id = _next_free_number(db, range_key)
    account = NovaFinAccount(
        code=code, name=name, account_type=account_type, is_system=True, number=number, parent_id=parent_id
    )
    db.add(account)
    db.flush()
    return account


def is_period_locked(db: Session, entry_date: date) -> bool:
    return period_lock_reason(db, entry_date) is not None


def period_lock_reason(db: Session, entry_date: date) -> str | None:
    closed = db.scalar(
        select(NovaFinFiscalYear).where(
            NovaFinFiscalYear.status == "closed",
            NovaFinFiscalYear.start_date <= entry_date,
            NovaFinFiscalYear.end_date >= entry_date,
        )
    )
    if closed is not None:
        return "This date falls within a closed fiscal year — no new entry can be posted."
    month_locked = db.scalar(
        select(NovaFinPeriodLock.id).where(
            NovaFinPeriodLock.year == entry_date.year, NovaFinPeriodLock.month == entry_date.month
        )
    )
    if month_locked is not None:
        return f"{entry_date:%B %Y} is locked — no entry dated in that month can be posted."
    return None


def assert_period_open(db: Session, entry_date: date) -> None:
    reason = period_lock_reason(db, entry_date)
    if reason:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=reason)


def _next_voucher_code(db: Session, prefix: str) -> str:
    return next_code(db, NovaFinJournalVoucher, prefix)


def _check_line(account: NovaFinAccount, dims: Dims) -> None:
    if account.is_group:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{account.number or account.code} {account.name} is a heading — post to one of the accounts under it.",
        )
    if account.code == "ar" and dims.customer_id is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A receivable entry needs a customer.")
    if account.code == "ap" and dims.vendor_id is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A payable entry needs a vendor.")


def post_journal(
    db: Session,
    *,
    entry_date: date,
    narration: str,
    lines: Sequence[tuple],
    code_prefix: str = "AUTO",
    dims: Dims = NO_DIMS,
    reversal_of_id: uuid.UUID | None = None,
    require_project_for_direct_costs: bool = False,
    ignore_period_lock: bool = False,
) -> NovaFinJournalVoucher:
    """`lines` are (account_code, debit, credit) or (account_code, debit, credit, Dims) tuples;
    `dims` tags every line that doesn't carry its own. Zero-value lines are dropped. Raises 422
    if the date is locked, the debits and credits don't balance, or a tagging rule is broken."""
    if not ignore_period_lock:
        assert_period_open(db, entry_date)

    real_lines = [line for line in lines if line[1] != 0 or line[2] != 0]
    total_debit = sum((line[1] for line in real_lines), Decimal("0"))
    total_credit = sum((line[2] for line in real_lines), Decimal("0"))
    if abs(total_debit - total_credit) > Decimal("0.01"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Debit and credit totals must match")
    if not real_lines:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A journal entry needs at least one line")

    voucher = NovaFinJournalVoucher(
        code=_next_voucher_code(db, code_prefix), voucher_date=entry_date, narration=narration, reversal_of_id=reversal_of_id
    )
    db.add(voucher)
    db.flush()
    for line in real_lines:
        account_code, debit, credit = line[0], line[1], line[2]
        line_dims = (line[3].merged_over(dims)) if len(line) > 3 and line[3] is not None else dims
        account = get_or_create_account(db, account_code)
        _check_line(account, line_dims)
        if require_project_for_direct_costs and account.number and line_dims.project_id is None:
            first, last = PROJECT_REQUIRED_RANGE
            if account.number.isdigit() and first <= int(account.number) <= last:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{account.number} {account.name} is a direct cost — choose the project it belongs to.",
                )
        db.add(
            NovaFinJournalVoucherLine(
                voucher_id=voucher.id,
                account_id=account.id,
                debit=debit,
                credit=credit,
                customer_id=line_dims.customer_id,
                vendor_id=line_dims.vendor_id,
                project_id=line_dims.project_id,
                cost_center_id=line_dims.cost_center_id,
                branch_id=line_dims.branch_id,
            )
        )
    return voucher


def reverse_voucher(
    db: Session,
    original: NovaFinJournalVoucher,
    *,
    entry_date: date,
    narration: str | None = None,
    code_prefix: str = "REV",
    ignore_period_lock: bool = False,
) -> NovaFinJournalVoucher:
    """A mirror entry (debits and credits swapped, same tags) linked to the original. The original is never touched."""
    if db.scalar(select(NovaFinJournalVoucher.id).where(NovaFinJournalVoucher.reversal_of_id == original.id)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{original.code} has already been reversed.")
    if original.reversal_of_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A reversal entry cannot itself be reversed — post a new entry instead."
        )
    lines = db.scalars(select(NovaFinJournalVoucherLine).where(NovaFinJournalVoucherLine.voucher_id == original.id)).all()
    accounts = {
        a.id: a for a in db.scalars(select(NovaFinAccount).where(NovaFinAccount.id.in_({line.account_id for line in lines})))
    }
    mirror = [
        (
            accounts[line.account_id].code,
            line.credit,
            line.debit,
            Dims(line.customer_id, line.vendor_id, line.project_id, line.cost_center_id, line.branch_id),
        )
        for line in lines
    ]
    return post_journal(
        db,
        entry_date=entry_date,
        narration=narration or f"Reversal of {original.code}",
        lines=mirror,
        code_prefix=code_prefix,
        reversal_of_id=original.id,
        ignore_period_lock=ignore_period_lock,
    )


def with_dims(dims: Dims, **changes: uuid.UUID | None) -> Dims:
    return replace(dims, **changes)


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
