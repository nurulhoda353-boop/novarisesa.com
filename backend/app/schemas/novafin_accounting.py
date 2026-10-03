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
    opening_amount: Decimal = Decimal("0")
    opening_side: Literal["debit", "credit"] = "debit"


class JournalLineInput(BaseModel):
    account_id: uuid.UUID
    debit: Decimal = Decimal("0")
    credit: Decimal = Decimal("0")


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
