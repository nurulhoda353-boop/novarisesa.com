import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/nf_widgets.dart';

double _d(dynamic v) => v == null ? 0 : double.parse(v.toString());

String _day(dynamic iso) => iso == null ? '' : DateFormat('dd/MM/yyyy').format(DateTime.parse(iso.toString()));

const _categoryNames = {
  'standard': 'Standard rated (15%)',
  'zero': 'Zero-rated (0%)',
  'exempt': 'Exempt',
  'out_of_scope': 'Out of scope',
};

const _monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/// One filing period's VAT figures, built from invoices, notes and bills, checked against the ledger.
class VatReturnScreen extends StatefulWidget {
  const VatReturnScreen({super.key});

  @override
  State<VatReturnScreen> createState() => _VatReturnScreenState();
}

class _VatReturnScreenState extends State<VatReturnScreen> {
  Future<Map<String, dynamic>>? _future;
  int? _year;
  int? _index;
  String _frequency = 'quarterly';
  bool _showDocuments = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final repo = context.read<NovaFinRepository>();
    final query = (_year == null || _index == null) ? '' : '?year=$_year&index=$_index';
    _future = repo.getRaw('vat-returns/preview$query').then((data) {
      final period = data['period'] as Map<String, dynamic>;
      _year = period['year'] as int;
      _index = period['index'] as int;
      _frequency = period['frequency'].toString();
      return data;
    });
  }

  void _reload() => setState(_load);

  Future<void> _file(Map<String, dynamic> data) async {
    final repo = context.read<NovaFinRepository>();
    final period = data['period'] as Map<String, dynamic>;
    final ok = await nfConfirm(
      context,
      title: 'File ${period['label']}',
      message:
          'Net VAT ${nfMoney.format(_d(data['net_vat']))}. Filing keeps a copy of these figures and locks every month in the period, '
          'so nothing dated in it can be posted or changed afterwards. Only a Director can unlock a month. Continue?',
      confirmLabel: 'File return',
    );
    if (!ok || !mounted) return;
    if (await nfRun(context, () => repo.createRaw('vat-returns/file', {'year': period['year'], 'index': period['index']}),
        success: 'Return filed and the months are locked.')) {
      _reload();
    }
  }

  Future<void> _settle(Map<String, dynamic> filed) async {
    final repo = context.read<NovaFinRepository>();
    final net = _d(filed['net_vat']);
    final banks = await repo.listRaw('banks');
    if (!mounted) return;
    final values = await nfForm(
      context,
      title: net >= 0 ? 'Record the payment to ZATCA' : 'Record the refund from ZATCA',
      message:
          'Posts one entry that clears VAT Output and VAT Input for this period and ${net >= 0 ? 'pays' : 'receives'} ${nfMoney.format(net.abs())}. Date format: YYYY-MM-DD.',
      fields: [
        NfFormField('payment_date', 'Date', initial: DateFormat('yyyy-MM-dd').format(DateTime.now())),
        NfFormField('method', net >= 0 ? 'Paid from' : 'Received into', options: [
          ('cash', 'Cash in hand'),
          for (final b in banks) ('bank:${b['id']}', b['name'].toString()),
        ], initial: 'cash'),
      ],
      confirmLabel: 'Record',
    );
    if (values == null || !mounted) return;
    if (await nfRun(
      context,
      () => repo.createRaw('vat-returns/${filed['id']}/settle', {'payment_date': values['payment_date'], 'method': values['method']}),
      success: 'Settlement entry posted. VAT Output and Input are cleared for this period.',
    )) {
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    final canClose = user?.permissions.contains('novafin.close_period') ?? false;
    final thisYear = DateTime.now().year;
    return FutureBuilder<Map<String, dynamic>>(
      future: _future,
      builder: (context, snapshot) {
        final data = snapshot.data;
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Expanded(child: NfPageTitle('VAT Return')),
            if (data != null) ...[
              DropdownButton<int>(
                value: _year,
                items: [for (var y = thisYear - 3; y <= thisYear + 1; y++) DropdownMenuItem(value: y, child: Text('$y'))],
                onChanged: (v) {
                  _year = v;
                  _reload();
                },
              ),
              const SizedBox(width: 12),
              DropdownButton<int>(
                value: _index,
                items: _frequency == 'monthly'
                    ? [for (var m = 1; m <= 12; m++) DropdownMenuItem(value: m, child: Text(_monthNames[m - 1]))]
                    : [for (var q = 1; q <= 4; q++) DropdownMenuItem(value: q, child: Text('Q$q (${_monthNames[(q - 1) * 3].substring(0, 3)}–${_monthNames[(q - 1) * 3 + 2].substring(0, 3)})'))],
                onChanged: (v) {
                  _index = v;
                  _reload();
                },
              ),
            ],
          ]),
          const SizedBox(height: 14),
          Expanded(
            child: data == null
                ? (snapshot.hasError ? Text('${snapshot.error}') : const Center(child: CircularProgressIndicator()))
                : _body(data, canClose),
          ),
        ]);
      },
    );
  }

  Widget _body(Map<String, dynamic> data, bool canClose) {
    final period = data['period'] as Map<String, dynamic>;
    final filed = data['filed'] as Map<String, dynamic>?;
    final control = data['control'] as Map<String, dynamic>;
    final matches = control['matches'] == true;
    final warnings = (data['warnings'] as List).cast<String>();
    final sales = data['sales'] as Map<String, dynamic>;
    final purchases = data['purchases'] as Map<String, dynamic>;
    final net = _d(data['net_vat']);
    final documents = (data['documents'] as List).cast<Map<String, dynamic>>();
    final ended = DateTime.now().isAfter(DateTime.parse(period['end'].toString()).add(const Duration(days: 1)));

    return ListView(children: [
      _statusBanner(period, filed, ended),
      const SizedBox(height: 14),
      _ledgerCheck(control, matches),
      for (final w in warnings) ...[
        const SizedBox(height: 10),
        _note(Icons.warning_amber_rounded, NfColors.warning, w),
      ],
      const SizedBox(height: 14),
      NfPanel(
        eyebrow: 'Sales',
        title: 'Output VAT — what we charged',
        padded: false,
        child: _table(
          ['Category', 'Value (before VAT)', 'VAT'],
          [
            for (final c in _categoryNames.keys) [_categoryNames[c]!, nfMoney.format(_d(sales[c]['net'])), nfMoney.format(_d(sales[c]['vat']))],
          ],
          totalLabel: 'Output VAT',
          totalValue: nfMoney.format(_d(data['output_vat'])),
        ),
      ),
      const SizedBox(height: 14),
      NfPanel(
        eyebrow: 'Purchases',
        title: 'Input VAT — what we can claim back',
        padded: false,
        child: _table(
          ['Category', 'Value (before VAT)', 'VAT'],
          [
            ['Standard rated — claimed', nfMoney.format(_d(purchases['standard_recoverable']['net'])), nfMoney.format(_d(purchases['standard_recoverable']['vat']))],
            ['Standard rated — not claimable', nfMoney.format(_d(purchases['standard_non_recoverable']['net'])), '${nfMoney.format(_d(purchases['standard_non_recoverable']['vat']))} (not claimed)'],
            ['Zero-rated (0%)', nfMoney.format(_d(purchases['zero']['net'])), ''],
            ['Exempt', nfMoney.format(_d(purchases['exempt']['net'])), ''],
            ['Out of scope', nfMoney.format(_d(purchases['out_of_scope']['net'])), ''],
          ],
          totalLabel: 'Input VAT claimed',
          totalValue: nfMoney.format(_d(data['input_vat'])),
        ),
      ),
      const SizedBox(height: 14),
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: NfColors.surface, borderRadius: BorderRadius.circular(8), border: Border.all(color: NfColors.border)),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(net >= 0 ? 'NET VAT PAYABLE TO ZATCA' : 'NET VAT REFUNDABLE FROM ZATCA', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: NfColors.muted)),
              const SizedBox(height: 6),
              Text(nfMoney.format(net.abs()), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('${nfMoney.format(_d(data['output_vat']))} output − ${nfMoney.format(_d(data['input_vat']))} input', style: const TextStyle(color: NfColors.muted, fontSize: 12.5)),
            ]),
          ),
          if (canClose && filed == null)
            ElevatedButton.icon(
              icon: const Icon(Icons.fact_check_outlined, size: 18),
              label: const Text('File this return'),
              onPressed: data['can_file'] == true ? () => _file(data) : null,
            ),
          if (canClose && filed != null && filed['settled'] != true)
            ElevatedButton.icon(
              icon: const Icon(Icons.payments_outlined, size: 18),
              label: Text(net >= 0 ? 'Record payment' : 'Record refund'),
              onPressed: () => _settle(filed),
            ),
        ]),
      ),
      if (filed == null && data['can_file'] != true) ...[
        const SizedBox(height: 8),
        Text(
          !ended
              ? 'The period has not ended yet, so this is a running figure and cannot be filed.'
              : !matches
                  ? 'Filing is blocked until the ledger check above agrees.'
                  : '',
          style: const TextStyle(color: NfColors.muted, fontSize: 12.5),
        ),
      ],
      const SizedBox(height: 14),
      NfPanel(
        eyebrow: 'Evidence',
        title: '${documents.length} documents behind these figures',
        trailing: TextButton(onPressed: () => setState(() => _showDocuments = !_showDocuments), child: Text(_showDocuments ? 'Hide' : 'Show')),
        padded: false,
        child: _showDocuments
            ? SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  columns: const [
                    DataColumn(label: Text('Date')),
                    DataColumn(label: Text('Document')),
                    DataColumn(label: Text('Type')),
                    DataColumn(label: Text('Party')),
                    DataColumn(label: Text('Treatment')),
                    DataColumn(label: Text('Value'), numeric: true),
                    DataColumn(label: Text('VAT'), numeric: true),
                  ],
                  rows: [
                    for (final doc in documents)
                      DataRow(cells: [
                        DataCell(Text(_day(doc['date']))),
                        DataCell(Text(doc['code'].toString(), style: const TextStyle(color: NfColors.primary, fontWeight: FontWeight.w600))),
                        DataCell(Text(doc['kind'].toString())),
                        DataCell(ConstrainedBox(constraints: const BoxConstraints(maxWidth: 220), child: Text(doc['party'].toString(), overflow: TextOverflow.ellipsis))),
                        DataCell(Text(_categoryNames[doc['category']] ?? doc['category'].toString())),
                        DataCell(Text('${doc['sign'] < 0 ? '−' : ''}${nfMoney.format(_d(doc['net']))}')),
                        DataCell(Text('${doc['sign'] < 0 ? '−' : ''}${nfMoney.format(_d(doc['vat']))}')),
                      ]),
                  ],
                ),
              )
            : const Padding(padding: EdgeInsets.all(16), child: Text('Every number above is the sum of these invoices, notes and bills.', style: TextStyle(color: NfColors.muted))),
      ),
      const SizedBox(height: 24),
    ]);
  }

  Widget _statusBanner(Map<String, dynamic> period, Map<String, dynamic>? filed, bool ended) {
    final due = _day(period['due_date']);
    if (filed != null) {
      return _note(
        Icons.check_circle_outline,
        NfColors.success,
        'Filed on ${_day(filed['filed_at'])}. ${filed['settled'] == true ? 'Settled on ${_day(filed['settled_on'])}.' : 'Payment or refund not recorded yet.'} Figures below are the live ledger view; the filed copy is kept.',
      );
    }
    return _note(
      ended ? Icons.event_available_outlined : Icons.hourglass_empty,
      ended ? NfColors.primary : NfColors.muted,
      '${period['label']} · due at ZATCA by $due${ended ? '' : ' · period still running'}',
    );
  }

  Widget _ledgerCheck(Map<String, dynamic> control, bool matches) {
    if (matches) {
      return _note(Icons.verified_outlined, NfColors.success,
          'Agrees with the ledger: VAT Output ${nfMoney.format(_d(control['ledger_output']))} and VAT Input ${nfMoney.format(_d(control['ledger_input']))}.');
    }
    return _note(
      Icons.error_outline,
      NfColors.danger,
      'Does NOT agree with the ledger. VAT Output differs by ${nfMoney.format(_d(control['output_difference']))}, VAT Input by ${nfMoney.format(_d(control['input_difference']))}. '
      'Some entry touches the VAT accounts without an invoice or bill behind it (a manual journal, for example).',
    );
  }

  Widget _note(IconData icon, Color color, String text) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withValues(alpha: 0.35))),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
      ]),
    );
  }

  Widget _table(List<String> headers, List<List<String>> rows, {required String totalLabel, required String totalValue}) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columns: [
          DataColumn(label: Text(headers[0])),
          DataColumn(label: Text(headers[1]), numeric: true),
          DataColumn(label: Text(headers[2]), numeric: true),
        ],
        rows: [
          for (final r in rows) DataRow(cells: [for (final c in r) DataCell(Text(c))]),
          DataRow(cells: [
            DataCell(Text(totalLabel, style: const TextStyle(fontWeight: FontWeight.w700))),
            const DataCell(Text('')),
            DataCell(Text(totalValue, style: const TextStyle(fontWeight: FontWeight.w700))),
          ]),
        ],
      ),
    );
  }
}
