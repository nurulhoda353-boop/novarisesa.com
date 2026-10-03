import uuid
from datetime import date
from decimal import Decimal

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


class CreditNoteCreate(BaseModel):
    customer_id: uuid.UUID
    note_date: date
    amount: Decimal = Field(gt=0)
    reason: str | None = None
