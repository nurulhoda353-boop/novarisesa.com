import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.novafin import DocumentLineInput


class QuoteCreate(BaseModel):
    customer_id: uuid.UUID
    quote_date: date
    vat_rate: Decimal = Decimal("15.00")
    lines: list[DocumentLineInput] = Field(min_length=1)


class OrderCreate(BaseModel):
    customer_id: uuid.UUID
    quote_id: uuid.UUID | None = None
    order_date: date
    vat_rate: Decimal = Decimal("15.00")
    lines: list[DocumentLineInput] = Field(min_length=1)


class DeliveryLineInput(BaseModel):
    item_id: uuid.UUID
    quantity: Decimal = Field(gt=0)


class DeliveryCreate(BaseModel):
    customer_id: uuid.UUID
    order_id: uuid.UUID | None = None
    delivery_date: date
    lines: list[DeliveryLineInput] = Field(min_length=1)


class SalesReturnCreate(BaseModel):
    customer_id: uuid.UUID
    invoice_id: uuid.UUID | None = None
    return_date: date
    vat_rate: Decimal = Decimal("15.00")
    lines: list[DocumentLineInput] = Field(min_length=1)


CorrectionReason = Literal["price_error", "goods_returned", "discount", "cancellation", "other"]


class CreditNoteCreate(BaseModel):
    """Credit part or all of an invoice. `amount` is the value before VAT; leave it out to credit
    whatever is still uncredited on the invoice. VAT follows the invoice's own rate."""

    invoice_id: uuid.UUID
    note_date: date
    amount: Decimal | None = Field(default=None, ge=0)  # empty or 0 = credit what is left
    reason_code: CorrectionReason
    reason: str | None = None


class DebitNoteCreate(BaseModel):
    invoice_id: uuid.UUID
    note_date: date
    amount: Decimal = Field(gt=0)  # extra value before VAT
    reason: str | None = None


class InvoiceReplace(BaseModel):
    """One-step correction: credit the whole invoice, then issue the right one in its place."""

    invoice_date: date
    reason_code: CorrectionReason
    reason: str | None = None
    notes: str | None = None
    lines: list[DocumentLineInput] = Field(min_length=1)
