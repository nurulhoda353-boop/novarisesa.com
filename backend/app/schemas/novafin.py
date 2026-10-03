import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

ItemKind = Literal["product", "service"]
PaymentMode = Literal["cash", "credit"]
InvoiceStatus = Literal["draft", "posted", "cancelled"]


class CompanyProfileUpsert(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    vat_number: str | None = Field(default=None, max_length=40)
    cr_number: str | None = Field(default=None, max_length=40)
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=320)
    address: str | None = None
    vat_rate: Decimal = Decimal("15.00")


class ItemUpsert(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    kind: ItemKind = "product"
    unit: str = Field(default="Piece", max_length=40)
    cost: Decimal = Decimal("0")
    price: Decimal = Decimal("0")
    opening_qty: Decimal = Decimal("0")
    min_level: Decimal = Decimal("0")
    is_active: bool = True


class CustomerUpsert(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=320)
    city: str | None = Field(default=None, max_length=120)
    vat_number: str | None = Field(default=None, max_length=40)
    credit_limit: Decimal = Decimal("0")
    opening_balance: Decimal = Decimal("0")
    is_active: bool = True


class VendorUpsert(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    phone: str | None = Field(default=None, max_length=40)
    city: str | None = Field(default=None, max_length=120)
    vat_number: str | None = Field(default=None, max_length=40)
    opening_balance: Decimal = Decimal("0")
    is_active: bool = True


class DocumentLineInput(BaseModel):
    item_id: uuid.UUID
    quantity: Decimal = Field(gt=0)
    rate: Decimal = Field(ge=0)


class InvoiceCreate(BaseModel):
    customer_id: uuid.UUID
    invoice_date: date
    mode: PaymentMode = "cash"
    status: InvoiceStatus = "posted"
    vat_rate: Decimal = Decimal("15.00")
    notes: str | None = None
    lines: list[DocumentLineInput] = Field(min_length=1)


class PurchaseCreate(BaseModel):
    vendor_id: uuid.UUID
    purchase_date: date
    mode: PaymentMode = "cash"
    vat_rate: Decimal = Decimal("15.00")
    notes: str | None = None
    lines: list[DocumentLineInput] = Field(min_length=1)
