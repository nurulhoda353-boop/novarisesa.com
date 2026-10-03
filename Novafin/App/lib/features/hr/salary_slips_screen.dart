import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/generic_list_screen.dart';
import '../../widgets/nf_widgets.dart';

class SalarySlipsScreen extends StatefulWidget {
  const SalarySlipsScreen({super.key});

  @override
  State<SalarySlipsScreen> createState() => _SalarySlipsScreenState();
}

class _SalarySlipsScreenState extends State<SalarySlipsScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = context.read<NovaFinRepository>().listRaw('salary-slips');

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
          const Expanded(child: NfPageTitle('Salary Slips')),
          if (canManage)
            ElevatedButton.icon(onPressed: () => _openCreateDialog(context), icon: const Icon(Icons.add, size: 18), label: const Text('New Slip')),
        ]),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: 'Payroll',
            title: 'All Salary Slips',
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
                if (rows.isEmpty) return const NfEmptyState(message: 'No salary slips yet.');
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Code')),
                      DataColumn(label: Text('Employee')),
                      DataColumn(label: Text('Month')),
                      DataColumn(label: Text('Net'), numeric: true),
                      DataColumn(label: Text('Status')),
                      DataColumn(label: Text('')),
                    ],
                    rows: [
                      for (final s in rows)
                        DataRow(cells: [
                          DataCell(Text(s['code'].toString(), style: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w600))),
                          DataCell(Text(s['employee_name']?.toString() ?? '—')),
                          DataCell(Text(s['month'].toString())),
                          DataCell(Text(nfMoney.format(double.parse(s['net'].toString())), style: const TextStyle(fontWeight: FontWeight.w700))),
                          DataCell(StatusChip(label: s['is_paid'] == true ? 'Paid' : 'Unpaid', color: s['is_paid'] == true ? NfColors.success : NfColors.warning)),
                          DataCell(s['is_paid'] == true || !canManage
                              ? const SizedBox.shrink()
                              : TextButton(
                                  onPressed: () async {
                                    await context.read<NovaFinRepository>().patchRaw('salary-slips/${s['id']}/pay');
                                    await _refresh();
                                  },
                                  child: const Text('Mark Paid'),
                                )),
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
    final employees = await repo.listRaw('employees');
    if (employees.isEmpty) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add at least one employee first.')));
      return;
    }

    final formKey = GlobalKey<FormState>();
    final month = TextEditingController();
    final basic = TextEditingController(text: '0');
    final allowance = TextEditingController(text: '0');
    final deduction = TextEditingController(text: '0');
    String employeeId = employees.first['id'] as String;

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        return AlertDialog(
          title: const Text('New Salary Slip'),
          content: SizedBox(
            width: 420,
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  DropdownButtonFormField<String>(
                    initialValue: employeeId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Employee'),
                    items: [
                      for (final e in employees)
                        DropdownMenuItem(value: e['id'] as String, child: Text(e['name'].toString(), overflow: TextOverflow.ellipsis)),
                    ],
                    onChanged: (v) => setDialogState(() {
                      employeeId = v!;
                      final selected = employees.firstWhere((e) => e['id'] == v);
                      basic.text = selected['basic_salary'].toString();
                    }),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(controller: month, decoration: const InputDecoration(labelText: 'Month (e.g. September 2026)'), validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null),
                  const SizedBox(height: 12),
                  TextFormField(controller: basic, decoration: const InputDecoration(labelText: 'Basic'), keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  TextFormField(controller: allowance, decoration: const InputDecoration(labelText: 'Allowance'), keyboardType: TextInputType.number),
                  const SizedBox(height: 12),
                  TextFormField(controller: deduction, decoration: const InputDecoration(labelText: 'Deduction'), keyboardType: TextInputType.number),
                ]),
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                await repo.createRaw('salary-slips', {
                  'employee_id': employeeId,
                  'month': month.text.trim(),
                  'basic': double.tryParse(basic.text) ?? 0,
                  'allowance': double.tryParse(allowance.text) ?? 0,
                  'deduction': double.tryParse(deduction.text) ?? 0,
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
