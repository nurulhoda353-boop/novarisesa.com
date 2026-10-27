import uuid
from datetime import date
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.cms import audit
from app.core.auth import require_permission
from app.core.database import get_db
from app.models import NovaFinPeriodLock, NovaFinVatReturn, User
from app.services.novafin_ledger import cash_method_code, post_journal
from app.services.novafin_vat import (
    SETTLEMENT_PREFIX,
    build_period,
    compute_return,
    filing_frequency,
    latest_finished_period,
)

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]
NovaFinCloser = Annotated[User, Depends(require_permission("novafin.close_period"))]

ZERO = Decimal("0")


class VatReturnFile(BaseModel):
    year: int = Field(ge=2000, le=2100)
    index: int = Field(ge=1, le=12)  # quarter 1-4, or month 1-12 when filing monthly
    note: str | None = None


class VatReturnSettle(BaseModel):
    payment_date: date
    method: str = "cash"  # "cash" or "bank:<bank id>"


def _plain(value: Any) -> Any:
    """JSON-safe copy (Decimal and date become strings) for the stored snapshot."""
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _plain(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_plain(v) for v in value]
    return value


def _period_or_422(year: int, index: int, frequency: str):
    try:
        return build_period(year, index, frequency)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


def _serialize_filed(record: NovaFinVatReturn) -> dict[str, Any]:
    return {
        "id": str(record.id),
        "period_start": record.period_start,
        "period_end": record.period_end,
        "frequency": record.frequency,
        "output_vat": record.output_vat,
        "input_vat": record.input_vat,
        "net_vat": record.net_vat,
        "filed_at": record.filed_at,
        "note": record.note,
        "settled_on": record.settled_on,
        "settled": record.settlement_voucher_id is not None,
    }


def _filed_for(db: Session, start: date, end: date) -> NovaFinVatReturn | None:
    return db.scalar(select(NovaFinVatReturn).where(NovaFinVatReturn.period_start == start, NovaFinVatReturn.period_end == end))


@router.get("/vat-returns/preview")
def preview_vat_return(user: NovaFinUser, db: DBSession, year: int | None = None, index: int | None = None) -> dict[str, Any]:
    """Without a year/period it opens the latest period that has already ended: the one to file next."""
    frequency = filing_frequency(db)
    if year is None or index is None:
        year, index = latest_finished_period(date.today(), frequency)
    period = _period_or_422(year, index, frequency)
    figures = compute_return(db, period)
    filed = _filed_for(db, period.start, period.end)
    figures["filed"] = _serialize_filed(filed) if filed else None
    figures["can_file"] = bool(
        filed is None and figures["control"]["matches"] and date.today() > period.end
    )
    return figures


@router.get("/vat-returns")
def list_vat_returns(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinVatReturn).order_by(NovaFinVatReturn.period_start.desc())).all()
    return {"items": [_serialize_filed(r) for r in rows]}


@router.post("/vat-returns/file", status_code=status.HTTP_201_CREATED)
def file_vat_return(payload: VatReturnFile, request: Request, user: NovaFinCloser, db: DBSession) -> dict[str, Any]:
    frequency = filing_frequency(db)
    period = _period_or_422(payload.year, payload.index, frequency)
    if date.today() <= period.end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{period.label} has not ended yet. A return can only be filed after the last day of its period ({period.end:%d/%m/%Y}).",
        )
    if _filed_for(db, period.start, period.end) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"The return for {period.label} is already filed.")

    figures = compute_return(db, period)
    control = figures["control"]
    if not control["matches"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "The return does not agree with the ledger, so it cannot be filed. "
                f"Output VAT differs by {control['output_difference']:,.2f} and input VAT by {control['input_difference']:,.2f}. "
                "Find the entry that touches the VAT accounts without a matching invoice or bill."
            ),
        )

    snapshot = _plain({k: v for k, v in figures.items() if k != "documents"})
    snapshot["document_codes"] = [d["code"] for d in figures["documents"]]
    record = NovaFinVatReturn(
        period_start=period.start,
        period_end=period.end,
        frequency=period.frequency,
        output_vat=figures["output_vat"],
        input_vat=figures["input_vat"],
        net_vat=figures["net_vat"],
        snapshot=snapshot,
        filed_by=user.id,
        note=payload.note,
    )
    db.add(record)
    for year, month in period.months:
        if db.scalar(select(NovaFinPeriodLock.id).where(NovaFinPeriodLock.year == year, NovaFinPeriodLock.month == month)) is None:
            db.add(NovaFinPeriodLock(year=year, month=month, locked_by=user.id, note=f"VAT return {period.label} filed"))
    db.flush()
    audit(
        db, request, user, "novafin.vat_return_filed", "novafin_vat_returns", record.id,
        after={"period": period.label, "output_vat": str(figures["output_vat"]), "input_vat": str(figures["input_vat"]), "net_vat": str(figures["net_vat"])},
    )
    db.commit()
    db.refresh(record)
    return _serialize_filed(record)


@router.post("/vat-returns/{return_id}/settle", status_code=status.HTTP_201_CREATED)
def settle_vat_return(return_id: uuid.UUID, payload: VatReturnSettle, request: Request, user: NovaFinCloser, db: DBSession) -> dict[str, Any]:
    record = db.get(NovaFinVatReturn, return_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VAT return not found")
    if record.settlement_voucher_id is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This return has already been settled.")

    output_vat, input_vat, net = Decimal(record.output_vat), Decimal(record.input_vat), Decimal(record.net_vat)
    pay_code = cash_method_code(payload.method)
    label = f"{record.period_start:%d/%m/%Y}–{record.period_end:%d/%m/%Y}"
    lines = [("vout", output_vat, ZERO), ("vin", ZERO, input_vat)]
    if net > 0:
        lines.append((pay_code, ZERO, net))
    elif net < 0:
        lines.append((pay_code, -net, ZERO))
    voucher = post_journal(
        db,
        entry_date=payload.payment_date,
        narration=f"VAT return {label}: net {'paid to' if net >= 0 else 'refunded by'} ZATCA {abs(net):,.2f}",
        lines=lines,
        code_prefix=SETTLEMENT_PREFIX,
    )
    record.settlement_voucher_id = voucher.id
    record.settled_on = payload.payment_date
    audit(
        db, request, user, "novafin.vat_return_settled", "novafin_vat_returns", record.id,
        after={"voucher": voucher.code, "net_vat": str(net), "method": payload.method},
    )
    db.commit()
    db.refresh(record)
    return _serialize_filed(record)
