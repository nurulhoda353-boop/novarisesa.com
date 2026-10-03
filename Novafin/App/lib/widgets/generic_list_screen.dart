import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../core/auth_state.dart';
import '../core/novafin_repository.dart';
import 'nf_widgets.dart';

enum FieldType { text, number, date, dropdown, bool_ }

class DropdownOption {
  const DropdownOption(this.value, this.label);
  final String value;
  final String label;
}

class FieldSpec {
  const FieldSpec({
    required this.key,
    required this.label,
    this.type = FieldType.text,
    this.required = false,
    this.options = const [],
    this.initialValue,
  });

  final String key;
  final String label;
  final FieldType type;
  final bool required;
  final List<DropdownOption> options;
  final dynamic initialValue;
}

class ColumnSpec {
  const ColumnSpec(this.label, this.getter, {this.numeric = false});
  final String label;
  final String Function(Map<String, dynamic> row) getter;
  final bool numeric;
}

/// A reusable list+create screen for the many simple NovaFin lookup and
/// record entities (departments, banks, cheques, vouchers, journal
/// accounts, ...) so each doesn't need its own hand-written CRUD screen.
class GenericListScreen extends StatefulWidget {
  const GenericListScreen({
    super.key,
    required this.title,
    required this.eyebrow,
    required this.endpoint,
    required this.columns,
    this.buildFormFields,
    this.addButtonLabel = 'Add',
    this.emptyMessage = 'Nothing here yet.',
    this.rowActions,
  });

  final String title;
  final String eyebrow;
  final String endpoint;
  final List<ColumnSpec> columns;
  final Future<List<FieldSpec>> Function(NovaFinRepository repo)? buildFormFields;
  final String addButtonLabel;
  final String emptyMessage;
  final List<Widget> Function(BuildContext context, Map<String, dynamic> row, VoidCallback refresh)? rowActions;

  @override
  State<GenericListScreen> createState() => _GenericListScreenState();
}

class _GenericListScreenState extends State<GenericListScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = context.read<NovaFinRepository>().listRaw(widget.endpoint);

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
            Expanded(child: NfPageTitle(widget.title)),
            if (canManage && widget.buildFormFields != null)
              ElevatedButton.icon(
                onPressed: () => _openCreateDialog(context),
                icon: const Icon(Icons.add, size: 18),
                label: Text(widget.addButtonLabel),
              ),
          ],
        ),
        const SizedBox(height: 18),
        Expanded(
          child: NfPanel(
            eyebrow: widget.eyebrow,
            title: 'All records',
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
                if (rows.isEmpty) return NfEmptyState(message: widget.emptyMessage);
                return SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: [
                      for (final c in widget.columns) DataColumn(label: Text(c.label), numeric: c.numeric),
                      if (widget.rowActions != null) const DataColumn(label: Text('')),
                    ],
                    rows: [
                      for (final row in rows)
                        DataRow(cells: [
                          for (final c in widget.columns) DataCell(Text(c.getter(row))),
                          if (widget.rowActions != null)
                            DataCell(Row(mainAxisSize: MainAxisSize.min, children: widget.rowActions!(context, row, () => _refresh()))),
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
    final fields = await widget.buildFormFields!(repo);
    final formKey = GlobalKey<FormState>();
    final values = <String, dynamic>{for (final f in fields) f.key: f.initialValue};
    final controllers = <String, TextEditingController>{
      for (final f in fields.where((f) => f.type == FieldType.text || f.type == FieldType.number))
        f.key: TextEditingController(text: f.initialValue?.toString() ?? ''),
    };

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        return AlertDialog(
          title: Text(widget.addButtonLabel),
          content: SizedBox(
            width: 440,
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final field in fields) ...[
                      _buildField(field, values, controllers, setDialogState, dialogContext),
                      const SizedBox(height: 12),
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
                final payload = <String, dynamic>{
                  for (final entry in values.entries)
                    entry.key: entry.value is DateTime ? DateFormat('yyyy-MM-dd').format(entry.value as DateTime) : entry.value,
                };
                await repo.createRaw(widget.endpoint, payload);
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

  Widget _buildField(
    FieldSpec field,
    Map<String, dynamic> values,
    Map<String, TextEditingController> controllers,
    void Function(void Function()) setDialogState,
    BuildContext dialogContext,
  ) {
    switch (field.type) {
      case FieldType.text:
        return TextFormField(
          controller: controllers[field.key],
          decoration: InputDecoration(labelText: field.label),
          validator: field.required ? (v) => (v == null || v.trim().isEmpty) ? 'Required' : null : null,
          onChanged: (v) => values[field.key] = v,
        );
      case FieldType.number:
        return TextFormField(
          controller: controllers[field.key],
          decoration: InputDecoration(labelText: field.label),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          validator: field.required ? (v) => (v == null || v.trim().isEmpty) ? 'Required' : null : null,
          onChanged: (v) => values[field.key] = double.tryParse(v) ?? 0,
        );
      case FieldType.bool_:
        return StatefulBuilder(
          builder: (context, setInner) => CheckboxListTile(
            value: values[field.key] as bool? ?? false,
            title: Text(field.label),
            contentPadding: EdgeInsets.zero,
            onChanged: (v) => setInner(() => values[field.key] = v ?? false),
          ),
        );
      case FieldType.date:
        final current = values[field.key] as DateTime? ?? DateTime.now();
        values[field.key] ??= current;
        return Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(
            icon: const Icon(Icons.calendar_today, size: 16),
            label: Text('${field.label}: ${DateFormat('dd/MM/yyyy').format(current)}'),
            onPressed: () async {
              final picked = await showDatePicker(
                context: dialogContext,
                initialDate: current,
                firstDate: DateTime(2020),
                lastDate: DateTime(2100),
              );
              if (picked != null) setDialogState(() => values[field.key] = picked);
            },
          ),
        );
      case FieldType.dropdown:
        return DropdownButtonFormField<String>(
          initialValue: values[field.key] as String?,
          isExpanded: true,
          decoration: InputDecoration(labelText: field.label),
          items: [for (final o in field.options) DropdownMenuItem(value: o.value, child: Text(o.label, overflow: TextOverflow.ellipsis))],
          validator: field.required ? (v) => v == null ? 'Required' : null : null,
          onChanged: (v) => setDialogState(() => values[field.key] = v),
        );
    }
  }
}

String moneyCell(dynamic v) => v == null ? '—' : nfMoney.format(double.parse(v.toString()));
String dateCell(dynamic v) => v == null ? '—' : DateFormat('dd/MM/yyyy').format(DateTime.parse(v.toString()));

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
    );
  }
}
