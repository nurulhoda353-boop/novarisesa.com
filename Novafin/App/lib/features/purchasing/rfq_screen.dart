import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/nf_widgets.dart';

class RfqScreen extends StatefulWidget {
  const RfqScreen({super.key});

  @override
  State<RfqScreen> createState() => _RfqScreenState();
}

class _RfqScreenState extends State<RfqScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = context.read<NovaFinRepository>().listRaw('rfqs');

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
          const Expanded(child: NfPageTitle('Request for Quotation')),
          if (canManage)
            ElevatedButton.icon(onPressed: () => _openCreateDialog(context), icon: const Icon(Icons.add, size: 18), label: const Text('New RFQ')),
        ]),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: 'Procurement',
            title: 'All RFQs',
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
                if (rows.isEmpty) return const NfEmptyState(message: 'No RFQs yet.');
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Code')),
                      DataColumn(label: Text('Date')),
                      DataColumn(label: Text('Deadline')),
                      DataColumn(label: Text('Vendors invited')),
                      DataColumn(label: Text('Line items')),
                    ],
                    rows: [
                      for (final r in rows)
                        DataRow(cells: [
                          DataCell(Text(r['code'].toString(), style: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w600))),
                          DataCell(Text(r['rfq_date'].toString())),
                          DataCell(Text(r['deadline']?.toString() ?? '—')),
                          DataCell(Text((r['vendor_names'] as List).join(', '))),
                          DataCell(Text('${(r['lines'] as List).length}')),
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
    final items = await repo.listRaw('items');
    if (items.isEmpty) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add at least one item first.')));
      return;
    }

    DateTime date = DateTime.now();
    DateTime? deadline;
    final vendorNamesController = TextEditingController();
    final lines = <_RfqLineDraft>[_RfqLineDraft(itemId: items.first['id'] as String)];

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        return AlertDialog(
          title: const Text('New RFQ'),
          content: SizedBox(
            width: 560,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TextFormField(controller: vendorNamesController, decoration: const InputDecoration(labelText: 'Vendors invited (comma separated)')),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.calendar_today, size: 16),
                      label: Text('Date: ${DateFormat('dd/MM/yyyy').format(date)}'),
                      onPressed: () async {
                        final picked = await showDatePicker(context: dialogContext, initialDate: date, firstDate: DateTime(2020), lastDate: DateTime(2100));
                        if (picked != null) setDialogState(() => date = picked);
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.event, size: 16),
                      label: Text(deadline == null ? 'Deadline' : DateFormat('dd/MM/yyyy').format(deadline!)),
                      onPressed: () async {
                        final picked = await showDatePicker(context: dialogContext, initialDate: date, firstDate: DateTime(2020), lastDate: DateTime(2100));
                        if (picked != null) setDialogState(() => deadline = picked);
                      },
                    ),
                  ),
                ]),
                const SizedBox(height: 16),
                const Align(alignment: Alignment.centerLeft, child: Text('Line items', style: TextStyle(fontWeight: FontWeight.w600))),
                const SizedBox(height: 8),
                for (var i = 0; i < lines.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(children: [
                      Expanded(
                        flex: 3,
                        child: DropdownButtonFormField<String>(
                          initialValue: lines[i].itemId,
                          isExpanded: true,
                          decoration: const InputDecoration(labelText: 'Item', isDense: true),
                          items: [for (final it in items) DropdownMenuItem(value: it['id'] as String, child: Text(it['name'].toString(), overflow: TextOverflow.ellipsis))],
                          onChanged: (v) => setDialogState(() => lines[i].itemId = v),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          decoration: const InputDecoration(labelText: 'Qty', isDense: true),
                          keyboardType: TextInputType.number,
                          onChanged: (v) => lines[i].quantity = double.tryParse(v) ?? 0,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          decoration: const InputDecoration(labelText: 'Max Price', isDense: true),
                          keyboardType: TextInputType.number,
                          onChanged: (v) => lines[i].maxPrice = double.tryParse(v) ?? 0,
                        ),
                      ),
                      IconButton(icon: const Icon(Icons.close, size: 18), onPressed: lines.length == 1 ? null : () => setDialogState(() => lines.removeAt(i))),
                    ]),
                  ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add line'),
                    onPressed: () => setDialogState(() => lines.add(_RfqLineDraft(itemId: items.first['id'] as String))),
                  ),
                ),
              ]),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                final validLines = lines.where((l) => l.itemId != null && l.quantity > 0).toList();
                if (validLines.isEmpty) return;
                await repo.createRaw('rfqs', {
                  'rfq_date': DateFormat('yyyy-MM-dd').format(date),
                  'deadline': deadline == null ? null : DateFormat('yyyy-MM-dd').format(deadline!),
                  'vendor_names': vendorNamesController.text.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList(),
                  'lines': [for (final l in validLines) {'item_id': l.itemId, 'quantity': l.quantity, 'max_price': l.maxPrice}],
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

class _RfqLineDraft {
  _RfqLineDraft({this.itemId});
  String? itemId;
  double quantity = 1;
  double maxPrice = 0;
}
