"""VAT return figures, built from the invoices, notes and bills themselves.

The return is computed from documents (so every number can be traced to a paper) and then
compared with what the ledger says about the VAT Output / VAT Input accounts. If the two
disagree the return cannot be filed.
"""

import calendar
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    NovaFinAccount,
    NovaFinCompanyProfile,
    NovaFinCreditNote,
    NovaFinCustomer,
    NovaFinDebitNote,
    NovaFinInvoice,
    NovaFinInvoiceStatus,
    NovaFinJournalVoucher,
    NovaFinJournalVoucherLine,
    NovaFinPurchase,
    NovaFinPurchaseReturn,
    NovaFinSalesReturn,
    NovaFinVendor,
)

ZERO = Decimal("0")
CENT = Decimal("0.01")
CATEGORIES = ("standard", "zero", "exempt", "out_of_scope")
SETTLEMENT_PREFIX = "VATS"


def effective_rate(category: str, rate: Decimal) -> Decimal:
    """Only standard-rated supplies carry VAT; zero-rated, exempt and out-of-scope never do."""
    return rate if category == "standard" else ZERO


@dataclass(frozen=True)
class Period:
    start: date
    end: date
    frequency: str  # monthly | quarterly
    index: int  # month 1-12, or quarter 1-4
    year: int

    @property
    def label(self) -> str:
        if self.frequency == "monthly":
            return f"{calendar.month_name[self.index]} {self.year}"
        return f"Q{self.index} {self.year} ({calendar.month_abbr[self.start.month]}–{calendar.month_abbr[self.end.month]})"

    @property
    def months(self) -> list[tuple[int, int]]:
        out: list[tuple[int, int]] = []
        year, month = self.start.year, self.start.month
        while (year, month) <= (self.end.year, self.end.month):
            out.append((year, month))
            month += 1
            if month > 12:
                year, month = year + 1, 1
        return out

    @property
    def due_date(self) -> date:
        """The last day of the month after the period ends."""
        year, month = (self.end.year + 1, 1) if self.end.month == 12 else (self.end.year, self.end.month + 1)
        return date(year, month, calendar.monthrange(year, month)[1])


def build_period(year: int, index: int, frequency: str) -> Period:
    if frequency == "monthly":
        if not 1 <= index <= 12:
            raise ValueError("month must be 1-12")
        return Period(date(year, index, 1), date(year, index, calendar.monthrange(year, index)[1]), "monthly", index, year)
    if not 1 <= index <= 4:
        raise ValueError("quarter must be 1-4")
    first_month = (index - 1) * 3 + 1
    last_month = first_month + 2
    return Period(date(year, first_month, 1), date(year, last_month, calendar.monthrange(year, last_month)[1]), "quarterly", index, year)


def latest_finished_period(today: date, frequency: str) -> tuple[int, int]:
    """(year, month-or-quarter) of the most recent period that ended before `today`."""
    if frequency == "monthly":
        return (today.year - 1, 12) if today.month == 1 else (today.year, today.month - 1)
    quarter = (today.month - 1) // 3  # 0-3: the quarter we are in, so the finished one is this number (0 = last year's Q4)
    return (today.year - 1, 4) if quarter == 0 else (today.year, quarter)


def filing_frequency(db: Session) -> str:
    profile = db.scalar(select(NovaFinCompanyProfile))
    value = profile.vat_filing_frequency if profile else "quarterly"
    return value if value in ("monthly", "quarterly") else "quarterly"


def _q(value) -> Decimal:
    return Decimal(value).quantize(CENT)


