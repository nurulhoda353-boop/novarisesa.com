import re
import uuid
from datetime import date as date_type
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.routes.cms import audit
from app.core.auth import require_permission
from app.core.database import get_db
from app.models import (
    NovaFinBank,
    NovaFinBranch,
    NovaFinCostCenter,
    NovaFinProject,
    NovaFinCashMove,
    NovaFinCreditNote,
    NovaFinCustomer,
    NovaFinCompanyProfile,
    NovaFinInvoice,
    NovaFinInvoiceLine,
    NovaFinItem,
    NovaFinItemKind,
    NovaFinPurchase,
    NovaFinPurchaseLine,
    NovaFinSalesReturn,
    NovaFinStockMove,
    NovaFinVendor,
    User,
)
from app.schemas.novafin import (
    CompanyProfileUpsert,
    CustomerUpsert,
    InvoiceCreate,
    ItemUpsert,
    PurchaseCreate,
    VendorUpsert,
)
from app.services.novafin_ledger import Dims, account_balance, post_journal
from app.services.novafin_sequences import next_code
from app.services.novafin_vat import effective_rate

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]
NovaFinManager = Annotated[User, Depends(require_permission("novafin.manage"))]


def _jsonable(value: Any) -> Any:
    """Audit before/after payloads land in a JSONB column via plain json.dumps,
    which chokes on Decimal (unlike FastAPI's response encoder), so stringify it."""
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    return value


def _next_code(db: Session, model: type, prefix: str) -> str:
    return next_code(db, model, prefix)


def dims_for(
    db: Session,
    project_id: uuid.UUID | None = None,
    cost_center_id: uuid.UUID | None = None,
    branch_id: uuid.UUID | None = None,
    *,
    customer_id: uuid.UUID | None = None,
    vendor_id: uuid.UUID | None = None,
) -> Dims:
    """Checks that the chosen project / cost center / branch really exist, then bundles them with the party."""
    for model, value, label in (
        (NovaFinProject, project_id, "Project"),
        (NovaFinCostCenter, cost_center_id, "Cost center"),
        (NovaFinBranch, branch_id, "Branch"),
    ):
        if value is not None and db.get(model, value) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found")
    return Dims(
        customer_id=customer_id, vendor_id=vendor_id, project_id=project_id, cost_center_id=cost_center_id, branch_id=branch_id
    )


_SAUDI_VAT = re.compile(r"^3\d{13}3$")


def validate_party_vat(db: Session, model: type, vat_number: str | None, *, current_id: uuid.UUID | None = None) -> str | None:
    """A Saudi VAT number is 15 digits, starts and ends with 3, and belongs to one party only."""
    vat = (vat_number or "").strip().replace(" ", "")
    if not vat:
        return None
    if not _SAUDI_VAT.match(vat):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="VAT number must be 15 digits, starting and ending with 3 (for example 300930779500003).",
        )
    clash = db.scalar(select(model).where(model.vat_number == vat, model.id != current_id if current_id else True))
    if clash is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This VAT number is already saved for “{clash.name}”.",
        )
    return vat


def delete_or_explain(db: Session, row: object, what: str) -> None:
    """Delete a master record, or say plainly why it can't be (it already has transactions)."""
    try:
        db.delete(row)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This {what} already has transactions and can't be deleted. Mark it inactive instead.",
        ) from None


def serialize_item(item: NovaFinItem) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "name": item.name,
        "kind": item.kind.value if hasattr(item.kind, "value") else item.kind,
        "unit": item.unit,
        "cost": item.cost,
        "price": item.price,
        "opening_qty": item.opening_qty,
        "min_level": item.min_level,
        "is_active": item.is_active,
    }


