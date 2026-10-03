import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/models.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/nf_widgets.dart';

class PurchasesScreen extends StatefulWidget {
  const PurchasesScreen({super.key});

  @override
  State<PurchasesScreen> createState() => _PurchasesScreenState();
}

class _PurchasesScreenState extends State<PurchasesScreen> {
  late Future<List<NfPurchase>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = context.read<NovaFinRepository>().listPurchases();

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
        Row(
          children: [
            const Expanded(child: NfPageTitle('Purchase Bills')),
            if (canManage)
              ElevatedButton.icon(
                onPressed: () => _openCreateDialog(context),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('New Purchase'),
              ),
          ],
        ),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: 'Register',
            title: 'All Purchases',
            padded: false,
            scrollableContent: true,
            child: FutureBuilder<List<NfPurchase>>(
              future: _future,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  if (snapshot.hasError) return Padding(padding: const EdgeInsets.all(24), child: Text('${snapshot.error}'));
                  return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
                }
                final rows = snapshot.data!;
                if (rows.isEmpty) return const NfEmptyState(message: 'No purchases recorded yet.');
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Code')),
                      DataColumn(label: Text('Vendor')),
                      DataColumn(label: Text('Date')),
                      DataColumn(label: Text('Mode')),
                      DataColumn(label: Text('Subtotal'), numeric: true),
                      DataColumn(label: Text('VAT'), numeric: true),
                      DataColumn(label: Text('Grand Total'), numeric: true),
                    ],
                    rows: [
                      for (final p in rows)
                        DataRow(cells: [
                          DataCell(Text(p.code, style: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w600))),
                          DataCell(Text(p.vendorName)),
                          DataCell(Text(p.date)),
                          DataCell(Text(p.mode == 'credit' ? 'Credit' : 'Cash')),
                          DataCell(Text(nfMoney.format(p.subtotal))),
                          DataCell(Text(nfMoney.format(p.vatAmount))),
                          DataCell(Text(nfMoney.format(p.grandTotal), style: const TextStyle(fontWeight: FontWeight.w700))),
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

  Future<void> _openCreateDialog(BuildContext context) async {
    final repo = context.read<NovaFinRepository>();
    final vendors = await repo.listVendors();
    final items = await repo.listItems();
    if (vendors.isEmpty || items.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Add at least one vendor and one item first.')),
        );
      }
      return;
    }

    String? vendorId = vendors.first.id;
    String mode = 'cash';
    DateTime date = DateTime.now();
    final lines = <_LineDraft>[_LineDraft()];

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        double subtotal = 0;
        for (final line in lines) {
          subtotal += line.quantity * line.rate;
        }
        final vat = subtotal * 0.15;

        return AlertDialog(
          title: const Text('New Purchase'),
          content: SizedBox(
            width: 560,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: vendorId,
                        decoration: const InputDecoration(labelText: 'Vendor'),
                        items: [for (final v in vendors) DropdownMenuItem(value: v.id, child: Text(v.name))],
                        onChanged: (v) => setDialogState(() => vendorId = v),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: mode,
                        decoration: const InputDecoration(labelText: 'Mode'),
                        items: const [
                          DropdownMenuItem(value: 'cash', child: Text('Cash')),
                          DropdownMenuItem(value: 'credit', child: Text('Credit')),
                        ],
                        onChanged: (v) => setDialogState(() => mode = v ?? 'cash'),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.calendar_today, size: 16),
                      label: Text(DateFormat('dd/MM/yyyy').format(date)),
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: dialogContext,
                          initialDate: date,
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2100),
                        );
                        if (picked != null) setDialogState(() => date = picked);
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Align(alignment: Alignment.centerLeft, child: Text('Line items', style: TextStyle(fontWeight: FontWeight.w600))),
                  const SizedBox(height: 8),
                  for (var i = 0; i < lines.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: DropdownButtonFormField<String>(
                              initialValue: lines[i].itemId,
                              isExpanded: true,
                              decoration: const InputDecoration(labelText: 'Item', isDense: true),
                              items: [for (final it in items) DropdownMenuItem(value: it.id, child: Text(it.name, overflow: TextOverflow.ellipsis))],
                              onChanged: (v) {
                                final selected = items.firstWhere((it) => it.id == v);
                                setDialogState(() {
                                  lines[i].itemId = v;
                                  lines[i].rate = selected.cost;
                                  lines[i].rateController.text = selected.cost.toStringAsFixed(2);
                                });
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextFormField(
                              controller: lines[i].qtyController,
                              decoration: const InputDecoration(labelText: 'Qty', isDense: true),
                              keyboardType: TextInputType.number,
                              onChanged: (v) => setDialogState(() => lines[i].quantity = double.tryParse(v) ?? 0),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextFormField(
                              controller: lines[i].rateController,
                              decoration: const InputDecoration(labelText: 'Rate', isDense: true),
                              keyboardType: TextInputType.number,
                              onChanged: (v) => setDialogState(() => lines[i].rate = double.tryParse(v) ?? 0),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, size: 18),
                            onPressed: lines.length == 1 ? null : () => setDialogState(() => lines.removeAt(i)),
                          ),
                        ],
                      ),
                    ),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Add line'),
                      onPressed: () => setDialogState(() => lines.add(_LineDraft(itemId: items.first.id, rate: items.first.cost))),
                    ),
                  ),
                  const Divider(),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Subtotal'),
                    Text(nfMoney.format(subtotal)),
                  ]),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('VAT (15%)'),
                    Text(nfMoney.format(vat)),
                  ]),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Grand Total', style: TextStyle(fontWeight: FontWeight.w700)),
                    Text(nfMoney.format(subtotal + vat), style: const TextStyle(fontWeight: FontWeight.w700)),
                  ]),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                final validLines = lines.where((l) => l.itemId != null && l.quantity > 0).toList();
                if (vendorId == null || validLines.isEmpty) return;
                await repo.createPurchase(
                  vendorId: vendorId!,
                  date: DateFormat('yyyy-MM-dd').format(date),
                  mode: mode,
                  lines: [
                    for (final l in validLines) {'item_id': l.itemId, 'quantity': l.quantity, 'rate': l.rate},
                  ],
                );
                if (dialogContext.mounted) Navigator.pop(dialogContext);
                await _refresh();
              },
              child: const Text('Save Purchase'),
            ),
          ],
        );
      }),
    );
  }
}

class _LineDraft {
  _LineDraft({this.itemId, this.rate = 0});

  String? itemId;
  double quantity = 1;
  double rate;
  final qtyController = TextEditingController(text: '1');
  late final rateController = TextEditingController(text: rate.toStringAsFixed(2));
}
