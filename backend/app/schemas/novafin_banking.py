import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

CashKind = Literal["receipt", "payment"]
ChequeKind = Literal["inward", "outward"]
ChequeStatus = Literal["pending", "cleared", "bounced"]
CapitalKind = Literal["capital", "drawings"]


class BankUpsert(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    branch: str | None = None
    account_no: str | None = None
    opening_balance: Decimal = Decimal("0")
    is_active: bool = True


class BranchUpsert(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    city: str | None = None


class CashMoveCreate(BaseModel):
    kind: CashKind
    party_name: str | None = None
    customer_id: uuid.UUID | None = None
    vendor_id: uuid.UUID | None = None
    amount: Decimal = Field(gt=0)
    move_date: date
    method: str = "cash"


class ChequeCreate(BaseModel):
    cheque_no: str = Field(min_length=1, max_length=60)
    bank_id: uuid.UUID | None = None
    kind: ChequeKind
    party_name: str | None = None
    due_date: date
    cheque_date: date
    amount: Decimal = Field(gt=0)
    status: ChequeStatus = "pending"


class CategoryUpsert(BaseModel):
    name: str = Field(min_length=2, max_length=150)


class VoucherCreate(BaseModel):
    category_id: uuid.UUID
    voucher_date: date
    amount: Decimal = Field(gt=0)
    method: str = "cash"
    note: str | None = None


class CapitalMoveCreate(BaseModel):
    kind: CapitalKind
    move_date: date
    amount: Decimal = Field(gt=0)
    method: str = "cash"
    note: str | None = None


class ContraCreate(BaseModel):
    contra_date: date
    from_method: str
    to_method: str
    amount: Decimal = Field(gt=0)
    note: str | None = None
