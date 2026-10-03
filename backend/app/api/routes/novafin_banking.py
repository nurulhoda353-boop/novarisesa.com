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
from app.models import (
    NovaFinBank,
    NovaFinBranch,
    NovaFinCapitalMove,
    NovaFinCashMove,
    NovaFinCheque,
    NovaFinContra,
    NovaFinCustomer,
    NovaFinExpenseCategory,
    NovaFinExpenseVoucher,
    NovaFinIncomeCategory,
    NovaFinIncomeVoucher,
    NovaFinVendor,
    User,
)
from app.schemas.novafin_banking import (
    BankUpsert,
    BranchUpsert,
    CapitalMoveCreate,
    CashMoveCreate,
    CategoryUpsert,
    ChequeCreate,
    ContraCreate,
    VoucherCreate,
)
from app.services.novafin_ledger import post_journal

router = APIRouter(prefix="/novafin")

DBSession = Annotated[Session, Depends(get_db)]
NovaFinUser = Annotated[User, Depends(require_permission("novafin.view", "novafin.manage"))]
NovaFinManager = Annotated[User, Depends(require_permission("novafin.manage"))]


# --- Banks ---


def serialize_bank(bank: NovaFinBank) -> dict[str, Any]:
    return {
        "id": str(bank.id),
        "name": bank.name,
        "branch": bank.branch,
        "account_no": bank.account_no,
        "opening_balance": bank.opening_balance,
        "is_active": bank.is_active,
    }


@router.get("/banks")
def list_banks(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinBank).order_by(NovaFinBank.name)).all()
    return {"items": [serialize_bank(b) for b in rows]}


