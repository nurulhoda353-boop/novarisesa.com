import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/nf_widgets.dart';

/// Cash Receipts and Cash Payments are the same `cash_moves` backend
/// resource filtered/created with a fixed `kind`, so one screen serves both.
class CashMoveScreen extends StatefulWidget {
  const CashMoveScreen({super.key, required this.kind});

  final String kind; // "receipt" | "payment"

  @override
  State<CashMoveScreen> createState() => _CashMoveScreenState();
}

class _CashMoveScreenState extends State<CashMoveScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = context.read<NovaFinRepository>().listRaw('cash-moves').then(
          (rows) => rows.where((r) => r['kind'] == widget.kind).toList(),
        );
  }

  Future<void> _refresh() async {
    setState(_reload);
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final canManage = context.watch<AuthState>().user?.canManage ?? false;
    final title = widget.kind == 'receipt' ? 'Cash Receipts' : 'Cash Payments';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Expanded(child: NfPageTitle(title)),
          if (canManage)
            ElevatedButton.icon(onPressed: () => _openCreateDialog(context), icon: const Icon(Icons.add, size: 18), label: Text('New ${widget.kind == 'receipt' ? 'Receipt' : 'Payment'}')),
        ]),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: 'Cash Book',
            title: 'All $title',
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
                if (rows.isEmpty) return NfEmptyState(message: 'No $title yet.');
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Code')),
                      DataColumn(label: Text('Party')),
                      DataColumn(label: Text('Date')),
                      DataColumn(label: Text('Method')),
                      DataColumn(label: Text('Amount'), numeric: true),
                      DataColumn(label: Text('Reconciled')),
                    ],
                    rows: [
                      for (final r in rows)
                        DataRow(cells: [
                          DataCell(Text(r['code'].toString(), style: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w600))),
                          DataCell(Text(r['party_name']?.toString() ?? '—')),
                          DataCell(Text(r['move_date'].toString())),
                          DataCell(Text(r['method'].toString())),
                          DataCell(Text(nfMoney.format(double.parse(r['amount'].toString())), style: const TextStyle(fontWeight: FontWeight.w700))),
                          DataCell(r['is_reconciled'] == true
                              ? const Icon(Icons.check_circle, color: NfColors.success, size: 18)
                              : (canManage
                                  ? TextButton(
                                      onPressed: () async {
                                        await context.read<NovaFinRepository>().patchRaw('cash-moves/${r['id']}/reconcile');
                                        await _refresh();
                                      },
                                      child: const Text('Reconcile'),
                                    )
                                  : const Icon(Icons.radio_button_unchecked, color: NfColors.muted, size: 18))),
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
    final isReceipt = widget.kind == 'receipt';
    final parties = await repo.listRaw(isReceipt ? 'customers' : 'vendors');
    final formKey = GlobalKey<FormState>();
    final partyName = TextEditingController();
    final amount = TextEditingController();
    final method = TextEditingController(text: 'cash');
    DateTime date = DateTime.now();
    String? linkedPartyId;

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        return AlertDialog(
          title: Text(widget.kind == 'receipt' ? 'New Cash Receipt' : 'New Cash Payment'),
          content: SizedBox(
            width: 420,
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  if (parties.isNotEmpty) ...[
                    DropdownButtonFormField<String>(
                      initialValue: linkedPartyId,
                      isExpanded: true,
                      decoration: InputDecoration(labelText: isReceipt ? 'Link to customer (optional)' : 'Link to vendor (optional)'),
                      items: [
                        const DropdownMenuItem(value: null, child: Text('Not linked (just a note)')),
                        for (final p in parties) DropdownMenuItem(value: p['id'] as String, child: Text(p['name'].toString(), overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (v) => setDialogState(() {
                        linkedPartyId = v;
                        if (v != null) partyName.text = parties.firstWhere((p) => p['id'] == v)['name'].toString();
                      }),
                    ),
                    const Padding(
                      padding: EdgeInsets.only(top: 4, bottom: 12),
                      child: Text('Linking reduces that account\'s outstanding balance on the Dashboard.', style: TextStyle(fontSize: 11, color: NfColors.muted)),
                    ),
                  ],
                  TextFormField(controller: partyName, decoration: const InputDecoration(labelText: 'Party name')),
                  const SizedBox(height: 12),
                  TextFormField(controller: amount, decoration: const InputDecoration(labelText: 'Amount'), keyboardType: TextInputType.number, validator: (v) => (double.tryParse(v ?? '') ?? 0) <= 0 ? 'Required' : null),
                  const SizedBox(height: 12),
                  TextFormField(controller: method, decoration: const InputDecoration(labelText: 'Method (cash / bank:<name>)')),
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
                ]),
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                await repo.createRaw('cash-moves', {
                  'kind': widget.kind,
                  'party_name': partyName.text.trim().isEmpty ? null : partyName.text.trim(),
                  if (isReceipt) 'customer_id': linkedPartyId else 'vendor_id': linkedPartyId,
                  'amount': double.tryParse(amount.text) ?? 0,
                  'move_date': DateFormat('yyyy-MM-dd').format(date),
                  'method': method.text.trim().isEmpty ? 'cash' : method.text.trim(),
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
