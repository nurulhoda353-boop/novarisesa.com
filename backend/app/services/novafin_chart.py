"""The standard NOVARISE chart of accounts (Saudi-style numbering, English + Arabic names).

`key` is the stable internal code the ledger engine posts to (`ar`, `sales`, ...);
`number` is what people read. Accounts without a key are reached by the
`acc:<number>` code. Group rows only organise the report, nothing posts to them.
"""

# (number, name, name_ar, account_type, parent_number, is_group, key)
STANDARD_CHART: list[tuple[str, str, str, str, str | None, bool, str | None]] = [
    ("1000", "Assets", "الأصول", "asset", None, True, None),
    ("1100", "Current Assets", "الأصول المتداولة", "asset", "1000", True, None),
    ("1110", "Cash in Hand", "النقدية بالصندوق", "asset", "1100", False, "cash"),
    ("1120", "Bank Accounts", "الحسابات البنكية", "asset", "1100", True, None),
    ("1130", "Accounts Receivable", "العملاء (الذمم المدينة)", "asset", "1100", False, "ar"),
    ("1135", "Retention Receivable", "محتجزات مستحقة القبض", "asset", "1100", False, None),
    ("1140", "Contract Assets (WIP)", "أصول العقود (أعمال تحت التنفيذ)", "asset", "1100", False, None),
    ("1150", "Inventory", "المخزون", "asset", "1100", False, "inventory"),
    ("1160", "Advances & Prepayments", "دفعات مقدمة ومصروفات مدفوعة مقدماً", "asset", "1100", False, None),
    ("1170", "VAT Input (Receivable)", "ضريبة القيمة المضافة - مدخلات", "asset", "1100", False, "vin"),
    ("1180", "Post-dated Cheques Receivable", "شيكات آجلة تحت التحصيل", "asset", "1100", False, None),
    ("1200", "Fixed Assets", "الأصول الثابتة", "asset", "1000", True, None),
    ("2000", "Liabilities", "الالتزامات", "liability", None, True, None),
    ("2100", "Current Liabilities", "الالتزامات المتداولة", "liability", "2000", True, None),
    ("2110", "Accounts Payable", "الموردون (الذمم الدائنة)", "liability", "2100", False, "ap"),
    ("2120", "Retention Payable", "محتجزات مستحقة الدفع", "liability", "2100", False, None),
    ("2140", "Salaries Payable", "رواتب مستحقة", "liability", "2100", False, None),
    ("2150", "GOSI Payable", "التأمينات الاجتماعية المستحقة", "liability", "2100", False, None),
    ("2160", "End-of-Service Provision", "مخصص مكافأة نهاية الخدمة", "liability", "2100", False, None),
    ("2170", "VAT Output (Payable)", "ضريبة القيمة المضافة - مخرجات", "liability", "2100", False, "vout"),
    ("2180", "Zakat & Tax Payable", "الزكاة والضريبة المستحقة", "liability", "2100", False, None),
    ("2190", "Customer Advances", "دفعات مقدمة من العملاء", "liability", "2100", False, None),
    ("3000", "Equity", "حقوق الملكية", "equity", None, True, None),
    ("3100", "Owner's Capital", "رأس المال", "equity", "3000", False, "capital"),
    ("3150", "Owner's Drawings", "مسحوبات المالك", "equity", "3000", False, "drawings"),
    ("3200", "Retained Earnings", "الأرباح المبقاة", "equity", "3000", False, "retained_earnings"),
    ("3900", "Opening Balance Equity", "أرصدة افتتاحية", "equity", "3000", False, "opening_equity"),
    ("4000", "Revenue", "الإيرادات", "income", None, True, None),
    ("4100", "Sales Revenue", "إيرادات المبيعات والمقاولات", "income", "4000", False, "sales"),
    ("4190", "Sales Returns", "مردودات المبيعات", "income", "4000", False, "sales_return"),
    ("4195", "Credit Notes Issued (legacy)", "إشعارات دائنة صادرة (قديم)", "income", "4000", False, "credit_note"),
    ("4200", "Equipment Rental Revenue", "إيرادات تأجير المعدات", "income", "4000", False, None),
    ("4300", "Manpower Supply Revenue", "إيرادات توريد العمالة", "income", "4000", False, None),
    ("4400", "Trading Revenue", "إيرادات التجارة", "income", "4000", False, None),
    ("4500", "IT Services Revenue", "إيرادات خدمات تقنية المعلومات", "income", "4000", False, None),
    ("4900", "Other Income", "إيرادات أخرى", "income", "4000", True, None),
    ("5000", "Direct Costs", "التكاليف المباشرة", "expense", None, True, None),
    ("5100", "Subcontractors", "مقاولو الباطن", "expense", "5000", False, None),
    ("5200", "Materials", "المواد", "expense", "5000", False, None),
    ("5300", "Cost of Goods Sold", "تكلفة البضاعة المباعة", "expense", "5000", False, "cogs"),
    ("5400", "Direct Labour", "العمالة المباشرة", "expense", "5000", False, None),
    ("5500", "Equipment Operating Costs", "تشغيل المعدات", "expense", "5000", False, None),
    ("5600", "Site Overheads", "مصاريف الموقع", "expense", "5000", False, None),
    ("6000", "Operating Expenses", "المصروفات التشغيلية", "expense", None, True, None),
    ("6100", "Wages & Salaries", "الرواتب والأجور", "expense", "6000", False, "wages"),
    ("6200", "Purchased Services", "خدمات مشتراة", "expense", "6000", False, "purchase_expense"),
    ("6300", "Rent", "الإيجارات", "expense", "6000", False, None),
    ("6400", "Utilities", "المرافق", "expense", "6000", False, None),
    ("6500", "Office Expenses", "مصروفات مكتبية", "expense", "6000", False, None),
    ("6600", "Travel", "السفر والتنقل", "expense", "6000", False, None),
    ("6700", "Professional Fees", "الأتعاب المهنية", "expense", "6000", False, None),
    ("6800", "Depreciation Expense", "مصروف الإهلاك", "expense", "6000", False, "dep_exp"),
    ("6850", "Bad Debt Expense", "ديون معدومة", "expense", "6000", False, "bad_debt"),
    ("6900", "Other Expenses", "مصروفات أخرى", "expense", "6000", True, None),
]

# Auto-created accounts (one per bank, fixed asset, income/expense category) are
# numbered from these ranges and filed under the matching group.
NUMBER_RANGES: dict[str, tuple[int, int, str]] = {
    "bank": (1121, 1129, "1120"),
    "asset": (1210, 1299, "1200"),
    "inc": (4910, 4999, "4900"),
    "exp": (6910, 6999, "6900"),
}

DEFAULT_COST_CENTERS: list[tuple[str, str, str]] = [
    ("CIVIL", "Civil", "أعمال مدنية"),
    ("SCAFF", "Scaffolding", "سقالات"),
    ("MANPOWER", "Manpower", "توريد عمالة"),
    ("EQUIP", "Equipment", "معدات"),
    ("OFFICE", "Office", "المكتب الرئيسي"),
]

# Direct-cost accounts (5100-5600): a manual entry posted here must say which project it is for.
PROJECT_REQUIRED_RANGE = (5100, 5699)
