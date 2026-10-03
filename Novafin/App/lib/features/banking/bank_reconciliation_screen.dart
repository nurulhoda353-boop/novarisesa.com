import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/generic_list_screen.dart' show StatusChip;
import '../../widgets/nf_widgets.dart';

class BankReconciliationScreen extends StatefulWidget {
  const BankReconciliationScreen({super.key});

  @override
  State<BankReconciliationScreen> createState() => _BankReconciliationScreenState();
}

class _BankReconciliationScreenState extends State<BankReconciliationScreen> {
  late Future<List<Map<String, dynamic>>> _banksFuture;
  String? _selectedBankId;
  Future<Map<String, dynamic>>? _reconFuture;
  final _statementBalanceController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _banksFuture = context.read<NovaFinRepository>().listRaw('banks');
  }

  void _selectBank(String bankId) {
    setState(() {
      _selectedBankId = bankId;
      _reconFuture = context.read<NovaFinRepository>().getRaw('banks/$bankId/reconciliation');
    });
  }

  Future<void> _toggle(String lineId) async {
    await context.read<NovaFinRepository>().createRaw('banks/$_selectedBankId/reconciliation/toggle?line_id=$lineId', {});
    _selectBank(_selectedBankId!);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const NfPageTitle('Bank Reconciliation'),
        const SizedBox(height: 4),
        const Text(
          'Match book entries against your bank statement — tick off whichever ones have actually cleared at the bank.',
          style: TextStyle(color: NfColors.muted, fontSize: 12.5),
        ),
        const SizedBox(height: 18),
        FutureBuilder<List<Map<String, dynamic>>>(
          future: _banksFuture,
          builder: (context, snapshot) {
            if (!snapshot.hasData) return const SizedBox.shrink();
            final banks = snapshot.data!;
            if (banks.isEmpty) {
              return const NfEmptyState(message: 'Add at least one bank first.');
            }
            return Row(children: [
              SizedBox(
                width: 280,
                child: DropdownButtonFormField<String>(
                  initialValue: _selectedBankId,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Bank Account'),
                  items: [for (final b in banks) DropdownMenuItem(value: b['id'] as String, child: Text(b['name'].toString()))],
                  onChanged: (v) { if (v != null) _selectBank(v); },
                ),
              ),
              const SizedBox(width: 16),
              SizedBox(
                width: 220,
                child: TextField(
                  controller: _statementBalanceController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Statement Balance'),
                  onChanged: (_) => setState(() {}),
                ),
              ),
            ]);
          },
        ),
        const SizedBox(height: 18),
        if (_reconFuture != null)
          Expanded(
            child: FutureBuilder<Map<String, dynamic>>(
              future: _reconFuture,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  if (snapshot.hasError) return Text('${snapshot.error}');
                  return const Center(child: CircularProgressIndicator());
                }
                final data = snapshot.data!;
                final lines = (data['lines'] as List).cast<Map<String, dynamic>>();
                final bookBalance = double.parse(data['book_balance'].toString());
                final clearedBalance = double.parse(data['cleared_balance'].toString());
                final statementBalance = double.tryParse(_statementBalanceController.text);
                final diff = statementBalance == null ? null : statementBalance - clearedBalance;
                final matched = diff != null && diff.abs() < 0.01;

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(spacing: 24, runSpacing: 8, children: [
                      Text('Book Balance: ${nfMoney.format(bookBalance)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text('Cleared Balance: ${nfMoney.format(clearedBalance)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                      if (statementBalance != null)
                        StatusChip(
                          label: matched ? 'Matched ✓' : 'Mismatch: ${nfMoney.format(diff!.abs())}',
                          color: matched ? NfColors.success : NfColors.danger,
                        ),
                    ]),
                    const SizedBox(height: 16),
                    Expanded(
                      child: NfPanel(
                        eyebrow: 'Ledger',
                        title: 'Bank Ledger Lines',
                        padded: false,
                        scrollableContent: true,
                        child: lines.isEmpty
                            ? const NfEmptyState(message: 'No transactions posted to this bank account yet.')
                            : SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: DataTable(
                                  columns: const [
                                    DataColumn(label: Text('Cleared')),
                                    DataColumn(label: Text('Date')),
                                    DataColumn(label: Text('Ref')),
                                    DataColumn(label: Text('Narration')),
                                    DataColumn(label: Text('Amount'), numeric: true),
                                  ],
                                  rows: [
                                    for (final line in lines)
                                      DataRow(cells: [
                                        DataCell(Checkbox(value: line['is_cleared'] == true, onChanged: (_) => _toggle(line['line_id'] as String))),
                                        DataCell(Text(line['date'].toString())),
                                        DataCell(Text(line['ref'].toString(), style: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w600))),
                                        DataCell(Text(line['narration']?.toString() ?? '—')),
                                        DataCell(Text(nfMoney.format(double.parse(line['amount'].toString())))),
                                      ]),
                                  ],
                                ),
                              ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
      ],
    );
  }
}
