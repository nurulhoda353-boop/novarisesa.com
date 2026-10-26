"""Fixing posted documents the right way: credit notes, debit notes, replace-an-invoice, bad-debt write-off.

Nothing posted is ever edited or deleted. Each correction is a new, linked document that
changes the books the way the original mistake would have, in the opposite direction.
"""

import uuid
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.routes.cms import audit
from app.api.routes.novafin import _jsonable, _next_code, build_invoice, dims_for, serialize_invoice
from app.api.routes.novafin_sales import serialize_credit_note
from app.core.auth import require_permission
from app.core.database import get_db
from app.models import (
    NovaFinCreditNote,
    NovaFinCustomer,
    NovaFinDebitNote,
    NovaFinInvoice,
    NovaFinItem,
    NovaFinItemKind,
    NovaFinPurchase,
    NovaFinSalesReturn,
    NovaFinStockMove,
    NovaFinVendor,
    User,
)
from app.schemas.novafin import InvoiceCreate
from app.schemas.novafin_phase1 import WriteOffCreate
from app.schemas.novafin_sales import CreditNoteCreate, DebitNoteCreate, DocumentLineInput, InvoiceReplace
from app.services.novafin_ar import invoice_open_balance, purchase_open_balance, record_allocation
from app.services.novafin_ledger import post_journal

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]
NovaFinManager = Annotated[User, Depends(require_permission("novafin.manage"))]
NovaFinCloser = Annotated[User, Depends(require_permission("novafin.close_period"))]

CENT = Decimal("0.01")
ZERO = Decimal("0")


def _credited_so_far(db: Session, invoice: NovaFinInvoice) -> tuple[Decimal, Decimal]:
    """(net, vat) already taken off this invoice by credit notes and goods returns."""
    cn_net, cn_vat = db.execute(
        select(func.coalesce(func.sum(NovaFinCreditNote.subtotal), 0), func.coalesce(func.sum(NovaFinCreditNote.vat_amount), 0)).where(
            NovaFinCreditNote.invoice_id == invoice.id
        )
    ).one()
    sr_net, sr_vat = db.execute(
        select(func.coalesce(func.sum(NovaFinSalesReturn.subtotal), 0), func.coalesce(func.sum(NovaFinSalesReturn.vat_amount), 0)).where(
            NovaFinSalesReturn.invoice_id == invoice.id
        )
    ).one()
    return Decimal(cn_net) + Decimal(sr_net), Decimal(cn_vat) + Decimal(sr_vat)


def _posted_invoice(db: Session, invoice_id: uuid.UUID) -> NovaFinInvoice:
    invoice = db.scalar(
        select(NovaFinInvoice)
        .options(selectinload(NovaFinInvoice.lines), selectinload(NovaFinInvoice.customer))
        .where(NovaFinInvoice.id == invoice_id)
    )
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    status_value = invoice.status.value if hasattr(invoice.status, "value") else invoice.status
    if status_value != "posted":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only a posted invoice can be corrected.")
    return invoice


def _invoice_dims(db: Session, invoice: NovaFinInvoice):
    return dims_for(db, invoice.project_id, invoice.cost_center_id, invoice.branch_id, customer_id=invoice.customer_id)


def issue_credit_note(
    db: Session, invoice: NovaFinInvoice, *, note_date, net: Decimal | None, reason_code: str, reason: str | None
) -> NovaFinCreditNote:
    already_net, already_vat = _credited_so_far(db, invoice)
    remaining_net = invoice.subtotal - already_net
    if remaining_net <= CENT:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{invoice.code} has already been credited in full.")
    credit_net = remaining_net if net is None else net.quantize(CENT)
    if credit_net > remaining_net + CENT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Only {remaining_net:,.2f} (before VAT) of {invoice.code} is left to credit.",
        )
    if abs(credit_net - remaining_net) <= CENT:
        credit_net, vat = remaining_net, invoice.vat_amount - already_vat  # no rounding drift on a full credit
    else:
        vat = (credit_net * invoice.vat_rate / Decimal("100")).quantize(CENT)
    grand = credit_net + vat

    note = NovaFinCreditNote(
        code=_next_code(db, NovaFinCreditNote, "CN"),
        customer_id=invoice.customer_id,
        invoice_id=invoice.id,
        note_date=note_date,
        subtotal=credit_net,
        vat_rate=invoice.vat_rate,
        vat_amount=vat,
        amount=grand,
        reason=reason,
        reason_code=reason_code,
    )
    db.add(note)
    db.flush()
    # A credit note on a cash sale is refunded in cash; on a credit sale it reduces what the customer owes.
    refund_side = "cash" if invoice.mode == "cash" else "ar"
    post_journal(
        db,
        entry_date=note_date,
        narration=f"Credit note {note.code} against {invoice.code} — {invoice.customer.name if invoice.customer else ''}".strip(" —"),
        lines=[("sales_return", credit_net, ZERO), ("vout", vat, ZERO), (refund_side, ZERO, grand)],
        code_prefix="GL",
        dims=_invoice_dims(db, invoice),
    )
    if invoice.mode == "credit":
        record_allocation(
            db,
            source_type="credit_note",
            source_id=note.id,
            target_type="invoice",
            target_id=invoice.id,
            amount=min(invoice_open_balance(db, invoice), grand),
            on=note_date,
        )
    return note


