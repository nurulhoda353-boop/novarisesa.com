import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:quick_actions/quick_actions.dart';

import 'core/api_client.dart';
import 'core/app_state.dart';
import 'core/push_service.dart';
import 'core/theme.dart';
import 'core/thread_utils.dart';
import 'features/auth/login_screen.dart';
import 'features/mail/compose_screen.dart';
import 'features/mail/inbox_screen.dart';
import 'features/mail/thread_screen.dart';

final navigatorKey = GlobalKey<NavigatorState>();

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  _setUpQuickActions();
  _setUpNotificationTapHandling();
  runApp(const NovariseMailApp());
}

/// Deep-links a mail notification tap straight to the message it's for,
/// Gmail-style, instead of just opening to whatever the default route is.
/// Covers both a tap while the app is already running ([notificationTaps])
/// and a tap that cold-started the app ([consumeLaunchPayload]).
void _setUpNotificationTapHandling() {
  notificationTaps.stream.listen(_openFromNotificationPayload);
  // Cold start: give the widget tree a moment to mount before navigating.
  WidgetsBinding.instance.addPostFrameCallback((_) async {
    final payload = await consumeLaunchPayload();
    if (payload != null) await _openFromNotificationPayload(payload);
  });
}

Future<void> _openFromNotificationPayload(Map<String, dynamic> payload) async {
  final context = navigatorKey.currentContext;
  if (context == null) return;
  final state = context.read<AppState>();
  final address = payload['account'] as String?;
  final folder = payload['folder'] as String?;
  final uid = payload['uid'] as int?;
  if (folder == null || uid == null) return;
  if (address != null && address != state.account?.address) {
    final switched = await state.switchAccount(address);
    if (!switched) return;
  }
  try {
    final summary = await state.api.message(folder, uid);
    navigatorKey.currentState?.push(
      MaterialPageRoute(
        builder: (_) => ThreadScreen(thread: MailThread([summary])),
      ),
    );
  } catch (_) {
    // The message may have since been deleted/moved elsewhere - nothing
    // sensible to open, so just leave the user on the inbox.
  }
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
