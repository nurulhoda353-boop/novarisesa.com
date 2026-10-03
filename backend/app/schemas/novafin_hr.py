import uuid
from decimal import Decimal

from pydantic import BaseModel, Field


class LookupUpsert(BaseModel):
    name: str = Field(min_length=2, max_length=150)


class EmployeeUpsert(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    phone: str | None = None
    department_id: uuid.UUID | None = None
    designation_id: uuid.UUID | None = None
    basic_salary: Decimal = Decimal("0")
    is_active: bool = True


class SalarySlipCreate(BaseModel):
    employee_id: uuid.UUID
    month: str = Field(min_length=3, max_length=20)
    basic: Decimal = Field(ge=0)
    allowance: Decimal = Decimal("0")
    deduction: Decimal = Decimal("0")
