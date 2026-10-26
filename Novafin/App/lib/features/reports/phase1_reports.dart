import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/generic_list_screen.dart';
import '../../widgets/nf_widgets.dart';

double _d(dynamic v) => v == null ? 0 : double.parse(v.toString());

/// One customer's or vendor's account: every invoice, payment and correction, with a running balance.
class StatementScreen extends StatefulWidget {
  const StatementScreen({super.key, required this.kind, required this.id});

  final String kind; // customer | vendor
  final String id;

  @override
  State<StatementScreen> createState() => _StatementScreenState();
}

class _StatementScreenState extends State<StatementScreen> {
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<NovaFinRepository>().getRaw('reports/statement/${widget.kind}/${widget.id}');
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _future,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          if (snapshot.hasError) return Padding(padding: const EdgeInsets.all(24), child: Text('${snapshot.error}'));
          return const Center(child: CircularProgressIndicator());
        }
        final data = snapshot.data!;
        final lines = (data['lines'] as List).cast<Map<String, dynamic>>();
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          NfPageTitle('Statement of Account — ${data['party_name']}'),
          const SizedBox(height: 4),
          Text(data['balance_meaning'].toString(), style: const TextStyle(color: NfColors.muted, fontSize: 12.5)),
          const SizedBox(height: 14),
          Expanded(
            child: NfPanel(
              eyebrow: 'Statement',
              title: 'Closing balance ${nfMoney.format(_d(data['closing_balance']))}',
              padded: false,
              scrollableContent: true,
              child: lines.isEmpty
                  ? const NfEmptyState(message: 'No transactions yet.')
                  : SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: DataTable(
                        columns: const [
                          DataColumn(label: Text('Date')),
                          DataColumn(label: Text('Document')),
                          DataColumn(label: Text('Details')),
                          DataColumn(label: Text('Debit'), numeric: true),
                          DataColumn(label: Text('Credit'), numeric: true),
                          DataColumn(label: Text('Balance'), numeric: true),
                        ],
                        rows: [
                          for (final l in lines)
                            DataRow(cells: [
                              DataCell(Text(dateCell(l['date']))),
                              DataCell(Text(l['code'].toString(), style: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w600))),
                              DataCell(ConstrainedBox(constraints: const BoxConstraints(maxWidth: 360), child: Text(l['description'].toString(), overflow: TextOverflow.ellipsis))),
                              DataCell(Text(_d(l['debit']) == 0 ? '' : nfMoney.format(_d(l['debit'])))),
                              DataCell(Text(_d(l['credit']) == 0 ? '' : nfMoney.format(_d(l['credit'])))),
                              DataCell(Text(nfMoney.format(_d(l['balance'])), style: const TextStyle(fontWeight: FontWeight.w700))),
                            ]),
                        ],
                      ),
                    ),
            ),
          ),
        ]);
      },
    );
  }
}

/// Income, direct cost and margin for each project.
class ProjectPlScreen extends StatefulWidget {
  const ProjectPlScreen({super.key});

  @override
  State<ProjectPlScreen> createState() => _ProjectPlScreenState();
}

class _ProjectPlScreenState extends State<ProjectPlScreen> {
  DateTime _from = DateTime(DateTime.now().year, 1, 1);
  DateTime _to = DateTime.now();
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final f = DateFormat('yyyy-MM-dd');
    _future = context.read<NovaFinRepository>().getRaw('reports/project-pl?date_from=${f.format(_from)}&date_to=${f.format(_to)}');
  }

  Future<void> _pick(bool from) async {
    final picked = await showDatePicker(context: context, initialDate: from ? _from : _to, firstDate: DateTime(2020), lastDate: DateTime(2100));
    if (picked == null) return;
    setState(() {
      if (from) {
        _from = picked;
      } else {
        _to = picked;
      }
      _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final f = DateFormat('dd/MM/yyyy');
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Expanded(child: NfPageTitle('Project Profit & Loss')),
        OutlinedButton(onPressed: () => _pick(true), child: Text('From ${f.format(_from)}')),
        const SizedBox(width: 8),
        OutlinedButton(onPressed: () => _pick(false), child: Text('To ${f.format(_to)}')),
      ]),
      const SizedBox(height: 18),
      Expanded(
        child: NfPanel(
          eyebrow: 'Per project',
          title: 'Income, direct cost and margin',
          padded: false,
          scrollableContent: true,
          child: FutureBuilder<Map<String, dynamic>>(
            future: _future,
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                if (snapshot.hasError) return Padding(padding: const EdgeInsets.all(24), child: Text('${snapshot.error}'));
                return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
              }
              final items = (snapshot.data!['items'] as List).cast<Map<String, dynamic>>();
              if (items.isEmpty) return const NfEmptyState(message: 'No income or cost in this period yet.');
              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  columns: const [
                    DataColumn(label: Text('Project')),
                    DataColumn(label: Text('Income'), numeric: true),
                    DataColumn(label: Text('Direct cost'), numeric: true),
                    DataColumn(label: Text('Gross profit'), numeric: true),
                    DataColumn(label: Text('Margin'), numeric: true),
                    DataColumn(label: Text('Other cost'), numeric: true),
                    DataColumn(label: Text('Net'), numeric: true),
                  ],
                  rows: [
                    for (final p in items)
                      DataRow(cells: [
                        DataCell(Text('${p['code'] ?? '—'}  ${p['name']}', style: const TextStyle(fontWeight: FontWeight.w600))),
                        DataCell(Text(nfMoney.format(_d(p['income'])))),
                        DataCell(Text(nfMoney.format(_d(p['direct_cost'])))),
                        DataCell(Text(nfMoney.format(_d(p['gross_profit'])), style: TextStyle(fontWeight: FontWeight.w700, color: _d(p['gross_profit']) < 0 ? NfColors.danger : null))),
                        DataCell(Text(p['margin_percent'] == null ? '—' : '${p['margin_percent']}%')),
                        DataCell(Text(nfMoney.format(_d(p['other_cost'])))),
                        DataCell(Text(nfMoney.format(_d(p['net'])), style: TextStyle(fontWeight: FontWeight.w700, color: _d(p['net']) < 0 ? NfColors.danger : null))),
                      ]),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    ]);
  }
}

