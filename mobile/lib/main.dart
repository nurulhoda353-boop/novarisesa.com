import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/api_client.dart';
import 'core/app_state.dart';
import 'core/theme.dart';
import 'features/auth/login_screen.dart';
import 'features/mail/inbox_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const NovariseMailApp());
}

class NovariseMailApp extends StatelessWidget {
  const NovariseMailApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState(ApiClient())..bootstrap(),
      child: MaterialApp(
        title: 'Novarise Mail',
        debugShowCheckedModeBanner: false,
        theme: NovariseTheme.light(),
        home: const _AppGate(),
      ),
    );
  }
}

class _AppGate extends StatelessWidget {
  const _AppGate();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    if (state.booting) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return state.authenticated ? const InboxScreen() : const LoginScreen();
  }
}
