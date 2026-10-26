import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

AccountType = Literal["asset", "liability", "equity", "income", "expense"]


class AccountUpsert(BaseModel):
    code: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=2, max_length=150)
    account_type: AccountType
    number: str | None = Field(default=None, max_length=20, pattern=r"^\d{3,10}$")
    name_ar: str | None = Field(default=None, max_length=200)
    parent_id: uuid.UUID | None = None
    opening_amount: Decimal = Decimal("0")
    opening_side: Literal["debit", "credit"] = "debit"


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    name_ar: str | None = Field(default=None, max_length=200)
    is_active: bool | None = None


class JournalLineInput(BaseModel):
    account_id: uuid.UUID
    debit: Decimal = Decimal("0")
    credit: Decimal = Decimal("0")
    customer_id: uuid.UUID | None = None
    vendor_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    cost_center_id: uuid.UUID | None = None
    branch_id: uuid.UUID | None = None


class JournalVoucherCreate(BaseModel):
    voucher_date: date
    narration: str | None = None
    lines: list[JournalLineInput] = Field(min_length=2)


class AssetUpsert(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    cost: Decimal = Field(ge=0)
    purchase_date: date
    depreciation_rate: Decimal = Decimal("0")
    funding_method: str = "cash"
    is_active: bool = True


class ReverseRequest(BaseModel):
    reversal_date: date | None = None  # defaults to today
    reason: str = Field(min_length=3, max_length=500)