def serialize_customer(customer: NovaFinCustomer) -> dict[str, Any]:
    return {
        "id": str(customer.id),
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "city": customer.city,
        "vat_number": customer.vat_number,
        "credit_limit": customer.credit_limit,
        "opening_balance": customer.opening_balance,
        "is_active": customer.is_active,
        "name_ar": customer.name_ar,
        "cr_number": customer.cr_number,
        "street": customer.street,
        "building_no": customer.building_no,
        "district": customer.district,
        "postal_code": customer.postal_code,
        "country": customer.country,
        "payment_terms_days": customer.payment_terms_days,
    }


def serialize_vendor(vendor: NovaFinVendor) -> dict[str, Any]:
    return {
        "id": str(vendor.id),
        "name": vendor.name,
        "phone": vendor.phone,
        "city": vendor.city,
        "vat_number": vendor.vat_number,
        "opening_balance": vendor.opening_balance,
        "is_active": vendor.is_active,
        "name_ar": vendor.name_ar,
        "cr_number": vendor.cr_number,
        "street": vendor.street,
        "building_no": vendor.building_no,
        "district": vendor.district,
        "postal_code": vendor.postal_code,
        "country": vendor.country,
        "payment_terms_days": vendor.payment_terms_days,
    }


def serialize_document_line(line: NovaFinInvoiceLine | NovaFinPurchaseLine) -> dict[str, Any]:
    return {
        "id": str(line.id),
        "item_id": str(line.item_id),
        "name": line.name_snapshot,
        "unit": line.unit,
        "quantity": line.quantity,
        "rate": line.rate,
        "amount": line.quantity * line.rate,
    }


def serialize_invoice(invoice: NovaFinInvoice) -> dict[str, Any]:
    return {
        "id": str(invoice.id),
        "code": invoice.code,
        "customer_id": str(invoice.customer_id),
        "customer_name": invoice.customer.name if invoice.customer else None,
        "invoice_date": invoice.invoice_date.isoformat(),
        "mode": invoice.mode,
        "status": _status_value(invoice.status),
        "vat_rate": invoice.vat_rate,
        "tax_category": invoice.tax_category,
        "subtotal": invoice.subtotal,
        "vat_amount": invoice.vat_amount,
        "grand_total": invoice.grand_total,
        "notes": invoice.notes,
        "project_id": str(invoice.project_id) if invoice.project_id else None,
        "cost_center_id": str(invoice.cost_center_id) if invoice.cost_center_id else None,
        "branch_id": str(invoice.branch_id) if invoice.branch_id else None,
        "corrects_invoice_id": str(invoice.corrects_invoice_id) if invoice.corrects_invoice_id else None,
        "lines": [serialize_document_line(line) for line in invoice.lines],
    }


def _status_value(status: Any) -> str:
    return status.value if hasattr(status, "value") else status


def serialize_purchase(purchase: NovaFinPurchase) -> dict[str, Any]:
    return {
        "id": str(purchase.id),
        "code": purchase.code,
        "vendor_id": str(purchase.vendor_id),
        "vendor_name": purchase.vendor.name if purchase.vendor else None,
        "purchase_date": purchase.purchase_date.isoformat(),
        "mode": purchase.mode,
        "vat_rate": purchase.vat_rate,
        "tax_category": purchase.tax_category,
        "supplier_invoice_no": purchase.supplier_invoice_no,
        "supplier_invoice_date": purchase.supplier_invoice_date.isoformat() if purchase.supplier_invoice_date else None,
        "vat_recoverable": purchase.vat_recoverable,
        "subtotal": purchase.subtotal,
        "vat_amount": purchase.vat_amount,
        "grand_total": purchase.grand_total,
        "notes": purchase.notes,
        "lines": [serialize_document_line(line) for line in purchase.lines],
    }


# --- Company profile ---


