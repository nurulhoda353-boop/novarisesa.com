import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/models.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/generic_list_screen.dart' show StatusChip;
import '../../widgets/nf_widgets.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<NfDashboardSummary> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<NovaFinRepository>().dashboardSummary();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<NfDashboardSummary>(
      future: _future,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          if (snapshot.hasError) {
            return Center(child: Text('Failed to load dashboard: ${snapshot.error}'));
          }
          return const Center(child: CircularProgressIndicator());
        }
        final s = snapshot.data!;
        return SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('DASHBOARD', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: NfColors.gold, letterSpacing: 0.6)),
                        const SizedBox(height: 4),
                        const Text("Today's Snapshot", style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: NfColors.textDark)),
                        const SizedBox(height: 4),
                        const Text('Every invoice, purchase and receipt updates these figures instantly.',
                            style: TextStyle(color: NfColors.muted, fontSize: 13)),
                      ],
                    ),
                  ),
                  Wrap(spacing: 10, children: [
                    OutlinedButton.icon(
                      onPressed: () => context.go('/customers'),
                      icon: const Icon(Icons.person_add_alt, size: 16),
                      label: const Text('Add Customer'),
                    ),
                    ElevatedButton.icon(
                      onPressed: () => context.go('/invoices'),
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('New Invoice'),
                    ),
                  ]),
                ],
              ),
              const SizedBox(height: 20),
              LayoutBuilder(builder: (context, constraints) {
                final wide = constraints.maxWidth > 900;
                final cards = [
                  NfStatCard(label: 'Cash & Bank', value: nfMoney.format(s.cashAndBank), caption: 'Across all accounts', accent: NfColors.primary),
                  NfStatCard(label: 'Receivable from customers', value: nfMoney.format(s.receivable), caption: 'Outstanding after receipts', accent: NfColors.danger),
                  NfStatCard(label: 'Payable to vendors', value: nfMoney.format(s.payable), caption: 'Outstanding after payments', accent: NfColors.warning),
                  NfStatCard(label: 'Total sales (excl. VAT)', value: nfMoney.format(s.totalSales), caption: '${s.invoiceCount} invoices', accent: NfColors.success),
                ];
                return GridView.count(
                  crossAxisCount: wide ? 4 : 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  childAspectRatio: 1.7,
                  children: cards,
                );
              }),
              const SizedBox(height: 20),
              LayoutBuilder(builder: (context, constraints) {
                final wide = constraints.maxWidth > 1100;
                final breakdown = NfPanel(
                  eyebrow: 'Breakdown',
                  title: 'Cash, Receivables & Payables',
                  child: SizedBox(height: 190, child: _BreakdownDonut(cash: s.cashAndBank, receivable: s.receivable, payable: s.payable)),
                );
                final profitChart = NfPanel(
                  eyebrow: 'Performance',
                  title: 'Net Profit Margin',
                  child: SizedBox(height: 190, child: _ProfitDonut(sales: s.totalSales, cost: s.totalPurchases)),
                );
                final topCustomerBox = SizedBox(height: 260, child: _TopCustomerBox(topCustomer: s.topCustomer));
                if (!wide) {
                  return Column(children: [breakdown, const SizedBox(height: 16), profitChart, const SizedBox(height: 16), topCustomerBox]);
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: breakdown),
                    const SizedBox(width: 16),
                    Expanded(child: profitChart),
                    const SizedBox(width: 16),
                    Expanded(child: topCustomerBox),
                  ],
                );
              }),
              const SizedBox(height: 16),
              LayoutBuilder(builder: (context, constraints) {
                final wide = constraints.maxWidth > 900;
                final trend = NfPanel(
                  eyebrow: 'Trend',
                  title: 'Sales vs Purchases (Monthly)',
                  child: SizedBox(height: 220, child: _TrendChart(rows: s.monthlyTrend)),
                );
                final topCustomers = NfPanel(
                  eyebrow: 'Ranking',
                  title: 'Top Customers (by Total Sales)',
                  child: SizedBox(height: 220, child: _TopCustomersChart(rows: s.topCustomers)),
                );
                if (!wide) {
                  return Column(children: [trend, const SizedBox(height: 16), topCustomers]);
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: trend),
                    const SizedBox(width: 16),
                    Expanded(child: topCustomers),
                  ],
                );
              }),
              const SizedBox(height: 16),
              LayoutBuilder(builder: (context, constraints) {
                final wide = constraints.maxWidth > 900;
                final recent = NfPanel(
                  eyebrow: 'Register',
                  title: 'Recent Invoices',
                  padded: false,
                  trailing: TextButton(onPressed: () => context.go('/invoices'), child: const Text('View All')),
                  child: s.recentInvoices.isEmpty
                      ? const NfEmptyState(message: 'No invoices posted yet.')
                      : Column(children: [for (final inv in s.recentInvoices) _InvoiceRow(inv)]),
                );
                final profitLoss = NfPanel(
                  eyebrow: 'Summary',
                  title: 'Profit & Loss',
                  trailing: StatusChip(label: s.grossProfit >= 0 ? 'In Profit' : 'In Loss', color: s.grossProfit >= 0 ? NfColors.success : NfColors.danger),
                  child: _ProfitLossPanel(totalSales: s.totalSales, totalPurchases: s.totalPurchases, grossProfit: s.grossProfit),
                );
                if (!wide) {
                  return Column(children: [recent, const SizedBox(height: 16), profitLoss]);
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 3, child: recent),
                    const SizedBox(width: 16),
                    Expanded(flex: 2, child: profitLoss),
                  ],
                );
              }),
              const SizedBox(height: 16),
              LayoutBuilder(builder: (context, constraints) {
                final wide = constraints.maxWidth > 900;
                final lowStock = NfPanel(
                  eyebrow: 'Alert',
                  title: 'Low Stock',
                  padded: false,
                  trailing: s.lowStock.isEmpty ? null : StatusChip(label: '${s.lowStock.length} item(s)', color: NfColors.danger),
                  child: s.lowStock.isEmpty
                      ? const NfEmptyState(message: 'No items below their reorder level.', icon: Icons.check_circle_outline)
                      : Column(children: [for (final row in s.lowStock) _LowStockRow(row)]),
                );
                final receivables = NfPanel(
                  eyebrow: 'Outstanding',
                  title: 'Highest Receivables',
                  padded: false,
                  trailing: s.topReceivables.isEmpty ? null : StatusChip(label: '${s.topReceivables.length} customer(s)', color: NfColors.primary),
                  child: s.topReceivables.isEmpty
                      ? const NfEmptyState(message: 'No outstanding customer balances.', icon: Icons.check_circle_outline)
                      : Column(children: [for (final row in s.topReceivables) _ReceivableRow(row)]),
                );
                if (!wide) {
                  return Column(children: [lowStock, const SizedBox(height: 16), receivables]);
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: lowStock),
                    const SizedBox(width: 16),
                    Expanded(child: receivables),
                  ],
                );
              }),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }
}

