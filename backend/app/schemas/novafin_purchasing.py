import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.novafin import DocumentLineInput


class RfqLineInput(BaseModel):
    item_id: uuid.UUID
    quantity: Decimal = Field(gt=0)
    max_price: Decimal = Field(ge=0)


class RfqCreate(BaseModel):
    rfq_date: date
    deadline: date | None = None
    vendor_names: list[str] = Field(default_factory=list)
    lines: list[RfqLineInput] = Field(min_length=1)


class PurchaseOrderCreate(BaseModel):
    vendor_id: uuid.UUID
    order_date: date
    vat_rate: Decimal = Decimal("15.00")
    lines: list[DocumentLineInput] = Field(min_length=1)


class PurchaseReturnCreate(BaseModel):
    vendor_id: uuid.UUID
    purchase_id: uuid.UUID | None = None
    return_date: date
    vat_rate: Decimal = Decimal("15.00")
    lines: list[DocumentLineInput] = Field(min_length=1)
