import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/novafin_repository.dart';
import '../../widgets/nf_widgets.dart';

class AssetsScreen extends StatefulWidget {
  const AssetsScreen({super.key});

  @override
  State<AssetsScreen> createState() => _AssetsScreenState();
}

class _AssetsScreenState extends State<AssetsScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  bool _running = false;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = context.read<NovaFinRepository>().listRaw('assets');

  Future<void> _refresh() async {
    setState(_reload);
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final canManage = context.watch<AuthState>().user?.canManage ?? false;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Expanded(child: NfPageTitle('Fixed Assets')),
          if (canManage) ...[
            OutlinedButton.icon(
              onPressed: _running ? null : _runDepreciation,
              icon: _running
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.trending_down, size: 16),
              label: const Text('Post This Month\'s Depreciation'),
            ),
            const SizedBox(width: 10),
            ElevatedButton.icon(
              onPressed: () => _openCreateDialog(context),
              icon: const Icon(Icons.add, size: 18),
              label: const Text('New Asset'),
            ),
          ],
        ]),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: 'Accounting',
            title: 'All Assets',
            padded: false,
            scrollableContent: true,
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: _future,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  if (snapshot.hasError) return Padding(padding: const EdgeInsets.all(24), child: Text('${snapshot.error}'));
                  return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
                }
                final rows = snapshot.data!;
                if (rows.isEmpty) return const NfEmptyState(message: 'No fixed assets registered yet.');
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Name')),
                      DataColumn(label: Text('Cost'), numeric: true),
                      DataColumn(label: Text('Purchase Date')),
                      DataColumn(label: Text('Monthly Dep.'), numeric: true),
                      DataColumn(label: Text('Accum. Dep.'), numeric: true),
                      DataColumn(label: Text('Book Value'), numeric: true),
                      DataColumn(label: Text('Funded Via')),
                    ],
                    rows: [
                      for (final a in rows)
                        DataRow(cells: [
                          DataCell(Text(a['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w600))),
                          DataCell(Text(nfMoney.format(double.parse(a['cost'].toString())))),
                          DataCell(Text(a['purchase_date'].toString())),
                          DataCell(Text(nfMoney.format(double.parse(a['monthly_depreciation'].toString())))),
                          DataCell(Text(nfMoney.format(double.parse(a['accumulated_depreciation'].toString())))),
                          DataCell(Text(nfMoney.format(double.parse(a['book_value'].toString())), style: const TextStyle(fontWeight: FontWeight.w700))),
                          DataCell(Text(a['funding_method'].toString())),
                        ]),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _runDepreciation() async {
    setState(() => _running = true);
    try {
      final result = await context.read<NovaFinRepository>().createRaw('assets/depreciation-run', {});
      final assets = (result['assets'] as List);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(assets.isEmpty ? 'Nothing to depreciate this month.' : 'Posted depreciation for ${assets.length} asset(s), total ${nfMoney.format(double.parse(result['total'].toString()))}.')),
        );
      }
      await _refresh();
    } finally {
      if (mounted) setState(() => _running = false);
    }
  }

  Future<void> _openCreateDialog(BuildContext context) async {
    final repo = context.read<NovaFinRepository>();
    final banks = await repo.listRaw('banks');
    final formKey = GlobalKey<FormState>();
    final name = TextEditingController();
    final cost = TextEditingController(text: '0');
    final rate = TextEditingController(text: '0');
    String fundingMethod = 'cash';
    DateTime purchaseDate = DateTime.now();

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        return AlertDialog(
          title: const Text('New Fixed Asset'),
          content: SizedBox(
            width: 420,
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  TextFormField(controller: name, decoration: const InputDecoration(labelText: 'Asset Name'), validator: (v) => (v == null || v.trim().length < 2) ? 'Required' : null),
                  const SizedBox(height: 12),
                  TextFormField(controller: cost, decoration: const InputDecoration(labelText: 'Cost'), keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  TextFormField(controller: rate, decoration: const InputDecoration(labelText: 'Depreciation Rate (% per year)'), keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.calendar_today, size: 16),
                      label: Text('Purchase date: ${DateFormat('dd/MM/yyyy').format(purchaseDate)}'),
                      onPressed: () async {
                        final picked = await showDatePicker(context: dialogContext, initialDate: purchaseDate, firstDate: DateTime(2015), lastDate: DateTime(2100));
                        if (picked != null) setDialogState(() => purchaseDate = picked);
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: fundingMethod,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Funded via'),
                    items: [
                      const DropdownMenuItem(value: 'cash', child: Text('Cash')),
                      for (final b in banks) DropdownMenuItem(value: 'bank:${b['id']}', child: Text(b['name'].toString())),
                    ],
                    onChanged: (v) => setDialogState(() => fundingMethod = v ?? 'cash'),
                  ),
                ]),
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                await repo.createRaw('assets', {
                  'name': name.text.trim(),
                  'cost': double.tryParse(cost.text) ?? 0,
                  'purchase_date': DateFormat('yyyy-MM-dd').format(purchaseDate),
                  'depreciation_rate': double.tryParse(rate.text) ?? 0,
                  'funding_method': fundingMethod,
                });
                if (dialogContext.mounted) Navigator.pop(dialogContext);
                await _refresh();
              },
              child: const Text('Save'),
            ),
          ],
        );
      }),
    );
  }
}