class _BreakdownDonut extends StatelessWidget {
  const _BreakdownDonut({required this.cash, required this.receivable, required this.payable});
  final double cash;
  final double receivable;
  final double payable;

  @override
  Widget build(BuildContext context) {
    final total = cash.abs() + receivable.abs() + payable.abs();
    if (total == 0) {
      return const NfEmptyState(message: 'No cash, receivable or payable activity yet.');
    }
    return Row(
      children: [
        Expanded(
          child: Stack(
            alignment: Alignment.center,
            children: [
              PieChart(
                PieChartData(
                  sectionsSpace: 2,
                  centerSpaceRadius: 46,
                  sections: [
                    PieChartSectionData(value: cash.abs(), color: NfColors.primary, showTitle: false, radius: 22),
                    PieChartSectionData(value: receivable.abs(), color: NfColors.danger, showTitle: false, radius: 22),
                    PieChartSectionData(value: payable.abs(), color: NfColors.warning, showTitle: false, radius: 22),
                  ],
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Grand Total', style: TextStyle(fontSize: 11, color: NfColors.muted)),
                  Text(nfMoney.format(total), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                ],
              ),
            ],
          ),
        ),
        SizedBox(
          width: 110,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _LegendDot(color: NfColors.primary, label: 'Cash & Bank'),
              const SizedBox(height: 8),
              _LegendDot(color: NfColors.danger, label: 'Receivable'),
              const SizedBox(height: 8),
              _LegendDot(color: NfColors.warning, label: 'Payable'),
            ],
          ),
        ),
      ],
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      const SizedBox(width: 6),
      Text(label, style: const TextStyle(fontSize: 11.5, color: NfColors.textDark)),
    ]);
  }
}

