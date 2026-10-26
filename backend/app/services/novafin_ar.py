"""Receivables / payables sub-ledger: who owes what, which payment settled which invoice.

Everything here is computed from the documents themselves (invoices, notes, receipts,
allocations) rather than from ledger tags, so it also covers records posted before the
tags existed. `ar_control_check` compares the two views and reports any difference.
"""

import uuid
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    NovaFinAllocation,
    NovaFinCashMove,
    NovaFinCreditNote,
    NovaFinCustomer,
    NovaFinDebitNote,
    NovaFinInvoice,
    NovaFinPurchase,
    NovaFinPurchaseReturn,
    NovaFinSalesReturn,
    NovaFinVendor,
)

ZERO = Decimal("0")
CENT = Decimal("0.01")


def _sum(db: Session, column, *conditions) -> Decimal:
    return Decimal(db.scalar(select(func.coalesce(func.sum(column), 0)).where(*conditions)) or 0)


def allocated_to(db: Session, target_type: str, target_id: uuid.UUID) -> Decimal:
    return _sum(
        db,
        NovaFinAllocation.amount,
        NovaFinAllocation.target_type == target_type,
        NovaFinAllocation.target_id == target_id,
    )


def allocated_from(db: Session, source_type: str, source_id: uuid.UUID) -> Decimal:
    return _sum(
        db,
        NovaFinAllocation.amount,
        NovaFinAllocation.source_type == source_type,
        NovaFinAllocation.source_id == source_id,
    )


def invoice_open_balance(db: Session, invoice: NovaFinInvoice) -> Decimal:
    """What a credit-mode invoice still owes after the receipts and notes explicitly matched to it."""
    if invoice.mode != "credit":
        return ZERO
    return max(invoice.grand_total - allocated_to(db, "invoice", invoice.id), ZERO)


def purchase_open_balance(db: Session, purchase: NovaFinPurchase) -> Decimal:
    if purchase.mode != "credit":
        return ZERO
    return max(purchase.grand_total - allocated_to(db, "purchase", purchase.id), ZERO)


def record_allocation(
    db: Session,
    *,
    source_type: str,
    source_id: uuid.UUID,
    target_type: str,
    target_id: uuid.UUID,
    amount: Decimal,
    on: date,
) -> None:
    if amount > 0:
        db.add(
            NovaFinAllocation(
                source_type=source_type, source_id=source_id, target_type=target_type, target_id=target_id, amount=amount, alloc_date=on
            )
        )


def apply_allocations(
    db: Session,
    *,
    kind: str,  # "receipt" (customer) | "payment" (vendor)
    source_id: uuid.UUID,
    party_id: uuid.UUID,
    available: Decimal,
    items: list[tuple[uuid.UUID, Decimal]],
    on: date,
) -> Decimal:
    """Match a receipt/payment to specific invoices/bills. Returns the part left unmatched (an advance)."""
    if not items:
        return available
    total = sum((amount for _doc, amount in items), ZERO)
    if total > available + CENT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"The amounts matched to invoices ({total}) are more than the payment itself ({available}).",
        )
    for doc_id, amount in items:
        if kind == "receipt":
            doc = db.get(NovaFinInvoice, doc_id)
            if doc is None or doc.customer_id != party_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="An invoice you matched does not belong to this customer.")
            open_balance, target = invoice_open_balance(db, doc), "invoice"
        else:
            doc = db.get(NovaFinPurchase, doc_id)
            if doc is None or doc.vendor_id != party_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="A bill you matched does not belong to this vendor.")
            open_balance, target = purchase_open_balance(db, doc), "purchase"
        if amount > open_balance + CENT:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{doc.code} only has {open_balance} left to pay, but {amount} was matched to it.",
            )
        record_allocation(db, source_type=kind, source_id=source_id, target_type=target, target_id=doc.id, amount=amount, on=on)
    return available - total


# --- statements -------------------------------------------------------------------------


@dataclass
class StatementLine:
    date: date
    kind: str
    code: str
    description: str
    debit: Decimal
    credit: Decimal
    balance: Decimal = ZERO
    reference_id: uuid.UUID | None = None


def _finish(lines: list[StatementLine], opening_sign: Decimal = ZERO) -> list[StatementLine]:
    lines.sort(key=lambda row: (row.date, 0 if row.kind == "opening" else 1, row.code))
    running = ZERO
    for row in lines:
        running += row.debit - row.credit
        row.balance = running
    return lines


