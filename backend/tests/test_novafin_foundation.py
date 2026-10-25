"""NovaFin phase 0 safety net.

These tests need a real PostgreSQL (row locks and triggers are the point), so
they only run when NOVAFIN_TEST_DATABASE_URL points at a database that has been
migrated to head, e.g. an isolated schema:

    NOVAFIN_TEST_DATABASE_URL="postgresql+psycopg://user:pw@localhost/db?options=-csearch_path%3Dnovafin_test"
"""

import os
import random
import threading
import uuid
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import sessionmaker

from app.api.routes import novafin_hr
from app.core import idempotency
from app.core.config import settings
from app.models import (
    NovaFinAccount,
    NovaFinEmployee,
    NovaFinJournalVoucher,
    NovaFinJournalVoucherLine,
    NovaFinSalarySlip,
)
from app.services.novafin_ledger import account_balance, get_or_create_account, post_journal
from app.services.novafin_sequences import next_code

TEST_URL = os.environ.get("NOVAFIN_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="NOVAFIN_TEST_DATABASE_URL not set")

D = Decimal


@pytest.fixture(scope="module")
def session_factory():
    engine = create_engine(TEST_URL)
    yield sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    engine.dispose()


@pytest.fixture()
def db(session_factory):
    with session_factory() as session:
        yield session
        session.rollback()


def _wipe(session_factory) -> None:
    with session_factory() as s:
        s.execute(text("SET LOCAL novafin.allow_ledger_rewrite = 'on'"))
        s.execute(text("DELETE FROM novafin_journal_voucher_lines"))
        s.execute(text("DELETE FROM novafin_journal_vouchers"))
        s.execute(text("DELETE FROM novafin_sequences"))
        s.execute(text("DELETE FROM novafin_salary_slips"))
        s.execute(text("DELETE FROM novafin_employees"))
        s.execute(text("DELETE FROM novafin_idempotency_keys"))
        s.commit()


@pytest.fixture()
def clean(session_factory):
    _wipe(session_factory)
    yield
    _wipe(session_factory)


# --- sequences ---


def test_numbers_are_sequential_and_continue_after_existing_codes(db, clean) -> None:
    db.add(NovaFinJournalVoucher(code="GL-0041", voucher_date=date(2026, 1, 1)))
    db.flush()
    assert next_code(db, NovaFinJournalVoucher, "GL") == "GL-0042"
    assert next_code(db, NovaFinJournalVoucher, "GL") == "GL-0043"
    assert next_code(db, NovaFinJournalVoucher, "JV") == "JV-0001"


def test_a_rolled_back_save_does_not_burn_a_number(session_factory, clean) -> None:
    with session_factory() as s:
        assert next_code(s, NovaFinJournalVoucher, "GL") == "GL-0001"
        s.commit()
    with session_factory() as s:
        assert next_code(s, NovaFinJournalVoucher, "GL") == "GL-0002"
        s.rollback()
    with session_factory() as s:
        assert next_code(s, NovaFinJournalVoucher, "GL") == "GL-0002"
        s.commit()


def test_simultaneous_saves_never_get_the_same_number(session_factory, clean) -> None:
    codes: list[str] = []
    lock = threading.Lock()

    def worker() -> None:
        with session_factory() as s:
            code = next_code(s, NovaFinJournalVoucher, "GL")
            s.commit()
            with lock:
                codes.append(code)

    threads = [threading.Thread(target=worker) for _ in range(12)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(codes) == [f"GL-{n:04d}" for n in range(1, 13)]


# --- ledger invariants ---


def test_random_transactions_keep_the_books_balanced(db, clean) -> None:
    rng = random.Random(2026)
    templates = [
        ("ar", "sales", "vout"),
        ("inventory", "ap", "vin"),
        ("cash", "ar", None),
        ("ap", "cash", None),
        ("wages", "cash", None),
        ("dep_exp", "inventory", None),
    ]
    for _ in range(200):
        net = D(rng.randint(1, 500_000)) / 100
        a, b, vat_code = rng.choice(templates)
        if vat_code == "vout":
            vat = (net * D("0.15")).quantize(D("0.01"))
            lines = [(a, net + vat, D(0)), (b, D(0), net), (vat_code, D(0), vat)]
        elif vat_code == "vin":
            vat = (net * D("0.15")).quantize(D("0.01"))
            lines = [(a, net, D(0)), (vat_code, vat, D(0)), (b, D(0), net + vat)]
        else:
            lines = [(a, net, D(0)), (b, D(0), net)]
        post_journal(db, entry_date=date(2026, rng.randint(1, 12), rng.randint(1, 28)), narration="t", lines=lines)
    db.flush()
    debit, credit = db.execute(
        select(func.sum(NovaFinJournalVoucherLine.debit), func.sum(NovaFinJournalVoucherLine.credit))
    ).one()
    assert debit == credit
    codes = [c for (c,) in db.execute(select(NovaFinAccount.code))]
    assert sum((account_balance(db, c) for c in codes), D(0)) == 0


def test_the_app_rejects_an_unbalanced_entry(db, clean) -> None:
    with pytest.raises(HTTPException) as exc:
        post_journal(
            db, entry_date=date(2026, 5, 1), narration="bad", lines=[("cash", D(100), D(0)), ("sales", D(0), D(90))]
        )
    assert exc.value.status_code == 422


def test_the_database_itself_rejects_an_unbalanced_voucher(session_factory, clean) -> None:
    with session_factory() as s:
        cash = get_or_create_account(s, "cash")
        voucher = NovaFinJournalVoucher(code="X-1", voucher_date=date(2026, 5, 1))
        s.add(voucher)
        s.flush()
        s.add(NovaFinJournalVoucherLine(voucher_id=voucher.id, account_id=cash.id, debit=D(100), credit=D(0)))
        with pytest.raises(DBAPIError, match="unbalanced"):
            s.commit()


def test_posted_lines_cannot_be_edited_or_deleted(session_factory, clean) -> None:
    with session_factory() as s:
        post_journal(s, entry_date=date(2026, 5, 1), narration="x", lines=[("cash", D(10), D(0)), ("sales", D(0), D(10))])
        s.commit()
    with session_factory() as s:
        with pytest.raises(DBAPIError, match="cannot be changed or deleted"):
            s.execute(text("UPDATE novafin_journal_voucher_lines SET debit = 999"))
    with session_factory() as s:
        with pytest.raises(DBAPIError, match="cannot be changed or deleted"):
            s.execute(text("DELETE FROM novafin_journal_vouchers"))


def test_a_negative_amount_is_rejected(session_factory, clean) -> None:
    with session_factory() as s:
        cash = get_or_create_account(s, "cash")
        voucher = NovaFinJournalVoucher(code="X-2", voucher_date=date(2026, 5, 1))
        s.add(voucher)
        s.flush()
        s.add(NovaFinJournalVoucherLine(voucher_id=voucher.id, account_id=cash.id, debit=D(-5), credit=D(0)))
        with pytest.raises(DBAPIError):
            s.flush()


# --- payroll double-pay guard ---


def test_paying_a_salary_slip_twice_is_refused(session_factory, clean, monkeypatch) -> None:
    monkeypatch.setattr(novafin_hr, "audit", lambda *a, **k: None)
    with session_factory() as s:
        employee = NovaFinEmployee(name="Test Worker", basic_salary=D(3000))
        s.add(employee)
        s.flush()
        slip = NovaFinSalarySlip(
            code="SLP-0001",
            employee_id=employee.id,
            month="2026-10",
            basic=D(3000),
            allowance=D(0),
            deduction=D(0),
            net=D(3000),
        )
        s.add(slip)
        s.commit()
        slip_id = slip.id
    with session_factory() as s:
        novafin_hr.pay_salary_slip(slip_id, SimpleNamespace(), SimpleNamespace(), s)
    with session_factory() as s:
        with pytest.raises(HTTPException) as exc:
            novafin_hr.pay_salary_slip(slip_id, SimpleNamespace(), SimpleNamespace(), s)
        assert exc.value.status_code == 409
        assert s.scalar(select(func.count()).select_from(NovaFinJournalVoucher)) == 1


# --- idempotency ---


@pytest.fixture()
def idem_client(session_factory, clean, monkeypatch):
    monkeypatch.setattr(idempotency, "SessionLocal", session_factory)
    app = FastAPI()
    app.add_middleware(idempotency.NovaFinIdempotencyMiddleware)
    calls = {"n": 0, "fail": False}

    @app.post(f"{settings.API_V1_PREFIX}/novafin/invoices", status_code=201)
    def create() -> dict:
        calls["n"] += 1
        if calls["fail"]:
            raise HTTPException(status_code=422, detail="nope")
        return {"id": str(uuid.uuid4()), "code": f"INV-{calls['n']:04d}"}

    return TestClient(app), calls


def test_a_repeated_key_replays_the_first_response(idem_client) -> None:
    client, calls = idem_client
    path = f"{settings.API_V1_PREFIX}/novafin/invoices"
    first = client.post(path, headers={"Idempotency-Key": "k1"})
    second = client.post(path, headers={"Idempotency-Key": "k1"})
    assert first.status_code == second.status_code == 201
    assert second.json() == first.json()
    assert second.headers["Idempotent-Replayed"] == "true"
    assert calls["n"] == 1


def test_different_keys_and_missing_keys_create_separate_documents(idem_client) -> None:
    client, calls = idem_client
    path = f"{settings.API_V1_PREFIX}/novafin/invoices"
    client.post(path, headers={"Idempotency-Key": "a"})
    client.post(path, headers={"Idempotency-Key": "b"})
    client.post(path)
    assert calls["n"] == 3


def test_a_failed_request_can_be_retried_with_the_same_key(idem_client) -> None:
    client, calls = idem_client
    path = f"{settings.API_V1_PREFIX}/novafin/invoices"
    calls["fail"] = True
    assert client.post(path, headers={"Idempotency-Key": "k"}).status_code == 422
    calls["fail"] = False
    assert client.post(path, headers={"Idempotency-Key": "k"}).status_code == 201