@router.post("/banks", status_code=status.HTTP_201_CREATED)
def create_bank(payload: BankUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    bank = NovaFinBank(**payload.model_dump())
    db.add(bank)
    db.flush()
    if bank.opening_balance:
        post_journal(
            db,
            entry_date=date_type.today(),
            narration=f"Opening balance — {bank.name}",
            lines=[(f"bank:{bank.id}", bank.opening_balance, Decimal("0")), ("opening_equity", Decimal("0"), bank.opening_balance)],
            code_prefix="OB",
        )
    audit(db, request, user, "novafin.bank_created", "novafin_banks", bank.id, after=_jsonable(serialize_bank(bank)))
    db.commit()
    db.refresh(bank)
    return serialize_bank(bank)


@router.delete("/banks/{bank_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bank(bank_id: uuid.UUID, request: Request, user: NovaFinManager, db: DBSession) -> None:
    bank = db.get(NovaFinBank, bank_id)
    if bank is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank not found")
    audit(db, request, user, "novafin.bank_deleted", "novafin_banks", bank.id, before=_jsonable(serialize_bank(bank)))
    db.delete(bank)
    db.commit()


# --- Branches ---


def serialize_branch(branch: NovaFinBranch) -> dict[str, Any]:
    return {"id": str(branch.id), "name": branch.name, "city": branch.city}


@router.get("/branches")
def list_branches(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinBranch).order_by(NovaFinBranch.name)).all()
    return {"items": [serialize_branch(b) for b in rows]}


@router.post("/branches", status_code=status.HTTP_201_CREATED)
def create_branch(payload: BranchUpsert, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    branch = NovaFinBranch(**payload.model_dump())
    db.add(branch)
    db.flush()
    audit(db, request, user, "novafin.branch_created", "novafin_branches", branch.id, after=serialize_branch(branch))
    db.commit()
    db.refresh(branch)
    return serialize_branch(branch)


# --- Cash moves (receipts & payments) ---


def serialize_cash_move(move: NovaFinCashMove) -> dict[str, Any]:
    return {
        "id": str(move.id),
        "code": move.code,
        "kind": move.kind,
        "party_name": move.party_name,
        "customer_id": str(move.customer_id) if move.customer_id else None,
        "vendor_id": str(move.vendor_id) if move.vendor_id else None,
        "amount": move.amount,
        "move_date": move.move_date.isoformat(),
        "method": move.method,
        "is_reconciled": move.is_reconciled,
    }


@router.get("/cash-moves")
def list_cash_moves(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinCashMove).order_by(NovaFinCashMove.move_date.desc(), NovaFinCashMove.code.desc())).all()
    return {"items": [serialize_cash_move(m) for m in rows]}


@router.post("/cash-moves", status_code=status.HTTP_201_CREATED)
def create_cash_move(payload: CashMoveCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    prefix = "REC" if payload.kind == "receipt" else "PAY"
    data = payload.model_dump()
    if data.get("customer_id") and not data.get("party_name"):
        customer = db.get(NovaFinCustomer, data["customer_id"])
        if customer:
            data["party_name"] = customer.name
    if data.get("vendor_id") and not data.get("party_name"):
        vendor = db.get(NovaFinVendor, data["vendor_id"])
        if vendor:
            data["party_name"] = vendor.name
    move = NovaFinCashMove(code=_next_code(db, NovaFinCashMove, prefix), **data)
    db.add(move)
    db.flush()
    if move.kind == "receipt":
        post_journal(
            db, entry_date=move.move_date, narration=f"Receipt — {move.party_name or move.code}",
            lines=[(move.method, move.amount, Decimal("0")), ("ar", Decimal("0"), move.amount)], code_prefix="GL",
        )
    else:
        post_journal(
            db, entry_date=move.move_date, narration=f"Payment — {move.party_name or move.code}",
            lines=[("ap", move.amount, Decimal("0")), (move.method, Decimal("0"), move.amount)], code_prefix="GL",
        )
    audit(db, request, user, "novafin.cash_move_created", "novafin_cash_moves", move.id, after=_jsonable(serialize_cash_move(move)))
    db.commit()
    db.refresh(move)
    return serialize_cash_move(move)


@router.patch("/cash-moves/{move_id}/reconcile")
def reconcile_cash_move(move_id: uuid.UUID, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    move = db.get(NovaFinCashMove, move_id)
    if move is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cash move not found")
    move.is_reconciled = True
    audit(db, request, user, "novafin.cash_move_reconciled", "novafin_cash_moves", move.id)
    db.commit()
    db.refresh(move)
    return serialize_cash_move(move)


# --- Cheques ---


def serialize_cheque(cheque: NovaFinCheque) -> dict[str, Any]:
    return {
        "id": str(cheque.id),
        "cheque_no": cheque.cheque_no,
        "bank_id": str(cheque.bank_id) if cheque.bank_id else None,
        "bank_name": cheque.bank.name if cheque.bank else None,
        "kind": cheque.kind,
        "party_name": cheque.party_name,
        "due_date": cheque.due_date.isoformat(),
        "cheque_date": cheque.cheque_date.isoformat(),
        "amount": cheque.amount,
        "status": cheque.status,
        "is_reconciled": cheque.is_reconciled,
    }


@router.get("/cheques")
def list_cheques(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinCheque).options(selectinload(NovaFinCheque.bank)).order_by(NovaFinCheque.due_date.desc())
    ).all()
    return {"items": [serialize_cheque(c) for c in rows]}


@router.post("/cheques", status_code=status.HTTP_201_CREATED)
def create_cheque(payload: ChequeCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    cheque = NovaFinCheque(**payload.model_dump())
    db.add(cheque)
    db.flush()
    audit(db, request, user, "novafin.cheque_created", "novafin_cheques", cheque.id, after=_jsonable(serialize_cheque(cheque)))
    db.commit()
    db.refresh(cheque)
    return serialize_cheque(cheque)


@router.patch("/cheques/{cheque_id}/status")
def update_cheque_status(cheque_id: uuid.UUID, new_status: str, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    if new_status not in {"pending", "cleared", "bounced"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status")
    cheque = db.get(NovaFinCheque, cheque_id)
    if cheque is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cheque not found")
    if new_status == "cleared" and cheque.status != "cleared":
        # Clearing a cheque auto-records the matching receipt/payment, same as
        # the reference implementation — a bounce on a still-pending cheque is
        # a no-op accounting-wise since an uncleared cheque never posted anything.
        method = f"bank:{cheque.bank_id}" if cheque.bank_id else "cash"
        kind = "receipt" if cheque.kind == "inward" else "payment"
        prefix = "REC" if kind == "receipt" else "PAY"
        move = NovaFinCashMove(
            code=_next_code(db, NovaFinCashMove, prefix),
            kind=kind,
            party_name=cheque.party_name,
            amount=cheque.amount,
            move_date=date_type.today(),
            method=method,
        )
        db.add(move)
        db.flush()
        if kind == "receipt":
            post_journal(
                db, entry_date=move.move_date, narration=f"Cheque cleared — {cheque.cheque_no}",
                lines=[(method, move.amount, Decimal("0")), ("ar", Decimal("0"), move.amount)], code_prefix="GL",
            )
        else:
            post_journal(
                db, entry_date=move.move_date, narration=f"Cheque cleared — {cheque.cheque_no}",
                lines=[("ap", move.amount, Decimal("0")), (method, Decimal("0"), move.amount)], code_prefix="GL",
            )
    cheque.status = new_status
    audit(db, request, user, "novafin.cheque_status_updated", "novafin_cheques", cheque.id, after={"status": new_status})
    db.commit()
    db.refresh(cheque)
    return serialize_cheque(cheque)


# --- Income / expense categories & vouchers ---


@router.get("/income-categories")
def list_income_categories(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinIncomeCategory).order_by(NovaFinIncomeCategory.name)).all()
    return {"items": [{"id": str(c.id), "name": c.name} for c in rows]}


@router.post("/income-categories", status_code=status.HTTP_201_CREATED)
def create_income_category(payload: CategoryUpsert, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    cat = NovaFinIncomeCategory(name=payload.name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": str(cat.id), "name": cat.name}


@router.get("/expense-categories")
def list_expense_categories(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinExpenseCategory).order_by(NovaFinExpenseCategory.name)).all()
    return {"items": [{"id": str(c.id), "name": c.name} for c in rows]}


@router.post("/expense-categories", status_code=status.HTTP_201_CREATED)
def create_expense_category(payload: CategoryUpsert, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    cat = NovaFinExpenseCategory(name=payload.name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": str(cat.id), "name": cat.name}


def serialize_income_voucher(v: NovaFinIncomeVoucher) -> dict[str, Any]:
    return {
        "id": str(v.id), "code": v.code, "category_id": str(v.category_id),
        "category_name": v.category.name if v.category else None,
        "voucher_date": v.voucher_date.isoformat(), "amount": v.amount, "method": v.method, "note": v.note,
    }


@router.get("/income-vouchers")
def list_income_vouchers(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinIncomeVoucher).options(selectinload(NovaFinIncomeVoucher.category)).order_by(NovaFinIncomeVoucher.voucher_date.desc())
    ).all()
    return {"items": [serialize_income_voucher(v) for v in rows]}


@router.post("/income-vouchers", status_code=status.HTTP_201_CREATED)
def create_income_voucher(payload: VoucherCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    if db.get(NovaFinIncomeCategory, payload.category_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    voucher = NovaFinIncomeVoucher(code=_next_code(db, NovaFinIncomeVoucher, "INC"), **payload.model_dump())
    db.add(voucher)
    db.flush()
    post_journal(
        db, entry_date=voucher.voucher_date, narration=f"Income — {voucher.category.name if voucher.category else voucher.code}",
        lines=[(voucher.method, voucher.amount, Decimal("0")), (f"inc:{voucher.category_id}", Decimal("0"), voucher.amount)],
        code_prefix="GL",
    )
    audit(db, request, user, "novafin.income_voucher_created", "novafin_income_vouchers", voucher.id, after=_jsonable({"code": voucher.code, "amount": voucher.amount}))
    db.commit()
    db.refresh(voucher)
    return serialize_income_voucher(voucher)


def serialize_expense_voucher(v: NovaFinExpenseVoucher) -> dict[str, Any]:
    return {
        "id": str(v.id), "code": v.code, "category_id": str(v.category_id),
        "category_name": v.category.name if v.category else None,
        "voucher_date": v.voucher_date.isoformat(), "amount": v.amount, "method": v.method, "note": v.note,
    }


@router.get("/expense-vouchers")
def list_expense_vouchers(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(
        select(NovaFinExpenseVoucher).options(selectinload(NovaFinExpenseVoucher.category)).order_by(NovaFinExpenseVoucher.voucher_date.desc())
    ).all()
    return {"items": [serialize_expense_voucher(v) for v in rows]}


@router.post("/expense-vouchers", status_code=status.HTTP_201_CREATED)
def create_expense_voucher(payload: VoucherCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    if db.get(NovaFinExpenseCategory, payload.category_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    voucher = NovaFinExpenseVoucher(code=_next_code(db, NovaFinExpenseVoucher, "EXP"), **payload.model_dump())
    db.add(voucher)
    db.flush()
    post_journal(
        db, entry_date=voucher.voucher_date, narration=f"Expense — {voucher.category.name if voucher.category else voucher.code}",
        lines=[(f"exp:{voucher.category_id}", voucher.amount, Decimal("0")), (voucher.method, Decimal("0"), voucher.amount)],
        code_prefix="GL",
    )
    audit(db, request, user, "novafin.expense_voucher_created", "novafin_expense_vouchers", voucher.id, after=_jsonable({"code": voucher.code, "amount": voucher.amount}))
    db.commit()
    db.refresh(voucher)
    return serialize_expense_voucher(voucher)


# --- Capital / drawings ---


def serialize_capital_move(m: NovaFinCapitalMove) -> dict[str, Any]:
    return {"id": str(m.id), "code": m.code, "kind": m.kind, "move_date": m.move_date.isoformat(), "amount": m.amount, "method": m.method, "note": m.note}


@router.get("/capital-moves")
def list_capital_moves(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinCapitalMove).order_by(NovaFinCapitalMove.move_date.desc())).all()
    return {"items": [serialize_capital_move(m) for m in rows]}


@router.post("/capital-moves", status_code=status.HTTP_201_CREATED)
def create_capital_move(payload: CapitalMoveCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    prefix = "CAP" if payload.kind == "capital" else "DRW"
    move = NovaFinCapitalMove(code=_next_code(db, NovaFinCapitalMove, prefix), **payload.model_dump())
    db.add(move)
    db.flush()
    if move.kind == "capital":
        post_journal(
            db, entry_date=move.move_date, narration=f"Capital injection ({move.code})",
            lines=[(move.method, move.amount, Decimal("0")), ("capital", Decimal("0"), move.amount)], code_prefix="GL",
        )
    else:
        post_journal(
            db, entry_date=move.move_date, narration=f"Owner's drawings ({move.code})",
            lines=[("drawings", move.amount, Decimal("0")), (move.method, Decimal("0"), move.amount)], code_prefix="GL",
        )
    audit(db, request, user, "novafin.capital_move_created", "novafin_capital_moves", move.id, after=_jsonable(serialize_capital_move(move)))
    db.commit()
    db.refresh(move)
    return serialize_capital_move(move)


# --- Contra (cash <-> bank transfers) ---


def serialize_contra(c: NovaFinContra) -> dict[str, Any]:
    return {"id": str(c.id), "code": c.code, "contra_date": c.contra_date.isoformat(), "from_method": c.from_method, "to_method": c.to_method, "amount": c.amount, "note": c.note}


@router.get("/contras")
def list_contras(user: NovaFinUser, db: DBSession) -> dict[str, Any]:
    rows = db.scalars(select(NovaFinContra).order_by(NovaFinContra.contra_date.desc())).all()
    return {"items": [serialize_contra(c) for c in rows]}


@router.post("/contras", status_code=status.HTTP_201_CREATED)
def create_contra(payload: ContraCreate, request: Request, user: NovaFinManager, db: DBSession) -> dict[str, Any]:
    if payload.from_method == payload.to_method:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="From and To accounts must differ")
    contra = NovaFinContra(code=_next_code(db, NovaFinContra, "CX"), **payload.model_dump())
    db.add(contra)
    db.flush()
    post_journal(
        db, entry_date=contra.contra_date, narration=f"Contra transfer ({contra.code})",
        lines=[(contra.to_method, contra.amount, Decimal("0")), (contra.from_method, Decimal("0"), contra.amount)],
        code_prefix="GL",
    )
    audit(db, request, user, "novafin.contra_created", "novafin_contras", contra.id, after=_jsonable(serialize_contra(contra)))
    db.commit()
    db.refresh(contra)
    return serialize_contra(contra)
