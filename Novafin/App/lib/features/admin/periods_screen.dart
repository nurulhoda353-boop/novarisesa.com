import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/novafin_repository.dart';
import '../../core/theme.dart';
import '../../widgets/nf_widgets.dart';

const _monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/// Lock a month once its VAT return is filed: after that nobody can post, edit or backdate into it.
class PeriodsScreen extends StatefulWidget {
  const PeriodsScreen({super.key});

  @override
  State<PeriodsScreen> createState() => _PeriodsScreenState();
}

class _PeriodsScreenState extends State<PeriodsScreen> {
  int _year = DateTime.now().year;
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() => _future = context.read<NovaFinRepository>().getRaw('periods?year=$_year');

  Future<void> _lock(int month) async {
    final repo = context.read<NovaFinRepository>();
    final ok = await nfConfirm(
      context,
      title: 'Lock ${_monthNames[month - 1]} $_year',
      message: 'Nothing dated in this month can be posted, edited or backdated afterwards. Only a Director can unlock it. Continue?',
      confirmLabel: 'Lock month',
    );
    if (!ok || !mounted) return;
    if (await nfRun(context, () => repo.createRaw('periods/$_year/$month/lock', {}), success: 'Month locked.')) setState(_load);
  }

  Future<void> _unlock(int month) async {
    final repo = context.read<NovaFinRepository>();
    final values = await nfForm(
      context,
      title: 'Unlock ${_monthNames[month - 1]} $_year',
      message: 'Directors only. The reason is kept in the audit log.',
      fields: const [NfFormField('note', 'Why is it being unlocked?')],
      confirmLabel: 'Unlock',
    );
    if (values == null || !mounted) return;
    if (await nfRun(context, () => repo.createRaw('periods/$_year/$month/unlock', {'note': values['note']}), success: 'Month unlocked.')) setState(_load);
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    final canLock = user?.permissions.contains('novafin.close_period') ?? false;
    final canUnlock = user?.permissions.contains('novafin.reopen_period') ?? false;
    final thisYear = DateTime.now().year;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Expanded(child: NfPageTitle('Accounting Periods')),
        DropdownButton<int>(
          value: _year,
          items: [for (var y = thisYear - 3; y <= thisYear + 1; y++) DropdownMenuItem(value: y, child: Text('$y'))],
          onChanged: (v) => setState(() {
            _year = v ?? _year;
            _load();
          }),
        ),
      ]),
      const SizedBox(height: 18),
      Expanded(
        child: NfPanel(
          eyebrow: 'Month-end',
          title: 'Lock a month after its VAT return is filed',
          scrollableContent: true,
          child: FutureBuilder<Map<String, dynamic>>(
            future: _future,
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                if (snapshot.hasError) return Padding(padding: const EdgeInsets.all(24), child: Text('${snapshot.error}'));
                return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
              }
              final months = (snapshot.data!['months'] as List).cast<Map<String, dynamic>>();
              return Wrap(spacing: 14, runSpacing: 14, children: [
                for (final m in months)
                  SizedBox(
                    width: 220,
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(_monthNames[(m['month'] as int) - 1], style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          const SizedBox(height: 6),
                          Text(
                            switch (m['status']) { 'locked' => 'Locked', 'closed_year' => 'Closed with the year', _ => 'Open' },
                            style: TextStyle(color: m['status'] == 'open' ? NfColors.success : NfColors.warning, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          if (m['status'] == 'open' && canLock)
                            OutlinedButton(onPressed: () => _lock(m['month'] as int), child: const Text('Lock')),
                          if (m['status'] == 'locked' && canUnlock)
                            OutlinedButton(onPressed: () => _unlock(m['month'] as int), child: const Text('Unlock…')),
                        ]),
                      ),
                    ),
                  ),
              ]);
            },
          ),
        ),
      ),
    ]);
  }
}
