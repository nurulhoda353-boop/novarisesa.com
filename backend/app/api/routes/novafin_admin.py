import uuid
from datetime import date as date_type
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session, selectinload

from app.api.routes.cms import audit
from app.core.auth import require_permission
from app.core.database import get_db
from app.models import (
    AuditLog,
    NovaFinAccount,
    NovaFinBank,
    NovaFinBankClear,
    NovaFinCashMove,
    NovaFinCreditNote,
    NovaFinCustomer,
    NovaFinFiscalYear,
    NovaFinInvoice,
    NovaFinInvoiceLine,
    NovaFinItem,
    NovaFinItemKind,
    NovaFinJournalVoucher,
    NovaFinJournalVoucherLine,
    NovaFinSalesReturn,
    NovaFinStockMove,
    User,
)
from app.schemas.novafin_admin import FiscalYearUpsert, OpeningBalanceSubmit
from app.schemas.novafin_phase1 import FiscalYearReopen
from app.services.novafin_ledger import (
    CLOSING_PREFIX,
    account_balance,
    account_balance_as_of,
    display_balance,
    get_or_create_account,
    post_journal,
    reverse_voucher,
)

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]
NovaFinManager = Annotated[User, Depends(require_permission("novafin.manage"))]
NovaFinCloser = Annotated[User, Depends(require_permission("novafin.close_period"))]
NovaFinReopener = Annotated[User, Depends(require_permission("novafin.reopen_period"))]


# --- Fiscal years ---


def serialize_fiscal_year(fy: NovaFinFiscalYear) -> dict[str, Any]:
    return {
        "id": str(fy.id), "label": fy.label,
        "start_date": fy.start_date.isoformat(), "end_date": fy.end_date.isoformat(),
        "is_active": fy.is_active, "status": fy.status,
        "closed_at": fy.closed_at.isoformat() if fy.closed_at else None,
        "net_profit_snapshot": fy.net_profit_snapshot,
        "closing_voucher_id": str(fy.closing_voucher_id) if fy.closing_voucher_id else None,
    }


@router.get("/fiscal-years")
def list_fiscal_years(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinFiscalYear).order_by(NovaFinFiscalYear.start_date.desc())).all()
    return {"items": [serialize_fiscal_year(fy) for fy in rows]}


@router.post("/fiscal-years", status_code=status.HTTP_201_CREATED)
def create_fiscal_year(payload: FiscalYearUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    if payload.end_date <= payload.start_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="End date must be after start date")
    overlap = db.scalar(
        select(NovaFinFiscalYear).where(
            NovaFinFiscalYear.start_date <= payload.end_date, NovaFinFiscalYear.end_date >= payload.start_date
        )
    )
    if overlap is not None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="This period overlaps another fiscal year")
    if payload.is_active:
        db.query(NovaFinFiscalYear).update({"is_active": False})
    fy = NovaFinFiscalYear(**payload.model_dump())
    db.add(fy)
    db.flush()
    audit(db, request, user, "novafin.fiscal_year_created", "novafin_fiscal_years", fy.id, after={"label": fy.label})
    db.commit()
    db.refresh(fy)
    return serialize_fiscal_year(fy)


@router.post("/fiscal-years/{fiscal_year_id}/close")
def close_fiscal_year(fiscal_year_id: uuid.UUID, request: Request, user: NovaFinCloser, db: DBSession) -> dict[str, Any]:
    fy = db.get(NovaFinFiscalYear, fiscal_year_id)
    if fy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiscal year not found")
    if fy.status == "closed":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="This fiscal year is already closed")

    net_profit = _net_profit_for_range(db, fy.start_date, fy.end_date)
    closing = _post_closing_entry(db, fy, net_profit)
    fy.status = "closed"
    fy.closed_at = datetime.now()
    fy.net_profit_snapshot = net_profit
    fy.closing_voucher_id = closing.id if closing is not None else None
    audit(
        db, request, user, "novafin.fiscal_year_closed", "novafin_fiscal_years", fy.id,
        after={"net_profit_snapshot": str(net_profit), "closing_entry": closing.code if closing else None},
    )
    db.commit()
    db.refresh(fy)
    return serialize_fiscal_year(fy)


