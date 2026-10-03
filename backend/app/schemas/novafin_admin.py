from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class FiscalYearUpsert(BaseModel):
    label: str = Field(min_length=2, max_length=40)
    start_date: date
    end_date: date
    is_active: bool = False


class OpeningBalanceLineInput(BaseModel):
    account_code: str
    debit: Decimal = Decimal("0")
    credit: Decimal = Decimal("0")


class OpeningBalanceSubmit(BaseModel):
    lines: list[OpeningBalanceLineInput] = Field(min_length=1)
