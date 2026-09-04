import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    try {
      await context.read<AppState>().login(_email.text, _password.text);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 78,
                        height: 78,
                        padding: const EdgeInsets.all(15),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: const [
                            BoxShadow(
                                color: Color(0x160B1739),
                                blurRadius: 30,
                                offset: Offset(0, 12)),
                          ],
                        ),
                        child: Image.asset('assets/novarise-logo-mark.png'),
                      ),
                    ),
                    const SizedBox(height: 28),
                    const Text(
                      'Novarise Mail',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w800,
                          color: NovariseTheme.navy),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Sign in with your @novarisesa.com mailbox',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.blueGrey.shade600),
                    ),
                    const SizedBox(height: 36),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                          labelText: 'Email address',
                          prefixIcon: Icon(Icons.mail_outline)),
                      validator: (value) {
                        final text = value?.trim().toLowerCase() ?? '';
                        if (!text.endsWith('@novarisesa.com') ||
                            !text.contains('@')) {
                          return 'Enter your Novarise email address';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscure,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: InputDecoration(
                        labelText: 'Mailbox password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => _obscure = !_obscure),
                          icon: Icon(_obscure
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined),
                        ),
                      ),
                      validator: (value) => (value?.length ?? 0) < 8
                          ? 'Password must contain at least 8 characters'
                          : null,
                    ),
                    if (state.error != null) ...[
                      const SizedBox(height: 14),
                      Text(state.error!,
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 22),
                    FilledButton.icon(
                      onPressed: state.busy ? null : _submit,
                      icon: state.busy
                          ? const SizedBox.square(
                              dimension: 20,
                              child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.login),
                      label: const Text('Sign in'),
                    ),
                    const SizedBox(height: 20),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.shield_outlined,
                            size: 18, color: Colors.blueGrey),
                        SizedBox(width: 7),
                        Flexible(
                            child: Text(
                                'Encrypted connection to Hostinger Mail',
                                style: TextStyle(color: Colors.blueGrey))),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