class _TopCustomerBox extends StatelessWidget {
  const _TopCustomerBox({required this.topCustomer});
  final NfTopCustomer? topCustomer;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: NfColors.primary, borderRadius: BorderRadius.circular(8)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: const BoxDecoration(color: NfColors.gold, shape: BoxShape.circle),
                child: const Icon(Icons.emoji_events_outlined, color: NfColors.primary, size: 18),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Text('Top Customer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
          const SizedBox(height: 2),
          Text('Your highest-selling customer right now', style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 11.5)),
          const SizedBox(height: 10),
          Text(topCustomer?.name ?? 'No sales yet', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18)),
          if (topCustomer != null) Text('${nfMoney.format(topCustomer!.total)} Total Sales', style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12.5)),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Colors.white54)),
              onPressed: () => context.go('/customers'),
              child: const Text('View All Customers'),
            ),
          ),
        ],
      ),
    );
  }
}

class _TrendChart extends StatelessWidget {
  const _TrendChart({required this.rows});
  final List<NfMonthlyTrend> rows;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty || rows.every((r) => r.sales == 0 && r.purchases == 0)) {
      return const NfEmptyState(message: 'No sales or purchases recorded yet.');
    }
    final maxVal = rows.map((r) => r.sales > r.purchases ? r.sales : r.purchases).reduce((a, b) => a > b ? a : b);
    return Column(
      children: [
        Row(mainAxisSize: MainAxisSize.min, children: [
          const _LegendDot(color: NfColors.success, label: 'Sales'),
          const SizedBox(width: 16),
          const _LegendDot(color: NfColors.danger, label: 'Purchases'),
        ]),
        const SizedBox(height: 10),
        Expanded(
          child: LineChart(
            LineChartData(
              minY: 0,
              maxY: maxVal * 1.2 == 0 ? 1 : maxVal * 1.2,
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      final i = value.toInt();
                      if (i < 0 || i >= rows.length) return const SizedBox.shrink();
                      return Padding(padding: const EdgeInsets.only(top: 6), child: Text(rows[i].month, style: const TextStyle(fontSize: 10)));
                    },
                  ),
                ),
              ),
              lineBarsData: [
                LineChartBarData(
                  spots: [for (var i = 0; i < rows.length; i++) FlSpot(i.toDouble(), rows[i].sales)],
                  color: NfColors.success,
                  barWidth: 3,
                  dotData: const FlDotData(show: true),
                  isCurved: true,
                ),
                LineChartBarData(
                  spots: [for (var i = 0; i < rows.length; i++) FlSpot(i.toDouble(), rows[i].purchases)],
                  color: NfColors.danger,
                  barWidth: 3,
                  dotData: const FlDotData(show: true),
                  isCurved: true,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ProfitLossPanel extends StatelessWidget {
  const _ProfitLossPanel({required this.totalSales, required this.totalPurchases, required this.grossProfit});
  final double totalSales;
  final double totalPurchases;
  final double grossProfit;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _plRow('Income (Sales)', totalSales, NfColors.success),
        const SizedBox(height: 10),
        _barTrack(totalSales, totalSales > totalPurchases ? totalSales : totalPurchases, NfColors.success),
        const SizedBox(height: 16),
        _plRow('Expense (Purchases)', totalPurchases, NfColors.danger),
        const SizedBox(height: 10),
        _barTrack(totalPurchases, totalSales > totalPurchases ? totalSales : totalPurchases, NfColors.danger),
        const Divider(height: 28),
        _plRow('Gross Profit', grossProfit, grossProfit >= 0 ? NfColors.success : NfColors.danger, bold: true),
      ],
    );
  }

  Widget _plRow(String label, double value, Color color, {bool bold = false}) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w500, fontSize: bold ? 14 : 13)),
      Text(nfMoney.format(value), style: TextStyle(fontWeight: FontWeight.w700, color: color, fontSize: bold ? 15 : 13)),
    ]);
  }

  Widget _barTrack(double value, double max, Color color) {
    final ratio = max == 0 ? 0.0 : (value / max).clamp(0.0, 1.0);
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: LinearProgressIndicator(value: ratio, minHeight: 6, backgroundColor: NfColors.soft, color: color),
    );
  }
}

