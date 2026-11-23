import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.routes.cms import audit
from app.core.database import get_db
from app.core.muqeem_access import muqeem_permissions, require_muqeem
from app.models import AuditLog, MuqeemRecord, User

router = APIRouter(prefix="/muqeem")

DBSession = Annotated[Session, Depends(get_db)]
Viewer = Annotated[User, Depends(require_muqeem("muqeem.view", "muqeem.manage"))]
Manager = Annotated[User, Depends(require_muqeem("muqeem.manage"))]
Admin = Annotated[User, Depends(require_muqeem("muqeem.admin"))]

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
    verify_code: str
    archived_at: datetime | None = None
    created_at: datetime


def _snapshot(record: MuqeemRecord) -> dict[str, str]:
    return {key: getattr(record, key) for key in MuqeemFields.model_fields}


def _get_or_404(db: Session, record_id: uuid.UUID) -> MuqeemRecord:
    record = db.get(MuqeemRecord, record_id)
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Record not found")
    return record


SORTABLE = {
    "created_at": MuqeemRecord.created_at,
    "name": MuqeemRecord.name,
    "iqama_number": MuqeemRecord.iqama_number,
    "occupation": MuqeemRecord.occupation,
    "status": MuqeemRecord.status,
    "report_date": MuqeemRecord.report_date,
    "iqama_expiry_date": MuqeemRecord.iqama_expiry_date,
    "passport_nationality": MuqeemRecord.passport_nationality,
    "employer_name": MuqeemRecord.employer_name,
}
# Nationality is the passport nationality, falling back to the birth country when that is blank.
NATIONALITY = func.coalesce(
    func.nullif(MuqeemRecord.passport_nationality, ""), func.nullif(MuqeemRecord.birth_country, "")
)


@router.get("/records", response_model=list[MuqeemRead])
def list_records(
    db: DBSession,
    _: Viewer,
    q: str | None = Query(default=None, max_length=80),
    nationality: str | None = Query(default=None, max_length=60),
    occupation: str | None = Query(default=None, max_length=80),
    status_: str | None = Query(default=None, alias="status", max_length=30),
    employer: str | None = Query(default=None, max_length=160),
    gender: str | None = Query(default=None, max_length=12),
    archived: bool = False,
    sort: str = "created_at",
    order: Literal["asc", "desc"] = "desc",
    limit: int = Query(default=500, ge=1, le=2000),
) -> list[MuqeemRecord]:
    column = SORTABLE.get(sort, MuqeemRecord.created_at)
    ordering = column.asc() if order == "asc" else column.desc()
    stmt = select(MuqeemRecord).where(
        MuqeemRecord.archived_at.is_not(None) if archived else MuqeemRecord.archived_at.is_(None)
    )
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
    if nationality:
        stmt = stmt.where(nationality == NATIONALITY)
    if occupation:
        stmt = stmt.where(MuqeemRecord.occupation == occupation)
    if status_:
        stmt = stmt.where(MuqeemRecord.status == status_)
    if employer:
        stmt = stmt.where(MuqeemRecord.employer_name == employer)
    if gender:
        stmt = stmt.where(MuqeemRecord.gender == gender)
    return list(db.scalars(stmt.order_by(ordering, MuqeemRecord.id).limit(limit)))


@router.get("/facets")
def facets(db: DBSession, _: Viewer) -> dict[str, list[str]]:
    """Distinct values for the filter drop-downs (active records only)."""
    active = MuqeemRecord.archived_at.is_(None)

    def distinct(expr: Any) -> list[str]:
        rows = db.scalars(
            select(expr).where(active, expr.is_not(None), expr.is_distinct_from("")).distinct().order_by(expr)
        )
        return list(rows)

    return {
        "nationalities": distinct(NATIONALITY),
        "occupations": distinct(MuqeemRecord.occupation),
        "statuses": distinct(MuqeemRecord.status),
        "employers": distinct(MuqeemRecord.employer_name),
        "genders": distinct(MuqeemRecord.gender),
    }


