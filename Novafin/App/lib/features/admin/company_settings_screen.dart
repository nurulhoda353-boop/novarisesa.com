import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_state.dart';
import '../../core/novafin_repository.dart';
import '../../widgets/nf_widgets.dart';

class CompanySettingsScreen extends StatefulWidget {
  const CompanySettingsScreen({super.key});

  @override
  State<CompanySettingsScreen> createState() => _CompanySettingsScreenState();
}

class _CompanySettingsScreenState extends State<CompanySettingsScreen> {
  late Future<Map<String, dynamic>> _future;
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _vat = TextEditingController();
  final _cr = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _address = TextEditingController();
  final _vatRate = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _future = context.read<NovaFinRepository>().getCompany().then((data) {
      _name.text = data['name']?.toString() ?? '';
      _vat.text = data['vat_number']?.toString() ?? '';
      _cr.text = data['cr_number']?.toString() ?? '';
      _phone.text = data['phone']?.toString() ?? '';
      _email.text = data['email']?.toString() ?? '';
      _address.text = data['address']?.toString() ?? '';
      _vatRate.text = data['vat_rate']?.toString() ?? '15.00';
      return data;
    });
  }

  @override
  Widget build(BuildContext context) {
    final canManage = context.watch<AuthState>().user?.canManage ?? false;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const NfPageTitle('Administration'),
        const SizedBox(height: 18),
        Expanded(
          child: FutureBuilder<Map<String, dynamic>>(
            future: _future,
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                if (snapshot.hasError) return Text('${snapshot.error}');
                return const Center(child: CircularProgressIndicator());
              }
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 560),
                  child: NfPanel(
                    eyebrow: 'Settings',
                    title: 'Company Profile',
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextFormField(controller: _name, enabled: canManage, decoration: const InputDecoration(labelText: 'Company Name')),
                          const SizedBox(height: 12),
                          Row(children: [
                            Expanded(child: TextFormField(controller: _vat, enabled: canManage, decoration: const InputDecoration(labelText: 'VAT Number'))),
                            const SizedBox(width: 12),
                            Expanded(child: TextFormField(controller: _cr, enabled: canManage, decoration: const InputDecoration(labelText: 'CR Number'))),
                          ]),
                          const SizedBox(height: 12),
                          Row(children: [
                            Expanded(child: TextFormField(controller: _phone, enabled: canManage, decoration: const InputDecoration(labelText: 'Phone'))),
                            const SizedBox(width: 12),
                            Expanded(child: TextFormField(controller: _email, enabled: canManage, decoration: const InputDecoration(labelText: 'Email'))),
                          ]),
                          const SizedBox(height: 12),
                          TextFormField(controller: _address, enabled: canManage, decoration: const InputDecoration(labelText: 'Address'), maxLines: 2),
                          const SizedBox(height: 12),
                          TextFormField(controller: _vatRate, enabled: canManage, decoration: const InputDecoration(labelText: 'Default VAT Rate (%)'), keyboardType: TextInputType.number),
                          if (canManage) ...[
                            const SizedBox(height: 20),
                            ElevatedButton(
                              onPressed: _saving ? null : _save,
                              child: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Save Settings'),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await context.read<NovaFinRepository>().saveCompany({
        'name': _name.text.trim(),
        'vat_number': _vat.text.trim().isEmpty ? null : _vat.text.trim(),
        'cr_number': _cr.text.trim().isEmpty ? null : _cr.text.trim(),
        'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        'email': _email.text.trim().isEmpty ? null : _email.text.trim(),
        'address': _address.text.trim().isEmpty ? null : _address.text.trim(),
        'vat_rate': double.tryParse(_vatRate.text) ?? 15.0,
      });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Settings saved')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}
