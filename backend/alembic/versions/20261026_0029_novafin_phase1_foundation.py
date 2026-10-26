"""NovaFin phase 1: chart of accounts, dimensions, corrections, allocations, period locks.

Additive only. Existing ledger lines are untouched; the new tag columns on them
start empty. Seeds the standard chart, five cost centers, one NovaFin project per
website project, and a January-December fiscal year when none exists yet.

Revision ID: 20261026_0029
Revises: 20261025_0028
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261026_0029"
down_revision: str | None = "20261025_0028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Frozen copy of app.services.novafin_chart at the time of this migration.
STANDARD_CHART = [
    ('1000', 'Assets', 'الأصول', 'asset', None, True, None),
    ('1100', 'Current Assets', 'الأصول المتداولة', 'asset', '1000', True, None),
    ('1110', 'Cash in Hand', 'النقدية بالصندوق', 'asset', '1100', False, 'cash'),
    ('1120', 'Bank Accounts', 'الحسابات البنكية', 'asset', '1100', True, None),
    ('1130', 'Accounts Receivable', 'العملاء (الذمم المدينة)', 'asset', '1100', False, 'ar'),
    ('1135', 'Retention Receivable', 'محتجزات مستحقة القبض', 'asset', '1100', False, None),
    ('1140', 'Contract Assets (WIP)', 'أصول العقود (أعمال تحت التنفيذ)', 'asset', '1100', False, None),
    ('1150', 'Inventory', 'المخزون', 'asset', '1100', False, 'inventory'),
    ('1160', 'Advances & Prepayments', 'دفعات مقدمة ومصروفات مدفوعة مقدماً', 'asset', '1100', False, None),
    ('1170', 'VAT Input (Receivable)', 'ضريبة القيمة المضافة - مدخلات', 'asset', '1100', False, 'vin'),
    ('1180', 'Post-dated Cheques Receivable', 'شيكات آجلة تحت التحصيل', 'asset', '1100', False, None),
    ('1200', 'Fixed Assets', 'الأصول الثابتة', 'asset', '1000', True, None),
    ('2000', 'Liabilities', 'الالتزامات', 'liability', None, True, None),
    ('2100', 'Current Liabilities', 'الالتزامات المتداولة', 'liability', '2000', True, None),
    ('2110', 'Accounts Payable', 'الموردون (الذمم الدائنة)', 'liability', '2100', False, 'ap'),
    ('2120', 'Retention Payable', 'محتجزات مستحقة الدفع', 'liability', '2100', False, None),
    ('2140', 'Salaries Payable', 'رواتب مستحقة', 'liability', '2100', False, None),
    ('2150', 'GOSI Payable', 'التأمينات الاجتماعية المستحقة', 'liability', '2100', False, None),
    ('2160', 'End-of-Service Provision', 'مخصص مكافأة نهاية الخدمة', 'liability', '2100', False, None),
    ('2170', 'VAT Output (Payable)', 'ضريبة القيمة المضافة - مخرجات', 'liability', '2100', False, 'vout'),
    ('2180', 'Zakat & Tax Payable', 'الزكاة والضريبة المستحقة', 'liability', '2100', False, None),
    ('2190', 'Customer Advances', 'دفعات مقدمة من العملاء', 'liability', '2100', False, None),
    ('3000', 'Equity', 'حقوق الملكية', 'equity', None, True, None),
    ('3100', "Owner's Capital", 'رأس المال', 'equity', '3000', False, 'capital'),
    ('3150', "Owner's Drawings", 'مسحوبات المالك', 'equity', '3000', False, 'drawings'),
    ('3200', 'Retained Earnings', 'الأرباح المبقاة', 'equity', '3000', False, 'retained_earnings'),
    ('3900', 'Opening Balance Equity', 'أرصدة افتتاحية', 'equity', '3000', False, 'opening_equity'),
    ('4000', 'Revenue', 'الإيرادات', 'income', None, True, None),
    ('4100', 'Sales Revenue', 'إيرادات المبيعات والمقاولات', 'income', '4000', False, 'sales'),
    ('4190', 'Sales Returns', 'مردودات المبيعات', 'income', '4000', False, 'sales_return'),
    ('4195', 'Credit Notes Issued (legacy)', 'إشعارات دائنة صادرة (قديم)', 'income', '4000', False, 'credit_note'),
    ('4200', 'Equipment Rental Revenue', 'إيرادات تأجير المعدات', 'income', '4000', False, None),
    ('4300', 'Manpower Supply Revenue', 'إيرادات توريد العمالة', 'income', '4000', False, None),
    ('4400', 'Trading Revenue', 'إيرادات التجارة', 'income', '4000', False, None),
    ('4500', 'IT Services Revenue', 'إيرادات خدمات تقنية المعلومات', 'income', '4000', False, None),
    ('4900', 'Other Income', 'إيرادات أخرى', 'income', '4000', True, None),
    ('5000', 'Direct Costs', 'التكاليف المباشرة', 'expense', None, True, None),
    ('5100', 'Subcontractors', 'مقاولو الباطن', 'expense', '5000', False, None),
    ('5200', 'Materials', 'المواد', 'expense', '5000', False, None),
    ('5300', 'Cost of Goods Sold', 'تكلفة البضاعة المباعة', 'expense', '5000', False, 'cogs'),
    ('5400', 'Direct Labour', 'العمالة المباشرة', 'expense', '5000', False, None),
    ('5500', 'Equipment Operating Costs', 'تشغيل المعدات', 'expense', '5000', False, None),
    ('5600', 'Site Overheads', 'مصاريف الموقع', 'expense', '5000', False, None),
    ('6000', 'Operating Expenses', 'المصروفات التشغيلية', 'expense', None, True, None),
    ('6100', 'Wages & Salaries', 'الرواتب والأجور', 'expense', '6000', False, 'wages'),
    ('6200', 'Purchased Services', 'خدمات مشتراة', 'expense', '6000', False, 'purchase_expense'),
    ('6300', 'Rent', 'الإيجارات', 'expense', '6000', False, None),
    ('6400', 'Utilities', 'المرافق', 'expense', '6000', False, None),
    ('6500', 'Office Expenses', 'مصروفات مكتبية', 'expense', '6000', False, None),
    ('6600', 'Travel', 'السفر والتنقل', 'expense', '6000', False, None),
    ('6700', 'Professional Fees', 'الأتعاب المهنية', 'expense', '6000', False, None),
    ('6800', 'Depreciation Expense', 'مصروف الإهلاك', 'expense', '6000', False, 'dep_exp'),
    ('6850', 'Bad Debt Expense', 'ديون معدومة', 'expense', '6000', False, 'bad_debt'),
    ('6900', 'Other Expenses', 'مصروفات أخرى', 'expense', '6000', True, None)
]
DEFAULT_COST_CENTERS = [
    ('CIVIL', 'Civil', 'أعمال مدنية'),
    ('SCAFF', 'Scaffolding', 'سقالات'),
    ('MANPOWER', 'Manpower', 'توريد عمالة'),
    ('EQUIP', 'Equipment', 'معدات'),
    ('OFFICE', 'Office', 'المكتب الرئيسي')
]
NUMBER_RANGES = {'bank': (1121, 1129, '1120'), 'asset': (1210, 1299, '1200'), 'inc': (4910, 4999, '4900'), 'exp': (6910, 6999, '6900')}


def _uuid_pk() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    ]


def upgrade() -> None:
    bind = op.get_bind()

    # --- accounts
    op.add_column("novafin_accounts", sa.Column("number", sa.String(20), nullable=True))
    op.add_column("novafin_accounts", sa.Column("name_ar", sa.String(200), nullable=True))
    op.add_column("novafin_accounts", sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("novafin_accounts", sa.Column("is_group", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_unique_constraint("uq_novafin_accounts_number", "novafin_accounts", ["number"])
    op.create_foreign_key(
        "fk_novafin_accounts_parent", "novafin_accounts", "novafin_accounts", ["parent_id"], ["id"], ondelete="SET NULL"
    )

    # --- dimension tables
    op.create_table(
        "novafin_projects",
        _uuid_pk(),
        sa.Column("code", sa.String(40), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("name_ar", sa.String(255)),
        sa.Column("client_name", sa.String(255)),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("novafin_customers.id", ondelete="SET NULL")),
        sa.Column("website_slug", sa.String(180)),
        sa.Column("start_date", sa.Date()),
        sa.Column("end_date", sa.Date()),
        sa.Column("budget", sa.Numeric(14, 2)),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
        sa.UniqueConstraint("code", name="uq_novafin_projects_code"),
    )
    op.create_table(
        "novafin_cost_centers",
        _uuid_pk(),
        sa.Column("code", sa.String(40), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("name_ar", sa.String(150)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_timestamps(),
        sa.UniqueConstraint("code", name="uq_novafin_cost_centers_code"),
    )

    # --- ledger line tags + reversal link
    for column, target in [
        ("customer_id", "novafin_customers"),
        ("vendor_id", "novafin_vendors"),
        ("project_id", "novafin_projects"),
        ("cost_center_id", "novafin_cost_centers"),
        ("branch_id", "novafin_branches"),
    ]:
        op.add_column(
            "novafin_journal_voucher_lines",
            sa.Column(column, postgresql.UUID(as_uuid=True), sa.ForeignKey(f"{target}.id", ondelete="RESTRICT"), nullable=True),
        )
    for column in ["customer_id", "vendor_id", "project_id"]:
        op.create_index(f"ix_novafin_jvl_{column}", "novafin_journal_voucher_lines", [column])
    op.add_column(
        "novafin_journal_vouchers",
        sa.Column(
            "reversal_of_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("novafin_journal_vouchers.id", ondelete="RESTRICT"),
            nullable=True,
        ),
    )
    op.create_unique_constraint("uq_novafin_jv_reversal_of", "novafin_journal_vouchers", ["reversal_of_id"])

    # --- customers / vendors master data
    for table in ("novafin_customers", "novafin_vendors"):
        op.add_column(table, sa.Column("name_ar", sa.String(200)))
        op.add_column(table, sa.Column("cr_number", sa.String(40)))
        op.add_column(table, sa.Column("street", sa.String(200)))
        op.add_column(table, sa.Column("building_no", sa.String(20)))
        op.add_column(table, sa.Column("district", sa.String(120)))
        op.add_column(table, sa.Column("postal_code", sa.String(20)))
        op.add_column(table, sa.Column("country", sa.String(2), nullable=False, server_default="SA"))
        op.add_column(table, sa.Column("payment_terms_days", sa.Integer(), nullable=False, server_default="0"))
        duplicates = bind.execute(
            sa.text(
                f"SELECT count(*) FROM (SELECT vat_number FROM {table} WHERE coalesce(vat_number, '') <> '' "
                "GROUP BY vat_number HAVING count(*) > 1) d"
            )
        ).scalar()
        if not duplicates:
            op.execute(
                f"CREATE UNIQUE INDEX uq_{table}_vat_number ON {table} (vat_number) WHERE coalesce(vat_number, '') <> ''"
            )

    # --- documents: dimensions + links
    for table in ("novafin_invoices", "novafin_purchases"):
        for column, target in [("project_id", "novafin_projects"), ("cost_center_id", "novafin_cost_centers"), ("branch_id", "novafin_branches")]:
            op.add_column(
                table, sa.Column(column, postgresql.UUID(as_uuid=True), sa.ForeignKey(f"{target}.id", ondelete="RESTRICT"), nullable=True)
            )
        op.create_index(f"ix_{table}_project_id", table, ["project_id"])
    op.add_column(
        "novafin_invoices",
        sa.Column(
            "corrects_invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("novafin_invoices.id", ondelete="RESTRICT"), nullable=True
        ),
    )
    op.add_column(
        "novafin_credit_notes",
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("novafin_invoices.id", ondelete="RESTRICT"), nullable=True),
    )
    op.create_index("ix_novafin_credit_notes_invoice_id", "novafin_credit_notes", ["invoice_id"])
    op.add_column("novafin_credit_notes", sa.Column("subtotal", sa.Numeric(14, 2), nullable=True))
    op.add_column("novafin_credit_notes", sa.Column("vat_rate", sa.Numeric(5, 2), nullable=False, server_default="0"))
    op.add_column("novafin_credit_notes", sa.Column("vat_amount", sa.Numeric(14, 2), nullable=False, server_default="0"))
    op.add_column("novafin_credit_notes", sa.Column("reason_code", sa.String(30), nullable=True))

    for column, target in (("customer_id", "novafin_customers"), ("vendor_id", "novafin_vendors")):
        op.add_column(
            "novafin_cheques",
            sa.Column(column, postgresql.UUID(as_uuid=True), sa.ForeignKey(f"{target}.id", ondelete="SET NULL"), nullable=True),
        )

    op.create_table(
        "novafin_debit_notes",
        _uuid_pk(),
        sa.Column("code", sa.String(40), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("novafin_customers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("novafin_invoices.id", ondelete="RESTRICT")),
        sa.Column("note_date", sa.Date(), nullable=False),
        sa.Column("subtotal", sa.Numeric(14, 2), nullable=False),
        sa.Column("vat_rate", sa.Numeric(5, 2), nullable=False, server_default="15.00"),
        sa.Column("vat_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("grand_total", sa.Numeric(14, 2), nullable=False),
        sa.Column("reason", sa.Text()),
        *_timestamps(),
        sa.UniqueConstraint("code", name="uq_novafin_debit_notes_code"),
    )
    op.create_index("ix_novafin_debit_notes_code", "novafin_debit_notes", ["code"])
    op.create_index("ix_novafin_debit_notes_invoice_id", "novafin_debit_notes", ["invoice_id"])

    op.create_table(
        "novafin_allocations",
        _uuid_pk(),
        sa.Column("source_type", sa.String(20), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(20), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("alloc_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("amount > 0", name="ck_novafin_allocations_positive"),
    )
    op.create_index("ix_novafin_allocations_source_id", "novafin_allocations", ["source_id"])
    op.create_index("ix_novafin_allocations_target_id", "novafin_allocations", ["target_id"])

    op.create_table(
        "novafin_period_locks",
        _uuid_pk(),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("locked_by", postgresql.UUID(as_uuid=True)),
        sa.Column("note", sa.Text()),
        sa.UniqueConstraint("year", "month", name="uq_novafin_period_locks_month"),
        sa.CheckConstraint("month BETWEEN 1 AND 12", name="ck_novafin_period_locks_month"),
    )

    op.add_column(
        "novafin_fiscal_years",
        sa.Column(
            "closing_voucher_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("novafin_journal_vouchers.id", ondelete="RESTRICT"),
            nullable=True,
        ),
    )
    op.add_column(
        "novafin_company_profile",
        sa.Column("vat_filing_frequency", sa.String(12), nullable=False, server_default="quarterly"),
    )

    _seed(bind)


def _seed(bind) -> None:
    accounts = sa.table(
        "novafin_accounts",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("name_ar", sa.String),
        sa.column("account_type", sa.String),
        sa.column("is_system", sa.Boolean),
        sa.column("is_active", sa.Boolean),
        sa.column("is_group", sa.Boolean),
        sa.column("number", sa.String),
        sa.column("parent_id", postgresql.UUID(as_uuid=True)),
    )

    # 1) the standard chart: fill in the ones that already exist, create the rest
    id_by_number: dict[str, uuid.UUID] = {}
    for number, name, name_ar, account_type, _parent, is_group, key in STANDARD_CHART:
        code = key or f"acc:{number}"
        existing = bind.execute(sa.select(accounts.c.id).where(accounts.c.code == code)).scalar()
        if existing is not None:
            bind.execute(
                accounts.update()
                .where(accounts.c.id == existing)
                .values(number=number, name_ar=name_ar, is_group=is_group, is_system=True)
            )
            id_by_number[number] = existing
        else:
            new_id = uuid.uuid4()
            bind.execute(
                accounts.insert().values(
                    id=new_id,
                    code=code,
                    name=name,
                    name_ar=name_ar,
                    account_type=account_type,
                    is_system=True,
                    is_active=True,
                    is_group=is_group,
                    number=number,
                )
            )
            id_by_number[number] = new_id
    for number, _name, _ar, _type, parent_number, _group, _key in STANDARD_CHART:
        if parent_number:
            bind.execute(accounts.update().where(accounts.c.id == id_by_number[number]).values(parent_id=id_by_number[parent_number]))

    # 2) accounts that were auto-created per bank / fixed asset / income / expense category
    for prefix, range_key in (("bank:", "bank"), ("asset:", "asset"), ("inc:", "inc"), ("exp:", "exp")):
        first, last, parent_number = NUMBER_RANGES[range_key]
        rows = bind.execute(
            sa.text("SELECT id FROM novafin_accounts WHERE code LIKE :p AND number IS NULL ORDER BY created_at, code"),
            {"p": prefix + "%"},
        ).fetchall()
        for offset, row in enumerate(rows):
            if first + offset > last:
                break
            bind.execute(
                accounts.update().where(accounts.c.id == row[0]).values(number=str(first + offset), parent_id=id_by_number[parent_number])
            )

    # 3) cost centers
    for code, name, name_ar in DEFAULT_COST_CENTERS:
        bind.execute(
            sa.text(
                "INSERT INTO novafin_cost_centers (code, name, name_ar) VALUES (:c, :n, :a) ON CONFLICT (code) DO NOTHING"
            ),
            {"c": code, "n": name, "a": name_ar},
        )

    # 4) one NovaFin project per website project (same names, so both systems agree)
    op.execute(
        """
        INSERT INTO novafin_projects (code, name, name_ar, client_name, website_slug, start_date, end_date, status, is_active)
        SELECT upper(p.slug), coalesce(en.title, p.slug), ar.title, p.client_name, p.slug, p.started_on, p.completed_on,
               CASE WHEN p.completed_on IS NOT NULL THEN 'completed' ELSE 'active' END, true
        FROM projects p
        LEFT JOIN project_translations en ON en.project_id = p.id AND en.locale = 'en'
        LEFT JOIN project_translations ar ON ar.project_id = p.id AND ar.locale = 'ar'
        ON CONFLICT (code) DO NOTHING
        """
    )

    # 5) a January-December fiscal year if nobody has set one up
    has_year = bind.execute(sa.text("SELECT count(*) FROM novafin_fiscal_years")).scalar()
    if not has_year:
        bind.execute(
            sa.text(
                "INSERT INTO novafin_fiscal_years (label, start_date, end_date, is_active, status) "
                "VALUES ('2026', '2026-01-01', '2026-12-31', true, 'open')"
            )
        )


def downgrade() -> None:
    op.drop_column("novafin_cheques", "vendor_id")
    op.drop_column("novafin_cheques", "customer_id")
    op.drop_column("novafin_company_profile", "vat_filing_frequency")
    op.drop_column("novafin_fiscal_years", "closing_voucher_id")
    op.drop_table("novafin_period_locks")
    op.drop_table("novafin_allocations")
    op.drop_table("novafin_debit_notes")
    for column in ("reason_code", "vat_amount", "vat_rate", "subtotal", "invoice_id"):
        op.drop_column("novafin_credit_notes", column)
    op.drop_column("novafin_invoices", "corrects_invoice_id")
    for table in ("novafin_invoices", "novafin_purchases"):
        for column in ("branch_id", "cost_center_id", "project_id"):
            op.drop_column(table, column)
    for table in ("novafin_customers", "novafin_vendors"):
        op.execute(f"DROP INDEX IF EXISTS uq_{table}_vat_number")
        for column in ("payment_terms_days", "country", "postal_code", "district", "building_no", "street", "cr_number", "name_ar"):
            op.drop_column(table, column)
    op.drop_column("novafin_journal_vouchers", "reversal_of_id")
    for column in ("branch_id", "cost_center_id", "project_id", "vendor_id", "customer_id"):
        op.drop_column("novafin_journal_voucher_lines", column)
    op.drop_table("novafin_cost_centers")
    op.drop_table("novafin_projects")
    for column in ("is_group", "parent_id", "name_ar", "number"):
        op.drop_column("novafin_accounts", column)
