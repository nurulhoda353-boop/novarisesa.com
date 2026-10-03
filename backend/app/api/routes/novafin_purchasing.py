from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.routes.cms import audit
from app.api.routes.novafin import _next_code
from app.api.routes.novafin_sales import _line, _load_items
from app.core.auth import require_permission
from app.core.database import get_db
from app.models import (
    NovaFinItemKind,
    NovaFinPurchase,
    NovaFinPurchaseOrder,
    NovaFinPurchaseOrderLine,
    NovaFinPurchaseReturn,
    NovaFinPurchaseReturnLine,
    NovaFinRfq,
    NovaFinRfqLine,
    NovaFinStockMove,
    NovaFinVendor,
    User,
)
from app.schemas.novafin_purchasing import PurchaseOrderCreate, PurchaseReturnCreate, RfqCreate
from app.services.novafin_ledger import post_journal

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]
NovaFinManager = Annotated[User, Depends(require_permission("novafin.manage"))]


# --- RFQ ---


def serialize_rfq(rfq: NovaFinRfq) -> dict[str, Any]:
    return {
        "id": str(rfq.id),
        "code": rfq.code,
        "rfq_date": rfq.rfq_date.isoformat(),
        "deadline": rfq.deadline.isoformat() if rfq.deadline else None,
        "vendor_names": rfq.vendor_names,
        "lines": [
            {"item_id": str(l.item_id), "name": l.name_snapshot, "unit": l.unit, "quantity": l.quantity, "max_price": l.max_price}
            for l in rfq.lines
        ],
    }


@router.get("/rfqs")
def list_rfqs(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinRfq).options(selectinload(NovaFinRfq.lines)).order_by(NovaFinRfq.rfq_date.desc(), NovaFinRfq.code.desc())
    ).all()
    return {"items": [serialize_rfq(r) for r in rows]}


@router.post("/rfqs", status_code=status.HTTP_201_CREATED)
def create_rfq(payload: RfqCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    items = _load_items(db, [l.item_id for l in payload.lines])
    rfq = NovaFinRfq(
        code=_next_code(db, NovaFinRfq, "RFQ"),
        rfq_date=payload.rfq_date,
        deadline=payload.deadline,
        vendor_names=payload.vendor_names,
    )
    db.add(rfq)
    db.flush()
    for line in payload.lines:
        item = items[line.item_id]
        db.add(NovaFinRfqLine(rfq_id=rfq.id, item_id=item.id, name_snapshot=item.name, unit=item.unit, quantity=line.quantity, max_price=line.max_price))

    audit(db, request, user, "novafin.rfq_created", "novafin_rfqs", rfq.id, after={"code": rfq.code})
    db.commit()
    db.refresh(rfq)
    return serialize_rfq(rfq)


# --- Purchase orders ---


def serialize_purchase_order(po: NovaFinPurchaseOrder) -> dict[str, Any]:
    return {
        "id": str(po.id),
        "code": po.code,
        "vendor_id": str(po.vendor_id),
        "vendor_name": po.vendor.name if po.vendor else None,
        "order_date": po.order_date.isoformat(),
        "vat_rate": po.vat_rate,
        "subtotal": po.subtotal,
        "vat_amount": po.vat_amount,
        "grand_total": po.grand_total,
        "status": po.status,
        "lines": [_line(l.item, l.quantity, l.rate) for l in po.lines],
    }


@router.get("/purchase-orders")
def list_purchase_orders(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinPurchaseOrder)
        .options(selectinload(NovaFinPurchaseOrder.lines).selectinload(NovaFinPurchaseOrderLine.item), selectinload(NovaFinPurchaseOrder.vendor))
        .order_by(NovaFinPurchaseOrder.order_date.desc(), NovaFinPurchaseOrder.code.desc())
    ).all()
    return {"items": [serialize_purchase_order(po) for po in rows]}