def _status(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _blank_bucket() -> dict[str, Decimal]:
    return {"net": ZERO, "vat": ZERO}


def collect_documents(db: Session, start: date, end: date) -> list[dict]:
    """Every VAT-relevant document dated inside the period, with its sign (+ adds, - reduces)."""
    rows: list[dict] = []

    invoice_by_id: dict = {}

    def invoice_for(invoice_id):
        if invoice_id is None:
            return None
        if invoice_id not in invoice_by_id:
            invoice_by_id[invoice_id] = db.get(NovaFinInvoice, invoice_id)
        return invoice_by_id[invoice_id]

    def note_category(invoice, vat: Decimal) -> str:
        if invoice is not None:
            return invoice.tax_category or "standard"
        return "standard" if vat else "zero"

    customers = {c.id: c for c in db.scalars(select(NovaFinCustomer))}
    vendors = {v.id: v for v in db.scalars(select(NovaFinVendor))}

    for inv in db.scalars(select(NovaFinInvoice).where(NovaFinInvoice.invoice_date.between(start, end))):
        if _status(inv.status) != "posted":
            continue
        rows.append(
            {"side": "sales", "kind": "Invoice", "code": inv.code, "date": inv.invoice_date, "party": customers[inv.customer_id].name,
             "category": inv.tax_category or "standard", "sign": 1, "net": inv.subtotal, "vat": inv.vat_amount, "recoverable": True, "supplier_invoice_no": None}
        )
    for dn in db.scalars(select(NovaFinDebitNote).where(NovaFinDebitNote.note_date.between(start, end))):
        rows.append(
            {"side": "sales", "kind": "Debit note", "code": dn.code, "date": dn.note_date, "party": customers[dn.customer_id].name,
             "category": note_category(invoice_for(dn.invoice_id), dn.vat_amount), "sign": 1, "net": dn.subtotal, "vat": dn.vat_amount,
             "recoverable": True, "supplier_invoice_no": None}
        )
    for cn in db.scalars(select(NovaFinCreditNote).where(NovaFinCreditNote.note_date.between(start, end))):
        net = cn.subtotal if cn.subtotal is not None else cn.amount
        rows.append(
            {"side": "sales", "kind": "Credit note", "code": cn.code, "date": cn.note_date, "party": customers[cn.customer_id].name,
             "category": note_category(invoice_for(cn.invoice_id), cn.vat_amount), "sign": -1, "net": net, "vat": cn.vat_amount,
             "recoverable": True, "supplier_invoice_no": None}
        )
    for sr in db.scalars(select(NovaFinSalesReturn).where(NovaFinSalesReturn.return_date.between(start, end))):
        rows.append(
            {"side": "sales", "kind": "Sales return", "code": sr.code, "date": sr.return_date, "party": customers[sr.customer_id].name,
             "category": note_category(invoice_for(sr.invoice_id), sr.vat_amount), "sign": -1, "net": sr.subtotal, "vat": sr.vat_amount,
             "recoverable": True, "supplier_invoice_no": None}
        )

    purchase_by_id: dict = {}
    for pu in db.scalars(select(NovaFinPurchase).where(NovaFinPurchase.purchase_date.between(start, end))):
        purchase_by_id[pu.id] = pu
        rows.append(
            {"side": "purchases", "kind": "Bill", "code": pu.code, "date": pu.purchase_date, "party": vendors[pu.vendor_id].name,
             "category": pu.tax_category or "standard", "sign": 1, "net": pu.subtotal, "vat": pu.vat_amount,
             "recoverable": bool(pu.vat_recoverable), "supplier_invoice_no": pu.supplier_invoice_no}
        )
    for pr in db.scalars(select(NovaFinPurchaseReturn).where(NovaFinPurchaseReturn.return_date.between(start, end))):
        original = purchase_by_id.get(pr.purchase_id) or (db.get(NovaFinPurchase, pr.purchase_id) if pr.purchase_id else None)
        rows.append(
            {"side": "purchases", "kind": "Purchase return", "code": pr.code, "date": pr.return_date, "party": vendors[pr.vendor_id].name,
             "category": (original.tax_category if original else ("standard" if pr.vat_amount else "zero")) or "standard", "sign": -1,
             "net": pr.subtotal, "vat": pr.vat_amount, "recoverable": bool(original.vat_recoverable) if original else True,
             "supplier_invoice_no": None}
        )
    rows.sort(key=lambda r: (r["date"], r["code"]))
    return rows


def _ledger_movement(db: Session, code: str, start: date, end: date, *, credit_positive: bool) -> Decimal:
    account_id = db.scalar(select(NovaFinAccount.id).where(NovaFinAccount.code == code))
    if account_id is None:
        return ZERO
    debit, credit = db.execute(
        select(func.coalesce(func.sum(NovaFinJournalVoucherLine.debit), 0), func.coalesce(func.sum(NovaFinJournalVoucherLine.credit), 0))
        .join(NovaFinJournalVoucher, NovaFinJournalVoucher.id == NovaFinJournalVoucherLine.voucher_id)
        .where(
            NovaFinJournalVoucherLine.account_id == account_id,
            NovaFinJournalVoucher.voucher_date.between(start, end),
            ~NovaFinJournalVoucher.code.like(f"{SETTLEMENT_PREFIX}-%"),
        )
    ).one()
    return _q(Decimal(credit) - Decimal(debit)) if credit_positive else _q(Decimal(debit) - Decimal(credit))


def compute_return(db: Session, period: Period) -> dict:
    documents = collect_documents(db, period.start, period.end)

    sales = {c: _blank_bucket() for c in CATEGORIES}
    purchases = {
        "standard_recoverable": _blank_bucket(),
        "standard_non_recoverable": _blank_bucket(),
        "zero": _blank_bucket(),
        "exempt": _blank_bucket(),
        "out_of_scope": _blank_bucket(),
    }
    for doc in documents:
        sign = doc["sign"]
        net, vat = sign * Decimal(doc["net"]), sign * Decimal(doc["vat"])
        if doc["side"] == "sales":
            bucket = sales[doc["category"] if doc["category"] in sales else "standard"]
        else:
            category = doc["category"]
            if category == "standard":
                bucket = purchases["standard_recoverable" if doc["recoverable"] else "standard_non_recoverable"]
            else:
                bucket = purchases[category if category in purchases else "zero"]
        bucket["net"] += net
        bucket["vat"] += vat

    for group in (sales, purchases):
        for bucket in group.values():
            bucket["net"], bucket["vat"] = _q(bucket["net"]), _q(bucket["vat"])

    output_vat = _q(sum((b["vat"] for b in sales.values()), ZERO))
    input_vat = purchases["standard_recoverable"]["vat"]
    net_vat = _q(output_vat - input_vat)

    gl_output = _ledger_movement(db, "vout", period.start, period.end, credit_positive=True)
    gl_input = _ledger_movement(db, "vin", period.start, period.end, credit_positive=False)
    control = {
        "ledger_output": gl_output,
        "ledger_input": gl_input,
        "output_difference": _q(gl_output - output_vat),
        "input_difference": _q(gl_input - input_vat),
    }
    control["matches"] = abs(control["output_difference"]) < CENT and abs(control["input_difference"]) < CENT

    warnings: list[str] = []
    missing_numbers = [
        d["code"] for d in documents if d["side"] == "purchases" and d["kind"] == "Bill" and d["recoverable"] and Decimal(d["vat"]) > 0 and not d["supplier_invoice_no"]
    ]
    if missing_numbers:
        warnings.append(
            f"{len(missing_numbers)} bill(s) claim input VAT but have no supplier invoice number: {', '.join(missing_numbers[:8])}"
            + ("…" if len(missing_numbers) > 8 else "")
            + ". ZATCA can refuse the claim without it."
        )
    drafts = db.scalar(
        select(func.count(NovaFinInvoice.id)).where(NovaFinInvoice.invoice_date.between(period.start, period.end), NovaFinInvoice.status == NovaFinInvoiceStatus.DRAFT)
    )
    if drafts:
        warnings.append(f"{drafts} draft invoice(s) dated in this period are not counted until they are posted.")

    return {
        "period": {
            "start": period.start,
            "end": period.end,
            "frequency": period.frequency,
            "label": period.label,
            "year": period.year,
            "index": period.index,
            "due_date": period.due_date,
        },
        "sales": sales,
        "purchases": purchases,
        "output_vat": output_vat,
        "input_vat": input_vat,
        "net_vat": net_vat,
        "control": control,
        "warnings": warnings,
        "documents": documents,
    }
