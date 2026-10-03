import uuid
from datetime import date as date_type
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.routes.cms import audit
from app.api.routes.novafin import _jsonable, _next_code
from app.core.auth import require_permission
from app.core.database import get_db
from app.models import NovaFinDepartment, NovaFinDesignation, NovaFinEmployee, NovaFinSalarySlip, User
from app.schemas.novafin_hr import EmployeeUpsert, LookupUpsert, SalarySlipCreate
from app.services.novafin_ledger import post_journal

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]
NovaFinManager = Annotated[User, Depends(require_permission("novafin.manage"))]


@router.get("/departments")
def list_departments(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinDepartment).order_by(NovaFinDepartment.name)).all()
    return {"items": [{"id": str(d.id), "name": d.name} for d in rows]}


@router.post("/departments", status_code=status.HTTP_201_CREATED)
def create_department(payload: LookupUpsert, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    dept = NovaFinDepartment(name=payload.name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return {"id": str(dept.id), "name": dept.name}


@router.get("/designations")
def list_designations(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinDesignation).order_by(NovaFinDesignation.name)).all()
    return {"items": [{"id": str(d.id), "name": d.name} for d in rows]}


@router.post("/designations", status_code=status.HTTP_201_CREATED)
def create_designation(payload: LookupUpsert, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    desig = NovaFinDesignation(name=payload.name)
    db.add(desig)
    db.commit()
    db.refresh(desig)
    return {"id": str(desig.id), "name": desig.name}


def serialize_employee(e: NovaFinEmployee) -> dict[str, Any]:
    return {
        "id": str(e.id), "name": e.name, "phone": e.phone,
        "department_id": str(e.department_id) if e.department_id else None,
        "department_name": e.department.name if e.department else None,
        "designation_id": str(e.designation_id) if e.designation_id else None,
        "designation_name": e.designation.name if e.designation else None,
        "basic_salary": e.basic_salary, "is_active": e.is_active,
    }


@router.get("/employees")
def list_employees(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinEmployee).options(selectinload(NovaFinEmployee.department), selectinload(NovaFinEmployee.designation)).order_by(NovaFinEmployee.name)
    ).all()
    return {"items": [serialize_employee(e) for e in rows]}


@router.post("/employees", status_code=status.HTTP_201_CREATED)
def create_employee(payload: EmployeeUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    employee = NovaFinEmployee(**payload.model_dump())
    db.add(employee)
    db.flush()
    audit(db, request, user, "novafin.employee_created", "novafin_employees", employee.id, after=_jsonable(serialize_employee(employee)))
    db.commit()
    db.refresh(employee)
    return serialize_employee(employee)


def serialize_salary_slip(s: NovaFinSalarySlip) -> dict[str, Any]:
    return {
        "id": str(s.id), "code": s.code, "employee_id": str(s.employee_id),
        "employee_name": s.employee.name if s.employee else None,
        "month": s.month, "basic": s.basic, "allowance": s.allowance, "deduction": s.deduction,
        "net": s.net, "is_paid": s.is_paid, "paid_date": s.paid_date.isoformat() if s.paid_date else None,
    }


@router.get("/salary-slips")
def list_salary_slips(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinSalarySlip).options(selectinload(NovaFinSalarySlip.employee)).order_by(NovaFinSalarySlip.month.desc())
    ).all()
    return {"items": [serialize_salary_slip(s) for s in rows]}


@router.post("/salary-slips", status_code=status.HTTP_201_CREATED)
def create_salary_slip(payload: SalarySlipCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    employee = db.get(NovaFinEmployee, payload.employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    net = payload.basic + payload.allowance - payload.deduction
    slip = NovaFinSalarySlip(
        code=_next_code(db, NovaFinSalarySlip, "SLP"),
        employee_id=payload.employee_id,
        month=payload.month,
        basic=payload.basic,
        allowance=payload.allowance,
        deduction=payload.deduction,
        net=net,
    )
    db.add(slip)
    db.flush()
    audit(db, request, user, "novafin.salary_slip_created", "novafin_salary_slips", slip.id, after=_jsonable({"code": slip.code, "net": slip.net}))
    db.commit()
    db.refresh(slip)
    return serialize_salary_slip(slip)


@router.patch("/salary-slips/{slip_id}/pay")
def pay_salary_slip(slip_id: uuid.UUID, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    slip = db.get(NovaFinSalarySlip, slip_id)
    if slip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary slip not found")
    slip.is_paid = True
    slip.paid_date = date_type.today()
    post_journal(
        db, entry_date=slip.paid_date, narration=f"Salary — {slip.employee.name if slip.employee else slip.code}",
        lines=[("wages", slip.net, Decimal("0")), ("cash", Decimal("0"), slip.net)], code_prefix="GL",
    )
    audit(db, request, user, "novafin.salary_slip_paid", "novafin_salary_slips", slip.id)
    db.commit()
    db.refresh(slip)
    return serialize_salary_slip(slip)