def _top(db: Session, expr: Any, limit: int = 8) -> list[dict[str, Any]]:
    count = func.count(MuqeemRecord.id)
    rows = db.execute(
        select(expr, count)
        .where(MuqeemRecord.archived_at.is_(None), expr.is_not(None), expr.is_distinct_from(""))
        .group_by(expr)
        .order_by(count.desc(), expr)
        .limit(limit)
    )
    return [{"label": label, "count": total} for label, total in rows]


@router.get("/stats")
def stats(db: DBSession, _: Viewer) -> dict[str, Any]:
    active = MuqeemRecord.archived_at.is_(None)
    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def count(*where: Any) -> int:
        return db.scalar(select(func.count(MuqeemRecord.id)).where(*where)) or 0

    total = count(active)
    valid = count(active, func.lower(MuqeemRecord.status) == "valid")

    # Last 12 calendar months of entries, oldest first and zero-filled.
    keys: list[tuple[int, int]] = []
    year, month = now.year, now.month
    for _i in range(12):
        keys.append((year, month))
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    keys.reverse()
    first = datetime(keys[0][0], keys[0][1], 1, tzinfo=UTC)
    bucket = func.date_trunc("month", MuqeemRecord.created_at)
    is_valid = func.lower(MuqeemRecord.status) == "valid"
    rows = db.execute(
        select(
            bucket,
            func.count(MuqeemRecord.id),
            func.count(MuqeemRecord.id).filter(is_valid),
        )
        .where(active, MuqeemRecord.created_at >= first)
        .group_by(bucket)
    )
    by_month = {(d.year, d.month): (n, ok) for d, n, ok in rows}
    monthly = [
        {
            "label": f"{y}-{m:02d}",
            "count": by_month.get((y, m), (0, 0))[0],
            "valid": by_month.get((y, m), (0, 0))[1],
        }
        for y, m in keys
    ]

    newest = select(MuqeemRecord).where(active).order_by(MuqeemRecord.created_at.desc()).limit(6)
    recent = list(db.scalars(newest))
    return {
        "total": total,
        "valid": valid,
        "not_valid": total - valid,
        "this_month": count(active, MuqeemRecord.created_at >= month_start),
        "last_7_days": count(active, MuqeemRecord.created_at >= now - timedelta(days=7)),
        "archived": count(MuqeemRecord.archived_at.is_not(None)),
        "employers": db.scalar(
            select(func.count(func.distinct(MuqeemRecord.employer_name))).where(
                active, MuqeemRecord.employer_name != ""
            )
        )
        or 0,
        "by_status": _top(db, MuqeemRecord.status),
        "by_nationality": _top(db, NATIONALITY),
        "by_occupation": _top(db, MuqeemRecord.occupation),
        "by_gender": _top(db, MuqeemRecord.gender),
        "monthly": monthly,
        "recent": [MuqeemRead.model_validate(r).model_dump(mode="json") for r in recent],
    }


class BulkRequest(BaseModel):
    ids: list[uuid.UUID] = Field(min_length=1, max_length=2000)
    action: Literal["archive", "restore"]


@router.post("/records/bulk")
def bulk_action(body: BulkRequest, request: Request, db: DBSession, user: Manager) -> dict[str, int]:
    rows = list(db.scalars(select(MuqeemRecord).where(MuqeemRecord.id.in_(body.ids))))
    now = datetime.now(UTC)
    changed = 0
    for record in rows:
        if body.action == "archive" and record.archived_at is None:
            record.archived_at = now
        elif body.action == "restore" and record.archived_at is not None:
            record.archived_at = None
        else:
            continue
        changed += 1
        audit(db, request, user, f"muqeem.{body.action}", "muqeem_record", record.id)
    db.commit()
    return {"changed": changed}


class ImportRequest(BaseModel):
    rows: list[dict[str, Any]] = Field(min_length=1, max_length=2000)
    skip_duplicates: bool = True


