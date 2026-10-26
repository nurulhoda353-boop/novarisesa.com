import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/models.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/nf_widgets.dart';
import '../../widgets/party_dialog.dart';

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
                      DataColumn(label: Text('VAT No.')),
                      DataColumn(label: Text('ZATCA info')),
                      DataColumn(label: Text('Opening Balance'), numeric: true),
                      DataColumn(label: Text('')),
                    ],
                    rows: [
                      for (final v in rows)
                        DataRow(cells: [
                          DataCell(Text(v.name, style: const TextStyle(fontWeight: FontWeight.w600))),
                          DataCell(Text(v.phone ?? '—')),
                          DataCell(Text(v.city ?? '—')),
                          DataCell(Text(v.vatNumber ?? '—')),
                          DataCell(_ZatcaTag(ready: v.zatcaReady)),
                          DataCell(Text(nfMoney.format(v.openingBalance))),
                          DataCell(Row(mainAxisSize: MainAxisSize.min, children: [
                            IconButton(
                              tooltip: 'Statement of account',
                              icon: const Icon(Icons.receipt_long_outlined, size: 18, color: NfColors.primary),
                              onPressed: () => context.go('/statement/vendor/${v.id}'),
                            ),
                            if (canManage)
                              IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 18, color: NfColors.danger),
                                  onPressed: () async {
                                    final repo = context.read<NovaFinRepository>();
                                    final ok = await nfConfirm(
                                      context,
                                      title: 'Delete vendor',
                                      message: 'Delete "${v.name}"? This cannot be undone.',
                                    );
                                    if (!ok || !context.mounted) return;
                                    if (await nfRun(context, () => repo.deleteVendor(v.id))) await _refresh();
                                  },
                              ),
                          ])),
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
    final saved = await showPartyDialog(context, isCustomer: false);
    if (saved) await _refresh();
  }
}

class _ZatcaTag extends StatelessWidget {
  const _ZatcaTag({required this.ready});
  final bool ready;

  @override
  Widget build(BuildContext context) => Tooltip(
        message: ready ? 'VAT number and national address are on file' : 'Missing VAT number or address — needed before ZATCA tax invoices',
        child: Text(ready ? 'Complete' : 'Incomplete', style: TextStyle(color: ready ? NfColors.success : NfColors.warning, fontWeight: FontWeight.w600, fontSize: 12)),
      );
}
