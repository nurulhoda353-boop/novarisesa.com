"""Projects, cost centers and period locks: the labels and gates around the ledger."""

import calendar
import uuid
from datetime import date as date_type
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.cms import audit
from app.api.routes.novafin import _jsonable, delete_or_explain
from app.core.auth import require_permission
from app.core.database import get_db
from app.models import NovaFinCostCenter, NovaFinFiscalYear, NovaFinPeriodLock, NovaFinProject, User
from app.schemas.novafin_phase1 import CostCenterUpsert, PeriodAction, ProjectUpsert

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]
NovaFinManager = Annotated[User, Depends(require_permission("novafin.manage"))]
NovaFinCloser = Annotated[User, Depends(require_permission("novafin.close_period"))]
NovaFinReopener = Annotated[User, Depends(require_permission("novafin.reopen_period"))]


def serialize_project(p: NovaFinProject) -> dict[str, Any]:
    return {
        "id": str(p.id),
        "code": p.code,
        "name": p.name,
        "name_ar": p.name_ar,
        "client_name": p.client_name,
        "customer_id": str(p.customer_id) if p.customer_id else None,
        "website_slug": p.website_slug,
        "start_date": p.start_date.isoformat() if p.start_date else None,
        "end_date": p.end_date.isoformat() if p.end_date else None,
        "budget": p.budget,
        "status": p.status,
        "is_active": p.is_active,
    }


@router.get("/projects")
def list_projects(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinProject).order_by(NovaFinProject.code)).all()
    return {"items": [serialize_project(p) for p in rows]}


@router.post("/projects", status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    code = payload.code.strip().upper()
    if db.scalar(select(NovaFinProject.id).where(NovaFinProject.code == code)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A project with code {code} already exists.")
    project = NovaFinProject(**{**payload.model_dump(), "code": code})
    db.add(project)
    db.flush()
    audit(db, request, user, "novafin.project_created", "novafin_projects", project.id, after=_jsonable(serialize_project(project)))
    db.commit()
    db.refresh(project)
    return serialize_project(project)


@router.patch("/projects/{project_id}")
def update_project(project_id: uuid.UUID, payload: ProjectUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    project = db.get(NovaFinProject, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    before = _jsonable(serialize_project(project))
    code = payload.code.strip().upper()
    clash = db.scalar(select(NovaFinProject.id).where(NovaFinProject.code == code, NovaFinProject.id != project.id))
    if clash is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A project with code {code} already exists.")
    for field, value in {**payload.model_dump(), "code": code}.items():
        setattr(project, field, value)
    audit(db, request, user, "novafin.project_updated", "novafin_projects", project.id, before=before, after=_jsonable(serialize_project(project)))
    db.commit()
    db.refresh(project)
    return serialize_project(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: uuid.UUID, request: Request, user: NovaFinManager, db: DBSession) -> None:
    project = db.get(NovaFinProject, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    audit(db, request, user, "novafin.project_deleted", "novafin_projects", project.id, before=_jsonable(serialize_project(project)))
    delete_or_explain(db, project, "project")


def serialize_cost_center(c: NovaFinCostCenter) -> dict[str, Any]:
    return {"id": str(c.id), "code": c.code, "name": c.name, "name_ar": c.name_ar, "is_active": c.is_active}


@router.get("/cost-centers")
def list_cost_centers(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinCostCenter).order_by(NovaFinCostCenter.code)).all()
    return {"items": [serialize_cost_center(c) for c in rows]}


@router.post("/cost-centers", status_code=status.HTTP_201_CREATED)
def create_cost_center(payload: CostCenterUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    code = payload.code.strip().upper()
    if db.scalar(select(NovaFinCostCenter.id).where(NovaFinCostCenter.code == code)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A cost center with code {code} already exists.")
    center = NovaFinCostCenter(**{**payload.model_dump(), "code": code})
    db.add(center)
    db.flush()
    audit(db, request, user, "novafin.cost_center_created", "novafin_cost_centers", center.id, after=serialize_cost_center(center))
    db.commit()
    db.refresh(center)
    return serialize_cost_center(center)


@router.patch("/cost-centers/{center_id}")
def update_cost_center(center_id: uuid.UUID, payload: CostCenterUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    center = db.get(NovaFinCostCenter, center_id)
    if center is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cost center not found")
    before = serialize_cost_center(center)
    for field, value in {**payload.model_dump(), "code": payload.code.strip().upper()}.items():
        setattr(center, field, value)
    audit(db, request, user, "novafin.cost_center_updated", "novafin_cost_centers", center.id, before=before, after=serialize_cost_center(center))
    db.commit()
    db.refresh(center)
    return serialize_cost_center(center)


@router.delete("/cost-centers/{center_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cost_center(center_id: uuid.UUID, request: Request, user: NovaFinManager, db: DBSession) -> None:
    center = db.get(NovaFinCostCenter, center_id)
    if center is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cost center not found")
    audit(db, request, user, "novafin.cost_center_deleted", "novafin_cost_centers", center.id, before=serialize_cost_center(center))
    delete_or_explain(db, center, "cost center")


# --- accounting periods (monthly lock) ---


@router.get("/periods")
def list_periods(user: NovaFinUser, db: DBSession, year: int | None = None) -> dict[str, Any]:
    year = year or date_type.today().year
    locks = {(p.year, p.month): p for p in db.scalars(select(NovaFinPeriodLock).where(NovaFinPeriodLock.year == year))}
    closed_years = db.scalars(select(NovaFinFiscalYear).where(NovaFinFiscalYear.status == "closed")).all()
    months = []
    for month in range(1, 13):
        first = date_type(year, month, 1)
        last = date_type(year, month, calendar.monthrange(year, month)[1])
        year_closed = any(fy.start_date <= first and fy.end_date >= last for fy in closed_years)
        lock = locks.get((year, month))
        months.append(
            {
                "year": year,
                "month": month,
                "status": "closed_year" if year_closed else ("locked" if lock else "open"),
                "locked_at": lock.locked_at.isoformat() if lock else None,
                "note": lock.note if lock else None,
            }
        )
    return {"year": year, "months": months}


@router.post("/periods/{year}/{month}/lock", status_code=status.HTTP_201_CREATED)
def lock_period(year: int, month: int, payload: PeriodAction, request: Request, user: NovaFinCloser, db: DBSession) -> dict[str, Any]:
    if not 1 <= month <= 12:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Month must be 1 to 12")
    if db.scalar(select(NovaFinPeriodLock.id).where(NovaFinPeriodLock.year == year, NovaFinPeriodLock.month == month)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This month is already locked.")
    db.add(NovaFinPeriodLock(year=year, month=month, locked_by=user.id, note=payload.note))
    audit(db, request, user, "novafin.period_locked", "novafin_period_locks", None, after={"year": year, "month": month})
    db.commit()
    return {"year": year, "month": month, "status": "locked"}


@router.post("/periods/{year}/{month}/unlock")
def unlock_period(year: int, month: int, payload: PeriodAction, request: Request, user: NovaFinReopener, db: DBSession) -> dict[str, Any]:
    lock = db.scalar(select(NovaFinPeriodLock).where(NovaFinPeriodLock.year == year, NovaFinPeriodLock.month == month))
    if lock is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This month is not locked.")
    if not payload.note:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Say why the month is being unlocked.")
    db.delete(lock)
    audit(db, request, user, "novafin.period_unlocked", "novafin_period_locks", None, after={"year": year, "month": month, "reason": payload.note})
    db.commit()
    return {"year": year, "month": month, "status": "open"}