def _receipt_description(db: Session, move: NovaFinCashMove, code_by_id: dict[uuid.UUID, str]) -> str:
    matched = db.execute(
        select(NovaFinAllocation.target_id, NovaFinAllocation.amount).where(
            NovaFinAllocation.source_type == "receipt", NovaFinAllocation.source_id == move.id
        )
    ).all()
    if not matched:
        return "Receipt (not matched to an invoice)"
    return "Receipt against " + ", ".join(f"{code_by_id.get(target, '?')} ({amount:,.2f})" for target, amount in matched)


def customer_statement(db: Session, customer: NovaFinCustomer) -> list[StatementLine]:
    lines: list[StatementLine] = []
    if customer.opening_balance:
        lines.append(
            StatementLine(customer.created_at.date(), "opening", "OPENING", "Opening balance", Decimal(customer.opening_balance), ZERO)
        )
    invoices = db.scalars(select(NovaFinInvoice).where(NovaFinInvoice.customer_id == customer.id, NovaFinInvoice.mode == "credit")).all()
    code_by_id = {inv.id: inv.code for inv in invoices}
    for inv in invoices:
        if str(inv.status.value if hasattr(inv.status, "value") else inv.status) == "draft":
            continue
        lines.append(StatementLine(inv.invoice_date, "invoice", inv.code, "Invoice", inv.grand_total, ZERO, inv.id))
    for dn in db.scalars(select(NovaFinDebitNote).where(NovaFinDebitNote.customer_id == customer.id)):
        lines.append(StatementLine(dn.note_date, "debit_note", dn.code, dn.reason or "Debit note", dn.grand_total, ZERO, dn.id))
    for move in db.scalars(select(NovaFinCashMove).where(NovaFinCashMove.customer_id == customer.id, NovaFinCashMove.kind == "receipt")):
        lines.append(StatementLine(move.move_date, "receipt", move.code, _receipt_description(db, move, code_by_id), ZERO, move.amount, move.id))
    for cn in db.scalars(select(NovaFinCreditNote).where(NovaFinCreditNote.customer_id == customer.id)):
        # A credit note on a cash-sale invoice was refunded in cash and never touched the customer's account.
        if cn.invoice_id is not None:
            inv = db.get(NovaFinInvoice, cn.invoice_id)
            if inv is not None and inv.mode != "credit":
                continue
        lines.append(StatementLine(cn.note_date, "credit_note", cn.code, cn.reason or "Credit note", ZERO, cn.amount, cn.id))
    for sr in db.scalars(select(NovaFinSalesReturn).where(NovaFinSalesReturn.customer_id == customer.id)):
        if sr.invoice_id is not None:
            inv = db.get(NovaFinInvoice, sr.invoice_id)
            if inv is not None and inv.mode != "credit":
                continue
        lines.append(StatementLine(sr.return_date, "sales_return", sr.code, "Goods returned", ZERO, sr.grand_total, sr.id))
    for wo in db.execute(
        select(NovaFinAllocation).where(NovaFinAllocation.source_type == "write_off", NovaFinAllocation.target_type == "invoice")
    ).scalars():
        inv = db.get(NovaFinInvoice, wo.target_id)
        if inv is not None and inv.customer_id == customer.id:
            lines.append(StatementLine(wo.alloc_date, "write_off", f"WO-{inv.code}", "Written off as bad debt", ZERO, wo.amount, wo.id))
    return _finish(lines)


def vendor_statement(db: Session, vendor: NovaFinVendor) -> list[StatementLine]:
    lines: list[StatementLine] = []
    if vendor.opening_balance:
        lines.append(StatementLine(vendor.created_at.date(), "opening", "OPENING", "Opening balance", ZERO, Decimal(vendor.opening_balance)))
    purchases = db.scalars(select(NovaFinPurchase).where(NovaFinPurchase.vendor_id == vendor.id, NovaFinPurchase.mode == "credit")).all()
    code_by_id = {p.id: p.code for p in purchases}
    for p in purchases:
        lines.append(StatementLine(p.purchase_date, "purchase", p.code, "Bill", ZERO, p.grand_total, p.id))
    for move in db.scalars(select(NovaFinCashMove).where(NovaFinCashMove.vendor_id == vendor.id, NovaFinCashMove.kind == "payment")):
        matched = db.execute(
            select(NovaFinAllocation.target_id, NovaFinAllocation.amount).where(
                NovaFinAllocation.source_type == "payment", NovaFinAllocation.source_id == move.id
            )
        ).all()
        description = (
            "Payment against " + ", ".join(f"{code_by_id.get(t, '?')} ({a:,.2f})" for t, a in matched)
            if matched
            else "Payment (not matched to a bill)"
        )
        lines.append(StatementLine(move.move_date, "payment", move.code, description, move.amount, ZERO, move.id))
    for pr in db.scalars(select(NovaFinPurchaseReturn).where(NovaFinPurchaseReturn.vendor_id == vendor.id)):
        if pr.purchase_id is not None:
            purchase = db.get(NovaFinPurchase, pr.purchase_id)
            if purchase is not None and purchase.mode != "credit":
                continue
        lines.append(StatementLine(pr.return_date, "purchase_return", pr.code, "Goods returned to vendor", pr.grand_total, ZERO, pr.id))
    return _finish(lines)


