import uuid
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.routes.cms import audit
from app.api.routes.novafin import _jsonable, _next_code
from app.core.auth import require_permission
from app.core.database import get_db
from app.models import (
    NovaFinCreditNote,
    NovaFinCustomer,
    NovaFinDelivery,
    NovaFinDeliveryLine,
    NovaFinInvoice,
    NovaFinItem,
    NovaFinItemKind,
    NovaFinOrder,
    NovaFinOrderLine,
    NovaFinQuote,
    NovaFinQuoteLine,
    NovaFinSalesReturn,
    NovaFinSalesReturnLine,
    NovaFinStockMove,
    User,
)
from app.schemas.novafin_sales import (
    CreditNoteCreate,
    DeliveryCreate,
    OrderCreate,
    QuoteCreate,
    SalesReturnCreate,
)
from app.services.novafin_ledger import post_journal

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]
NovaFinManager = Annotated[User, Depends(require_permission("novafin.manage"))]


def _line(item: NovaFinItem, quantity: Decimal, rate: Decimal | None = None) -> dict[str, Any]:
    return {
        "item_id": str(item.id),
        "name": item.name,
        "unit": item.unit,
        "quantity": quantity,
        "rate": rate,
        "amount": quantity * rate if rate is not None else None,
    }


def _load_items(db: Session, item_ids: list[uuid.UUID]) -> dict[uuid.UUID, NovaFinItem]:
    items = {item.id: item for item in db.scalars(select(NovaFinItem).where(NovaFinItem.id.in_(item_ids)))}
    missing = set(item_ids) - set(items)
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item(s) not found: {missing}")
    return items


# --- Quotes ---


def serialize_quote(quote: NovaFinQuote) -> dict[str, Any]:
    return {
        "id": str(quote.id),
        "code": quote.code,
        "customer_id": str(quote.customer_id),
        "customer_name": quote.customer.name if quote.customer else None,
        "quote_date": quote.quote_date.isoformat(),
        "vat_rate": quote.vat_rate,
        "subtotal": quote.subtotal,
        "vat_amount": quote.vat_amount,
        "grand_total": quote.grand_total,
        "status": quote.status,
        "lines": [_line(l.item, l.quantity, l.rate) for l in quote.lines],
    }


@router.get("/quotes")
def list_quotes(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinQuote)
        .options(selectinload(NovaFinQuote.lines).selectinload(NovaFinQuoteLine.item), selectinload(NovaFinQuote.customer))
        .order_by(NovaFinQuote.quote_date.desc(), NovaFinQuote.code.desc())
    ).all()
    return {"items": [serialize_quote(q) for q in rows]}


