import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/nf_widgets.dart';

class JournalVouchersScreen extends StatefulWidget {
  const JournalVouchersScreen({super.key});

  @override
  State<JournalVouchersScreen> createState() => _JournalVouchersScreenState();
}

class _JournalVouchersScreenState extends State<JournalVouchersScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = context.read<NovaFinRepository>().listRaw('journal-vouchers');

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
          const Expanded(child: NfPageTitle('Journal Vouchers')),
          if (canManage)
            ElevatedButton.icon(onPressed: () => _openCreateDialog(context), icon: const Icon(Icons.add, size: 18), label: const Text('New Voucher')),
        ]),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: 'Accounting',
            title: 'All Vouchers',
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
                if (rows.isEmpty) return const NfEmptyState(message: 'No journal vouchers yet.');
                return Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      for (var index = 0; index < rows.length; index++) ...[
                        if (index > 0) const Divider(height: 1),
                        Builder(builder: (context) {
                          final jv = rows[index];
                          final lines = jv['lines'] as List;
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(children: [
                                  Text(jv['code'].toString(), style: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w700)),
                                  const SizedBox(width: 10),
                                  Text(jv['voucher_date'].toString(), style: const TextStyle(color: NfColors.muted, fontSize: 12)),
                                  const SizedBox(width: 10),
                                  if (jv['narration'] != null) Expanded(child: Text(jv['narration'].toString(), style: const TextStyle(fontSize: 12.5))),
                                ]),
                                const SizedBox(height: 6),
                                for (final l in lines)
                                  Padding(
                                    padding: const EdgeInsets.only(left: 8, top: 2),
                                    child: Row(children: [
                                      Expanded(child: Text(l['account_name']?.toString() ?? '—', style: const TextStyle(fontSize: 12.5))),
                                      SizedBox(width: 90, child: Text(double.parse(l['debit'].toString()) > 0 ? nfMoney.format(double.parse(l['debit'].toString())) : '', textAlign: TextAlign.right)),
                                      SizedBox(width: 90, child: Text(double.parse(l['credit'].toString()) > 0 ? nfMoney.format(double.parse(l['credit'].toString())) : '', textAlign: TextAlign.right)),
                                    ]),
                                  ),
                              ],
                            ),
                          );
                        }),
                      ],
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
    final accounts = await repo.listRaw('accounts');
    if (accounts.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add at least two accounts in Chart of Accounts first.')));
      }
      return;
    }

    DateTime date = DateTime.now();
    final narrationController = TextEditingController();
    final lines = <_JvLineDraft>[_JvLineDraft(accountId: accounts.first['id'] as String), _JvLineDraft(accountId: accounts.first['id'] as String)];

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        double totalDebit = 0, totalCredit = 0;
        for (final l in lines) {
          totalDebit += l.debit;
          totalCredit += l.credit;
        }
        return AlertDialog(
          title: const Text('New Journal Voucher'),
          content: SizedBox(
            width: 560,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Row(children: [
                  Expanded(
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
                const SizedBox(height: 12),
                TextFormField(controller: narrationController, decoration: const InputDecoration(labelText: 'Narration')),
                const SizedBox(height: 16),
                for (var i = 0; i < lines.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(children: [
                      Expanded(
                        flex: 3,
                        child: DropdownButtonFormField<String>(
                          initialValue: lines[i].accountId,
                          isExpanded: true,
                          decoration: const InputDecoration(labelText: 'Account', isDense: true),
                          items: [for (final a in accounts) DropdownMenuItem(value: a['id'] as String, child: Text('${a['code']} - ${a['name']}', overflow: TextOverflow.ellipsis))],
                          onChanged: (v) => setDialogState(() => lines[i].accountId = v),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          decoration: const InputDecoration(labelText: 'Debit', isDense: true),
                          keyboardType: TextInputType.number,
                          onChanged: (v) => setDialogState(() => lines[i].debit = double.tryParse(v) ?? 0),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          decoration: const InputDecoration(labelText: 'Credit', isDense: true),
                          keyboardType: TextInputType.number,
                          onChanged: (v) => setDialogState(() => lines[i].credit = double.tryParse(v) ?? 0),
                        ),
                      ),
                      IconButton(icon: const Icon(Icons.close, size: 18), onPressed: lines.length == 2 ? null : () => setDialogState(() => lines.removeAt(i))),
                    ]),
                  ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add line'),
                    onPressed: () => setDialogState(() => lines.add(_JvLineDraft(accountId: accounts.first['id'] as String))),
                  ),
                ),
                const Divider(),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('Total Debit'),
                  Text(nfMoney.format(totalDebit), style: TextStyle(fontWeight: FontWeight.w700, color: totalDebit == totalCredit ? NfColors.success : NfColors.danger)),
                ]),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('Total Credit'),
                  Text(nfMoney.format(totalCredit), style: TextStyle(fontWeight: FontWeight.w700, color: totalDebit == totalCredit ? NfColors.success : NfColors.danger)),
                ]),
              ]),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: totalDebit != totalCredit || totalDebit == 0
                  ? null
                  : () async {
                      await repo.createRaw('journal-vouchers', {
                        'voucher_date': DateFormat('yyyy-MM-dd').format(date),
                        'narration': narrationController.text.trim().isEmpty ? null : narrationController.text.trim(),
                        'lines': [for (final l in lines) {'account_id': l.accountId, 'debit': l.debit, 'credit': l.credit}],
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

class _JvLineDraft {
  _JvLineDraft({this.accountId});
  String? accountId;
  double debit = 0;
  double credit = 0;
}
