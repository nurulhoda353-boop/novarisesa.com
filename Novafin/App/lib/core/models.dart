double _num(dynamic v) => v == null ? 0 : double.parse(v.toString());

class NfItem {
  NfItem.fromJson(Map<String, dynamic> j)
      : id = j['id'] as String,
        name = j['name'] as String,
        kind = j['kind'] as String,
        unit = j['unit'] as String,
        cost = _num(j['cost']),
        price = _num(j['price']),
        openingQty = _num(j['opening_qty']),
        minLevel = _num(j['min_level']),
        isActive = j['is_active'] as bool;

  final String id;
  final String name;
  final String kind;
  final String unit;
  final double cost;
  final double price;
  final double openingQty;
  final double minLevel;
  final bool isActive;
}

class NfCustomer {
  NfCustomer.fromJson(Map<String, dynamic> j)
      : id = j['id'] as String,
        name = j['name'] as String,
        phone = j['phone'] as String?,
        email = j['email'] as String?,
        city = j['city'] as String?,
        creditLimit = _num(j['credit_limit']),
        openingBalance = _num(j['opening_balance']);

  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String? city;
  final double creditLimit;
  final double openingBalance;
}

class NfVendor {
  NfVendor.fromJson(Map<String, dynamic> j)
      : id = j['id'] as String,
        name = j['name'] as String,
        phone = j['phone'] as String?,
        city = j['city'] as String?,
        openingBalance = _num(j['opening_balance']);

  final String id;
  final String name;
  final String? phone;
  final String? city;
  final double openingBalance;
}

class NfDocumentLine {
  NfDocumentLine.fromJson(Map<String, dynamic> j)
      : itemId = j['item_id'] as String,
        name = j['name'] as String,
        unit = j['unit'] as String,
        quantity = _num(j['quantity']),
        rate = _num(j['rate']),
        amount = _num(j['amount']);

  final String itemId;
  final String name;
  final String unit;
  final double quantity;
  final double rate;
  final double amount;
}

class NfInvoice {
  NfInvoice.fromJson(Map<String, dynamic> j)
      : id = j['id'] as String,
        code = j['code'] as String,
        customerName = j['customer_name'] as String? ?? '—',
        date = j['invoice_date'] as String,
        mode = j['mode'] as String,
        status = j['status'] as String,
        subtotal = _num(j['subtotal']),
        vatAmount = _num(j['vat_amount']),
        grandTotal = _num(j['grand_total']),
        lines = (j['lines'] as List? ?? [])
            .map((e) => NfDocumentLine.fromJson(e as Map<String, dynamic>))
            .toList();

  final String id;
  final String code;
  final String customerName;
  final String date;
  final String mode;
  final String status;
  final double subtotal;
  final double vatAmount;
  final double grandTotal;
  final List<NfDocumentLine> lines;
}

class NfPurchase {
  NfPurchase.fromJson(Map<String, dynamic> j)
      : id = j['id'] as String,
        code = j['code'] as String,
        vendorName = j['vendor_name'] as String? ?? '—',
        date = j['purchase_date'] as String,
        mode = j['mode'] as String,
        subtotal = _num(j['subtotal']),
        vatAmount = _num(j['vat_amount']),
        grandTotal = _num(j['grand_total']),
        lines = (j['lines'] as List? ?? [])
            .map((e) => NfDocumentLine.fromJson(e as Map<String, dynamic>))
            .toList();

  final String id;
  final String code;
  final String vendorName;
  final String date;
  final String mode;
  final double subtotal;
  final double vatAmount;
  final double grandTotal;
  final List<NfDocumentLine> lines;
}

class NfLowStockRow {
  NfLowStockRow.fromJson(Map<String, dynamic> j)
      : name = j['name'] as String,
        onHand = _num(j['on_hand']),
        minLevel = _num(j['min_level']),
        unit = j['unit'] as String;

  final String name;
  final double onHand;
  final double minLevel;
  final String unit;
}

class NfTopCustomer {
  NfTopCustomer.fromJson(Map<String, dynamic> j)
      : name = j['name'] as String,
        total = _num(j['total']);

  final String name;
  final double total;
}

class NfTopReceivable {
  NfTopReceivable.fromJson(Map<String, dynamic> j)
      : name = j['name'] as String,
        city = j['city'] as String?,
        outstanding = _num(j['outstanding']);

  final String name;
  final String? city;
  final double outstanding;
}

class NfMonthlyTrend {
  NfMonthlyTrend.fromJson(Map<String, dynamic> j)
      : month = j['month'] as String,
        sales = _num(j['sales']),
        purchases = _num(j['purchases']);

  final String month;
  final double sales;
  final double purchases;
}

class NfRecentInvoice {
  NfRecentInvoice.fromJson(Map<String, dynamic> j)
      : code = j['code'] as String,
        customerName = j['customer_name'] as String? ?? '—',
        date = j['invoice_date'] as String,
        mode = j['mode'] as String,
        grandTotal = _num(j['grand_total']);

  final String code;
  final String customerName;
  final String date;
  final String mode;
  final double grandTotal;
}

class NfDashboardSummary {
  NfDashboardSummary.fromJson(Map<String, dynamic> j)
      : cashAndBank = _num(j['cash_and_bank']),
        receivable = _num(j['receivable']),
        payable = _num(j['payable']),
        totalSales = _num(j['total_sales']),
        totalPurchases = _num(j['total_purchases']),
        grossProfit = _num(j['gross_profit']),
        invoiceCount = j['invoice_count'] as int,
        customerCount = j['customer_count'] as int,
        itemCount = j['item_count'] as int,
        lowStock = (j['low_stock'] as List).map((e) => NfLowStockRow.fromJson(e as Map<String, dynamic>)).toList(),
        topCustomers =
            (j['top_customers'] as List).map((e) => NfTopCustomer.fromJson(e as Map<String, dynamic>)).toList(),
        topCustomer = j['top_customer'] == null ? null : NfTopCustomer.fromJson(j['top_customer'] as Map<String, dynamic>),
        topReceivables = (j['top_receivables'] as List).map((e) => NfTopReceivable.fromJson(e as Map<String, dynamic>)).toList(),
        monthlyTrend = (j['monthly_trend'] as List).map((e) => NfMonthlyTrend.fromJson(e as Map<String, dynamic>)).toList(),
        recentInvoices = (j['recent_invoices'] as List)
            .map((e) => NfRecentInvoice.fromJson(e as Map<String, dynamic>))
            .toList();

  final double cashAndBank;
  final double receivable;
  final double payable;
  final double totalSales;
  final double totalPurchases;
  final double grossProfit;
  final int invoiceCount;
  final int customerCount;
  final int itemCount;
  final List<NfLowStockRow> lowStock;
  final List<NfTopCustomer> topCustomers;
  final NfTopCustomer? topCustomer;
  final List<NfTopReceivable> topReceivables;
  final List<NfMonthlyTrend> monthlyTrend;
  final List<NfRecentInvoice> recentInvoices;
}