@router.post("/credit-notes", status_code=status.HTTP_201_CREATED)
def create_credit_note(payload: CreditNoteCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    invoice = _posted_invoice(db, payload.invoice_id)
    note = issue_credit_note(
        db, invoice, note_date=payload.note_date, net=payload.amount or None, reason_code=payload.reason_code, reason=payload.reason
    )
    audit(
        db, request, user, "novafin.credit_note_created", "novafin_credit_notes", note.id,
        after=_jsonable({"code": note.code, "invoice": invoice.code, "amount": note.amount}),
    )
    db.commit()
    db.refresh(note)
    return serialize_credit_note(note)


# --- debit notes ---


def serialize_debit_note(dn: NovaFinDebitNote) -> dict[str, Any]:
    return {
        "id": str(dn.id),
        "code": dn.code,
        "customer_id": str(dn.customer_id),
        "customer_name": dn.customer.name if dn.customer else None,
        "invoice_id": str(dn.invoice_id) if dn.invoice_id else None,
        "note_date": dn.note_date.isoformat(),
        "subtotal": dn.subtotal,
        "vat_amount": dn.vat_amount,
        "amount": dn.grand_total,
        "reason": dn.reason,
    }


@router.get("/debit-notes")
def list_debit_notes(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinDebitNote).options(selectinload(NovaFinDebitNote.customer)).order_by(NovaFinDebitNote.note_date.desc())
    ).all()
    return {"items": [serialize_debit_note(r) for r in rows]}