@router.post("/fiscal-years/{fiscal_year_id}/reopen")
def reopen_fiscal_year(
    fiscal_year_id: uuid.UUID, payload: FiscalYearReopen, request: Request, user: NovaFinReopener, db: DBSession
) -> dict[str, Any]:
    """Director-only. The closing entry is reversed (never deleted) so the year's profit is open to correction again."""
    fy = db.get(NovaFinFiscalYear, fiscal_year_id)
    if fy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiscal year not found")
    if fy.status != "closed":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="This fiscal year is not closed")
    fy.status = "open"  # must be open before the reversal can be dated inside it
    if fy.closing_voucher_id is not None:
        original = db.get(NovaFinJournalVoucher, fy.closing_voucher_id)
        reverse_voucher(
            db,
            original,
            entry_date=fy.end_date,
            narration=f"Reopening {fy.label}: {payload.reason}",
            code_prefix=CLOSING_PREFIX,
            ignore_period_lock=True,
        )
    fy.closing_voucher_id = None
    fy.closed_at = None
    fy.net_profit_snapshot = None
    audit(db, request, user, "novafin.fiscal_year_reopened", "novafin_fiscal_years", fy.id, after={"reason": payload.reason})
    db.commit()
    db.refresh(fy)
    return serialize_fiscal_year(fy)


def _net_profit_for_range(db: Session, start: date_type, end: date_type, *, exclude_closing: bool = True) -> Decimal:
    """Sum of income-type minus expense-type ledger activity within [start, end]. Year-end closing
    entries are left out so a closed year still reports the profit it earned."""
    conditions = [NovaFinJournalVoucher.voucher_date >= start, NovaFinJournalVoucher.voucher_date <= end]
    if exclude_closing:
        conditions.append(~NovaFinJournalVoucher.code.like(f"{CLOSING_PREFIX}-%"))
    rows = db.execute(
        select(NovaFinAccount.account_type, func.coalesce(func.sum(NovaFinJournalVoucherLine.debit), 0), func.coalesce(func.sum(NovaFinJournalVoucherLine.credit), 0))
        .join(NovaFinJournalVoucherLine, NovaFinJournalVoucherLine.account_id == NovaFinAccount.id)
        .join(NovaFinJournalVoucher, NovaFinJournalVoucher.id == NovaFinJournalVoucherLine.voucher_id)
        .where(*conditions)
        .group_by(NovaFinAccount.account_type)
    ).all()
    net = Decimal("0")
    for account_type, debit, credit in rows:
        if account_type == "income":
            net += Decimal(credit) - Decimal(debit)
        elif account_type == "expense":
            net -= Decimal(debit) - Decimal(credit)
    return net


def _post_closing_entry(db: Session, fy: NovaFinFiscalYear, net_profit: Decimal):
    """Zero every income and expense account for the year and move the profit to Retained Earnings."""
    rows = db.execute(
        select(NovaFinAccount.code, NovaFinAccount.account_type, func.sum(NovaFinJournalVoucherLine.debit), func.sum(NovaFinJournalVoucherLine.credit))
        .join(NovaFinJournalVoucherLine, NovaFinJournalVoucherLine.account_id == NovaFinAccount.id)
        .join(NovaFinJournalVoucher, NovaFinJournalVoucher.id == NovaFinJournalVoucherLine.voucher_id)
        .where(
            NovaFinAccount.account_type.in_(["income", "expense"]),
            NovaFinJournalVoucher.voucher_date >= fy.start_date,
            NovaFinJournalVoucher.voucher_date <= fy.end_date,
        )
        .group_by(NovaFinAccount.code, NovaFinAccount.account_type)
    ).all()
    lines: list[tuple] = []
    for code, _type, debit, credit in rows:
        balance = Decimal(debit or 0) - Decimal(credit or 0)  # debit-positive
        if balance > 0:
            lines.append((code, Decimal("0"), balance))
        elif balance < 0:
            lines.append((code, -balance, Decimal("0")))
    if not lines:
        return None
    net = sum((line[1] - line[2] for line in lines), Decimal("0"))  # debits closed out minus credits = profit
    lines.append(("retained_earnings", Decimal("0") if net >= 0 else -net, net if net >= 0 else Decimal("0")))
    return post_journal(
        db,
        entry_date=fy.end_date,
        narration=f"Year-end closing {fy.label}: net profit {net_profit:,.2f} moved to Retained Earnings",
        lines=lines,
        code_prefix=CLOSING_PREFIX,
        ignore_period_lock=True,
    )


