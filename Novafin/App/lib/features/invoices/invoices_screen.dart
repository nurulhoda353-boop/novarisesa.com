import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/models.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/dims_picker.dart';
import '../../widgets/nf_widgets.dart';

class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({super.key});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  late Future<List<NfInvoice>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = context.read<NovaFinRepository>().listInvoices();

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
            const Expanded(child: NfPageTitle('Invoices')),
            if (canManage)
              ElevatedButton.icon(
                onPressed: () => _openCreateDialog(context),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('New Invoice'),
              ),
          ],
        ),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: 'Register',
            title: 'All Invoices',
            padded: false,
            scrollableContent: true,
            child: FutureBuilder<List<NfInvoice>>(
              future: _future,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  if (snapshot.hasError) return Padding(padding: const EdgeInsets.all(24), child: Text('${snapshot.error}'));
                  return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
                }
                final rows = snapshot.data!;
                if (rows.isEmpty) return const NfEmptyState(message: 'No invoices posted yet.');
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Code')),
                      DataColumn(label: Text('Customer')),
                      DataColumn(label: Text('Date')),
                      DataColumn(label: Text('Mode')),
                      DataColumn(label: Text('Subtotal'), numeric: true),
                      DataColumn(label: Text('VAT'), numeric: true),
                      DataColumn(label: Text('Grand Total'), numeric: true),
                      DataColumn(label: Text('')),
                    ],
                    rows: [
                      for (final inv in rows)
                        DataRow(cells: [
                          DataCell(Text(inv.code, style: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w600))),
                          DataCell(Text(inv.customerName)),
                          DataCell(Text(inv.date)),
                          DataCell(Text(inv.mode == 'credit' ? 'Credit' : 'Cash')),
                          DataCell(Text(nfMoney.format(inv.subtotal))),
                          DataCell(Text(nfMoney.format(inv.vatAmount))),
                          DataCell(Text(nfMoney.format(inv.grandTotal), style: const TextStyle(fontWeight: FontWeight.w700))),
                          DataCell(canManage && inv.status == 'posted'
                              ? PopupMenuButton<String>(
                                  tooltip: 'Correct or adjust this invoice',
                                  icon: const Icon(Icons.more_vert, size: 18),
                                  onSelected: (choice) {
                                    if (choice == 'correct') _openCorrectDialog(inv);
                                    if (choice == 'debit') _openDebitNote(inv);
                                    if (choice == 'writeoff') _openWriteOff(inv);
                                  },
                                  itemBuilder: (_) => [
                                    const PopupMenuItem(value: 'correct', child: Text('Correct this invoice…')),
                                    const PopupMenuItem(value: 'debit', child: Text('Add a charge (debit note)…')),
                                    if (inv.mode == 'credit') const PopupMenuItem(value: 'writeoff', child: Text('Write off as bad debt…')),
                                  ],
                                )
                              : const SizedBox.shrink()),
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
    final customers = await repo.listCustomers();
    final items = await repo.listItems();
    if (customers.isEmpty || items.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Add at least one customer and one item first.')),
        );
      }
      return;
    }

    String? customerId; // the user must choose; never silently the first customer
    final dimOptions = await DimOptions.load(repo);
    final dims = DimSelection();
    var saving = false;
    String? saveError;
    String mode = 'cash';
    DateTime date = DateTime.now();
    final lines = <_LineDraft>[_LineDraft()];

    if (!context.mounted) return;
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        double subtotal = 0;
        for (final line in lines) {
          subtotal += line.quantity * line.rate;
        }
        final vat = subtotal * 0.15;

        return AlertDialog(
          title: const Text('New Invoice'),
          content: SizedBox(
            width: 560,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: customerId,
                        decoration: const InputDecoration(labelText: 'Customer', hintText: 'Select…'),
                        isExpanded: true,
                        items: [for (final c in customers) DropdownMenuItem(value: c.id, child: Text(c.name))],
                        onChanged: (v) => setDialogState(() => customerId = v),
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
                  DimPickers(options: dimOptions, selection: dims, onChanged: () => setDialogState(() {})),
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
                                  lines[i].rate = selected.price;
                                  lines[i].rateController.text = selected.price.toStringAsFixed(2);
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
                      onPressed: () => setDialogState(() => lines.add(_LineDraft(itemId: items.first.id, rate: items.first.price))),
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
                  if (saveError != null) ...[
                    const SizedBox(height: 12),
                    Align(alignment: Alignment.centerLeft, child: Text(saveError!, style: const TextStyle(color: Color(0xFFB3261E), fontSize: 13))),
                  ],
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: saving ? null : () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: saving
                  ? null
                  : () async {
                      final validLines = lines.where((l) => l.itemId != null && l.quantity > 0).toList();
                      if (customerId == null) {
                        setDialogState(() => saveError = 'Select a customer first.');
                        return;
                      }
                      if (validLines.isEmpty) {
                        setDialogState(() => saveError = 'Add at least one line with an item and a quantity.');
                        return;
                      }
                      setDialogState(() {
                        saving = true;
                        saveError = null;
                      });
                      try {
                        await repo.createRaw('invoices', {
                          'customer_id': customerId,
                          'invoice_date': DateFormat('yyyy-MM-dd').format(date),
                          'mode': mode,
                          ...dims.toJson(),
                          'lines': [
                            for (final l in validLines) {'item_id': l.itemId, 'quantity': l.quantity, 'rate': l.rate},
                          ],
                        });
                      } on ApiException catch (e) {
                        saving = false;
                        if (dialogContext.mounted) setDialogState(() => saveError = nfErrorMessage(e));
                        return;
                      } catch (_) {
                        saving = false;
                        if (dialogContext.mounted) setDialogState(() => saveError = 'Could not save. Check your connection and try again.');
                        return;
                      }
                      if (dialogContext.mounted) Navigator.pop(dialogContext);
                      await _refresh();
                    },
              child: saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save Invoice'),
            ),
          ],
        );
      }),
    );
  }

  static const _reasons = [
    ('price_error', 'Price or value was wrong'),
    ('goods_returned', 'Goods were returned'),
    ('discount', 'Discount agreed afterwards'),
    ('cancellation', 'Invoice should not have been issued'),
    ('other', 'Other'),
  ];

  Future<void> _openCorrectDialog(NfInvoice inv) async {
    final repo = context.read<NovaFinRepository>();
    var path = 'replace';
    var reasonCode = 'price_error';
    final reasonText = TextEditingController();
    final creditAmount = TextEditingController();
    final qty = [for (final l in inv.lines) TextEditingController(text: l.quantity.toString())];
    final rate = [for (final l in inv.lines) TextEditingController(text: l.rate.toStringAsFixed(2))];
    var date = DateTime.now();
    var saving = false;
    String? error;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setState) {
        var newSubtotal = 0.0;
        for (var i = 0; i < inv.lines.length; i++) {
          newSubtotal += (double.tryParse(qty[i].text) ?? 0) * (double.tryParse(rate[i].text) ?? 0);
        }
        return AlertDialog(
          title: Text('Correct ${inv.code}'),
          content: SizedBox(
            width: 600,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text(
                  'A posted invoice is never edited or deleted. The correction is a Credit Note linked to it (VAT included), '
                  'and — if you replace it — a new correct invoice.',
                  style: TextStyle(fontSize: 12.5, color: NfColors.muted),
                ),
                const SizedBox(height: 12),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'replace', label: Text('Replace with a corrected invoice')),
                    ButtonSegment(value: 'credit', label: Text('Credit note only')),
                  ],
                  selected: {path},
                  onSelectionChanged: (v) => setState(() => path = v.first),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: reasonCode,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Why'),
                  items: [for (final r in _reasons) DropdownMenuItem(value: r.$1, child: Text(r.$2))],
                  onChanged: (v) => setState(() => reasonCode = v ?? 'other'),
                ),
                const SizedBox(height: 12),
                TextFormField(controller: reasonText, decoration: const InputDecoration(labelText: 'Details (optional)')),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  icon: const Icon(Icons.calendar_today, size: 16),
                  label: Text('Date of correction: ${DateFormat('dd/MM/yyyy').format(date)}'),
                  onPressed: () async {
                    final picked = await showDatePicker(context: dialogContext, initialDate: date, firstDate: DateTime(2020), lastDate: DateTime(2100));
                    if (picked != null) setState(() => date = picked);
                  },
                ),
                const SizedBox(height: 12),
                if (path == 'replace') ...[
                  const Text('Corrected lines', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  for (var i = 0; i < inv.lines.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(children: [
                        Expanded(flex: 3, child: Text(inv.lines[i].name, overflow: TextOverflow.ellipsis)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: qty[i],
                            decoration: const InputDecoration(labelText: 'Qty', isDense: true),
                            keyboardType: TextInputType.number,
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: rate[i],
                            decoration: const InputDecoration(labelText: 'Rate', isDense: true),
                            keyboardType: TextInputType.number,
                            onChanged: (_) => setState(() {}),
                          ),
                        ),
                      ]),
                    ),
                  Text(
                    'Before: ${nfMoney.format(inv.subtotal)} + VAT = ${nfMoney.format(inv.grandTotal)}    →    '
                    'After: ${nfMoney.format(newSubtotal)} + VAT = ${nfMoney.format(newSubtotal * 1.15)}',
                    style: const TextStyle(fontSize: 12.5),
                  ),
                ] else
                  TextFormField(
                    controller: creditAmount,
                    decoration: const InputDecoration(
                      labelText: 'Amount to credit, before VAT (leave empty to credit the whole invoice)',
                    ),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  ),
                if (error != null) ...[
                  const SizedBox(height: 12),
                  Text(error!, style: const TextStyle(color: Color(0xFFB3261E), fontSize: 13)),
                ],
              ]),
            ),
          ),
          actions: [
            TextButton(onPressed: saving ? null : () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: saving
                  ? null
                  : () async {
                      setState(() {
                        saving = true;
                        error = null;
                      });
                      final day = DateFormat('yyyy-MM-dd').format(date);
                      try {
                        if (path == 'replace') {
                          await repo.createRaw('invoices/${inv.id}/replace', {
                            'invoice_date': day,
                            'reason_code': reasonCode,
                            if (reasonText.text.trim().isNotEmpty) 'reason': reasonText.text.trim(),
                            'lines': [
                              for (var i = 0; i < inv.lines.length; i++)
                                {
                                  'item_id': inv.lines[i].itemId,
                                  'quantity': double.tryParse(qty[i].text) ?? 0,
                                  'rate': double.tryParse(rate[i].text) ?? 0,
                                },
                            ],
                          });
                        } else {
                          final amount = double.tryParse(creditAmount.text);
                          await repo.createRaw('credit-notes', {
                            'invoice_id': inv.id,
                            'note_date': day,
                            if (amount != null && amount > 0) 'amount': amount,
                            'reason_code': reasonCode,
                            if (reasonText.text.trim().isNotEmpty) 'reason': reasonText.text.trim(),
                          });
                        }
                      } on ApiException catch (e) {
                        saving = false;
                        if (dialogContext.mounted) setState(() => error = nfErrorMessage(e));
                        return;
                      } catch (_) {
                        saving = false;
                        if (dialogContext.mounted) setState(() => error = 'Could not save. Check your connection and try again.');
                        return;
                      }
                      if (dialogContext.mounted) Navigator.pop(dialogContext);
                      await _refresh();
                    },
              child: saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(path == 'replace' ? 'Credit and re-issue' : 'Issue credit note'),
            ),
          ],
        );
      }),
    );
  }

  Future<void> _openDebitNote(NfInvoice inv) async {
    final repo = context.read<NovaFinRepository>();
    final values = await nfForm(
      context,
      title: 'Debit note against ${inv.code}',
      message: 'Use this when the customer owes more than was invoiced. VAT is added at the invoice\'s rate.',
      fields: const [
        NfFormField('amount', 'Extra amount, before VAT', number: true),
        NfFormField('reason', 'Reason', required: false),
      ],
      confirmLabel: 'Issue debit note',
    );
    if (values == null || !mounted) return;
    final ok = await nfRun(context, () => repo.createRaw('debit-notes', {
          'invoice_id': inv.id,
          'note_date': DateFormat('yyyy-MM-dd').format(DateTime.now()),
          'amount': double.tryParse(values['amount']!) ?? 0,
          if (values['reason']!.isNotEmpty) 'reason': values['reason'],
        }));
    if (ok) await _refresh();
  }

  Future<void> _openWriteOff(NfInvoice inv) async {
    final repo = context.read<NovaFinRepository>();
    final values = await nfForm(
      context,
      title: 'Write off ${inv.code}',
      message: 'Records the unpaid amount as a bad debt. Needs the Finance Manager permission.',
      fields: [
        NfFormField('amount', 'Amount to write off (VAT included)', number: true, initial: inv.grandTotal.toStringAsFixed(2)),
        const NfFormField('reason', 'Why it cannot be collected'),
      ],
      confirmLabel: 'Write off',
    );
    if (values == null || !mounted) return;
    final ok = await nfRun(context, () => repo.createRaw('invoices/${inv.id}/write-off', {
          'invoice_id': inv.id,
          'amount': double.tryParse(values['amount']!) ?? 0,
          'reason': values['reason'],
          'write_off_date': DateFormat('yyyy-MM-dd').format(DateTime.now()),
        }));
    if (ok) await _refresh();
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