@router.post("/quotes", status_code=status.HTTP_201_CREATED)
def create_quote(payload: QuoteCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    customer = db.get(NovaFinCustomer, payload.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    items = _load_items(db, [l.item_id for l in payload.lines])

    subtotal = sum((l.quantity * l.rate for l in payload.lines), Decimal("0"))
    vat_amount = (subtotal * payload.vat_rate / Decimal("100")).quantize(Decimal("0.01"))
    quote = NovaFinQuote(
        code=_next_code(db, NovaFinQuote, "QTN"),
        customer_id=payload.customer_id,
        quote_date=payload.quote_date,
        vat_rate=payload.vat_rate,
        subtotal=subtotal,
        vat_amount=vat_amount,
        grand_total=subtotal + vat_amount,
    )
    db.add(quote)
    db.flush()
    for line in payload.lines:
        item = items[line.item_id]
        db.add(NovaFinQuoteLine(quote_id=quote.id, item_id=item.id, name_snapshot=item.name, unit=item.unit, quantity=line.quantity, rate=line.rate))

    audit(db, request, user, "novafin.quote_created", "novafin_quotes", quote.id, after={"code": quote.code})
    db.commit()
    db.refresh(quote)
    return serialize_quote(quote)


# --- Orders ---


def serialize_order(order: NovaFinOrder) -> dict[str, Any]:
    return {
        "id": str(order.id),
        "code": order.code,
        "customer_id": str(order.customer_id),
        "customer_name": order.customer.name if order.customer else None,
        "quote_id": str(order.quote_id) if order.quote_id else None,
        "order_date": order.order_date.isoformat(),
        "vat_rate": order.vat_rate,
        "subtotal": order.subtotal,
        "vat_amount": order.vat_amount,
        "grand_total": order.grand_total,
        "status": order.status,
        "lines": [_line(l.item, l.quantity, l.rate) for l in order.lines],
    }


@router.get("/orders")
def list_orders(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinOrder)
        .options(selectinload(NovaFinOrder.lines).selectinload(NovaFinOrderLine.item), selectinload(NovaFinOrder.customer))
        .order_by(NovaFinOrder.order_date.desc(), NovaFinOrder.code.desc())
    ).all()
    return {"items": [serialize_order(o) for o in rows]}


@router.post("/orders", status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    customer = db.get(NovaFinCustomer, payload.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    items = _load_items(db, [l.item_id for l in payload.lines])

    subtotal = sum((l.quantity * l.rate for l in payload.lines), Decimal("0"))
    vat_amount = (subtotal * payload.vat_rate / Decimal("100")).quantize(Decimal("0.01"))
    order = NovaFinOrder(
        code=_next_code(db, NovaFinOrder, "ORD"),
        customer_id=payload.customer_id,
        quote_id=payload.quote_id,
        order_date=payload.order_date,
        vat_rate=payload.vat_rate,
        subtotal=subtotal,
        vat_amount=vat_amount,
        grand_total=subtotal + vat_amount,
    )
    db.add(order)
    db.flush()
    for line in payload.lines:
        item = items[line.item_id]
        db.add(NovaFinOrderLine(order_id=order.id, item_id=item.id, name_snapshot=item.name, unit=item.unit, quantity=line.quantity, rate=line.rate))

    audit(db, request, user, "novafin.order_created", "novafin_orders", order.id, after={"code": order.code})
    db.commit()
    db.refresh(order)
    return serialize_order(order)


# --- Deliveries ---


def serialize_delivery(delivery: NovaFinDelivery) -> dict[str, Any]:
    return {
        "id": str(delivery.id),
        "code": delivery.code,
        "customer_id": str(delivery.customer_id),
        "customer_name": delivery.customer.name if delivery.customer else None,
        "order_id": str(delivery.order_id) if delivery.order_id else None,
        "delivery_date": delivery.delivery_date.isoformat(),
        "lines": [_line(l.item, l.quantity) for l in delivery.lines],
    }


@router.get("/deliveries")
def list_deliveries(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinDelivery)
        .options(selectinload(NovaFinDelivery.lines).selectinload(NovaFinDeliveryLine.item), selectinload(NovaFinDelivery.customer))
        .order_by(NovaFinDelivery.delivery_date.desc(), NovaFinDelivery.code.desc())
    ).all()
    return {"items": [serialize_delivery(d) for d in rows]}


@router.post("/deliveries", status_code=status.HTTP_201_CREATED)
def create_delivery(payload: DeliveryCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    customer = db.get(NovaFinCustomer, payload.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    items = _load_items(db, [l.item_id for l in payload.lines])

    delivery = NovaFinDelivery(
        code=_next_code(db, NovaFinDelivery, "DEL"),
        customer_id=payload.customer_id,
        order_id=payload.order_id,
        delivery_date=payload.delivery_date,
    )
    db.add(delivery)
    db.flush()
    for line in payload.lines:
        item = items[line.item_id]
        db.add(NovaFinDeliveryLine(delivery_id=delivery.id, item_id=item.id, name_snapshot=item.name, unit=item.unit, quantity=line.quantity))
        if item.kind == NovaFinItemKind.PRODUCT:
            db.add(NovaFinStockMove(item_id=item.id, delta=-line.quantity, move_date=payload.delivery_date, reference=delivery.code))

    audit(db, request, user, "novafin.delivery_created", "novafin_deliveries", delivery.id, after={"code": delivery.code})
    db.commit()
    db.refresh(delivery)
    return serialize_delivery(delivery)


# --- Sales returns ---


def serialize_sales_return(sr: NovaFinSalesReturn) -> dict[str, Any]:
    return {
        "id": str(sr.id),
        "code": sr.code,
        "customer_id": str(sr.customer_id),
        "customer_name": sr.customer.name if sr.customer else None,
        "invoice_id": str(sr.invoice_id) if sr.invoice_id else None,
        "return_date": sr.return_date.isoformat(),
        "subtotal": sr.subtotal,
        "vat_amount": sr.vat_amount,
        "grand_total": sr.grand_total,
        "lines": [_line(l.item, l.quantity, l.rate) for l in sr.lines],
    }


@router.get("/sales-returns")
def list_sales_returns(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinSalesReturn)
        .options(selectinload(NovaFinSalesReturn.lines).selectinload(NovaFinSalesReturnLine.item), selectinload(NovaFinSalesReturn.customer))
        .order_by(NovaFinSalesReturn.return_date.desc(), NovaFinSalesReturn.code.desc())
    ).all()
    return {"items": [serialize_sales_return(sr) for sr in rows]}


@router.post("/sales-returns", status_code=status.HTTP_201_CREATED)
def create_sales_return(payload: SalesReturnCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    customer = db.get(NovaFinCustomer, payload.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    original_invoice = db.get(NovaFinInvoice, payload.invoice_id) if payload.invoice_id else None
    if payload.invoice_id and original_invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    items = _load_items(db, [l.item_id for l in payload.lines])

    subtotal = sum((l.quantity * l.rate for l in payload.lines), Decimal("0"))
    vat_amount = (subtotal * payload.vat_rate / Decimal("100")).quantize(Decimal("0.01"))
    sr = NovaFinSalesReturn(
        code=_next_code(db, NovaFinSalesReturn, "SRT"),
        customer_id=payload.customer_id,
        invoice_id=payload.invoice_id,
        return_date=payload.return_date,
        vat_rate=payload.vat_rate,
        subtotal=subtotal,
        vat_amount=vat_amount,
        grand_total=subtotal + vat_amount,
    )
    db.add(sr)
    db.flush()
    cost_of_goods_reversed = Decimal("0")
    for line in payload.lines:
        item = items[line.item_id]
        db.add(NovaFinSalesReturnLine(sales_return_id=sr.id, item_id=item.id, name_snapshot=item.name, unit=item.unit, quantity=line.quantity, rate=line.rate))
        if item.kind == NovaFinItemKind.PRODUCT:
            db.add(NovaFinStockMove(item_id=item.id, delta=line.quantity, move_date=payload.return_date, reference=sr.code))
            cost_of_goods_reversed += line.quantity * item.cost

    cash_or_ar = "cash" if (original_invoice and original_invoice.mode == "cash") else "ar"
    post_journal(
        db,
        entry_date=payload.return_date,
        narration=f"Sales return — {customer.name} ({sr.code})",
        lines=[
            ("sales_return", sr.subtotal, Decimal("0")),
            ("vout", sr.vat_amount, Decimal("0")),
            (cash_or_ar, Decimal("0"), sr.grand_total),
        ],
        code_prefix="GL",
    )
    if cost_of_goods_reversed:
        post_journal(
            db,
            entry_date=payload.return_date,
            narration=f"Stock restored — {sr.code}",
            lines=[("inventory", cost_of_goods_reversed, Decimal("0")), ("cogs", Decimal("0"), cost_of_goods_reversed)],
            code_prefix="GL",
        )

    audit(db, request, user, "novafin.sales_return_created", "novafin_sales_returns", sr.id, after={"code": sr.code})
    db.commit()
    db.refresh(sr)
    return serialize_sales_return(sr)


# --- Credit notes ---


def serialize_credit_note(cn: NovaFinCreditNote) -> dict[str, Any]:
    return {
        "id": str(cn.id),
        "code": cn.code,
        "customer_id": str(cn.customer_id),
        "customer_name": cn.customer.name if cn.customer else None,
        "note_date": cn.note_date.isoformat(),
        "amount": cn.amount,
        "reason": cn.reason,
    }


@router.get("/credit-notes")
def list_credit_notes(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinCreditNote)
        .options(selectinload(NovaFinCreditNote.customer))
        .order_by(NovaFinCreditNote.note_date.desc(), NovaFinCreditNote.code.desc())
    ).all()
    return {"items": [serialize_credit_note(cn) for cn in rows]}


@router.post("/credit-notes", status_code=status.HTTP_201_CREATED)
def create_credit_note(payload: CreditNoteCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    customer = db.get(NovaFinCustomer, payload.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    cn = NovaFinCreditNote(
        code=_next_code(db, NovaFinCreditNote, "CN"),
        customer_id=payload.customer_id,
        note_date=payload.note_date,
        amount=payload.amount,
        reason=payload.reason,
    )
    db.add(cn)
    db.flush()
    post_journal(
        db,
        entry_date=payload.note_date,
        narration=f"Credit note — {customer.name} ({cn.code})",
        lines=[("credit_note", cn.amount, Decimal("0")), ("ar", Decimal("0"), cn.amount)],
        code_prefix="GL",
    )
    audit(db, request, user, "novafin.credit_note_created", "novafin_credit_notes", cn.id, after=_jsonable({"code": cn.code, "amount": cn.amount}))
    db.commit()
    db.refresh(cn)
    return serialize_credit_note(cn)