@router.get("/company")
def get_company_profile(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    profile = db.scalar(select(NovaFinCompanyProfile).limit(1))
    if profile is None:
        return {
            "name": "NOVARISE Trading and Contracting Company",
            "vat_number": None,
            "cr_number": None,
            "phone": None,
            "email": None,
            "address": None,
            "vat_rate": Decimal("15.00"),
        }
    return {
        "id": str(profile.id),
        "name": profile.name,
        "vat_number": profile.vat_number,
        "cr_number": profile.cr_number,
        "phone": profile.phone,
        "email": profile.email,
        "address": profile.address,
        "vat_rate": profile.vat_rate,
    }


@router.put("/company")
def upsert_company_profile(
    payload: CompanyProfileUpsert, request: Request, user: NovaFinManager, db: DBSession
) -> dict[str, Any]:
    profile = db.scalar(select(NovaFinCompanyProfile).limit(1))
    if profile is None:
        profile = NovaFinCompanyProfile(**payload.model_dump())
        db.add(profile)
        db.flush()
    else:
        for field, value in payload.model_dump().items():
            setattr(profile, field, value)
    audit(db, request, user, "novafin.company_updated", "novafin_company_profile", profile.id)
    db.commit()
    return {"id": str(profile.id), "status": "saved"}


# --- Items ---


@router.get("/items")
def list_items(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    items = db.scalars(select(NovaFinItem).order_by(NovaFinItem.name)).all()
    return {"items": [serialize_item(item) for item in items]}


@router.post("/items", status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    item = NovaFinItem(**payload.model_dump())
    db.add(item)
    db.flush()
    if item.opening_qty:
        db.add(
            NovaFinStockMove(
                item_id=item.id,
                delta=item.opening_qty,
                move_date=date_type.today(),
                reference="OPENING",
            )
        )
    audit(db, request, user, "novafin.item_created", "novafin_items", item.id, after=_jsonable(serialize_item(item)))
    db.commit()
    db.refresh(item)
    return serialize_item(item)


@router.patch("/items/{item_id}")
def update_item(
    item_id: uuid.UUID, payload: ItemUpsert, request: Request, user: NovaFinManager, db: DBSession
) -> dict[str, Any]:
    item = db.get(NovaFinItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    before = _jsonable(serialize_item(item))
    for field, value in payload.model_dump().items():
        setattr(item, field, value)
    audit(db, request, user, "novafin.item_updated", "novafin_items", item.id, before=before, after=_jsonable(serialize_item(item)))
    db.commit()
    db.refresh(item)
    return serialize_item(item)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: uuid.UUID, request: Request, user: NovaFinManager, db: DBSession) -> None:
    item = db.get(NovaFinItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    audit(db, request, user, "novafin.item_deleted", "novafin_items", item.id, before=_jsonable(serialize_item(item)))
    delete_or_explain(db, item, "item")


# --- Customers ---


@router.get("/customers")
def list_customers(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    customers = db.scalars(select(NovaFinCustomer).order_by(NovaFinCustomer.name)).all()
    return {"items": [serialize_customer(c) for c in customers]}


@router.post("/customers", status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerUpsert, request: Request, user: NovaFinManager, db: DBSession
) -> dict[str, Any]:
    data = payload.model_dump()
    data["vat_number"] = validate_party_vat(db, NovaFinCustomer, payload.vat_number)
    customer = NovaFinCustomer(**data)
    db.add(customer)
    db.flush()
    if customer.opening_balance:
        post_journal(
            db,
            entry_date=date_type.today(),
            narration=f"Opening balance — {customer.name}",
            lines=[("ar", customer.opening_balance, Decimal("0")), ("opening_equity", Decimal("0"), customer.opening_balance)],
            code_prefix="OB",
            dims=Dims(customer_id=customer.id),
        )
    audit(db, request, user, "novafin.customer_created", "novafin_customers", customer.id, after=_jsonable(serialize_customer(customer)))
    db.commit()
    db.refresh(customer)
    return serialize_customer(customer)


@router.patch("/customers/{customer_id}")
def update_customer(
    customer_id: uuid.UUID, payload: CustomerUpsert, request: Request, user: NovaFinManager, db: DBSession
) -> dict[str, Any]:
    customer = db.get(NovaFinCustomer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    before = _jsonable(serialize_customer(customer))
    data = payload.model_dump()
    if (payload.vat_number or "").strip() != (customer.vat_number or ""):
        data["vat_number"] = validate_party_vat(db, NovaFinCustomer, payload.vat_number, current_id=customer.id)
    for field, value in data.items():
        setattr(customer, field, value)
    audit(db, request, user, "novafin.customer_updated", "novafin_customers", customer.id, before=before, after=_jsonable(serialize_customer(customer)))
    db.commit()
    db.refresh(customer)
    return serialize_customer(customer)


@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: uuid.UUID, request: Request, user: NovaFinManager, db: DBSession) -> None:
    customer = db.get(NovaFinCustomer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    audit(db, request, user, "novafin.customer_deleted", "novafin_customers", customer.id, before=_jsonable(serialize_customer(customer)))
    delete_or_explain(db, customer, "customer")


# --- Vendors ---


@router.get("/vendors")
def list_vendors(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    vendors = db.scalars(select(NovaFinVendor).order_by(NovaFinVendor.name)).all()
    return {"items": [serialize_vendor(v) for v in vendors]}


@router.post("/vendors", status_code=status.HTTP_201_CREATED)
def create_vendor(payload: VendorUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    data = payload.model_dump()
    data["vat_number"] = validate_party_vat(db, NovaFinVendor, payload.vat_number)
    vendor = NovaFinVendor(**data)
    db.add(vendor)
    db.flush()
    if vendor.opening_balance:
        post_journal(
            db,
            entry_date=date_type.today(),
            narration=f"Opening balance — {vendor.name}",
            lines=[("opening_equity", vendor.opening_balance, Decimal("0")), ("ap", Decimal("0"), vendor.opening_balance)],
            code_prefix="OB",
            dims=Dims(vendor_id=vendor.id),
        )
    audit(db, request, user, "novafin.vendor_created", "novafin_vendors", vendor.id, after=_jsonable(serialize_vendor(vendor)))
    db.commit()
    db.refresh(vendor)
    return serialize_vendor(vendor)


@router.patch("/vendors/{vendor_id}")
def update_vendor(
    vendor_id: uuid.UUID, payload: VendorUpsert, request: Request, user: NovaFinManager, db: DBSession
) -> dict[str, Any]:
    vendor = db.get(NovaFinVendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    before = _jsonable(serialize_vendor(vendor))
    data = payload.model_dump()
    if (payload.vat_number or "").strip() != (vendor.vat_number or ""):
        data["vat_number"] = validate_party_vat(db, NovaFinVendor, payload.vat_number, current_id=vendor.id)
    for field, value in data.items():
        setattr(vendor, field, value)
    audit(db, request, user, "novafin.vendor_updated", "novafin_vendors", vendor.id, before=before, after=_jsonable(serialize_vendor(vendor)))
    db.commit()
    db.refresh(vendor)
    return serialize_vendor(vendor)


@router.delete("/vendors/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vendor(vendor_id: uuid.UUID, request: Request, user: NovaFinManager, db: DBSession) -> None:
    vendor = db.get(NovaFinVendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    audit(db, request, user, "novafin.vendor_deleted", "novafin_vendors", vendor.id, before=_jsonable(serialize_vendor(vendor)))
    delete_or_explain(db, vendor, "vendor")


# --- Invoices ---


@router.get("/invoices")
def list_invoices(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    invoices = db.scalars(
        select(NovaFinInvoice)
        .options(selectinload(NovaFinInvoice.lines), selectinload(NovaFinInvoice.customer))
        .order_by(NovaFinInvoice.invoice_date.desc(), NovaFinInvoice.code.desc())
    ).all()
    return {"items": [serialize_invoice(invoice) for invoice in invoices]}


@router.post("/invoices", status_code=status.HTTP_201_CREATED)
def create_invoice(payload: InvoiceCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    invoice = build_invoice(db, payload)
    audit(db, request, user, "novafin.invoice_created", "novafin_invoices", invoice.id, after={"code": invoice.code, "grand_total": str(invoice.grand_total)})
    db.commit()
    db.refresh(invoice)
    return serialize_invoice(invoice)


def build_invoice(db: Session, payload: InvoiceCreate, *, corrects_invoice_id: uuid.UUID | None = None) -> NovaFinInvoice:
    """Create and post an invoice inside the caller's transaction (the caller audits and commits)."""
    customer = db.get(NovaFinCustomer, payload.customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    item_ids = [line.item_id for line in payload.lines]
    items = {item.id: item for item in db.scalars(select(NovaFinItem).where(NovaFinItem.id.in_(item_ids)))}
    missing = set(item_ids) - set(items)
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item(s) not found: {missing}")

    subtotal = sum((line.quantity * line.rate for line in payload.lines), Decimal("0"))
    vat_rate = effective_rate(payload.tax_category, payload.vat_rate)
    vat_amount = (subtotal * vat_rate / Decimal("100")).quantize(Decimal("0.01"))
    invoice = NovaFinInvoice(
        code=_next_code(db, NovaFinInvoice, "INV"),
        customer_id=payload.customer_id,
        invoice_date=payload.invoice_date,
        mode=payload.mode,
        status=payload.status,
        vat_rate=vat_rate,
        tax_category=payload.tax_category,
        subtotal=subtotal,
        vat_amount=vat_amount,
        grand_total=subtotal + vat_amount,
        notes=payload.notes,
        project_id=payload.project_id,
        cost_center_id=payload.cost_center_id,
        branch_id=payload.branch_id,
        corrects_invoice_id=corrects_invoice_id,
    )
    dims = dims_for(db, payload.project_id, payload.cost_center_id, payload.branch_id, customer_id=payload.customer_id)
    db.add(invoice)
    db.flush()

    cost_of_goods_sold = Decimal("0")
    for line in payload.lines:
        item = items[line.item_id]
        db.add(
            NovaFinInvoiceLine(
                invoice_id=invoice.id,
                item_id=item.id,
                name_snapshot=item.name,
                unit=item.unit,
                quantity=line.quantity,
                rate=line.rate,
            )
        )
        if item.kind == NovaFinItemKind.PRODUCT and payload.status != "draft":
            db.add(
                NovaFinStockMove(
                    item_id=item.id,
                    delta=-line.quantity,
                    move_date=payload.invoice_date,
                    reference=invoice.code,
                )
            )
            cost_of_goods_sold += line.quantity * item.cost

    if payload.status != "draft":
        # Revenue side: the cash/AR debit already reflects the cash-mode vs
        # credit-mode distinction, so a cash sale never touches "ar" at all —
        # no separate cash-move workaround is needed once this posts for real.
        cash_or_ar = "cash" if payload.mode == "cash" else "ar"
        post_journal(
            db,
            entry_date=payload.invoice_date,
            narration=f"Sale — {customer.name} ({invoice.code})",
            lines=[
                (cash_or_ar, invoice.grand_total, Decimal("0")),
                ("sales", Decimal("0"), invoice.subtotal),
                ("vout", Decimal("0"), invoice.vat_amount),
            ],
            code_prefix="GL",
            dims=dims,
        )
        # Cost side: a separate paired entry, same as the reference's
        # perpetual-inventory model (Inventory asset reduced, COGS expensed).
        if cost_of_goods_sold:
            post_journal(
                db,
                entry_date=payload.invoice_date,
                narration=f"COGS — {invoice.code}",
                lines=[("cogs", cost_of_goods_sold, Decimal("0")), ("inventory", Decimal("0"), cost_of_goods_sold)],
                code_prefix="GL",
                dims=dims,
            )

    return invoice


@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: uuid.UUID, user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    invoice = db.scalar(
        select(NovaFinInvoice)
        .options(selectinload(NovaFinInvoice.lines), selectinload(NovaFinInvoice.customer))
        .where(NovaFinInvoice.id == invoice_id)
    )
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return serialize_invoice(invoice)


# --- Purchases ---


@router.get("/purchases")
def list_purchases(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    purchases = db.scalars(
        select(NovaFinPurchase)
        .options(selectinload(NovaFinPurchase.lines), selectinload(NovaFinPurchase.vendor))
        .order_by(NovaFinPurchase.purchase_date.desc(), NovaFinPurchase.code.desc())
    ).all()
    return {"items": [serialize_purchase(purchase) for purchase in purchases]}


@router.post("/purchases", status_code=status.HTTP_201_CREATED)
def create_purchase(payload: PurchaseCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    vendor = db.get(NovaFinVendor, payload.vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    item_ids = [line.item_id for line in payload.lines]
    items = {item.id: item for item in db.scalars(select(NovaFinItem).where(NovaFinItem.id.in_(item_ids)))}
    missing = set(item_ids) - set(items)
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item(s) not found: {missing}")

    subtotal = sum((line.quantity * line.rate for line in payload.lines), Decimal("0"))
    vat_rate = effective_rate(payload.tax_category, payload.vat_rate)
    vat_amount = (subtotal * vat_rate / Decimal("100")).quantize(Decimal("0.01"))
    purchase = NovaFinPurchase(
        code=_next_code(db, NovaFinPurchase, "PUR"),
        vendor_id=payload.vendor_id,
        purchase_date=payload.purchase_date,
        mode=payload.mode,
        vat_rate=vat_rate,
        tax_category=payload.tax_category,
        supplier_invoice_no=(payload.supplier_invoice_no or "").strip() or None,
        supplier_invoice_date=payload.supplier_invoice_date,
        vat_recoverable=payload.vat_recoverable,
        subtotal=subtotal,
        vat_amount=vat_amount,
        grand_total=subtotal + vat_amount,
        notes=payload.notes,
        project_id=payload.project_id,
        cost_center_id=payload.cost_center_id,
        branch_id=payload.branch_id,
    )
    dims = dims_for(db, payload.project_id, payload.cost_center_id, payload.branch_id, vendor_id=payload.vendor_id)
    db.add(purchase)
    db.flush()

    product_subtotal = Decimal("0")
    service_subtotal = Decimal("0")
    for line in payload.lines:
        item = items[line.item_id]
        db.add(
            NovaFinPurchaseLine(
                purchase_id=purchase.id,
                item_id=item.id,
                name_snapshot=item.name,
                unit=item.unit,
                quantity=line.quantity,
                rate=line.rate,
            )
        )
        if item.kind == NovaFinItemKind.PRODUCT:
            db.add(
                NovaFinStockMove(
                    item_id=item.id,
                    delta=line.quantity,
                    move_date=payload.purchase_date,
                    reference=purchase.code,
                )
            )
            product_subtotal += line.quantity * line.rate
        else:
            service_subtotal += line.quantity * line.rate

    # Product lines land on the Inventory asset (perpetual inventory);
    # purchased services are expensed immediately since they never sit in stock.
    cash_or_ap = "cash" if payload.mode == "cash" else "ap"
    post_journal(
        db,
        entry_date=payload.purchase_date,
        narration=f"Purchase — {vendor.name} ({purchase.code})",
        lines=[
            ("inventory", product_subtotal, Decimal("0")),
            # VAT the company may not claim back is part of what the purchase cost.
            ("purchase_expense", service_subtotal + (Decimal("0") if purchase.vat_recoverable else purchase.vat_amount), Decimal("0")),
            ("vin", purchase.vat_amount if purchase.vat_recoverable else Decimal("0"), Decimal("0")),
            (cash_or_ap, Decimal("0"), purchase.grand_total),
        ],
        code_prefix="GL",
        dims=dims,
    )

    audit(db, request, user, "novafin.purchase_created", "novafin_purchases", purchase.id, after={"code": purchase.code, "grand_total": str(purchase.grand_total)})
    db.commit()
    db.refresh(purchase)
    return serialize_purchase(purchase)


@router.get("/purchases/{purchase_id}")
def get_purchase(purchase_id: uuid.UUID, user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    purchase = db.scalar(
        select(NovaFinPurchase)
        .options(selectinload(NovaFinPurchase.lines), selectinload(NovaFinPurchase.vendor))
        .where(NovaFinPurchase.id == purchase_id)
    )
    if purchase is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase not found")
    return serialize_purchase(purchase)


# --- Dashboard ---


def _grouped(db: Session, key_col, value_col, where=None) -> dict[Any, Decimal]:
    stmt = select(key_col, func.coalesce(func.sum(value_col), 0)).group_by(key_col)
    if where is not None:
        stmt = stmt.where(where)
    return dict(db.execute(stmt).all())


@router.get("/dashboard/summary")
def dashboard_summary(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    total_sales = db.scalar(select(func.coalesce(func.sum(NovaFinInvoice.subtotal), 0))) or Decimal("0")
    total_purchases = db.scalar(select(func.coalesce(func.sum(NovaFinPurchase.subtotal), 0))) or Decimal("0")
    invoice_count = db.scalar(select(func.count()).select_from(NovaFinInvoice)) or 0
    customer_count = db.scalar(select(func.count()).select_from(NovaFinCustomer)) or 0
    item_count = db.scalar(select(func.count()).select_from(NovaFinItem)) or 0

    # --- Real cash & bank / receivable / payable position, read straight from
    # the general ledger control accounts (every module posts through
    # post_journal(), so these balances are always the true, current totals —
    # no more re-deriving them by re-summing every transaction table here).
    cash_and_bank = account_balance(db, "cash")
    for bank in db.scalars(select(NovaFinBank)):
        cash_and_bank += account_balance(db, f"bank:{bank.id}")
    receivable = account_balance(db, "ar")
    payable = -account_balance(db, "ap")

    # --- Real per-customer / per-vendor outstanding balances, not just "all
    # credit invoices ever" — a paid invoice shouldn't still count as receivable.
    invoiced_by_customer = _grouped(db, NovaFinInvoice.customer_id, NovaFinInvoice.grand_total, NovaFinInvoice.mode == "credit")
    sales_returns_by_customer = _grouped(db, NovaFinSalesReturn.customer_id, NovaFinSalesReturn.grand_total)
    credit_notes_by_customer = _grouped(db, NovaFinCreditNote.customer_id, NovaFinCreditNote.amount)
    received_by_customer = _grouped(db, NovaFinCashMove.customer_id, NovaFinCashMove.amount, NovaFinCashMove.kind == "receipt")

    # Per-customer breakdown for the "Highest Receivables" panel — the ledger's
    # pooled "ar" account (above) has no per-customer detail, so this
    # sub-ledger reconstruction is still needed for that list specifically.
    top_receivables: list[dict[str, Any]] = []
    for customer in db.scalars(select(NovaFinCustomer)):
        outstanding = (
            customer.opening_balance
            + invoiced_by_customer.get(customer.id, Decimal("0"))
            - sales_returns_by_customer.get(customer.id, Decimal("0"))
            - credit_notes_by_customer.get(customer.id, Decimal("0"))
            - received_by_customer.get(customer.id, Decimal("0"))
        )
        if outstanding > 0:
            top_receivables.append({"name": customer.name, "city": customer.city, "outstanding": outstanding})
    top_receivables.sort(key=lambda r: r["outstanding"], reverse=True)
    top_receivables = top_receivables[:5]

    stock_by_item = dict(
        db.execute(
            select(NovaFinStockMove.item_id, func.coalesce(func.sum(NovaFinStockMove.delta), 0)).group_by(
                NovaFinStockMove.item_id
            )
        ).all()
    )
    low_stock = []
    for item in db.scalars(select(NovaFinItem).where(NovaFinItem.kind == NovaFinItemKind.PRODUCT)):
        on_hand = stock_by_item.get(item.id, Decimal("0"))
        if item.min_level and on_hand <= item.min_level:
            low_stock.append({"name": item.name, "on_hand": on_hand, "min_level": item.min_level, "unit": item.unit})

    top_customers_rows = db.execute(
        select(NovaFinCustomer.name, func.coalesce(func.sum(NovaFinInvoice.grand_total), 0).label("total"))
        .join(NovaFinInvoice, NovaFinInvoice.customer_id == NovaFinCustomer.id)
        .group_by(NovaFinCustomer.name)
        .order_by(func.sum(NovaFinInvoice.grand_total).desc())
        .limit(5)
    ).all()
    top_customer = {"name": top_customers_rows[0][0], "total": top_customers_rows[0][1]} if top_customers_rows else None

    recent_invoices = db.scalars(
        select(NovaFinInvoice)
        .options(selectinload(NovaFinInvoice.customer))
        .order_by(NovaFinInvoice.invoice_date.desc(), NovaFinInvoice.code.desc())
        .limit(6)
    ).all()

    # --- Sales vs purchases, last 6 calendar months. Group keys come back as
    # a Postgres `timestamp` (from date_trunc), so normalize to (year, month)
    # tuples before matching against the calendar months we want to display.
    month_expr_inv = func.date_trunc("month", NovaFinInvoice.invoice_date)
    sales_by_month = {
        (row[0].year, row[0].month): row[1]
        for row in db.execute(select(month_expr_inv, func.coalesce(func.sum(NovaFinInvoice.subtotal), 0)).group_by(month_expr_inv))
    }
    month_expr_pur = func.date_trunc("month", NovaFinPurchase.purchase_date)
    purchases_by_month = {
        (row[0].year, row[0].month): row[1]
        for row in db.execute(select(month_expr_pur, func.coalesce(func.sum(NovaFinPurchase.subtotal), 0)).group_by(month_expr_pur))
    }
    today = date_type.today()
    month_starts = []
    cursor_year, cursor_month = today.year, today.month
    for _ in range(6):
        month_starts.append(date_type(cursor_year, cursor_month, 1))
        cursor_month -= 1
        if cursor_month == 0:
            cursor_month = 12
            cursor_year -= 1
    month_starts.reverse()
    monthly_trend = [
        {
            "month": m.strftime("%Y-%m"),
            "sales": sales_by_month.get((m.year, m.month), Decimal("0")),
            "purchases": purchases_by_month.get((m.year, m.month), Decimal("0")),
        }
        for m in month_starts
    ]

    return {
        "cash_and_bank": cash_and_bank,
        "receivable": receivable,
        "payable": payable,
        "total_sales": total_sales,
        "total_purchases": total_purchases,
        "gross_profit": total_sales - total_purchases,
        "invoice_count": invoice_count,
        "customer_count": customer_count,
        "item_count": item_count,
        "low_stock": low_stock,
        "top_customers": [{"name": name, "total": total} for name, total in top_customers_rows],
        "top_customer": top_customer,
        "top_receivables": top_receivables,
        "monthly_trend": monthly_trend,
        "recent_invoices": [
            {
                "code": inv.code,
                "customer_name": inv.customer.name if inv.customer else None,
                "invoice_date": inv.invoice_date.isoformat(),
                "mode": inv.mode,
                "grand_total": inv.grand_total,
            }
            for inv in recent_invoices
        ],
    }
