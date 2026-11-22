import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.routes.cms import audit
from app.core.auth import require_permission
from app.core.database import get_db
from app.models import MuqeemRecord, User

router = APIRouter(prefix="/muqeem")

DBSession = Annotated[Session, Depends(get_db)]
Viewer = Annotated[User, Depends(require_permission("muqeem.view", "muqeem.manage"))]
Manager = Annotated[User, Depends(require_permission("muqeem.manage"))]

HIJRI = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DATE_FIELDS = (
    "report_date",
    "birth_date",
    "entry_date",
    "passport_issue_date",
    "passport_expiry_date",
    "iqama_issue_date",
    "iqama_expiry_date",
)


class MuqeemFields(BaseModel):
    report_date: str = Field(max_length=10)
    operator_id: str = Field(default="", max_length=20)
    location: str = Field(default="Muqeem Portal", max_length=60)
    iqama_number: str = Field(min_length=1, max_length=20)
    version_number: str = Field(default="1", max_length=6)
    gender: str = Field(default="Male", max_length=12)
    name: str = Field(min_length=1, max_length=120)
    translated_name: str = Field(default="", max_length=120)
    birth_date: str = Field(default="", max_length=10)
    birth_country: str = Field(default="", max_length=60)
    marital_status: str = Field(default="", max_length=30)
    religion: str = Field(default="", max_length=30)
    occupation: str = Field(default="", max_length=80)
    status: str = Field(default="Valid", max_length=30)
    entry_date: str = Field(default="", max_length=10)
    entry_location: str = Field(default="", max_length=80)
    passport_number: str = Field(default="", max_length=30)
    passport_nationality: str = Field(default="", max_length=60)
    passport_issue_date: str = Field(default="", max_length=10)
    passport_expiry_date: str = Field(default="", max_length=10)
    passport_issue_location: str = Field(default="", max_length=80)
    iqama_issue_date: str = Field(default="", max_length=10)
    iqama_expiry_date: str = Field(default="", max_length=10)
    iqama_issue_location: str = Field(default="", max_length=80)
    employer_number: str = Field(default="", max_length=20)
    employer_name: str = Field(default="", max_length=160)

    @field_validator("*", mode="before")
    @classmethod
    def _strip(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator(*DATE_FIELDS)
    @classmethod
    def _hijri(cls, value: str, info) -> str:
        if info.field_name == "report_date" and not value:
            raise ValueError("Report date is required")
        if value and not HIJRI.match(value):
            raise ValueError("Dates must look like 1448-05-25 (YYYY-MM-DD, Hijri)")
        return value


class MuqeemRead(MuqeemFields):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


def _snapshot(record: MuqeemRecord) -> dict[str, str]:
    return {key: getattr(record, key) for key in MuqeemFields.model_fields}


def _get_or_404(db: Session, record_id: uuid.UUID) -> MuqeemRecord:
    record = db.get(MuqeemRecord, record_id)
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Record not found")
    return record


@router.get("/records", response_model=list[MuqeemRead])
def list_records(
    db: DBSession, _: Viewer, q: str | None = Query(default=None, max_length=80)
) -> list[MuqeemRecord]:
    stmt = select(MuqeemRecord).order_by(MuqeemRecord.created_at.desc())
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                MuqeemRecord.name.ilike(like),
                MuqeemRecord.translated_name.ilike(like),
                MuqeemRecord.iqama_number.ilike(like),
                MuqeemRecord.passport_number.ilike(like),
                MuqeemRecord.employer_name.ilike(like),
            )
        )
    return list(db.scalars(stmt.limit(500)))


@router.get("/records/{record_id}", response_model=MuqeemRead)
def get_record(record_id: uuid.UUID, db: DBSession, _: Viewer) -> MuqeemRecord:
    return _get_or_404(db, record_id)


@router.post("/records", response_model=MuqeemRead, status_code=status.HTTP_201_CREATED)
def create_record(body: MuqeemFields, request: Request, db: DBSession, user: Manager) -> MuqeemRecord:
    record = MuqeemRecord(**body.model_dump(), created_by=user.id)
    db.add(record)
    db.flush()
    audit(db, request, user, "muqeem.create", "muqeem_record", record.id, after=_snapshot(record))
    db.commit()
    db.refresh(record)
    return record


@router.put("/records/{record_id}", response_model=MuqeemRead)
def update_record(
    record_id: uuid.UUID, body: MuqeemFields, request: Request, db: DBSession, user: Manager
) -> MuqeemRecord:
    record = _get_or_404(db, record_id)
    before = _snapshot(record)
    for key, value in body.model_dump().items():
        setattr(record, key, value)
    audit(db, request, user, "muqeem.update", "muqeem_record", record.id, before=before, after=_snapshot(record))
    db.commit()
    db.refresh(record)
    return record


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(record_id: uuid.UUID, request: Request, db: DBSession, user: Manager) -> None:
    record = _get_or_404(db, record_id)
    audit(db, request, user, "muqeem.delete", "muqeem_record", record.id, before=_snapshot(record))
    db.delete(record)
    db.commit()