class _ProfitDonut extends StatelessWidget {
  const _ProfitDonut({required this.sales, required this.cost});
  final double sales;
  final double cost;

  @override
  Widget build(BuildContext context) {
    final profit = sales - cost;
    final margin = sales == 0 ? 0.0 : (profit / sales * 100).clamp(0.0, 100.0);
    return Stack(
      alignment: Alignment.center,
      children: [
        PieChart(
          PieChartData(
            sectionsSpace: 2,
            centerSpaceRadius: 60,
            sections: [
              PieChartSectionData(value: margin, color: NfColors.success, showTitle: false, radius: 22),
              PieChartSectionData(value: 100 - margin, color: NfColors.soft, showTitle: false, radius: 22),
            ],
          ),
        ),
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Profit Margin', style: TextStyle(fontSize: 12, color: NfColors.muted)),
            Text('${margin.toStringAsFixed(0)}%', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
          ],
        ),
      ],
    );
  }
}

class _TopCustomersChart extends StatelessWidget {
  const _TopCustomersChart({required this.rows});
  final List<NfTopCustomer> rows;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return const NfEmptyState(message: 'No sales recorded yet.');
    }
    final maxVal = rows.map((r) => r.total).reduce((a, b) => a > b ? a : b);
    return BarChart(
      BarChartData(
        maxY: maxVal * 1.2,
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i < 0 || i >= rows.length) return const SizedBox.shrink();
                final name = rows[i].name;
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(name.length > 10 ? '${name.substring(0, 9)}…' : name, style: const TextStyle(fontSize: 9)),
                );
              },
            ),
          ),
        ),
        barGroups: [
          for (var i = 0; i < rows.length; i++)
            BarChartGroupData(x: i, barRods: [
              BarChartRodData(toY: rows[i].total, color: NfColors.primary, width: 18, borderRadius: BorderRadius.circular(4)),
            ]),
        ],
      ),
    );
  }
}

class _InvoiceRow extends StatelessWidget {
  const _InvoiceRow(this.inv);
  final NfRecentInvoice inv;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      child: Row(
        children: [
          SizedBox(width: 78, child: Text(inv.code, style: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w600, fontSize: 12.5))),
          Expanded(child: Text(inv.customerName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
          Text(inv.date, style: const TextStyle(color: NfColors.muted, fontSize: 12)),
          const SizedBox(width: 12),
          _ModeTag(mode: inv.mode),
          const SizedBox(width: 12),
          SizedBox(
            width: 80,
            child: Text(nfMoney.format(inv.grandTotal), textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

class _ModeTag extends StatelessWidget {
  const _ModeTag({required this.mode});
  final String mode;

  @override
  Widget build(BuildContext context) {
    final credit = mode == 'credit';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: (credit ? NfColors.danger : NfColors.success).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        credit ? 'Credit' : 'Cash',
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: credit ? NfColors.danger : NfColors.success),
      ),
    );
  }
}

class _LowStockRow extends StatelessWidget {
  const _LowStockRow(this.row);
  final NfLowStockRow row;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                Text('Reorder level ${nfMoney.format(row.minLevel)} ${row.unit}', style: const TextStyle(fontSize: 11.5, color: NfColors.muted)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: NfColors.danger.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)),
            child: Text('${nfMoney.format(row.onHand)} ${row.unit}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: NfColors.danger)),
          ),
        ],
      ),
    );
  }
}

class _ReceivableRow extends StatelessWidget {
  const _ReceivableRow(this.row);
  final NfTopReceivable row;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                if (row.city != null) Text(row.city!, style: const TextStyle(fontSize: 11.5, color: NfColors.muted)),
              ],
            ),
          ),
          Text(nfMoney.format(row.outstanding), style: const TextStyle(fontWeight: FontWeight.w700, color: NfColors.danger, fontSize: 13)),
        ],
      ),
    );
  }
}
