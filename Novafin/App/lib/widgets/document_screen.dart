import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../core/auth_state.dart';
import '../core/novafin_repository.dart';
import '../core/theme.dart';
import 'nf_widgets.dart';

/// Generic list+create screen for sales/purchasing "documents" that share
/// the same shape: a party (customer or vendor), a date, and a set of
/// item lines with quantity (and usually a rate + VAT). Covers Quotes,
/// Orders, Deliveries, Sales Returns, Purchase Orders and Purchase Returns
/// so each doesn't need its own near-duplicate 300-line screen.
class DocumentScreen extends StatefulWidget {
  const DocumentScreen({
    super.key,
    required this.title,
    required this.eyebrow,
    required this.listEndpoint,
    required this.createEndpoint,
    required this.partyLabel,
    required this.partyEndpoint,
    required this.partyKey,
    required this.dateLabel,
    required this.dateKey,
    this.hasRate = true,
    this.hasVat = true,
    this.rateFromCost = false,
    this.secondaryRefLabel,
    this.secondaryRefEndpoint,
    this.secondaryRefKey,
  });

  final String title;
  final String eyebrow;
  final String listEndpoint;
  final String createEndpoint;
  final String partyLabel;
  final String partyEndpoint; // "customers" or "vendors"
  final String partyKey; // "customer_id" or "vendor_id"
  final String dateLabel;
  final String dateKey;
  final bool hasRate;
  final bool hasVat;
  final bool rateFromCost; // true = default rate from item.cost, false = item.price
  final String? secondaryRefLabel;
  final String? secondaryRefEndpoint;
  final String? secondaryRefKey;

  @override
  State<DocumentScreen> createState() => _DocumentScreenState();
}

