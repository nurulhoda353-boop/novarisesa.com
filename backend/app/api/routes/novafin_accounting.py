import uuid
from datetime import date as date_type
from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.routes.cms import audit
from app.api.routes.novafin import _jsonable, _next_code, dims_for
from app.core.auth import require_permission
from app.core.database import get_db
from app.models import NovaFinAccount, NovaFinAsset, NovaFinJournalVoucher, NovaFinJournalVoucherLine, User
from app.schemas.novafin_accounting import AccountUpdate, AccountUpsert, AssetUpsert, JournalVoucherCreate, ReverseRequest
from app.services.novafin_ledger import account_balance, post_journal, reverse_voucher

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]
NovaFinManager = Annotated[User, Depends(require_permission("novafin.manage"))]


# --- Chart of accounts ---


def serialize_account(a: NovaFinAccount) -> dict[str, Any]:
    return {
        "id": str(a.id),
        "code": a.code,
        "number": a.number,
        "name": a.name,
        "name_ar": a.name_ar,
        "account_type": a.account_type,
        "parent_id": str(a.parent_id) if a.parent_id else None,
        "is_group": a.is_group,
        "is_system": a.is_system,
        "is_active": a.is_active,
    }


@router.get("/accounts")
def list_accounts(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinAccount).order_by(NovaFinAccount.number.asc().nulls_last(), NovaFinAccount.code)).all()
    return {"items": [serialize_account(a) for a in rows]}


@router.post("/accounts", status_code=status.HTTP_201_CREATED)
def create_account(payload: AccountUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    data = payload.model_dump()
    opening_amount = data.pop("opening_amount")
    opening_side = data.pop("opening_side")
    if db.scalar(select(NovaFinAccount.id).where(NovaFinAccount.code == data["code"])) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"An account with code {data['code']} already exists.")
    if data.get("number") and db.scalar(select(NovaFinAccount.id).where(NovaFinAccount.number == data["number"])) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Account number {data['number']} is already used.")
    if data.get("parent_id") is not None:
        parent = db.get(NovaFinAccount, data["parent_id"])
        if parent is None or not parent.is_group:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose a heading account as the parent.")
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


@router.patch("/accounts/{account_id}")
def update_account(account_id: uuid.UUID, payload: AccountUpdate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    account = db.get(NovaFinAccount, account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    before = serialize_account(account)
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("is_active") is False and account.is_system:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="System accounts are used automatically and can't be switched off.")
    for field, value in changes.items():
        setattr(account, field, value)
    audit(db, request, user, "novafin.account_updated", "novafin_accounts", account.id, before=before, after=serialize_account(account))
    db.commit()
    db.refresh(account)
    return serialize_account(account)


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: uuid.UUID, request: Request, user: NovaFinManager, db: DBSession) -> None:
    account = db.get(NovaFinAccount, account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if account.is_system:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="System accounts cannot be deleted — the ledger posts to them automatically.",
        )
    if db.scalar(select(NovaFinJournalVoucherLine.id).where(NovaFinJournalVoucherLine.account_id == account.id).limit(1)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account already has transactions and cannot be deleted. Mark it inactive instead.",
        )
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
        "reversal_of_id": str(jv.reversal_of_id) if jv.reversal_of_id else None,
        "lines": [
            {
                "account_id": str(l.account_id),
                "account_number": l.account.number if l.account else None,
                "account_name": l.account.name if l.account else None,
                "debit": l.debit,
                "credit": l.credit,
                "customer_id": str(l.customer_id) if l.customer_id else None,
                "vendor_id": str(l.vendor_id) if l.vendor_id else None,
                "project_id": str(l.project_id) if l.project_id else None,
                "cost_center_id": str(l.cost_center_id) if l.cost_center_id else None,
                "branch_id": str(l.branch_id) if l.branch_id else None,
            }
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
    account_ids = [l.account_id for l in payload.lines]
    accounts = {a.id: a for a in db.scalars(select(NovaFinAccount).where(NovaFinAccount.id.in_(account_ids)))}
    missing = set(account_ids) - set(accounts)
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account(s) not found: {missing}")

    lines = []
    for line in payload.lines:
        line_dims = dims_for(
            db, line.project_id, line.cost_center_id, line.branch_id, customer_id=line.customer_id, vendor_id=line.vendor_id
        )
        lines.append((accounts[line.account_id].code, line.debit, line.credit, line_dims))
    voucher = post_journal(
        db,
        entry_date=payload.voucher_date,
        narration=payload.narration or "Journal voucher",
        lines=lines,
        code_prefix="JV",
        require_project_for_direct_costs=True,
    )
    audit(db, request, user, "novafin.journal_voucher_created", "novafin_journal_vouchers", voucher.id, after={"code": voucher.code})
    db.commit()
    jv = db.scalar(
        select(NovaFinJournalVoucher)
        .options(selectinload(NovaFinJournalVoucher.lines).selectinload(NovaFinJournalVoucherLine.account))
        .where(NovaFinJournalVoucher.id == voucher.id)
    )
    return serialize_journal_voucher(jv)


@router.post("/journal-vouchers/{voucher_id}/reverse", status_code=status.HTTP_201_CREATED)
def reverse_journal_voucher(
    voucher_id: uuid.UUID, payload: ReverseRequest, request: Request, user: NovaFinManager, db: DBSession
) -> dict[str, Any]:
    """Undo a manual entry the safe way: post its exact mirror image, linked to it. Nothing is erased."""
    original = db.get(NovaFinJournalVoucher, voucher_id)
    if original is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal voucher not found")
    if not original.code.startswith("JV-"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only manual journal vouchers can be reversed here. Correct an invoice or bill with a credit note instead.",
        )
    mirror = reverse_voucher(
        db,
        original,
        entry_date=payload.reversal_date or date_type.today(),
        narration=f"Reversal of {original.code}: {payload.reason}",
    )
    audit(db, request, user, "novafin.journal_voucher_reversed", "novafin_journal_vouchers", original.id, after={"reversal": mirror.code, "reason": payload.reason})
    db.commit()
    jv = db.scalar(
        select(NovaFinJournalVoucher)
        .options(selectinload(NovaFinJournalVoucher.lines).selectinload(NovaFinJournalVoucherLine.account))
        .where(NovaFinJournalVoucher.id == mirror.id)
    )
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
