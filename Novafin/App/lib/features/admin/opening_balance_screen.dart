import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/generic_list_screen.dart' show StatusChip;
import '../../widgets/nf_widgets.dart';

class OpeningBalanceScreen extends StatefulWidget {
  const OpeningBalanceScreen({super.key});

  @override
  State<OpeningBalanceScreen> createState() => _OpeningBalanceScreenState();
}

class _OpeningBalanceScreenState extends State<OpeningBalanceScreen> {
  late Future<Map<String, dynamic>> _future;
  final Map<String, TextEditingController> _debitControllers = {};
  final Map<String, TextEditingController> _creditControllers = {};
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<Map<String, dynamic>> _load() async {
    final data = await context.read<NovaFinRepository>().getRaw('opening-balance');
    for (final account in (data['accounts'] as List).cast<Map<String, dynamic>>()) {
      final code = account['code'] as String;
      _debitControllers[code] = TextEditingController(text: _fmt(account['debit']));
      _creditControllers[code] = TextEditingController(text: _fmt(account['credit']));
    }
    return data;
  }

  String _fmt(dynamic v) {
    final n = double.tryParse(v.toString()) ?? 0;
    return n == 0 ? '' : n.toStringAsFixed(2);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const NfPageTitle('Opening Balance'),
        const SizedBox(height: 4),
        const Text(
          "Set the opening trial balance for every ledger account except Accounts Receivable/Payable — those come from each customer's or vendor's own opening balance field instead.",
          style: TextStyle(color: NfColors.muted, fontSize: 12.5),
        ),
        const SizedBox(height: 18),
        Expanded(
          child: FutureBuilder<Map<String, dynamic>>(
            future: _future,
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                if (snapshot.hasError) return Text('${snapshot.error}');
                return const Center(child: CircularProgressIndicator());
              }
              final accounts = (snapshot.data!['accounts'] as List).cast<Map<String, dynamic>>();
              final alreadyPosted = snapshot.data!['already_posted'] == true;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (alreadyPosted)
                    Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: NfColors.warning.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                      child: const Text(
                        'An opening balance was already posted before. Saving again will replace it.',
                        style: TextStyle(fontSize: 12.5, color: NfColors.textDark),
                      ),
                    ),
                  Expanded(
                    child: NfPanel(
                      eyebrow: 'Entry',
                      title: 'All Ledger Accounts',
                      padded: false,
                      scrollableContent: true,
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: DataTable(
                          columns: const [
                            DataColumn(label: Text('Code')),
                            DataColumn(label: Text('Name')),
                            DataColumn(label: Text('Type')),
                            DataColumn(label: Text('Debit')),
                            DataColumn(label: Text('Credit')),
                          ],
                          rows: [
                            for (final a in accounts)
                              DataRow(cells: [
                                DataCell(Text(a['code'].toString())),
                                DataCell(Text(a['name'].toString())),
                                DataCell(Text(a['account_type'].toString())),
                                DataCell(SizedBox(
                                  width: 110,
                                  child: TextField(
                                    controller: _debitControllers[a['code']],
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(isDense: true),
                                    onChanged: (v) {
                                      if (v.isNotEmpty) _creditControllers[a['code']]!.clear();
                                      setState(() {});
                                    },
                                  ),
                                )),
                                DataCell(SizedBox(
                                  width: 110,
                                  child: TextField(
                                    controller: _creditControllers[a['code']],
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(isDense: true),
                                    onChanged: (v) {
                                      if (v.isNotEmpty) _debitControllers[a['code']]!.clear();
                                      setState(() {});
                                    },
                                  ),
                                )),
                              ]),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildFooter(context, accounts),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildFooter(BuildContext context, List<Map<String, dynamic>> accounts) {
    double totalDebit = 0, totalCredit = 0;
    for (final a in accounts) {
      totalDebit += double.tryParse(_debitControllers[a['code']]?.text ?? '') ?? 0;
      totalCredit += double.tryParse(_creditControllers[a['code']]?.text ?? '') ?? 0;
    }
    final balanced = (totalDebit - totalCredit).abs() < 0.01 && totalDebit > 0;
    return Row(
      children: [
        Text('Total Debit: ${nfMoney.format(totalDebit)}', style: const TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(width: 20),
        Text('Total Credit: ${nfMoney.format(totalCredit)}', style: const TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(width: 20),
        StatusChip(label: balanced ? 'Balanced' : 'Not balanced', color: balanced ? NfColors.success : NfColors.danger),
        const Spacer(),
        ElevatedButton(
          onPressed: (!balanced || _saving) ? null : () => _save(accounts),
          child: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Save Opening Balance'),
        ),
      ],
    );
  }

  Future<void> _save(List<Map<String, dynamic>> accounts) async {
    setState(() => _saving = true);
    try {
      final lines = <Map<String, dynamic>>[];
      for (final a in accounts) {
        final debit = double.tryParse(_debitControllers[a['code']]?.text ?? '') ?? 0;
        final credit = double.tryParse(_creditControllers[a['code']]?.text ?? '') ?? 0;
        if (debit != 0 || credit != 0) {
          lines.add({'account_code': a['code'], 'debit': debit, 'credit': credit});
        }
      }
      await context.read<NovaFinRepository>().createRaw('opening-balance', {'lines': lines});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Opening balance saved')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