# --- aging ------------------------------------------------------------------------------


def _bucket(days: int) -> str:
    if days <= 30:
        return "b0_30"
    if days <= 60:
        return "b31_60"
    if days <= 90:
        return "b61_90"
    return "b90_plus"


def _age(docs: list[tuple[date, Decimal]], pool: Decimal, today: date) -> dict[str, Decimal]:
    """Whatever is unmatched (`pool`) settles the oldest documents first; the rest is aged by its own date."""
    buckets = {"b0_30": ZERO, "b31_60": ZERO, "b61_90": ZERO, "b90_plus": ZERO}
    for doc_date, amount in sorted(docs, key=lambda d: d[0]):
        remaining = amount
        if pool > 0:
            offset = min(pool, remaining)
            remaining -= offset
            pool -= offset
        if remaining > Decimal("0.005"):
            buckets[_bucket((today - doc_date).days)] += remaining
    return buckets


def customer_aging(db: Session, today: date) -> list[dict]:
    results = []
    for customer in db.scalars(select(NovaFinCustomer)):
        docs: list[tuple[date, Decimal]] = []
        if customer.opening_balance:
            docs.append((customer.created_at.date(), Decimal(customer.opening_balance)))
        explicit_in = ZERO
        for inv in db.scalars(select(NovaFinInvoice).where(NovaFinInvoice.customer_id == customer.id, NovaFinInvoice.mode == "credit")):
            if str(inv.status.value if hasattr(inv.status, "value") else inv.status) == "draft":
                continue
            matched = allocated_to(db, "invoice", inv.id)
            explicit_in += min(matched, inv.grand_total)
            docs.append((inv.invoice_date, max(inv.grand_total - matched, ZERO)))
        for dn in db.scalars(select(NovaFinDebitNote).where(NovaFinDebitNote.customer_id == customer.id)):
            docs.append((dn.note_date, dn.grand_total))
        if not docs:
            continue
        # credit that is not matched to any particular invoice: legacy receipts, notes without a link, advances
        credit_total = _sum(db, NovaFinCashMove.amount, NovaFinCashMove.customer_id == customer.id, NovaFinCashMove.kind == "receipt")
        cash_invoice_ids = select(NovaFinInvoice.id).where(NovaFinInvoice.mode != "credit")
        credit_total += _sum(
            db,
            NovaFinCreditNote.amount,
            NovaFinCreditNote.customer_id == customer.id,
            NovaFinCreditNote.invoice_id.is_(None) | NovaFinCreditNote.invoice_id.not_in(cash_invoice_ids),
        )
        credit_total += _sum(
            db,
            NovaFinSalesReturn.grand_total,
            NovaFinSalesReturn.customer_id == customer.id,
            NovaFinSalesReturn.invoice_id.is_(None) | NovaFinSalesReturn.invoice_id.not_in(cash_invoice_ids),
        )
        customer_invoice_ids = list(db.scalars(select(NovaFinInvoice.id).where(NovaFinInvoice.customer_id == customer.id)))
        matched_total = ZERO
        for invoice_id in customer_invoice_ids:
            matched_total += allocated_to(db, "invoice", invoice_id)
        if customer_invoice_ids:
            credit_total += _sum(
                db,
                NovaFinAllocation.amount,
                NovaFinAllocation.source_type == "write_off",
                NovaFinAllocation.target_id.in_(customer_invoice_ids),
            )
        pool = max(credit_total - matched_total, ZERO)
        buckets = _age(docs, pool, today)
        total = sum(buckets.values(), ZERO)
        if total > Decimal("0.005"):
            results.append({"customer_id": str(customer.id), "customer_name": customer.name, **buckets, "total": total})
    results.sort(key=lambda r: r["total"], reverse=True)
    return results


def ar_control_check(db: Session) -> dict:
    """Sum of every customer's statement balance against the receivables account in the ledger."""
    from app.services.novafin_ledger import account_balance

    total = ZERO
    for customer in db.scalars(select(NovaFinCustomer)):
        statement = customer_statement(db, customer)
        total += statement[-1].balance if statement else ZERO
    ledger = account_balance(db, "ar")
    return {"customers_total": total, "ledger_total": ledger, "difference": ledger - total}
