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
from app.models import NovaFinAccount, NovaFinAsset, NovaFinJournalVoucher, NovaFinJournalVoucherLine, User
from app.schemas.novafin_accounting import AccountUpsert, AssetUpsert, JournalVoucherCreate
from app.services.novafin_ledger import account_balance, is_period_locked, post_journal

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]
NovaFinManager = Annotated[User, Depends(require_permission("novafin.manage"))]


# --- Chart of accounts ---


def serialize_account(a: NovaFinAccount) -> dict[str, Any]:
    return {"id": str(a.id), "code": a.code, "name": a.name, "account_type": a.account_type}


@router.get("/accounts")
def list_accounts(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinAccount).order_by(NovaFinAccount.code)).all()
    return {"items": [serialize_account(a) for a in rows]}


@router.post("/accounts", status_code=status.HTTP_201_CREATED)
def create_account(payload: AccountUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    data = payload.model_dump()
    opening_amount = data.pop("opening_amount")
    opening_side = data.pop("opening_side")
    account = NovaFinAccount(**data)
    db.add(account)
    db.flush()
    if opening_amount:
        debit, credit = (opening_amount, Decimal("0")) if opening_side == "debit" else (Decimal("0"), opening_amount)
        post_journal(
            db, entry_date=date_type.today(), narration=f"Opening balance — {account.name}",
            lines=[(account.code, debit, credit), ("opening_equity", credit, debit)], code_prefix="OB",
        )
    audit(db, request, user, "novafin.account_created", "novafin_accounts", account.id, after=serialize_account(account))
    db.commit()
    db.refresh(account)
    return serialize_account(account)


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: uuid.UUID, request: Request, user: NovaFinManager, db: DBSession) -> None:
    account = db.get(NovaFinAccount, account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    audit(db, request, user, "novafin.account_deleted", "novafin_accounts", account.id, before=serialize_account(account))
    db.delete(account)
    db.commit()


# --- Journal vouchers (manual double-entry) ---


def serialize_journal_voucher(jv: NovaFinJournalVoucher) -> dict[str, Any]:
    return {
        "id": str(jv.id),
        "code": jv.code,
        "voucher_date": jv.voucher_date.isoformat(),
        "narration": jv.narration,
        "lines": [
            {"account_id": str(l.account_id), "account_name": l.account.name if l.account else None, "debit": l.debit, "credit": l.credit}
            for l in jv.lines
        ],
    }


@router.get("/journal-vouchers")
def list_journal_vouchers(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinJournalVoucher)
        .options(selectinload(NovaFinJournalVoucher.lines).selectinload(NovaFinJournalVoucherLine.account))
        .order_by(NovaFinJournalVoucher.voucher_date.desc(), NovaFinJournalVoucher.code.desc())
    ).all()
    return {"items": [serialize_journal_voucher(jv) for jv in rows]}


@router.post("/journal-vouchers", status_code=status.HTTP_201_CREATED)
def create_journal_voucher(payload: JournalVoucherCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    total_debit = sum((l.debit for l in payload.lines), start=payload.lines[0].debit * 0)
    total_credit = sum((l.credit for l in payload.lines), start=payload.lines[0].credit * 0)
    if total_debit != total_credit:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Debit and credit totals must match")
    if is_period_locked(db, payload.voucher_date):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This date falls within a closed fiscal year — no new entry can be posted.",
        )

    account_ids = [l.account_id for l in payload.lines]
    accounts = {a.id: a for a in db.scalars(select(NovaFinAccount).where(NovaFinAccount.id.in_(account_ids)))}
    missing = set(account_ids) - set(accounts)
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account(s) not found: {missing}")

    jv = NovaFinJournalVoucher(code=_next_code(db, NovaFinJournalVoucher, "JV"), voucher_date=payload.voucher_date, narration=payload.narration)
    db.add(jv)
    db.flush()
    for line in payload.lines:
        db.add(NovaFinJournalVoucherLine(voucher_id=jv.id, account_id=line.account_id, debit=line.debit, credit=line.credit))

    audit(db, request, user, "novafin.journal_voucher_created", "novafin_journal_vouchers", jv.id, after={"code": jv.code})
    db.commit()
    db.refresh(jv)
    return serialize_journal_voucher(jv)


