"""Reports that answer the owner's questions: who owes us, how is each project doing, do the books agree."""

import uuid
from datetime import date as date_type
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import require_permission
from app.core.database import get_db
from app.models import (
    NovaFinAccount,
    NovaFinCustomer,
    NovaFinJournalVoucher,
    NovaFinJournalVoucherLine,
    NovaFinProject,
    NovaFinVendor,
    User,
)
from app.services.novafin_ar import ar_control_check, customer_aging, customer_statement, vendor_statement
from app.services.novafin_ledger import CLOSING_PREFIX

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]

ZERO = Decimal("0")


def _statement_payload(party_name: str, lines, opening_label: str) -> dict[str, Any]:
    return {
        "party_name": party_name,
        "lines": [
            {
                "date": row.date.isoformat(),
                "kind": row.kind,
                "code": row.code,
                "description": row.description,
                "debit": row.debit,
                "credit": row.credit,
                "balance": row.balance,
            }
            for row in lines
        ],
        "closing_balance": lines[-1].balance if lines else ZERO,
        "balance_meaning": opening_label,
    }


@router.get("/reports/statement/customer/{customer_id}")
def customer_statement_report(customer_id: uuid.UUID, user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    customer = db.get(NovaFinCustomer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return _statement_payload(customer.name, customer_statement(db, customer), "Positive = the customer owes us")


@router.get("/reports/statement/vendor/{vendor_id}")
def vendor_statement_report(vendor_id: uuid.UUID, user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    vendor = db.get(NovaFinVendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    lines = vendor_statement(db, vendor)
    # a vendor's account is credit-positive: flip so a positive number means we owe them
    for row in lines:
        row.balance = -row.balance
    payload = _statement_payload(vendor.name, lines, "Positive = we owe the vendor")
    return payload


@router.get("/reports/aging")
def aging_report(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    return {"items": customer_aging(db, date_type.today()), "control": ar_control_check(db)}


@router.get("/reports/trial-balance")
def trial_balance(user: NovaFinUser, db: DBSession, as_of: date_type | None = None, include_closing: bool = True) -> dict[str, Any]:
    as_of = as_of or date_type.today()
    conditions = [NovaFinJournalVoucher.voucher_date <= as_of]
    if not include_closing:
        conditions.append(~NovaFinJournalVoucher.code.like(f"{CLOSING_PREFIX}-%"))
    rows = db.execute(
        select(
            NovaFinAccount.id,
            NovaFinAccount.number,
            NovaFinAccount.name,
            NovaFinAccount.name_ar,
            NovaFinAccount.account_type,
            func.coalesce(func.sum(NovaFinJournalVoucherLine.debit), 0),
            func.coalesce(func.sum(NovaFinJournalVoucherLine.credit), 0),
        )
        .join(NovaFinJournalVoucherLine, NovaFinJournalVoucherLine.account_id == NovaFinAccount.id)
        .join(NovaFinJournalVoucher, NovaFinJournalVoucher.id == NovaFinJournalVoucherLine.voucher_id)
        .where(*conditions)
        .group_by(NovaFinAccount.id)
        .order_by(NovaFinAccount.number.asc().nulls_last(), NovaFinAccount.name)
    ).all()
    items = []
    total_debit = total_credit = ZERO
    for account_id, number, name, name_ar, account_type, debit, credit in rows:
        debit, credit = Decimal(debit), Decimal(credit)
        net = debit - credit
        items.append(
            {
                "account_id": str(account_id),
                "number": number,
                "name": name,
                "name_ar": name_ar,
                "account_type": account_type,
                "debit": net if net > 0 else ZERO,
                "credit": -net if net < 0 else ZERO,
            }
        )
        total_debit += net if net > 0 else ZERO
        total_credit += -net if net < 0 else ZERO
    return {
        "as_of": as_of.isoformat(),
        "items": items,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "difference": total_debit - total_credit,
    }


@router.get("/reports/general-ledger/{account_id}")
def general_ledger(
    account_id: uuid.UUID, user: NovaFinUser, db: DBSession, date_from: date_type | None = None, date_to: date_type | None = None
) -> dict[str, Any]:
    account = db.get(NovaFinAccount, account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    date_from = date_from or date_type(2000, 1, 1)
    date_to = date_to or date_type.today()
    opening = db.execute(
        select(func.coalesce(func.sum(NovaFinJournalVoucherLine.debit - NovaFinJournalVoucherLine.credit), 0))
        .join(NovaFinJournalVoucher, NovaFinJournalVoucher.id == NovaFinJournalVoucherLine.voucher_id)
        .where(NovaFinJournalVoucherLine.account_id == account_id, NovaFinJournalVoucher.voucher_date < date_from)
    ).scalar()
    running = Decimal(opening)
    rows = db.execute(
        select(NovaFinJournalVoucher, NovaFinJournalVoucherLine, NovaFinProject.code, NovaFinCustomer.name, NovaFinVendor.name)
        .join(NovaFinJournalVoucher, NovaFinJournalVoucher.id == NovaFinJournalVoucherLine.voucher_id)
        .outerjoin(NovaFinProject, NovaFinProject.id == NovaFinJournalVoucherLine.project_id)
        .outerjoin(NovaFinCustomer, NovaFinCustomer.id == NovaFinJournalVoucherLine.customer_id)
        .outerjoin(NovaFinVendor, NovaFinVendor.id == NovaFinJournalVoucherLine.vendor_id)
        .where(
            NovaFinJournalVoucherLine.account_id == account_id,
            NovaFinJournalVoucher.voucher_date >= date_from,
            NovaFinJournalVoucher.voucher_date <= date_to,
        )
        .order_by(NovaFinJournalVoucher.voucher_date, NovaFinJournalVoucher.code)
    ).all()
    lines = []
    for voucher, line, project_code, customer_name, vendor_name in rows:
        running += line.debit - line.credit
        lines.append(
            {
                "date": voucher.voucher_date.isoformat(),
                "voucher": voucher.code,
                "narration": voucher.narration,
                "project": project_code,
                "party": customer_name or vendor_name,
                "debit": line.debit,
                "credit": line.credit,
                "balance": running,
            }
        )
    return {
        "account": {"number": account.number, "name": account.name, "name_ar": account.name_ar, "account_type": account.account_type},
        "opening_balance": Decimal(opening),
        "lines": lines,
        "closing_balance": running,
    }


@router.get("/reports/project-pl")
def project_profit_and_loss(
    user: NovaFinUser,
    db: DBSession,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    branch_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Income and cost per project. Entries with no project are shown under 'Not assigned' so nothing disappears."""
    date_from = date_from or date_type(2000, 1, 1)
    date_to = date_to or date_type.today()
    conditions = [
        NovaFinJournalVoucher.voucher_date >= date_from,
        NovaFinJournalVoucher.voucher_date <= date_to,
        ~NovaFinJournalVoucher.code.like(f"{CLOSING_PREFIX}-%"),
        NovaFinAccount.account_type.in_(["income", "expense"]),
    ]
    if branch_id is not None:
        conditions.append(NovaFinJournalVoucherLine.branch_id == branch_id)
    rows = db.execute(
        select(
            NovaFinJournalVoucherLine.project_id,
            NovaFinAccount.account_type,
            NovaFinAccount.number,
            func.coalesce(func.sum(NovaFinJournalVoucherLine.debit), 0),
            func.coalesce(func.sum(NovaFinJournalVoucherLine.credit), 0),
        )
        .join(NovaFinAccount, NovaFinAccount.id == NovaFinJournalVoucherLine.account_id)
        .join(NovaFinJournalVoucher, NovaFinJournalVoucher.id == NovaFinJournalVoucherLine.voucher_id)
        .where(*conditions)
        .group_by(NovaFinJournalVoucherLine.project_id, NovaFinAccount.account_type, NovaFinAccount.number)
    ).all()
    buckets: dict[uuid.UUID | None, dict[str, Decimal]] = {}
    for project_id, account_type, number, debit, credit in rows:
        bucket = buckets.setdefault(project_id, {"income": ZERO, "direct_cost": ZERO, "other_cost": ZERO})
        debit, credit = Decimal(debit), Decimal(credit)
        if account_type == "income":
            bucket["income"] += credit - debit
        elif number and number.startswith("5"):
            bucket["direct_cost"] += debit - credit
        else:
            bucket["other_cost"] += debit - credit
    projects = {p.id: p for p in db.scalars(select(NovaFinProject))}
    items = []
    for project_id, b in buckets.items():
        gross = b["income"] - b["direct_cost"]
        project = projects.get(project_id)
        items.append(
            {
                "project_id": str(project_id) if project_id else None,
                "code": project.code if project else None,
                "name": project.name if project else "Not assigned to a project",
                "income": b["income"],
                "direct_cost": b["direct_cost"],
                "gross_profit": gross,
                "margin_percent": (gross / b["income"] * 100).quantize(Decimal("0.1")) if b["income"] else None,
                "other_cost": b["other_cost"],
                "net": gross - b["other_cost"],
            }
        )
    items.sort(key=lambda r: r["income"], reverse=True)
    return {
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "items": items,
        "total_income": sum((i["income"] for i in items), ZERO),
        "total_net": sum((i["net"] for i in items), ZERO),
    }