@router.post("/purchase-orders", status_code=status.HTTP_201_CREATED)
def create_purchase_order(payload: PurchaseOrderCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    vendor = db.get(NovaFinVendor, payload.vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    items = _load_items(db, [l.item_id for l in payload.lines])

    subtotal = sum((l.quantity * l.rate for l in payload.lines), Decimal("0"))
    vat_amount = (subtotal * payload.vat_rate / Decimal("100")).quantize(Decimal("0.01"))
    po = NovaFinPurchaseOrder(
        code=_next_code(db, NovaFinPurchaseOrder, "PO"),
        vendor_id=payload.vendor_id,
        order_date=payload.order_date,
        vat_rate=payload.vat_rate,
        subtotal=subtotal,
        vat_amount=vat_amount,
        grand_total=subtotal + vat_amount,
    )
    db.add(po)
    db.flush()
    for line in payload.lines:
        item = items[line.item_id]
        db.add(NovaFinPurchaseOrderLine(purchase_order_id=po.id, item_id=item.id, name_snapshot=item.name, unit=item.unit, quantity=line.quantity, rate=line.rate))

    audit(db, request, user, "novafin.purchase_order_created", "novafin_purchase_orders", po.id, after={"code": po.code})
    db.commit()
    db.refresh(po)
    return serialize_purchase_order(po)


# --- Purchase returns ---


def serialize_purchase_return(pr: NovaFinPurchaseReturn) -> dict[str, Any]:
    return {
        "id": str(pr.id),
        "code": pr.code,
        "vendor_id": str(pr.vendor_id),
        "vendor_name": pr.vendor.name if pr.vendor else None,
        "purchase_id": str(pr.purchase_id) if pr.purchase_id else None,
        "return_date": pr.return_date.isoformat(),
        "subtotal": pr.subtotal,
        "vat_amount": pr.vat_amount,
        "grand_total": pr.grand_total,
        "lines": [_line(l.item, l.quantity, l.rate) for l in pr.lines],
    }


@router.get("/purchase-returns")
def list_purchase_returns(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinPurchaseReturn)
        .options(selectinload(NovaFinPurchaseReturn.lines).selectinload(NovaFinPurchaseReturnLine.item), selectinload(NovaFinPurchaseReturn.vendor))
        .order_by(NovaFinPurchaseReturn.return_date.desc(), NovaFinPurchaseReturn.code.desc())
    ).all()
    return {"items": [serialize_purchase_return(pr) for pr in rows]}


@router.post("/purchase-returns", status_code=status.HTTP_201_CREATED)
def create_purchase_return(payload: PurchaseReturnCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    vendor = db.get(NovaFinVendor, payload.vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    original_purchase = db.get(NovaFinPurchase, payload.purchase_id) if payload.purchase_id else None
    if payload.purchase_id and original_purchase is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
    items = _load_items(db, [l.item_id for l in payload.lines])

    subtotal = sum((l.quantity * l.rate for l in payload.lines), Decimal("0"))
    vat_amount = (subtotal * payload.vat_rate / Decimal("100")).quantize(Decimal("0.01"))
    pr = NovaFinPurchaseReturn(
        code=_next_code(db, NovaFinPurchaseReturn, "PRT"),
        vendor_id=payload.vendor_id,
        purchase_id=payload.purchase_id,
        return_date=payload.return_date,
        vat_rate=payload.vat_rate,
        subtotal=subtotal,
        vat_amount=vat_amount,
        grand_total=subtotal + vat_amount,
    )
    db.add(pr)
    db.flush()
    product_subtotal = Decimal("0")
    for line in payload.lines:
        item = items[line.item_id]
        db.add(NovaFinPurchaseReturnLine(purchase_return_id=pr.id, item_id=item.id, name_snapshot=item.name, unit=item.unit, quantity=line.quantity, rate=line.rate))
        if item.kind == NovaFinItemKind.PRODUCT:
            db.add(NovaFinStockMove(item_id=item.id, delta=-line.quantity, move_date=payload.return_date, reference=pr.code))
            product_subtotal += line.quantity * line.rate

    cash_or_ap = "cash" if (original_purchase and original_purchase.mode == "cash") else "ap"
    post_journal(
        db,
        entry_date=payload.return_date,
        narration=f"Purchase return — {vendor.name} ({pr.code})",
        lines=[
            (cash_or_ap, pr.grand_total, Decimal("0")),
            ("inventory", Decimal("0"), product_subtotal),
            ("vin", Decimal("0"), pr.vat_amount),
        ],
        code_prefix="GL",
    )

    audit(db, request, user, "novafin.purchase_return_created", "novafin_purchase_returns", pr.id, after={"code": pr.code})
    db.commit()
    db.refresh(pr)
    return serialize_purchase_return(pr)
