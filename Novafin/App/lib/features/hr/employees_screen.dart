import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/novafin_repository.dart';
import '../../widgets/nf_widgets.dart';

class EmployeesScreen extends StatefulWidget {
  const EmployeesScreen({super.key});

  @override
  State<EmployeesScreen> createState() => _EmployeesScreenState();
}

class _EmployeesScreenState extends State<EmployeesScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = context.read<NovaFinRepository>().listRaw('employees');

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
          const Expanded(child: NfPageTitle('Employees')),
          if (canManage)
            ElevatedButton.icon(onPressed: () => _openCreateDialog(context), icon: const Icon(Icons.add, size: 18), label: const Text('New Employee')),
        ]),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: 'HR',
            title: 'All Employees',
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
                if (rows.isEmpty) return const NfEmptyState(message: 'No employees yet.');
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Name')),
                      DataColumn(label: Text('Phone')),
                      DataColumn(label: Text('Department')),
                      DataColumn(label: Text('Designation')),
                      DataColumn(label: Text('Basic Salary'), numeric: true),
                    ],
                    rows: [
                      for (final e in rows)
                        DataRow(cells: [
                          DataCell(Text(e['name'].toString(), style: const TextStyle(fontWeight: FontWeight.w600))),
                          DataCell(Text(e['phone']?.toString() ?? '—')),
                          DataCell(Text(e['department_name']?.toString() ?? '—')),
                          DataCell(Text(e['designation_name']?.toString() ?? '—')),
                          DataCell(Text(nfMoney.format(double.parse(e['basic_salary'].toString())))),
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
    final departments = await repo.listRaw('departments');
    final designations = await repo.listRaw('designations');

    final formKey = GlobalKey<FormState>();
    final name = TextEditingController();
    final phone = TextEditingController();
    final basic = TextEditingController(text: '0');
    String? departmentId = departments.isNotEmpty ? departments.first['id'] as String : null;
    String? designationId = designations.isNotEmpty ? designations.first['id'] as String : null;

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        return AlertDialog(
          title: const Text('New Employee'),
          content: SizedBox(
            width: 420,
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  TextFormField(controller: name, decoration: const InputDecoration(labelText: 'Name'), validator: (v) => (v == null || v.trim().length < 2) ? 'Required' : null),
                  const SizedBox(height: 12),
                  TextFormField(controller: phone, decoration: const InputDecoration(labelText: 'Phone')),
                  const SizedBox(height: 12),
                  if (departments.isNotEmpty)
                    DropdownButtonFormField<String>(
                      initialValue: departmentId,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Department'),
                      items: [for (final d in departments) DropdownMenuItem(value: d['id'] as String, child: Text(d['name'].toString()))],
                      onChanged: (v) => setDialogState(() => departmentId = v),
                    ),
                  const SizedBox(height: 12),
                  if (designations.isNotEmpty)
                    DropdownButtonFormField<String>(
                      initialValue: designationId,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Designation'),
                      items: [for (final d in designations) DropdownMenuItem(value: d['id'] as String, child: Text(d['name'].toString()))],
                      onChanged: (v) => setDialogState(() => designationId = v),
                    ),
                  const SizedBox(height: 12),
                  TextFormField(controller: basic, decoration: const InputDecoration(labelText: 'Basic Salary'), keyboardType: TextInputType.number),
                ]),
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                await repo.createRaw('employees', {
                  'name': name.text.trim(),
                  'phone': phone.text.trim().isEmpty ? null : phone.text.trim(),
                  'department_id': departmentId,
                  'designation_id': designationId,
                  'basic_salary': double.tryParse(basic.text) ?? 0,
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
