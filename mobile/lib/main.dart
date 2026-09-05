import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:quick_actions/quick_actions.dart';

import 'core/api_client.dart';
import 'core/app_state.dart';
import 'core/theme.dart';
import 'features/auth/login_screen.dart';
import 'features/mail/compose_screen.dart';
import 'features/mail/inbox_screen.dart';

final navigatorKey = GlobalKey<NavigatorState>();

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  _setUpQuickActions();
  runApp(const NovariseMailApp());
}

void _setUpQuickActions() {
  const quickActions = QuickActions();
  quickActions.initialize((type) {
    if (type != 'compose') return;
    final context = navigatorKey.currentContext;
    if (context == null || !context.read<AppState>().authenticated) return;
    navigatorKey.currentState
        ?.push(MaterialPageRoute(builder: (_) => const ComposeScreen()));
  });
  quickActions.setShortcutItems(const [
    ShortcutItem(
      type: 'compose',
      localizedTitle: 'Compose',
      icon: 'ic_compose_shortcut',
    ),
  ]);
}

class NovariseMailApp extends StatelessWidget {
  const NovariseMailApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState(ApiClient())..bootstrap(),
      child: Consumer<AppState>(
        builder: (context, state, _) => MaterialApp(
          navigatorKey: navigatorKey,
          title: 'Novamail',
          debugShowCheckedModeBanner: false,
          theme: NovariseTheme.light(),
          darkTheme: NovariseTheme.dark(),
          themeMode: state.themeMode,
          home: const _AppGate(),
        ),
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
