import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/dims_picker.dart';
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
    final banks = await repo.listRaw('banks');
    final dimOptions = await DimOptions.load(repo);
    final dims = DimSelection();
    final formKey = GlobalKey<FormState>();
    final amount = TextEditingController();
    var method = 'cash';
    var date = DateTime.now();
    String? partyId;
    var openDocs = <Map<String, dynamic>>[];
    final matched = <String, TextEditingController>{};
    var saving = false;
    String? error;

    if (!context.mounted) return;
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        double matchedTotal = 0;
        for (final c in matched.values) {
          matchedTotal += double.tryParse(c.text) ?? 0;
        }
        final paid = double.tryParse(amount.text) ?? 0;

        Future<void> loadDocs(String id) async {
          try {
            final docs = await repo.listRaw(isReceipt ? 'customers/$id/open-invoices' : 'vendors/$id/open-bills');
            setDialogState(() {
              openDocs = docs;
              matched
                ..forEach((_, c) => c.dispose())
                ..clear();
              for (final d in docs) {
                matched[d['id'] as String] = TextEditingController();
              }
            });
          } catch (_) {
            setDialogState(() => error = 'Could not load the open ${isReceipt ? 'invoices' : 'bills'}.');
          }
        }

        void matchOldestFirst() {
          var left = paid;
          setDialogState(() {
            for (final d in openDocs) {
              final open = double.parse(d['open_balance'].toString());
              final take = left <= 0 ? 0.0 : (left < open ? left : open);
              matched[d['id'] as String]!.text = take > 0 ? take.toStringAsFixed(2) : '';
              left -= take;
            }
          });
        }

        return AlertDialog(
          title: Text(isReceipt ? 'New Cash Receipt' : 'New Cash Payment'),
          content: SizedBox(
            width: 560,
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                  DropdownButtonFormField<String>(
                    initialValue: partyId,
                    isExpanded: true,
                    decoration: InputDecoration(labelText: isReceipt ? 'Received from (customer)' : 'Paid to (vendor)', hintText: 'Select…'),
                    items: [for (final p in parties) DropdownMenuItem(value: p['id'] as String, child: Text(p['name'].toString(), overflow: TextOverflow.ellipsis))],
                    validator: (v) => v == null ? 'Required' : null,
                    onChanged: (v) {
                      setDialogState(() => partyId = v);
                      if (v != null) loadDocs(v);
                    },
                  ),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(
                      child: TextFormField(
                        controller: amount,
                        decoration: const InputDecoration(labelText: 'Amount'),
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        validator: (v) => (double.tryParse(v ?? '') ?? 0) <= 0 ? 'Required' : null,
                        onChanged: (_) => setDialogState(() {}),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: method,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Into / from'),
                        items: [
                          const DropdownMenuItem(value: 'cash', child: Text('Cash in hand')),
                          for (final b in banks) DropdownMenuItem(value: 'bank:${b['id']}', child: Text(b['name'].toString(), overflow: TextOverflow.ellipsis)),
                        ],
                        onChanged: (v) => setDialogState(() => method = v ?? 'cash'),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 12),
                  DimPickers(options: dimOptions, selection: dims, onChanged: () => setDialogState(() {})),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.calendar_today, size: 16),
                    label: Text(DateFormat('dd/MM/yyyy').format(date)),
                    onPressed: () async {
                      final picked = await showDatePicker(context: dialogContext, initialDate: date, firstDate: DateTime(2020), lastDate: DateTime(2100));
                      if (picked != null) setDialogState(() => date = picked);
                    },
                  ),
                  if (partyId != null) ...[
                    const SizedBox(height: 16),
                    Row(children: [
                      Expanded(child: Text(isReceipt ? 'Which invoices does this pay?' : 'Which bills does this pay?', style: const TextStyle(fontWeight: FontWeight.w600))),
                      if (openDocs.isNotEmpty) TextButton(onPressed: paid > 0 ? matchOldestFirst : null, child: const Text('Match oldest first')),
                    ]),
                    if (openDocs.isEmpty)
                      const Text('Nothing is open for this party — the whole amount will be kept as an advance.', style: TextStyle(fontSize: 12.5, color: NfColors.muted))
                    else ...[
                      for (final d in openDocs)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(children: [
                            Expanded(
                              flex: 3,
                              child: Text('${d['code']} · ${d['invoice_date']} · open ${nfMoney.format(double.parse(d['open_balance'].toString()))}', style: const TextStyle(fontSize: 12.5)),
                            ),
                            Expanded(
                              child: TextFormField(
                                controller: matched[d['id'] as String],
                                decoration: const InputDecoration(labelText: 'Pays', isDense: true),
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                onChanged: (_) => setDialogState(() {}),
                              ),
                            ),
                          ]),
                        ),
                      Text(
                        matchedTotal > paid + 0.005
                            ? 'Matched ${nfMoney.format(matchedTotal)} is more than the amount ${nfMoney.format(paid)}.'
                            : 'Matched ${nfMoney.format(matchedTotal)} of ${nfMoney.format(paid)}; ${nfMoney.format((paid - matchedTotal).clamp(0, double.infinity))} is kept as an advance.',
                        style: TextStyle(fontSize: 12.5, color: matchedTotal > paid + 0.005 ? const Color(0xFFB3261E) : NfColors.muted),
                      ),
                    ],
                  ],
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(error!, style: const TextStyle(color: Color(0xFFB3261E), fontSize: 13)),
                  ],
                ]),
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: saving ? null : () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: saving
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;
                      setDialogState(() {
                        saving = true;
                        error = null;
                      });
                      try {
                        await repo.createRaw('cash-moves', {
                          'kind': widget.kind,
                          if (isReceipt) 'customer_id': partyId else 'vendor_id': partyId,
                          'amount': paid,
                          'move_date': DateFormat('yyyy-MM-dd').format(date),
                          'method': method,
                          ...dims.toJson(),
                          'allocations': [
                            for (final d in openDocs)
                              if ((double.tryParse(matched[d['id'] as String]!.text) ?? 0) > 0)
                                {'document_id': d['id'], 'amount': double.parse(matched[d['id'] as String]!.text)},
                          ],
                        });
                      } on ApiException catch (e) {
                        saving = false;
                        if (dialogContext.mounted) setDialogState(() => error = nfErrorMessage(e));
                        return;
                      } catch (_) {
                        saving = false;
                        if (dialogContext.mounted) setDialogState(() => error = 'Could not save. Check your connection and try again.');
                        return;
                      }
                      if (dialogContext.mounted) Navigator.pop(dialogContext);
                      await _refresh();
                    },
              child: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save'),
            ),
          ],
        );
      }),
    );
  }
}
