import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/models.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/nf_widgets.dart';

class VendorsScreen extends StatefulWidget {
  const VendorsScreen({super.key});

  @override
  State<VendorsScreen> createState() => _VendorsScreenState();
}

class _VendorsScreenState extends State<VendorsScreen> {
  late Future<List<NfVendor>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = context.read<NovaFinRepository>().listVendors();

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
            const Expanded(child: NfPageTitle('Vendors')),
            if (canManage)
              ElevatedButton.icon(
                onPressed: () => _openCreateDialog(context),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('New Vendor'),
              ),
          ],
        ),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: 'Directory',
            title: 'All Vendors',
            padded: false,
            scrollableContent: true,
            child: FutureBuilder<List<NfVendor>>(
              future: _future,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  if (snapshot.hasError) return Padding(padding: const EdgeInsets.all(24), child: Text('${snapshot.error}'));
                  return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
                }
                final rows = snapshot.data!;
                if (rows.isEmpty) return const NfEmptyState(message: 'No vendors yet.');
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Name')),
                      DataColumn(label: Text('Phone')),
                      DataColumn(label: Text('City')),
                      DataColumn(label: Text('Opening Balance'), numeric: true),
                      DataColumn(label: Text('')),
                    ],
                    rows: [
                      for (final v in rows)
                        DataRow(cells: [
                          DataCell(Text(v.name, style: const TextStyle(fontWeight: FontWeight.w600))),
                          DataCell(Text(v.phone ?? '—')),
                          DataCell(Text(v.city ?? '—')),
                          DataCell(Text(nfMoney.format(v.openingBalance))),
                          DataCell(canManage
                              ? IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 18, color: NfColors.danger),
                                  onPressed: () async {
                                    await context.read<NovaFinRepository>().deleteVendor(v.id);
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
    final repo = context.read<NovaFinRepository>();

    await showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('New Vendor'),
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
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              await repo.createVendor(
                name: name.text.trim(),
                phone: phone.text.trim().isEmpty ? null : phone.text.trim(),
                city: city.text.trim().isEmpty ? null : city.text.trim(),
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
