import 'api_client.dart';
import 'models.dart';

/// Talks to the `/api/v1/novafin/*` routes added to the shared FastAPI
/// backend. Keeps the raw JSON handling out of the UI layer.
class NovaFinRepository {
  NovaFinRepository(this._api);

  final ApiClient _api;

  Future<NfDashboardSummary> dashboardSummary() async {
    final data = await _api.get<Map<String, dynamic>>('/novafin/dashboard/summary');
    return NfDashboardSummary.fromJson(data);
  }

  Future<List<NfItem>> listItems() async {
    final data = await _api.get<Map<String, dynamic>>('/novafin/items');
    return (data['items'] as List).map((e) => NfItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createItem({
    required String name,
    required String kind,
    required String unit,
    required double cost,
    required double price,
    required double openingQty,
    required double minLevel,
  }) {
    return _api.post('/novafin/items', data: {
      'name': name,
      'kind': kind,
      'unit': unit,
      'cost': cost,
      'price': price,
      'opening_qty': openingQty,
      'min_level': minLevel,
    });
  }

  Future<void> deleteItem(String id) => _api.delete('/novafin/items/$id');

  Future<List<NfCustomer>> listCustomers() async {
    final data = await _api.get<Map<String, dynamic>>('/novafin/customers');
    return (data['items'] as List).map((e) => NfCustomer.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createCustomer({
    required String name,
    String? phone,
    String? email,
    String? city,
    double creditLimit = 0,
    double openingBalance = 0,
  }) {
    return _api.post('/novafin/customers', data: {
      'name': name,
      'phone': phone,
      'email': email,
      'city': city,
      'credit_limit': creditLimit,
      'opening_balance': openingBalance,
    });
  }

  Future<void> deleteCustomer(String id) => _api.delete('/novafin/customers/$id');

  Future<List<NfVendor>> listVendors() async {
    final data = await _api.get<Map<String, dynamic>>('/novafin/vendors');
    return (data['items'] as List).map((e) => NfVendor.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createVendor({
    required String name,
    String? phone,
    String? city,
    double openingBalance = 0,
  }) {
    return _api.post('/novafin/vendors', data: {
      'name': name,
      'phone': phone,
      'city': city,
      'opening_balance': openingBalance,
    });
  }

  Future<void> deleteVendor(String id) => _api.delete('/novafin/vendors/$id');

  Future<List<NfInvoice>> listInvoices() async {
    final data = await _api.get<Map<String, dynamic>>('/novafin/invoices');
    return (data['items'] as List).map((e) => NfInvoice.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createInvoice({
    required String customerId,
    required String date,
    required String mode,
    required List<Map<String, dynamic>> lines,
  }) {
    return _api.post('/novafin/invoices', data: {
      'customer_id': customerId,
      'invoice_date': date,
      'mode': mode,
      'lines': lines,
    });
  }

  Future<List<NfPurchase>> listPurchases() async {
    final data = await _api.get<Map<String, dynamic>>('/novafin/purchases');
    return (data['items'] as List).map((e) => NfPurchase.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createPurchase({
    required String vendorId,
    required String date,
    required String mode,
    required List<Map<String, dynamic>> lines,
  }) {
    return _api.post('/novafin/purchases', data: {
      'vendor_id': vendorId,
      'purchase_date': date,
      'mode': mode,
      'lines': lines,
    });
  }

  Future<Map<String, dynamic>> getCompany() => _api.get<Map<String, dynamic>>('/novafin/company');

  Future<void> saveCompany(Map<String, dynamic> body) => _api.put('/novafin/company', data: body);

  /// For endpoints whose response isn't a plain {"items": [...]} list —
  /// opening balance, bank reconciliation, reports, etc.
  Future<Map<String, dynamic>> getRaw(String endpoint) => _api.get<Map<String, dynamic>>('/novafin/$endpoint');

  /// Generic helpers for the many simple/lookup-style NovaFin endpoints
  /// (departments, banks, cheques, vouchers, journal entries, etc.) where a
  /// typed model per entity would be pure repetition for this pass.
  Future<List<Map<String, dynamic>>> listRaw(String endpoint) async {
    final data = await _api.get<Map<String, dynamic>>('/novafin/$endpoint');
    return (data['items'] as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> createRaw(String endpoint, Map<String, dynamic> body) =>
      _api.post<Map<String, dynamic>>('/novafin/$endpoint', data: body);

  Future<void> patchRaw(String endpoint, [Map<String, dynamic>? body]) =>
      _api.patch('/novafin/$endpoint', data: body);

  Future<void> deleteRaw(String endpoint) => _api.delete('/novafin/$endpoint');
}