@router.post("/records/import")
def import_records(body: ImportRequest, request: Request, db: DBSession, user: Admin) -> dict[str, Any]:
    """Bulk create from parsed spreadsheet rows; invalid rows are reported by row number."""
    existing = {
        (iqama, version)
        for iqama, version in db.execute(select(MuqeemRecord.iqama_number, MuqeemRecord.version_number))
    }
    created = skipped = 0
    errors: list[dict[str, Any]] = []
    for index, raw in enumerate(body.rows, start=2):  # row 1 is the header in the sheet
        data = {k: str(v) for k, v in raw.items() if k in MuqeemFields.model_fields and v is not None}
        try:
            fields = MuqeemFields(**data)
        except ValidationError as exc:
            first = exc.errors()[0]
            where = ".".join(str(part) for part in first["loc"])
            errors.append({"row": index, "message": f"{where}: {first['msg'].replace('Value error, ', '')}"})
            continue
        key = (fields.iqama_number, fields.version_number)
        if body.skip_duplicates and key in existing:
            skipped += 1
            continue
        existing.add(key)
        db.add(MuqeemRecord(**fields.model_dump(), created_by=user.id))
        created += 1
    audit(
        db,
        request,
        user,
        "muqeem.import",
        "muqeem_record",
        None,
        after={"created": created, "skipped": skipped, "errors": len(errors)},
    )
    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors[:200]}


class PublicVerify(BaseModel):
    verified: bool
    name: str
    iqama_number: str
    status: str
    report_date: str
    employer_name: str
    nationality: str
    iqama_expiry_date: str


@router.get("/verify/{code}", response_model=PublicVerify)
def verify_report(code: str, db: DBSession) -> PublicVerify:
    """Public, login-free check behind the QR code on the PDF (masked iqama number only)."""
    if not re.fullmatch(r"[A-Za-z0-9_-]{6,16}", code):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    record = db.scalar(select(MuqeemRecord).where(MuqeemRecord.verify_code == code))
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    iqama = record.iqama_number
    return PublicVerify(
        verified=record.archived_at is None,
        name=record.name,
        iqama_number=("*" * max(len(iqama) - 4, 0)) + iqama[-4:],
        status=record.status,
        report_date=record.report_date,
        employer_name=record.employer_name,
        nationality=record.passport_nationality or record.birth_country,
        iqama_expiry_date=record.iqama_expiry_date,
    )


@router.get("/records/{record_id}", response_model=MuqeemRead)
def get_record(record_id: uuid.UUID, db: DBSession, _: Viewer) -> MuqeemRecord:
    return _get_or_404(db, record_id)


@router.get("/records/{record_id}/history")
def record_history(record_id: uuid.UUID, db: DBSession, _: Admin) -> list[dict[str, Any]]:
    """Who changed what and when, newest first (read from the audit log)."""
    logs = db.execute(
        select(AuditLog, User.full_name, User.email)
        .join(User, User.id == AuditLog.actor_id, isouter=True)
        .where(AuditLog.entity_type == "muqeem_record", AuditLog.entity_id == record_id)
        .order_by(AuditLog.created_at.desc())
        .limit(200)
    )
    out: list[dict[str, Any]] = []
    for log, full_name, email in logs:
        before, after = log.before or {}, log.after or {}
        changes = [
            {"field": key, "from": before.get(key, ""), "to": after.get(key, "")}
            for key in after
            if key in before and before.get(key) != after.get(key)
        ]
        out.append(
            {
                "id": str(log.id),
                "action": log.action,
                "at": log.created_at.isoformat(),
                "actor": full_name or email or "System",
                "changes": changes,
            }
        )
    return out


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
    audit(
        db, request, user, "muqeem.update", "muqeem_record", record.id, before=before, after=_snapshot(record)
    )
    db.commit()
    db.refresh(record)
    return record


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    record_id: uuid.UUID,
    request: Request,
    db: DBSession,
    user: Manager,
    permanent: bool = False,
) -> None:
    """Archives by default. `?permanent=true` erases the row and needs the muqeem.admin permission."""
    record = _get_or_404(db, record_id)
    if permanent:
        if "muqeem.admin" not in muqeem_permissions(user):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Permanent delete needs Muqeem admin permission")
        audit(db, request, user, "muqeem.delete", "muqeem_record", record.id, before=_snapshot(record))
        db.delete(record)
    else:
        record.archived_at = datetime.now(UTC)
        audit(db, request, user, "muqeem.archive", "muqeem_record", record.id)
    db.commit()
