import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/models.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/nf_widgets.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  late Future<List<NfCustomer>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = context.read<NovaFinRepository>().listCustomers();

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
            const Expanded(child: NfPageTitle('Customers')),
            if (canManage)
              ElevatedButton.icon(
                onPressed: () => _openCreateDialog(context),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('New Customer'),
              ),
          ],
        ),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: 'Directory',
            title: 'All Customers',
            padded: false,
            scrollableContent: true,
            child: FutureBuilder<List<NfCustomer>>(
              future: _future,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  if (snapshot.hasError) return Padding(padding: const EdgeInsets.all(24), child: Text('${snapshot.error}'));
                  return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
                }
                final rows = snapshot.data!;
                if (rows.isEmpty) return const NfEmptyState(message: 'No customers yet.');
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Name')),
                      DataColumn(label: Text('Phone')),
                      DataColumn(label: Text('City')),
                      DataColumn(label: Text('Credit Limit'), numeric: true),
                      DataColumn(label: Text('Opening Balance'), numeric: true),
                      DataColumn(label: Text('')),
                    ],
                    rows: [
                      for (final c in rows)
                        DataRow(cells: [
                          DataCell(Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600))),
                          DataCell(Text(c.phone ?? '—')),
                          DataCell(Text(c.city ?? '—')),
                          DataCell(Text(nfMoney.format(c.creditLimit))),
                          DataCell(Text(nfMoney.format(c.openingBalance))),
                          DataCell(canManage
                              ? IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 18, color: NfColors.danger),
                                  onPressed: () async {
                                    await context.read<NovaFinRepository>().deleteCustomer(c.id);
                                    await _refresh();
                                  },
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
    final formKey = GlobalKey<FormState>();
    final name = TextEditingController();
    final phone = TextEditingController();
    final city = TextEditingController();
    final creditLimit = TextEditingController(text: '0');
    final repo = context.read<NovaFinRepository>();

    await showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('New Customer'),
        content: SizedBox(
          width: 400,
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Name'),
                  validator: (v) => (v == null || v.trim().length < 2) ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(controller: phone, decoration: const InputDecoration(labelText: 'Phone')),
                const SizedBox(height: 12),
                TextFormField(controller: city, decoration: const InputDecoration(labelText: 'City')),
                const SizedBox(height: 12),
                TextFormField(controller: creditLimit, decoration: const InputDecoration(labelText: 'Credit Limit'), keyboardType: TextInputType.number),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              await repo.createCustomer(
                name: name.text.trim(),
                phone: phone.text.trim().isEmpty ? null : phone.text.trim(),
                city: city.text.trim().isEmpty ? null : city.text.trim(),
                creditLimit: double.tryParse(creditLimit.text) ?? 0,
              );
              if (dialogContext.mounted) Navigator.pop(dialogContext);
              await _refresh();
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}
