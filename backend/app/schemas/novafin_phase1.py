import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

ProjectStatus = Literal["active", "on_hold", "completed"]


class ProjectUpsert(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=255)
    name_ar: str | None = Field(default=None, max_length=255)
    client_name: str | None = Field(default=None, max_length=255)
    customer_id: uuid.UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    budget: Decimal | None = Field(default=None, ge=0)
    status: ProjectStatus = "active"
    is_active: bool = True


class CostCenterUpsert(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=150)
    name_ar: str | None = Field(default=None, max_length=150)
    is_active: bool = True


class PeriodAction(BaseModel):
    note: str | None = Field(default=None, max_length=500)


class FiscalYearReopen(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


class WriteOffCreate(BaseModel):
    invoice_id: uuid.UUID
    amount: Decimal = Field(gt=0)
    reason: str = Field(min_length=3, max_length=500)
    write_off_date: date
