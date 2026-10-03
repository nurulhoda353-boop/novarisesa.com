import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/models.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/generic_list_screen.dart' show StatusChip;
import '../../widgets/nf_widgets.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  late Future<
      (
        NfDashboardSummary,
        List<Map<String, dynamic>>,
        Map<String, dynamic>,
        Map<String, dynamic>,
        List<Map<String, dynamic>>,
        List<Map<String, dynamic>>
      )> _future;

  @override
  void initState() {
    super.initState();
    final repo = context.read<NovaFinRepository>();
    _future = Future.wait([
      repo.dashboardSummary(),
      repo.listRaw('reports/stock'),
      repo.getRaw('reports/balance-sheet'),
      repo.getRaw('reports/vat-summary'),
      repo.getRaw('reports/aging').then((d) => (d['items'] as List).cast<Map<String, dynamic>>()),
      repo.getRaw('reports/top-products').then((d) => (d['items'] as List).cast<Map<String, dynamic>>()),
    ]).then((r) => (
          r[0] as NfDashboardSummary,
          r[1] as List<Map<String, dynamic>>,
          r[2] as Map<String, dynamic>,
          r[3] as Map<String, dynamic>,
          r[4] as List<Map<String, dynamic>>,
          r[5] as List<Map<String, dynamic>>,
        ));
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _future,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          if (snapshot.hasError) return Center(child: Text('${snapshot.error}'));
          return const Center(child: CircularProgressIndicator());
        }
        final (summary, stock, balanceSheet, vat, aging, topProducts) = snapshot.data!;
        return SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const NfPageTitle('Reports'),
              const SizedBox(height: 18),
              Wrap(spacing: 12, runSpacing: 12, children: [
                _ReportLink(icon: Icons.receipt_long_outlined, label: 'Sales Register', onTap: () => context.go('/invoices')),
                _ReportLink(icon: Icons.shopping_bag_outlined, label: 'Purchase Register', onTap: () => context.go('/purchase-bills')),
                _ReportLink(icon: Icons.request_quote_outlined, label: 'Quotes', onTap: () => context.go('/quotes')),
                _ReportLink(icon: Icons.assignment_outlined, label: 'Orders', onTap: () => context.go('/orders')),
              ]),
              const SizedBox(height: 20),
              LayoutBuilder(builder: (context, constraints) {
                final wide = constraints.maxWidth > 900;
                final pl = NfPanel(
                  eyebrow: 'Summary',
                  title: 'Profit & Loss',
                  child: Column(children: [
                    _row('Income (Sales)', summary.totalSales, NfColors.success),
                    _row('Expense (Purchases)', summary.totalPurchases, NfColors.danger),
                    const Divider(),
                    _row('Gross Profit', summary.grossProfit, summary.grossProfit >= 0 ? NfColors.success : NfColors.danger, bold: true),
                  ]),
                );
                final vatPanel = NfPanel(
                  eyebrow: 'Tax',
                  title: 'VAT Summary',
                  child: Column(children: [
                    _row('VAT Output (collected on sales)', _n(vat['vat_output']), NfColors.success),
                    _row('VAT Input (paid on purchases)', _n(vat['vat_input']), NfColors.danger),
                    const Divider(),
                    _row(
                      _n(vat['net_payable']) > 0 ? 'Payable to government' : 'Refundable',
                      _n(vat['net_payable']) > 0 ? _n(vat['net_payable']) : _n(vat['net_refundable']),
                      NfColors.primary,
                      bold: true,
                    ),
                  ]),
                );
                if (!wide) return Column(children: [pl, const SizedBox(height: 16), vatPanel]);
                return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(child: pl),
                  const SizedBox(width: 16),
                  Expanded(child: vatPanel),
                ]);
              }),
              const SizedBox(height: 20),
              NfPanel(
                eyebrow: 'Financial Position',
                title: 'Balance Sheet',
                trailing: StatusChip(
                  label: _n(balanceSheet['check_difference']).abs() < 0.05 ? 'Balanced ✓' : 'Check needed',
                  color: _n(balanceSheet['check_difference']).abs() < 0.05 ? NfColors.success : NfColors.danger,
                ),
                child: LayoutBuilder(builder: (context, constraints) {
                  final wide = constraints.maxWidth > 700;
                  final assetsCol = _balanceSheetColumn('Assets', (balanceSheet['assets'] as List).cast<Map<String, dynamic>>(), _n(balanceSheet['total_assets']));
                  final liabEquityCol = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _balanceSheetColumn('Liabilities', (balanceSheet['liabilities'] as List).cast<Map<String, dynamic>>(), _n(balanceSheet['total_liabilities'])),
                    const SizedBox(height: 16),
                    _balanceSheetColumn(
                      'Equity',
                      [...(balanceSheet['equity'] as List).cast<Map<String, dynamic>>(), {'code': '', 'name': 'Net Profit (to date)', 'balance': balanceSheet['net_profit_to_date']}],
                      _n(balanceSheet['total_equity']),
                    ),
                  ]);
                  if (!wide) return Column(children: [assetsCol, const SizedBox(height: 20), liabEquityCol]);
                  return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Expanded(child: assetsCol),
                    const SizedBox(width: 24),
                    Expanded(child: liabEquityCol),
                  ]);
                }),
              ),
              const SizedBox(height: 20),
              LayoutBuilder(builder: (context, constraints) {
                final wide = constraints.maxWidth > 900;
                final agingPanel = NfPanel(
                  eyebrow: 'Receivables',
                  title: 'Aging Report',
                  padded: false,
                  child: aging.isEmpty
                      ? const NfEmptyState(message: 'No outstanding customer balances.')
                      : SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: DataTable(
                            columns: const [
                              DataColumn(label: Text('Customer')),
                              DataColumn(label: Text('0-30')),
                              DataColumn(label: Text('31-60')),
                              DataColumn(label: Text('61-90')),
                              DataColumn(label: Text('90+')),
                              DataColumn(label: Text('Total')),
                            ],
                            rows: [
                              for (final row in aging)
                                DataRow(cells: [
                                  DataCell(Text(row['customer_name'].toString(), style: const TextStyle(fontWeight: FontWeight.w600))),
                                  DataCell(Text(nfMoney.format(_n(row['b0_30'])))),
                                  DataCell(Text(nfMoney.format(_n(row['b31_60'])))),
                                  DataCell(Text(nfMoney.format(_n(row['b61_90'])))),
                                  DataCell(Text(nfMoney.format(_n(row['b90_plus'])), style: const TextStyle(color: NfColors.danger, fontWeight: FontWeight.w600))),
                                  DataCell(Text(nfMoney.format(_n(row['total'])), style: const TextStyle(fontWeight: FontWeight.w700))),
                                ]),
                            ],
                          ),
                        ),
                );
                final topProductsPanel = NfPanel(
                  eyebrow: 'Sales',
                  title: 'Top Selling Products',
                  padded: false,
                  child: topProducts.isEmpty
                      ? const NfEmptyState(message: 'No sales recorded yet.')
                      : Column(children: [
                          for (final row in topProducts)
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                              child: Row(children: [
                                Expanded(child: Text(row['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                                Text('${nfMoney.format(_n(row['quantity']))} ${row['unit']}', style: const TextStyle(color: NfColors.muted, fontSize: 12)),
                                const SizedBox(width: 12),
                                SizedBox(width: 90, child: Text(nfMoney.format(_n(row['value'])), textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w700))),
                              ]),
                            ),
                        ]),
                );
                if (!wide) return Column(children: [agingPanel, const SizedBox(height: 16), topProductsPanel]);
                return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(flex: 3, child: agingPanel),
                  const SizedBox(width: 16),
                  Expanded(flex: 2, child: topProductsPanel),
                ]);
              }),
              const SizedBox(height: 20),
              NfPanel(
                eyebrow: 'Inventory',
                title: 'Stock Report',
                padded: false,
                child: stock.isEmpty
                    ? const NfEmptyState(message: 'No product items yet.')
                    : SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: DataTable(
                          columns: const [
                            DataColumn(label: Text('Item')),
                            DataColumn(label: Text('Unit')),
                            DataColumn(label: Text('Opening'), numeric: true),
                            DataColumn(label: Text('On Hand'), numeric: true),
                            DataColumn(label: Text('Reorder Level'), numeric: true),
                          ],
                          rows: [
                            for (final row in stock)
                              DataRow(cells: [
                                DataCell(Text(row['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w600))),
                                DataCell(Text(row['unit'].toString())),
                                DataCell(Text(nfMoney.format(double.parse(row['opening_qty'].toString())))),
                                DataCell(Text(nfMoney.format(double.parse(row['on_hand'].toString())),
                                    style: TextStyle(
                                        color: double.parse(row['on_hand'].toString()) <= double.parse(row['min_level'].toString()) ? NfColors.danger : null,
                                        fontWeight: FontWeight.w600))),
                                DataCell(Text(nfMoney.format(double.parse(row['min_level'].toString())))),
                              ]),
                          ],
                        ),
                      ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  double _n(dynamic v) => v == null ? 0 : double.parse(v.toString());

  Widget _balanceSheetColumn(String title, List<Map<String, dynamic>> rows, double total) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: NfColors.gold, letterSpacing: 0.5)),
        const SizedBox(height: 8),
        for (final row in rows) _row(row['name'].toString(), _n(row['balance']), NfColors.textDark),
        const Divider(),
        _row('Total $title', total, NfColors.primary, bold: true),
      ],
    );
  }

  Widget _row(String label, double value, Color color, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Expanded(child: Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w500))),
        Text(nfMoney.format(value), style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w600, color: color)),
      ]),
    );
  }
}

class _ReportLink extends StatelessWidget {
  const _ReportLink({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: NfColors.surface,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Container(
          width: 190,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: NfColors.border)),
          child: Row(children: [
            Icon(icon, size: 20, color: NfColors.primary),
            const SizedBox(width: 10),
            Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
          ]),
        ),
      ),
    );
  }
}
