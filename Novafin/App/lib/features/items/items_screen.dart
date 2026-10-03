import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/models.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/nf_widgets.dart';

class ItemsScreen extends StatefulWidget {
  const ItemsScreen({super.key});

  @override
  State<ItemsScreen> createState() => _ItemsScreenState();
}

class _ItemsScreenState extends State<ItemsScreen> {
  late Future<List<NfItem>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = context.read<NovaFinRepository>().listItems();
  }

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
            const Expanded(
              child: NfPageTitle('Items & Inventory'),
            ),
            if (canManage)
              ElevatedButton.icon(
                onPressed: () => _openCreateDialog(context),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('New Item'),
              ),
          ],
        ),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: 'Catalog',
            title: 'All Items',
            padded: false,
            scrollableContent: true,
            child: FutureBuilder<List<NfItem>>(
              future: _future,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  if (snapshot.hasError) return Padding(padding: const EdgeInsets.all(24), child: Text('${snapshot.error}'));
                  return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
                }
                final items = snapshot.data!;
                if (items.isEmpty) return const NfEmptyState(message: 'No items yet. Add your first product or service.');
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Name')),
                      DataColumn(label: Text('Kind')),
                      DataColumn(label: Text('Unit')),
                      DataColumn(label: Text('Cost'), numeric: true),
                      DataColumn(label: Text('Price'), numeric: true),
                      DataColumn(label: Text('Opening Qty'), numeric: true),
                      DataColumn(label: Text('')),
                    ],
                    rows: [
                      for (final item in items)
                        DataRow(cells: [
                          DataCell(Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600))),
                          DataCell(_KindTag(kind: item.kind)),
                          DataCell(Text(item.unit)),
                          DataCell(Text(nfMoney.format(item.cost))),
                          DataCell(Text(nfMoney.format(item.price))),
                          DataCell(Text(nfMoney.format(item.openingQty))),
                          DataCell(canManage
                              ? IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 18, color: NfColors.danger),
                                  onPressed: () async {
                                    await context.read<NovaFinRepository>().deleteItem(item.id);
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
    final unit = TextEditingController(text: 'Piece');
    final cost = TextEditingController(text: '0');
    final price = TextEditingController(text: '0');
    final openingQty = TextEditingController(text: '0');
    final minLevel = TextEditingController(text: '0');
    String kind = 'product';

    final repo = context.read<NovaFinRepository>();

    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        return AlertDialog(
          title: const Text('New Item'),
          content: SizedBox(
            width: 420,
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextFormField(
                      controller: name,
                      decoration: const InputDecoration(labelText: 'Name'),
                      validator: (v) => (v == null || v.trim().length < 2) ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: kind,
                      decoration: const InputDecoration(labelText: 'Kind'),
                      items: const [
                        DropdownMenuItem(value: 'product', child: Text('Product')),
                        DropdownMenuItem(value: 'service', child: Text('Service')),
                      ],
                      onChanged: (v) => setDialogState(() => kind = v ?? 'product'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(controller: unit, decoration: const InputDecoration(labelText: 'Unit')),
                    const SizedBox(height: 12),
                    Row(children: [
                      Expanded(child: TextFormField(controller: cost, decoration: const InputDecoration(labelText: 'Cost'), keyboardType: TextInputType.number)),
                      const SizedBox(width: 12),
                      Expanded(child: TextFormField(controller: price, decoration: const InputDecoration(labelText: 'Price'), keyboardType: TextInputType.number)),
                    ]),
                    if (kind == 'product') ...[
                      const SizedBox(height: 12),
                      Row(children: [
                        Expanded(child: TextFormField(controller: openingQty, decoration: const InputDecoration(labelText: 'Opening Qty'), keyboardType: TextInputType.number)),
                        const SizedBox(width: 12),
                        Expanded(child: TextFormField(controller: minLevel, decoration: const InputDecoration(labelText: 'Reorder Level'), keyboardType: TextInputType.number)),
                      ]),
                    ],
                  ],
                ),
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                await repo.createItem(
                  name: name.text.trim(),
                  kind: kind,
                  unit: unit.text.trim().isEmpty ? 'Piece' : unit.text.trim(),
                  cost: double.tryParse(cost.text) ?? 0,
                  price: double.tryParse(price.text) ?? 0,
                  openingQty: double.tryParse(openingQty.text) ?? 0,
                  minLevel: double.tryParse(minLevel.text) ?? 0,
                );
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

class _KindTag extends StatelessWidget {
  const _KindTag({required this.kind});
  final String kind;

  @override
  Widget build(BuildContext context) {
    final isProduct = kind == 'product';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: (isProduct ? NfColors.primary : NfColors.warning).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        isProduct ? 'Product' : 'Service',
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isProduct ? NfColors.primary : NfColors.warning),
      ),
    );
  }
}