# --- Opening balance (chart-of-accounts trial balance, excludes AR/AP —
# those are entered per customer/vendor on their own master records instead) ---

OPENBAL_REF = "OPENBAL-MASTER"


@router.get("/opening-balance")
def get_opening_balance(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    # Materialize every account a user would expect to see here (system
    # accounts, banks, fixed assets, custom COA rows) even if nothing has
    # posted to them yet, so the form always shows a complete list.
    from app.services.novafin_ledger import SYSTEM_ACCOUNTS

    for code in SYSTEM_ACCOUNTS:
        if code not in {"ar", "ap"}:
            get_or_create_account(db, code)
    for bank in db.scalars(select(NovaFinBank)):
        get_or_create_account(db, f"bank:{bank.id}")
    db.flush()

    existing = db.scalar(select(NovaFinJournalVoucher).where(NovaFinJournalVoucher.code == OPENBAL_REF))
    posted_lines: dict[str, dict[str, Decimal]] = {}
    if existing is not None:
        for line in db.scalars(select(NovaFinJournalVoucherLine).where(NovaFinJournalVoucherLine.voucher_id == existing.id)):
            account = db.get(NovaFinAccount, line.account_id)
            if account:
                posted_lines[account.code] = {"debit": line.debit, "credit": line.credit}

    accounts = db.scalars(
        select(NovaFinAccount)
        .where(NovaFinAccount.code.notin_(["ar", "ap"]), NovaFinAccount.is_group.is_(False))
        .order_by(NovaFinAccount.number.asc().nulls_last(), NovaFinAccount.code)
    ).all()
    return {
        "already_posted": existing is not None,
        "accounts": [
            {
                "id": str(a.id),
                "code": a.code,
                "number": a.number,
                "name": a.name,
                "name_ar": a.name_ar,
                "account_type": a.account_type,
                "debit": posted_lines.get(a.code, {}).get("debit", Decimal("0")),
                "credit": posted_lines.get(a.code, {}).get("credit", Decimal("0")),
            }
            for a in accounts
        ],
    }


@router.post("/opening-balance")
def submit_opening_balance(payload: OpeningBalanceSubmit, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    for line in payload.lines:
        if line.account_code in {"ar", "ap"}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Customer/vendor opening balances are set on their own pages, not here",
            )
    total_debit = sum((l.debit for l in payload.lines), Decimal("0"))
    total_credit = sum((l.credit for l in payload.lines), Decimal("0"))
    if abs(total_debit - total_credit) > Decimal("0.01"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Debit and credit totals must match")
    if total_debit == 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter at least one non-zero amount")

    existing = db.scalar(select(NovaFinJournalVoucher).where(NovaFinJournalVoucher.code == OPENBAL_REF))
    if existing is not None:
        # The one sanctioned ledger rewrite: re-saving the opening trial balance replaces
        # its voucher. Opt in for this transaction only (see migration 20261025_0028).
        db.execute(text("SET LOCAL novafin.allow_ledger_rewrite = 'on'"))
        db.delete(existing)
        db.flush()

    voucher = NovaFinJournalVoucher(code=OPENBAL_REF, voucher_date=date_type.today(), narration="Opening Trial Balance")
    db.add(voucher)
    db.flush()
    for line in payload.lines:
        if line.debit == 0 and line.credit == 0:
            continue
        account = get_or_create_account(db, line.account_code)
        db.add(NovaFinJournalVoucherLine(voucher_id=voucher.id, account_id=account.id, debit=line.debit, credit=line.credit))

    audit(db, request, user, "novafin.opening_balance_posted", "novafin_journal_vouchers", voucher.id, after={"total": str(total_debit)})
    db.commit()
    return {"status": "saved"}


# --- Bank reconciliation ---


@router.get("/banks/{bank_id}/reconciliation")
def bank_reconciliation(bank_id: uuid.UUID, user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    bank = db.get(NovaFinBank, bank_id)
    if bank is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank not found")
    account = db.scalar(select(NovaFinAccount).where(NovaFinAccount.code == f"bank:{bank_id}"))
    if account is None:
        return {"bank_name": bank.name, "lines": [], "book_balance": Decimal("0"), "cleared_balance": Decimal("0")}

    cleared_line_ids = {
        c.journal_voucher_line_id for c in db.scalars(select(NovaFinBankClear).where(NovaFinBankClear.bank_id == bank_id))
    }
    rows = db.scalars(
        select(NovaFinJournalVoucherLine)
        .options(selectinload(NovaFinJournalVoucherLine.voucher))
        .where(NovaFinJournalVoucherLine.account_id == account.id)
        .join(NovaFinJournalVoucher)
        .order_by(NovaFinJournalVoucher.voucher_date)
    ).all()

    book_balance = Decimal("0")
    cleared_balance = Decimal("0")
    lines = []
    for line in rows:
        amount = line.debit - line.credit
        book_balance += amount
        is_cleared = line.id in cleared_line_ids
        if is_cleared:
            cleared_balance += amount
        lines.append({
            "line_id": str(line.id),
            "date": line.voucher.voucher_date.isoformat(),
            "ref": line.voucher.code,
            "narration": line.voucher.narration,
            "amount": amount,
            "is_cleared": is_cleared,
        })
    return {"bank_name": bank.name, "lines": lines, "book_balance": book_balance, "cleared_balance": cleared_balance}


@router.post("/banks/{bank_id}/reconciliation/toggle")
def toggle_bank_clear(bank_id: uuid.UUID, line_id: uuid.UUID, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    existing = db.scalar(
        select(NovaFinBankClear).where(NovaFinBankClear.bank_id == bank_id, NovaFinBankClear.journal_voucher_line_id == line_id)
    )
    if existing is not None:
        db.delete(existing)
        db.commit()
        return {"is_cleared": False}
    db.add(NovaFinBankClear(bank_id=bank_id, journal_voucher_line_id=line_id))
    db.commit()
    return {"is_cleared": True}


# --- Stock report ---


@router.get("/reports/stock")
def stock_report(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    items = db.scalars(select(NovaFinItem).where(NovaFinItem.kind == NovaFinItemKind.PRODUCT).order_by(NovaFinItem.name)).all()
    stock_by_item = dict(
        db.execute(
            select(NovaFinStockMove.item_id, func.coalesce(func.sum(NovaFinStockMove.delta), 0)).group_by(NovaFinStockMove.item_id)
        ).all()
    )
    return {
        "items": [
            {
                "item_id": str(item.id),
                "name": item.name,
                "unit": item.unit,
                "opening_qty": item.opening_qty,
                "on_hand": stock_by_item.get(item.id, item.opening_qty),
                "min_level": item.min_level,
            }
            for item in items
        ]
    }


# --- Balance sheet, VAT summary, aging, top products ---


@router.get("/reports/balance-sheet")
def balance_sheet(user: NovaFinUser, db: DBSession, as_of: date_type | None = None) -> dict[str, Any]:
    as_of = as_of or date_type.today()
    accounts = db.scalars(select(NovaFinAccount).where(NovaFinAccount.is_group.is_(False)).order_by(NovaFinAccount.number.asc().nulls_last())).all()
    assets, liabilities, equity_rows = [], [], []
    for account in accounts:
        balance = display_balance(account_balance_as_of(db, account.code, as_of), account.account_type)
        if abs(balance) <= Decimal("0.005"):
            continue
        row = {"code": account.code, "number": account.number, "name": account.name, "name_ar": account.name_ar, "balance": balance}
        if account.account_type == "asset":
            assets.append(row)
        elif account.account_type == "liability":
            liabilities.append(row)
        elif account.account_type == "equity":
            equity_rows.append(row)

    total_assets = sum((r["balance"] for r in assets), Decimal("0"))
    total_liabilities = sum((r["balance"] for r in liabilities), Decimal("0"))
    capital_total = sum((r["balance"] for r in equity_rows), Decimal("0"))
    # Closed years' profit already sits in Retained Earnings; their closing entries zero the P&L accounts,
    # so including them here keeps the open year's profit the only thing added to equity.
    net_profit_to_date = _net_profit_for_range(db, date_type(2000, 1, 1), as_of, exclude_closing=False)
    total_equity = capital_total + net_profit_to_date

    stock_value = Decimal("0")
    for item in db.scalars(select(NovaFinItem).where(NovaFinItem.kind == NovaFinItemKind.PRODUCT)):
        on_hand = db.scalar(
            select(func.coalesce(func.sum(NovaFinStockMove.delta), 0)).where(
                NovaFinStockMove.item_id == item.id, NovaFinStockMove.move_date <= as_of
            )
        ) or Decimal("0")
        stock_value += on_hand * item.cost

    return {
        "as_of": as_of.isoformat(),
        "assets": assets,
        "total_assets": total_assets,
        "liabilities": liabilities,
        "total_liabilities": total_liabilities,
        "equity": equity_rows,
        "net_profit_to_date": net_profit_to_date,
        "total_equity": total_equity,
        "check_difference": total_assets - total_liabilities - total_equity,
        "stock_value_memo": stock_value,
    }


@router.get("/reports/vat-summary")
def vat_summary(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    vout = display_balance(account_balance(db, "vout"), "liability")
    vin = account_balance(db, "vin")
    net = vout - vin
    return {
        "vat_output": vout,
        "vat_input": vin,
        "net_payable": max(net, Decimal("0")),
        "net_refundable": max(-net, Decimal("0")),
    }


@router.get("/reports/top-products")
def top_products(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.execute(
        select(
            NovaFinInvoiceLine.item_id,
            NovaFinInvoiceLine.name_snapshot,
            NovaFinInvoiceLine.unit,
            func.sum(NovaFinInvoiceLine.quantity),
            func.sum(NovaFinInvoiceLine.quantity * NovaFinInvoiceLine.rate),
        )
        .join(NovaFinInvoice, NovaFinInvoice.id == NovaFinInvoiceLine.invoice_id)
        .group_by(NovaFinInvoiceLine.item_id, NovaFinInvoiceLine.name_snapshot, NovaFinInvoiceLine.unit)
        .order_by(func.sum(NovaFinInvoiceLine.quantity * NovaFinInvoiceLine.rate).desc())
        .limit(10)
    ).all()
    return {
        "items": [
            {"name": name, "unit": unit, "quantity": qty, "value": value}
            for _, name, unit, qty, value in rows
        ]
    }


# --- Audit log viewer (NovaFin actions only) ---


@router.get("/audit-log")
def list_audit_log(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(AuditLog).where(AuditLog.action.like("novafin.%")).order_by(AuditLog.created_at.desc()).limit(200)
    ).all()
    actor_ids = {row.actor_id for row in rows if row.actor_id}
    actors = {u.id: u.email for u in db.scalars(select(User).where(User.id.in_(actor_ids)))} if actor_ids else {}
    return {
        "items": [
            {
                "id": str(row.id),
                "actor": actors.get(row.actor_id),
                "action": row.action,
                "entity_type": row.entity_type,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ]
    }