# --- Fixed assets ---


def serialize_asset(a: NovaFinAsset, db: Session) -> dict[str, Any]:
    book_value = account_balance(db, f"asset:{a.id}")
    return {
        "id": str(a.id), "name": a.name, "cost": a.cost, "purchase_date": a.purchase_date.isoformat(),
        "depreciation_rate": a.depreciation_rate, "funding_method": a.funding_method, "is_active": a.is_active,
        "monthly_depreciation": (a.cost * a.depreciation_rate / Decimal("100") / Decimal("12")).quantize(Decimal("0.01")),
        "book_value": book_value,
        "accumulated_depreciation": a.cost - book_value,
        "last_depreciation_period": a.last_depreciation_period,
    }


@router.get("/assets")
def list_assets(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinAsset).order_by(NovaFinAsset.purchase_date.desc())).all()
    return {"items": [serialize_asset(a, db) for a in rows]}


@router.post("/assets", status_code=status.HTTP_201_CREATED)
def create_asset(payload: AssetUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    asset = NovaFinAsset(**payload.model_dump())
    db.add(asset)
    db.flush()
    post_journal(
        db, entry_date=asset.purchase_date, narration=f"Asset purchase — {asset.name}",
        lines=[(f"asset:{asset.id}", asset.cost, Decimal("0")), (asset.funding_method, Decimal("0"), asset.cost)],
        code_prefix="GL",
    )
    audit(db, request, user, "novafin.asset_created", "novafin_assets", asset.id, after=_jsonable(serialize_asset(asset, db)))
    db.commit()
    db.refresh(asset)
    return serialize_asset(asset, db)


@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(asset_id: uuid.UUID, request: Request, user: NovaFinManager, db: DBSession) -> None:
    asset = db.get(NovaFinAsset, asset_id)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    audit(db, request, user, "novafin.asset_deleted", "novafin_assets", asset.id, before=_jsonable(serialize_asset(asset, db)))
    db.delete(asset)
    db.commit()


@router.post("/assets/depreciation-run")
def run_depreciation(request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    """Idempotent per (asset, calendar month) — matches the reference's manual,
    on-demand monthly depreciation run, straight-line, capped so book value
    never goes below zero."""
    period = date_type.today().strftime("%Y-%m")
    posted: list[dict[str, Any]] = []
    total = Decimal("0")
    lines: list[tuple[str, Decimal, Decimal]] = []
    for asset in db.scalars(select(NovaFinAsset).where(NovaFinAsset.is_active.is_(True))):
        if asset.last_depreciation_period == period:
            continue
        book_value = account_balance(db, f"asset:{asset.id}")
        monthly = (asset.cost * asset.depreciation_rate / Decimal("100") / Decimal("12")).quantize(Decimal("0.01"))
        monthly = min(monthly, max(Decimal("0"), book_value))
        if monthly <= 0:
            asset.last_depreciation_period = period
            continue
        lines.append((f"asset:{asset.id}", Decimal("0"), monthly))
        total += monthly
        asset.last_depreciation_period = period
        posted.append({"name": asset.name, "amount": monthly})

    if total > 0:
        post_journal(
            db, entry_date=date_type.today(), narration=f"Monthly depreciation — {period}",
            lines=[("dep_exp", total, Decimal("0")), *lines], code_prefix="DEP",
        )
        audit(db, request, user, "novafin.depreciation_posted", "novafin_assets", None, after=_jsonable({"period": period, "total": total, "assets": posted}))
    db.commit()
    return {"period": period, "total": total, "assets": posted}