@router.post("/debit-notes", status_code=status.HTTP_201_CREATED)
def create_debit_note(payload: DebitNoteCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    invoice = _posted_invoice(db, payload.invoice_id)
    net = payload.amount.quantize(CENT)
    vat = (net * invoice.vat_rate / Decimal("100")).quantize(CENT)
    note = NovaFinDebitNote(
        code=_next_code(db, NovaFinDebitNote, "DN"),
        customer_id=invoice.customer_id,
        invoice_id=invoice.id,
        note_date=payload.note_date,
        subtotal=net,
        vat_rate=invoice.vat_rate,
        vat_amount=vat,
        grand_total=net + vat,
        reason=payload.reason,
    )
    db.add(note)
    db.flush()
    post_journal(
        db,
        entry_date=payload.note_date,
        narration=f"Debit note {note.code} against {invoice.code}",
        lines=[("ar", net + vat, ZERO), ("sales", ZERO, net), ("vout", ZERO, vat)],
        code_prefix="GL",
        dims=_invoice_dims(db, invoice),
    )
    audit(db, request, user, "novafin.debit_note_created", "novafin_debit_notes", note.id, after=_jsonable({"code": note.code, "amount": note.grand_total}))
    db.commit()
    db.refresh(note)
    return serialize_debit_note(note)


# --- replace an invoice in one step ---


@router.post("/invoices/{invoice_id}/replace", status_code=status.HTTP_201_CREATED)
def replace_invoice(
    invoice_id: uuid.UUID, payload: InvoiceReplace, request: Request, user: NovaFinManager, db: DBSession
) -> dict[str, Any]:
    original = _posted_invoice(db, invoice_id)
    already_net, _vat = _credited_so_far(db, original)
    if already_net > CENT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{original.code} already has credit notes or returns. Credit the rest and issue a new invoice separately.",
        )
    if db.scalar(select(NovaFinInvoice.id).where(NovaFinInvoice.corrects_invoice_id == original.id)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{original.code} has already been replaced.")

    note = issue_credit_note(
        db, original, note_date=payload.invoice_date, net=None, reason_code=payload.reason_code, reason=payload.reason
    )
    # The goods go back on the shelf (and out of cost of sales); the new invoice takes them out again.
    stock_value = ZERO
    for line in original.lines:
        item = db.get(NovaFinItem, line.item_id)
        if item is not None and item.kind == NovaFinItemKind.PRODUCT:
            db.add(NovaFinStockMove(item_id=item.id, delta=line.quantity, move_date=payload.invoice_date, reference=note.code))
            stock_value += line.quantity * item.cost
    if stock_value:
        post_journal(
            db,
            entry_date=payload.invoice_date,
            narration=f"Stock restored — {note.code}",
            lines=[("inventory", stock_value, ZERO), ("cogs", ZERO, stock_value)],
            code_prefix="GL",
            dims=_invoice_dims(db, original),
        )
    new_invoice = build_invoice(
        db,
        InvoiceCreate(
            customer_id=original.customer_id,
            invoice_date=payload.invoice_date,
            mode=original.mode,
            status="posted",
            vat_rate=original.vat_rate,
            notes=payload.notes if payload.notes is not None else original.notes,
            project_id=original.project_id,
            cost_center_id=original.cost_center_id,
            branch_id=original.branch_id,
            lines=[DocumentLineInput(item_id=l.item_id, quantity=l.quantity, rate=l.rate) for l in payload.lines],
        ),
        corrects_invoice_id=original.id,
    )
    audit(
        db, request, user, "novafin.invoice_replaced", "novafin_invoices", original.id,
        after=_jsonable({"credit_note": note.code, "new_invoice": new_invoice.code}),
    )
    db.commit()
    db.refresh(note)
    db.refresh(new_invoice)
    return {"credit_note": serialize_credit_note(note), "invoice": serialize_invoice(new_invoice)}


# --- bad debt ---


@router.post("/invoices/{invoice_id}/write-off", status_code=status.HTTP_201_CREATED)
def write_off_invoice(
    invoice_id: uuid.UUID, payload: WriteOffCreate, request: Request, user: NovaFinCloser, db: DBSession
) -> dict[str, Any]:
    invoice = _posted_invoice(db, invoice_id)
    if invoice.mode != "credit":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only an unpaid credit invoice can be written off.")
    open_balance = invoice_open_balance(db, invoice)
    amount = payload.amount.quantize(CENT)
    if amount > open_balance + CENT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Only {open_balance:,.2f} of {invoice.code} is still unpaid."
        )
    voucher = post_journal(
        db,
        entry_date=payload.write_off_date,
        narration=f"Bad debt write-off — {invoice.code}: {payload.reason}",
        lines=[("bad_debt", amount, ZERO), ("ar", ZERO, amount)],
        code_prefix="GL",
        dims=_invoice_dims(db, invoice),
    )
    record_allocation(
        db, source_type="write_off", source_id=voucher.id, target_type="invoice", target_id=invoice.id, amount=amount, on=payload.write_off_date
    )
    audit(db, request, user, "novafin.invoice_written_off", "novafin_invoices", invoice.id, after=_jsonable({"amount": amount, "reason": payload.reason}))
    db.commit()
    return {"invoice_id": str(invoice.id), "written_off": amount, "voucher": voucher.code}


# --- what is still owed (for matching receipts and payments) ---


@router.get("/customers/{customer_id}/open-invoices")
def customer_open_invoices(customer_id: uuid.UUID, user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    if db.get(NovaFinCustomer, customer_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    rows = []
    for invoice in db.scalars(
        select(NovaFinInvoice).where(NovaFinInvoice.customer_id == customer_id, NovaFinInvoice.mode == "credit").order_by(NovaFinInvoice.invoice_date)
    ):
        if (invoice.status.value if hasattr(invoice.status, "value") else invoice.status) != "posted":
            continue
        open_balance = invoice_open_balance(db, invoice)
        if open_balance > CENT:
            rows.append(
                {
                    "id": str(invoice.id),
                    "code": invoice.code,
                    "invoice_date": invoice.invoice_date.isoformat(),
                    "grand_total": invoice.grand_total,
                    "open_balance": open_balance,
                }
            )
    return {"items": rows}


@router.get("/vendors/{vendor_id}/open-bills")
def vendor_open_bills(vendor_id: uuid.UUID, user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    if db.get(NovaFinVendor, vendor_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    rows = []
    for purchase in db.scalars(
        select(NovaFinPurchase).where(NovaFinPurchase.vendor_id == vendor_id, NovaFinPurchase.mode == "credit").order_by(NovaFinPurchase.purchase_date)
    ):
        open_balance = purchase_open_balance(db, purchase)
        if open_balance > CENT:
            rows.append(
                {
                    "id": str(purchase.id),
                    "code": purchase.code,
                    "invoice_date": purchase.purchase_date.isoformat(),
                    "grand_total": purchase.grand_total,
                    "open_balance": open_balance,
                }
            )
    return {"items": rows}