class _DocumentScreenState extends State<DocumentScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = context.read<NovaFinRepository>().listRaw(widget.listEndpoint);

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
            Expanded(child: NfPageTitle(widget.title)),
            if (canManage)
              ElevatedButton.icon(
                onPressed: () => _openCreateDialog(context),
                icon: const Icon(Icons.add, size: 18),
                label: Text('New ${widget.eyebrow}'),
              ),
          ],
        ),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: widget.eyebrow,
            title: 'All records',
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
                if (rows.isEmpty) return const NfEmptyState(message: 'No records yet.');
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: [
                      const DataColumn(label: Text('Code')),
                      DataColumn(label: Text(widget.partyLabel)),
                      DataColumn(label: Text(widget.dateLabel)),
                      if (widget.hasVat) ...const [
                        DataColumn(label: Text('Subtotal'), numeric: true),
                        DataColumn(label: Text('VAT'), numeric: true),
                        DataColumn(label: Text('Grand Total'), numeric: true),
                      ],
                    ],
                    rows: [
                      for (final row in rows)
                        DataRow(cells: [
                          DataCell(Text(row['code']?.toString() ?? '—', style: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w600))),
                          DataCell(Text(row['customer_name']?.toString() ?? row['vendor_name']?.toString() ?? '—')),
                          DataCell(Text(row[widget.dateKey]?.toString() ?? '—')),
                          if (widget.hasVat) ...[
                            DataCell(Text(nfMoney.format(double.parse((row['subtotal'] ?? 0).toString())))),
                            DataCell(Text(nfMoney.format(double.parse((row['vat_amount'] ?? 0).toString())))),
                            DataCell(Text(nfMoney.format(double.parse((row['grand_total'] ?? 0).toString())), style: const TextStyle(fontWeight: FontWeight.w700))),
                          ],
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
    final parties = await repo.listRaw(widget.partyEndpoint);
    final items = await repo.listRaw('items');
    List<Map<String, dynamic>> secondaryRefs = [];
    if (widget.secondaryRefEndpoint != null) {
      secondaryRefs = await repo.listRaw(widget.secondaryRefEndpoint!);
    }
    if (parties.isEmpty || items.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Add at least one ${widget.partyLabel.toLowerCase()} and one item first.')),
        );
      }
      return;
    }

    String? partyId = parties.first['id'] as String;
    String? secondaryId;
    DateTime date = DateTime.now();
    final lines = <_LineDraft>[_LineDraft()];

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        double subtotal = 0;
        for (final line in lines) {
          subtotal += line.quantity * (line.rate ?? 0);
        }
        final vat = subtotal * 0.15;

        return AlertDialog(
          title: Text('New ${widget.eyebrow}'),
          content: SizedBox(
            width: 560,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: partyId,
                    isExpanded: true,
                    decoration: InputDecoration(labelText: widget.partyLabel),
                    items: [for (final p in parties) DropdownMenuItem(value: p['id'] as String, child: Text(p['name'].toString()))],
                    onChanged: (v) => setDialogState(() => partyId = v),
                  ),
                  if (widget.secondaryRefEndpoint != null) ...[
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: secondaryId,
                      isExpanded: true,
                      decoration: InputDecoration(labelText: '${widget.secondaryRefLabel} (optional)'),
                      items: [
                        const DropdownMenuItem(value: null, child: Text('None')),
                        for (final r in secondaryRefs) DropdownMenuItem(value: r['id'] as String, child: Text(r['code'].toString())),
                      ],
                      onChanged: (v) => setDialogState(() => secondaryId = v),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.calendar_today, size: 16),
                      label: Text(DateFormat('dd/MM/yyyy').format(date)),
                      onPressed: () async {
                        final picked = await showDatePicker(context: dialogContext, initialDate: date, firstDate: DateTime(2020), lastDate: DateTime(2100));
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
                              items: [for (final it in items) DropdownMenuItem(value: it['id'] as String, child: Text(it['name'].toString(), overflow: TextOverflow.ellipsis))],
                              onChanged: (v) {
                                final selected = items.firstWhere((it) => it['id'] == v);
                                final defaultRate = double.parse((widget.rateFromCost ? selected['cost'] : selected['price']).toString());
                                setDialogState(() {
                                  lines[i].itemId = v;
                                  lines[i].rate = defaultRate;
                                  lines[i].rateController.text = defaultRate.toStringAsFixed(2);
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
                          if (widget.hasRate) ...[
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextFormField(
                                controller: lines[i].rateController,
                                decoration: InputDecoration(labelText: widget.eyebrow == 'RFQ' ? 'Max Price' : 'Rate', isDense: true),
                                keyboardType: TextInputType.number,
                                onChanged: (v) => setDialogState(() => lines[i].rate = double.tryParse(v) ?? 0),
                              ),
                            ),
                          ],
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
                      onPressed: () => setDialogState(() => lines.add(_LineDraft())),
                    ),
                  ),
                  if (widget.hasVat) ...[
                    const Divider(),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Subtotal'), Text(nfMoney.format(subtotal))]),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('VAT (15%)'), Text(nfMoney.format(vat))]),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      const Text('Grand Total', style: TextStyle(fontWeight: FontWeight.w700)),
                      Text(nfMoney.format(subtotal + vat), style: const TextStyle(fontWeight: FontWeight.w700)),
                    ]),
                  ],
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                final validLines = lines.where((l) => l.itemId != null && l.quantity > 0).toList();
                if (partyId == null || validLines.isEmpty) return;
                final lineKey = widget.eyebrow == 'RFQ' ? 'max_price' : 'rate';
                final body = <String, dynamic>{
                  widget.partyKey: partyId,
                  widget.dateKey: DateFormat('yyyy-MM-dd').format(date),
                  if (widget.secondaryRefKey != null && secondaryId != null) widget.secondaryRefKey!: secondaryId,
                  if (widget.hasVat) 'vat_rate': 15.0,
                  'lines': [
                    for (final l in validLines)
                      {
                        'item_id': l.itemId,
                        'quantity': l.quantity,
                        if (widget.hasRate) lineKey: l.rate ?? 0,
                      },
                  ],
                };
                await repo.createRaw(widget.createEndpoint, body);
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

class _LineDraft {
  String? itemId;
  double quantity = 1;
  double? rate;
  final qtyController = TextEditingController(text: '1');
  final rateController = TextEditingController(text: '0.00');
}