/// Every account's balance on a date; the two columns must add to the same number.
class TrialBalanceScreen extends StatefulWidget {
  const TrialBalanceScreen({super.key});

  @override
  State<TrialBalanceScreen> createState() => _TrialBalanceScreenState();
}

class _TrialBalanceScreenState extends State<TrialBalanceScreen> {
  DateTime _asOf = DateTime.now();
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() => _future = context.read<NovaFinRepository>().getRaw('reports/trial-balance?as_of=${DateFormat('yyyy-MM-dd').format(_asOf)}');

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Expanded(child: NfPageTitle('Trial Balance')),
        OutlinedButton.icon(
          icon: const Icon(Icons.calendar_today, size: 16),
          label: Text('As of ${DateFormat('dd/MM/yyyy').format(_asOf)}'),
          onPressed: () async {
            final picked = await showDatePicker(context: context, initialDate: _asOf, firstDate: DateTime(2020), lastDate: DateTime(2100));
            if (picked != null) {
              setState(() {
                _asOf = picked;
                _load();
              });
            }
          },
        ),
      ]),
      const SizedBox(height: 18),
      Expanded(
        child: NfPanel(
          eyebrow: 'Ledger',
          title: 'All accounts',
          padded: false,
          scrollableContent: true,
          child: FutureBuilder<Map<String, dynamic>>(
            future: _future,
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                if (snapshot.hasError) return Padding(padding: const EdgeInsets.all(24), child: Text('${snapshot.error}'));
                return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
              }
              final data = snapshot.data!;
              final items = (data['items'] as List).cast<Map<String, dynamic>>();
              final balanced = _d(data['difference']).abs() < 0.01;
              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  DataTable(
                    columns: const [
                      DataColumn(label: Text('No.')),
                      DataColumn(label: Text('Account')),
                      DataColumn(label: Text('الاسم')),
                      DataColumn(label: Text('Debit'), numeric: true),
                      DataColumn(label: Text('Credit'), numeric: true),
                    ],
                    rows: [
                      for (final a in items)
                        DataRow(cells: [
                          DataCell(Text(a['number']?.toString() ?? '—')),
                          DataCell(Text(a['name'].toString())),
                          DataCell(Text(a['name_ar']?.toString() ?? '')),
                          DataCell(Text(_d(a['debit']) == 0 ? '' : nfMoney.format(_d(a['debit'])))),
                          DataCell(Text(_d(a['credit']) == 0 ? '' : nfMoney.format(_d(a['credit'])))),
                        ]),
                      DataRow(cells: [
                        const DataCell(Text('')),
                        const DataCell(Text('Total', style: TextStyle(fontWeight: FontWeight.w700))),
                        const DataCell(Text('')),
                        DataCell(Text(nfMoney.format(_d(data['total_debit'])), style: const TextStyle(fontWeight: FontWeight.w700))),
                        DataCell(Text(nfMoney.format(_d(data['total_credit'])), style: const TextStyle(fontWeight: FontWeight.w700))),
                      ]),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      balanced ? 'Balanced — debits equal credits.' : 'NOT balanced: difference ${nfMoney.format(_d(data['difference']))}',
                      style: TextStyle(fontWeight: FontWeight.w700, color: balanced ? NfColors.success : NfColors.danger),
                    ),
                  ),
                ]),
              );
            },
          ),
        ),
      ),
    ]);
  }
}
