import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/novafin_repository.dart';
import 'nf_widgets.dart';

/// The full customer / vendor form, including everything a ZATCA tax invoice needs about the
/// buyer (VAT number, national address, commercial registration, Arabic name).
/// Returns true when a record was saved.
Future<bool> showPartyDialog(BuildContext context, {required bool isCustomer}) async {
  final repo = context.read<NovaFinRepository>();
  final formKey = GlobalKey<FormState>();
  final c = <String, TextEditingController>{
    for (final key in [
      'name', 'name_ar', 'phone', 'email', 'city', 'vat_number', 'cr_number',
      'street', 'building_no', 'district', 'postal_code', 'payment_terms_days', 'credit_limit', 'opening_balance',
    ])
      key: TextEditingController(text: const {'payment_terms_days': '0', 'credit_limit': '0', 'opening_balance': '0'}[key] ?? ''),
  };
  var saving = false;
  String? error;
  var saved = false;

  Widget field(String key, String label, {bool number = false, String? Function(String?)? validator}) => Expanded(
        child: TextFormField(
          controller: c[key],
          decoration: InputDecoration(labelText: label, isDense: true),
          keyboardType: number ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
          validator: validator,
        ),
      );
  Widget row(List<Widget> children) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          for (var i = 0; i < children.length; i++) ...[if (i > 0) const SizedBox(width: 10), children[i]],
        ]),
      );
  String? text(String key) => c[key]!.text.trim().isEmpty ? null : c[key]!.text.trim();

  await showDialog(
    context: context,
    barrierDismissible: false,
    builder: (dialogContext) => StatefulBuilder(
      builder: (dialogContext, setState) => AlertDialog(
        title: Text(isCustomer ? 'New Customer' : 'New Vendor'),
        content: SizedBox(
          width: 620,
          child: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                row([field('name', 'Name (English)', validator: (v) => (v == null || v.trim().length < 2) ? 'Required' : null), field('name_ar', 'Name (Arabic)')]),
                row([field('phone', 'Phone'), if (isCustomer) field('email', 'Email')]),
                row([field('vat_number', 'VAT number (15 digits)'), field('cr_number', 'Commercial registration no.')]),
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Text('National address (required on B2B tax invoices)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5)),
                ),
                row([field('street', 'Street'), field('building_no', 'Building no.')]),
                row([field('district', 'District'), field('city', 'City'), field('postal_code', 'Postal code')]),
                row([
                  field('payment_terms_days', 'Payment terms (days)', number: true),
                  if (isCustomer) field('credit_limit', 'Credit limit', number: true),
                  field('opening_balance', 'Opening balance', number: true),
                ]),
                if (error != null) Text(error!, style: const TextStyle(color: Color(0xFFB3261E), fontSize: 13)),
              ]),
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: saving ? null : () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: saving
                ? null
                : () async {
                    if (!formKey.currentState!.validate()) return;
                    setState(() {
                      saving = true;
                      error = null;
                    });
                    final body = <String, dynamic>{
                      'name': text('name'),
                      'name_ar': text('name_ar'),
                      'phone': text('phone'),
                      if (isCustomer) 'email': text('email'),
                      'city': text('city'),
                      'vat_number': text('vat_number'),
                      'cr_number': text('cr_number'),
                      'street': text('street'),
                      'building_no': text('building_no'),
                      'district': text('district'),
                      'postal_code': text('postal_code'),
                      'payment_terms_days': int.tryParse(c['payment_terms_days']!.text) ?? 0,
                      if (isCustomer) 'credit_limit': double.tryParse(c['credit_limit']!.text) ?? 0,
                      'opening_balance': double.tryParse(c['opening_balance']!.text) ?? 0,
                    };
                    try {
                      await repo.createRaw(isCustomer ? 'customers' : 'vendors', body);
                      saved = true;
                      if (dialogContext.mounted) Navigator.pop(dialogContext);
                    } on ApiException catch (e) {
                      setState(() {
                        saving = false;
                        error = nfErrorMessage(e);
                      });
                    } catch (_) {
                      setState(() {
                        saving = false;
                        error = 'Could not save. Check your connection and try again.';
                      });
                    }
                  },
            child: saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save'),
          ),
        ],
      ),
    ),
  );
  return saved;
}
