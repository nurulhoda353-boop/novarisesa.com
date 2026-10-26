"""NovaFin safety net (phase 0) and accounting integrity (phase 1).

These tests need a real PostgreSQL (row locks and triggers are the point), so they only run
when NOVAFIN_TEST_DATABASE_URL points at a database migrated to head, e.g. an isolated schema:

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

from app.api.routes import novafin_admin, novafin_banking, novafin_corrections, novafin_hr
from app.api.routes.novafin import build_invoice, validate_party_vat
from app.api.routes.novafin_reports import project_profit_and_loss
from app.core import idempotency
from app.core.config import settings
from app.models import (
    NovaFinAccount,
    NovaFinCustomer,
    NovaFinEmployee,
    NovaFinFiscalYear,
    NovaFinInvoice,
    NovaFinItem,
    NovaFinItemKind,
    NovaFinJournalVoucher,
    NovaFinJournalVoucherLine,
    NovaFinPeriodLock,
    NovaFinProject,
    NovaFinSalarySlip,
    NovaFinVendor,
)
from app.schemas.novafin import DocumentLineInput, InvoiceCreate
from app.schemas.novafin_banking import AllocationInput, CashMoveCreate
from app.schemas.novafin_phase1 import FiscalYearReopen, WriteOffCreate
from app.schemas.novafin_sales import InvoiceReplace
from app.services.novafin_ar import ar_control_check, customer_aging, customer_statement
from app.services.novafin_ledger import (
    Dims,
    account_balance,
    get_or_create_account,
    post_journal,
    reverse_voucher,
)
from app.services.novafin_sequences import next_code

TEST_URL = os.environ.get("NOVAFIN_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="NOVAFIN_TEST_DATABASE_URL not set")

D = Decimal
USER = SimpleNamespace(id=uuid.uuid4(), email="test@example.com")
REQUEST = SimpleNamespace()


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


WIPE = [
    "DELETE FROM novafin_allocations",
    "UPDATE novafin_fiscal_years SET closing_voucher_id = NULL, status = 'open', closed_at = NULL, net_profit_snapshot = NULL",
    "DELETE FROM novafin_journal_voucher_lines",
    "DELETE FROM novafin_journal_vouchers",
    "DELETE FROM novafin_credit_notes",
    "DELETE FROM novafin_debit_notes",
    "DELETE FROM novafin_sales_return_lines",
    "DELETE FROM novafin_sales_returns",
    "DELETE FROM novafin_stock_moves",
    "DELETE FROM novafin_invoice_lines",
    "UPDATE novafin_invoices SET corrects_invoice_id = NULL",
    "DELETE FROM novafin_invoices",
    "DELETE FROM novafin_cash_moves",
    "DELETE FROM novafin_salary_slips",
    "DELETE FROM novafin_employees",
    "DELETE FROM novafin_items",
    "DELETE FROM novafin_customers",
    "DELETE FROM novafin_vendors",
    "DELETE FROM novafin_projects WHERE website_slug IS NULL",
    "DELETE FROM novafin_period_locks",
    "DELETE FROM novafin_sequences",
    "DELETE FROM novafin_idempotency_keys",
]


def _wipe(session_factory) -> None:
    with session_factory() as s:
        s.execute(text("SET LOCAL novafin.allow_ledger_rewrite = 'on'"))
        for statement in WIPE:
            s.execute(text(statement))
        s.commit()


@pytest.fixture()
def clean(session_factory):
    _wipe(session_factory)
    yield
    _wipe(session_factory)


@pytest.fixture()
def no_audit(monkeypatch):
    for module in (novafin_hr, novafin_banking, novafin_corrections, novafin_admin):
        monkeypatch.setattr(module, "audit", lambda *a, **k: None)


def make_customer(s, name="Aramco", vat="300000000000003") -> NovaFinCustomer:
    customer = NovaFinCustomer(name=name, vat_number=vat, credit_limit=D(0), opening_balance=D(0), is_active=True)
    s.add(customer)
    s.flush()
    return customer


def make_item(s, name="Scaffolding service", kind=NovaFinItemKind.SERVICE, cost=D(0)) -> NovaFinItem:
    item = NovaFinItem(name=name, kind=kind, unit="Job", cost=cost, price=D(0), opening_qty=D(0), min_level=D(0), is_active=True)
    s.add(item)
    s.flush()
    return item


def make_invoice(s, customer, item, net=D(100_000), mode="credit", on=date(2026, 9, 1), project=None, **kw) -> NovaFinInvoice:
    payload = InvoiceCreate(
        customer_id=customer.id,
        invoice_date=on,
        mode=mode,
        vat_rate=D("15.00"),
        project_id=project.id if project else None,
        lines=[DocumentLineInput(item_id=item.id, quantity=D(1), rate=net)],
        **kw,
    )
    invoice = build_invoice(s, payload)
    s.flush()
    return invoice


# =============================================================================== phase 0: sequences


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


# =============================================================================== phase 0: ledger invariants


def test_random_transactions_keep_the_books_balanced(db, clean) -> None:
    rng = random.Random(2026)
    customer, vendor = make_customer(db), NovaFinVendor(name="Vendor", opening_balance=D(0), is_active=True)
    db.add(vendor)
    db.flush()
    templates = [
        ("ar", "sales", "vout"),
        ("inventory", "ap", "vin"),
        ("cash", "ar", None),
        ("ap", "cash", None),
        ("wages", "cash", None),
        ("dep_exp", "inventory", None),
    ]
    dims = Dims(customer_id=customer.id, vendor_id=vendor.id)
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
        post_journal(db, entry_date=date(2026, rng.randint(1, 12), rng.randint(1, 28)), narration="t", lines=lines, dims=dims)
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


def test_paying_a_salary_slip_twice_is_refused(session_factory, clean, no_audit) -> None:
    with session_factory() as s:
        employee = NovaFinEmployee(name="Test Worker", basic_salary=D(3000))
        s.add(employee)
        s.flush()
        slip = NovaFinSalarySlip(
            code="SLP-0001", employee_id=employee.id, month="2026-10", basic=D(3000), allowance=D(0), deduction=D(0), net=D(3000)
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


# =============================================================================== phase 0: idempotency


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


# =============================================================================== phase 1: chart of accounts


def test_the_standard_chart_is_numbered_and_bilingual(db) -> None:
    ar = db.scalar(select(NovaFinAccount).where(NovaFinAccount.code == "ar"))
    assert (ar.number, ar.name_ar) == ("1130", "العملاء (الذمم المدينة)")
    assert db.scalar(select(NovaFinAccount.number).where(NovaFinAccount.code == "retained_earnings")) == "3200"
    group = db.scalar(select(NovaFinAccount).where(NovaFinAccount.number == "1100"))
    assert group.is_group


def test_a_heading_account_cannot_be_posted_to(db, clean) -> None:
    db.add(NovaFinAccount(code="acc:test-group", name="Group", account_type="asset", is_group=True, number="9999"))
    db.flush()
    with pytest.raises(HTTPException, match="heading"):
        post_journal(db, entry_date=date(2026, 5, 1), narration="x", lines=[("acc:test-group", D(10), D(0)), ("cash", D(0), D(10))])


def test_new_bank_accounts_get_the_next_number_under_the_bank_heading(db, clean) -> None:
    first = get_or_create_account(db, f"bank:{uuid.uuid4()}")
    second = get_or_create_account(db, f"bank:{uuid.uuid4()}")
    assert int(second.number) == int(first.number) + 1
    assert db.get(NovaFinAccount, first.parent_id).number == "1120"


# =============================================================================== phase 1: corrections


def test_credit_note_for_a_wrong_price_corrects_revenue_and_vat(session_factory, clean, no_audit) -> None:
    """Invoice 100,000 + VAT 15,000 should have been 90,000: credit it in full and re-issue."""
    with session_factory() as s:
        customer, item = make_customer(s), make_item(s)
        invoice = make_invoice(s, customer, item, net=D(100_000))
        s.commit()
        invoice_id = invoice.id
    with session_factory() as s:
        result = novafin_corrections.replace_invoice(
            invoice_id,
            InvoiceReplace(
                invoice_date=date(2026, 9, 5),
                reason_code="price_error",
                reason="Wrong price",
                lines=[DocumentLineInput(item_id=s.scalar(select(NovaFinItem.id)), quantity=D(1), rate=D(90_000))],
            ),
            REQUEST,
            USER,
            s,
        )
        assert result["credit_note"]["amount"] == D("115000.00")
        assert result["invoice"]["grand_total"] == D("103500.00")
    with session_factory() as s:
        assert account_balance(s, "ar") == D("103500.00")
        assert account_balance(s, "vout") == D("-13500.00")  # credit-positive: 13,500 owed to ZATCA
        net_sales = account_balance(s, "sales") + account_balance(s, "sales_return")
        assert net_sales == D("-90000.00")  # revenue is the corrected 90,000
        original = s.get(NovaFinInvoice, invoice_id)
        replacement = s.scalar(select(NovaFinInvoice).where(NovaFinInvoice.corrects_invoice_id == invoice_id))
        assert replacement is not None and original.subtotal == D("100000.00")  # history untouched


def test_a_partial_credit_note_cannot_exceed_what_is_left(session_factory, clean, no_audit) -> None:
    with session_factory() as s:
        customer, item = make_customer(s), make_item(s)
        invoice = make_invoice(s, customer, item, net=D(1000))
        novafin_corrections.issue_credit_note(s, invoice, note_date=date(2026, 9, 2), net=D(400), reason_code="discount", reason=None)
        with pytest.raises(HTTPException) as exc:
            novafin_corrections.issue_credit_note(s, invoice, note_date=date(2026, 9, 3), net=D(700), reason_code="discount", reason=None)
        assert exc.value.status_code == 422
        s.rollback()


def test_a_cash_invoice_credit_note_refunds_cash_not_the_customer_account(session_factory, clean, no_audit) -> None:
    with session_factory() as s:
        customer, item = make_customer(s), make_item(s)
        invoice = make_invoice(s, customer, item, net=D(1000), mode="cash")
        novafin_corrections.issue_credit_note(s, invoice, note_date=date(2026, 9, 2), net=None, reason_code="cancellation", reason=None)
        s.flush()
        assert account_balance(s, "cash") == D(0)
        assert account_balance(s, "ar") == D(0)
        s.rollback()


def test_a_manual_journal_is_reversed_by_a_linked_mirror_entry(db, clean) -> None:
    original = post_journal(
        db, entry_date=date(2026, 6, 1), narration="Rent", lines=[("exp:Rent", D(500), D(0)), ("cash", D(0), D(500))]
    )
    db.flush()
    mirror = reverse_voucher(db, original, entry_date=date(2026, 6, 2))
    db.flush()
    assert mirror.reversal_of_id == original.id
    assert account_balance(db, "cash") == D(0)
    with pytest.raises(HTTPException) as exc:
        reverse_voucher(db, original, entry_date=date(2026, 6, 3))
    assert exc.value.status_code == 409


def test_a_receivable_entry_without_a_customer_is_refused(db, clean) -> None:
    with pytest.raises(HTTPException, match="needs a customer"):
        post_journal(db, entry_date=date(2026, 6, 1), narration="x", lines=[("ar", D(10), D(0)), ("sales", D(0), D(10))])


def test_bad_debt_write_off_clears_the_open_balance(session_factory, clean, no_audit) -> None:
    with session_factory() as s:
        customer, item = make_customer(s), make_item(s)
        invoice = make_invoice(s, customer, item, net=D(1000))
        novafin_corrections.write_off_invoice(
            invoice.id, WriteOffCreate(invoice_id=invoice.id, amount=D(1150), reason="Customer insolvent", write_off_date=date(2026, 10, 1)),
            REQUEST, USER, s,
        )
        assert account_balance(s, "ar") == D(0)
        assert account_balance(s, "bad_debt") == D("1150.00")
        s.rollback()


# =============================================================================== phase 1: sub-ledger


def test_a_receipt_matched_to_the_right_invoice_gives_the_right_aging(session_factory, clean, no_audit) -> None:
    """Aramco paid INV-B (115,000); the old oldest-first guess would have cleared INV-A instead."""
    with session_factory() as s:
        customer, item = make_customer(s), make_item(s)
        old = make_invoice(s, customer, item, net=D(200_000), on=date(2026, 7, 1))   # 230,000
        newer = make_invoice(s, customer, item, net=D(100_000), on=date(2026, 9, 15))  # 115,000
        novafin_banking.create_cash_move(
            CashMoveCreate(
                kind="receipt", customer_id=customer.id, amount=D(115_000), move_date=date(2026, 9, 28),
                allocations=[AllocationInput(document_id=newer.id, amount=D(115_000))],
            ),
            REQUEST, USER, s,
        )
        s.commit()
        old_id = old.id
    with session_factory() as s:
        rows = customer_aging(s, date(2026, 10, 25))
        assert len(rows) == 1
        assert rows[0]["b90_plus"] == D("230000.00")  # the old invoice is still fully unpaid
        assert rows[0]["total"] == D("230000.00")
        statement = customer_statement(s, s.scalar(select(NovaFinCustomer)))
        assert statement[-1].balance == D("230000.00")
        assert any("INV-" in line.description for line in statement if line.kind == "receipt")
        assert old_id is not None


def test_a_receipt_cannot_be_matched_to_more_than_an_invoice_owes(session_factory, clean, no_audit) -> None:
    with session_factory() as s:
        customer, item = make_customer(s), make_item(s)
        invoice = make_invoice(s, customer, item, net=D(1000))
        with pytest.raises(HTTPException) as exc:
            novafin_banking.create_cash_move(
                CashMoveCreate(
                    kind="receipt", customer_id=customer.id, amount=D(5000), move_date=date(2026, 9, 28),
                    allocations=[AllocationInput(document_id=invoice.id, amount=D(5000))],
                ),
                REQUEST, USER, s,
            )
        assert exc.value.status_code == 422
        s.rollback()


def test_customer_statements_add_up_to_the_ledger(session_factory, clean, no_audit) -> None:
    with session_factory() as s:
        a, b = make_customer(s, "A", "300000000000003"), make_customer(s, "B", "300000000000013")
        item = make_item(s)
        make_invoice(s, a, item, net=D(1000))
        inv_b = make_invoice(s, b, item, net=D(2000))
        novafin_corrections.issue_credit_note(s, inv_b, note_date=date(2026, 9, 3), net=D(500), reason_code="discount", reason=None)
        novafin_banking.create_cash_move(
            CashMoveCreate(kind="receipt", customer_id=a.id, amount=D(300), move_date=date(2026, 9, 4)), REQUEST, USER, s
        )
        s.flush()
        control = ar_control_check(s)
        assert control["difference"] == D(0)
        s.rollback()


def test_vat_numbers_must_be_valid_and_unique(db, clean) -> None:
    make_customer(db, "First", "300000000000003")
    with pytest.raises(HTTPException, match="already saved"):
        validate_party_vat(db, NovaFinCustomer, "300000000000003")
    with pytest.raises(HTTPException, match="15 digits"):
        validate_party_vat(db, NovaFinCustomer, "12345")
    assert validate_party_vat(db, NovaFinCustomer, "300000000000013") == "300000000000013"
    assert validate_party_vat(db, NovaFinCustomer, "") is None


# =============================================================================== phase 1: dimensions


def test_project_profit_and_loss_separates_each_project(session_factory, clean, no_audit) -> None:
    with session_factory() as s:
        customer, item = make_customer(s), make_item(s)
        red_sea = NovaFinProject(code="TEST-RSG", name="Red Sea test")
        aramco = NovaFinProject(code="TEST-ARM", name="Aramco test")
        s.add_all([red_sea, aramco])
        s.flush()
        make_invoice(s, customer, item, net=D(2_000_000), project=red_sea)
        make_invoice(s, customer, item, net=D(1_500_000), project=aramco)
        post_journal(
            s, entry_date=date(2026, 9, 10), narration="Subcontractor", code_prefix="JV",
            lines=[("acc:5100", D(1_600_000), D(0)), ("cash", D(0), D(1_600_000))], dims=Dims(project_id=red_sea.id),
        )
        s.commit()
    with session_factory() as s:
        report = project_profit_and_loss(user=None, db=s, date_from=None, date_to=None, branch_id=None)
        by_code = {row["code"]: row for row in report["items"]}
        assert by_code["TEST-RSG"]["income"] == D("2000000.00")
        assert by_code["TEST-RSG"]["direct_cost"] == D("1600000.00")
        assert by_code["TEST-RSG"]["gross_profit"] == D("400000.00")
        assert by_code["TEST-RSG"]["margin_percent"] == D("20.0")
        assert by_code["TEST-ARM"]["gross_profit"] == D("1500000.00")


def test_a_direct_cost_journal_must_name_its_project(db, clean) -> None:
    with pytest.raises(HTTPException, match="choose the project"):
        post_journal(
            db, entry_date=date(2026, 9, 10), narration="x", code_prefix="JV", require_project_for_direct_costs=True,
            lines=[("acc:5100", D(100), D(0)), ("cash", D(0), D(100))],
        )


# =============================================================================== phase 1: locks and year-end


def test_a_locked_month_refuses_new_entries(db, clean) -> None:
    db.add(NovaFinPeriodLock(year=2026, month=9))
    db.flush()
    with pytest.raises(HTTPException, match="locked"):
        post_journal(db, entry_date=date(2026, 9, 15), narration="x", lines=[("cash", D(10), D(0)), ("sales", D(0), D(10))])
    post_journal(db, entry_date=date(2026, 10, 1), narration="ok", lines=[("cash", D(10), D(0)), ("sales", D(0), D(10))])


def test_closing_the_year_moves_profit_to_retained_earnings_and_reopening_restores_it(session_factory, clean, no_audit) -> None:
    with session_factory() as s:
        post_journal(s, entry_date=date(2026, 3, 1), narration="Sale", lines=[("cash", D(12_000), D(0)), ("sales", D(0), D(12_000))])
        post_journal(s, entry_date=date(2026, 4, 1), narration="Cost", lines=[("cogs", D(10_500), D(0)), ("cash", D(0), D(10_500))])
        s.commit()
        year_id = s.scalar(select(NovaFinFiscalYear.id).where(NovaFinFiscalYear.label == "2026"))
    with session_factory() as s:
        closed = novafin_admin.close_fiscal_year(year_id, REQUEST, USER, s)
        assert closed["status"] == "closed" and closed["net_profit_snapshot"] == D("1500.00")
    with session_factory() as s:
        assert account_balance(s, "sales") == D(0) and account_balance(s, "cogs") == D(0)
        assert account_balance(s, "retained_earnings") == D("-1500.00")  # credit balance
        with pytest.raises(HTTPException, match="closed fiscal year"):
            post_journal(s, entry_date=date(2026, 12, 31), narration="late", lines=[("cash", D(1), D(0)), ("sales", D(0), D(1))])
        again = novafin_admin.reopen_fiscal_year(year_id, FiscalYearReopen(reason="Auditor adjustment"), REQUEST, USER, s)
        assert again["status"] == "open"
    with session_factory() as s:
        assert account_balance(s, "sales") == D("-12000.00")  # P&L is live again
        assert account_balance(s, "retained_earnings") == D(0)


# =============================================================================== phase 1: through the real HTTP routes


@pytest.fixture()
def api(session_factory, clean, monkeypatch):
    """The real app with login faked as a full-rights user and the test schema as its database."""
    from app.api.routes import novafin, novafin_accounting, novafin_projects, novafin_sales
    from app.bootstrap import CMS_PERMISSIONS
    from app.core.auth import get_current_user
    from app.core.database import get_db
    from app.main import app

    for module in (novafin, novafin_accounting, novafin_projects, novafin_sales, novafin_banking, novafin_corrections, novafin_admin, novafin_hr):
        monkeypatch.setattr(module, "audit", lambda *a, **k: None)
    admin = SimpleNamespace(
        id=uuid.uuid4(),
        email="owner@example.com",
        must_change_password=False,
        roles=[SimpleNamespace(name="super_admin", permissions=[SimpleNamespace(code=c) for c in CMS_PERMISSIONS])],
    )

    def override_db():
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_current_user] = lambda: admin
    app.dependency_overrides[get_db] = override_db
    client = TestClient(app, base_url="http://testserver")
    yield client
    app.dependency_overrides.clear()


def test_the_owner_can_run_a_whole_sale_correct_it_and_read_the_reports(api) -> None:
    prefix = settings.API_V1_PREFIX + "/novafin"
    customer = api.post(f"{prefix}/customers", json={"name": "Saudi Aramco", "vat_number": "300000000000003", "name_ar": "أرامكو"})
    assert customer.status_code == 201, customer.text
    assert customer.json()["name_ar"] == "أرامكو"
    clash = api.post(f"{prefix}/customers", json={"name": "Other", "vat_number": "300000000000003"})
    assert clash.status_code == 409
    item = api.post(f"{prefix}/items", json={"name": "Scaffolding hire", "kind": "service", "price": 100000})
    assert item.status_code == 201, item.text
    project = api.post(f"{prefix}/projects", json={"code": "t-rsg", "name": "Red Sea test"})
    assert project.status_code == 201 and project.json()["code"] == "T-RSG"
    invoice = api.post(
        f"{prefix}/invoices",
        json={
            "customer_id": customer.json()["id"],
            "invoice_date": "2026-09-01",
            "mode": "credit",
            "project_id": project.json()["id"],
            "lines": [{"item_id": item.json()["id"], "quantity": 1, "rate": 100000}],
        },
    )
    assert invoice.status_code == 201, invoice.text
    invoice_id = invoice.json()["id"]

    credit = api.post(
        f"{prefix}/credit-notes",
        json={"invoice_id": invoice_id, "note_date": "2026-09-05", "reason_code": "price_error", "amount": 10000},
    )
    assert credit.status_code == 201, credit.text
    assert credit.json()["amount"] == "11500.00" or float(credit.json()["amount"]) == 11500.0

    open_invoices = api.get(f"{prefix}/customers/{customer.json()['id']}/open-invoices").json()["items"]
    assert float(open_invoices[0]["open_balance"]) == 103500.0

    receipt = api.post(
        f"{prefix}/cash-moves",
        json={
            "kind": "receipt",
            "customer_id": customer.json()["id"],
            "amount": 50000,
            "move_date": "2026-09-20",
            "allocations": [{"document_id": invoice_id, "amount": 50000}],
        },
    )
    assert receipt.status_code == 201, receipt.text
    no_customer = api.post(f"{prefix}/cash-moves", json={"kind": "receipt", "amount": 10, "move_date": "2026-09-20"})
    assert no_customer.status_code == 422

    statement = api.get(f"{prefix}/reports/statement/customer/{customer.json()['id']}").json()
    assert float(statement["closing_balance"]) == 53500.0
    aging = api.get(f"{prefix}/reports/aging").json()
    assert float(aging["control"]["difference"]) == 0.0
    pl = api.get(f"{prefix}/reports/project-pl").json()
    assert float(pl["items"][0]["income"]) == 90000.0
    trial = api.get(f"{prefix}/reports/trial-balance").json()
    assert float(trial["difference"]) == 0.0
    sheet = api.get(f"{prefix}/reports/balance-sheet").json()
    assert abs(float(sheet["check_difference"])) < 0.01
    assert api.get(f"{prefix}/accounts").json()["items"][0]["number"] is not None

    locked = api.post(f"{prefix}/periods/2026/9/lock", json={})
    assert locked.status_code == 201
    blocked = api.post(
        f"{prefix}/invoices",
        json={"customer_id": customer.json()["id"], "invoice_date": "2026-09-10", "lines": [{"item_id": item.json()["id"], "quantity": 1, "rate": 5}]},
    )
    assert blocked.status_code == 422 and "locked" in blocked.json()["detail"]
    months = api.get(f"{prefix}/periods?year=2026").json()["months"]
    assert months[8]["status"] == "locked"
    unlocked = api.post(f"{prefix}/periods/2026/9/unlock", json={"note": "Late invoice"})
    assert unlocked.status_code == 200
