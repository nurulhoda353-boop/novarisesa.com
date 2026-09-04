import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:workmanager/workmanager.dart';

import 'api_client.dart';

/// Self-hosted replacement for Firebase Cloud Messaging.
///
/// While the app process is alive (foreground or recently backgrounded) new
/// mail arrives instantly over the `/mail/ws` WebSocket, which the backend
/// feeds from an IMAP IDLE watcher. When the app has been fully killed,
/// Android's WorkManager runs a lightweight check roughly every 15 minutes
/// (the platform's minimum interval for periodic background work) so mail
/// still surfaces as a notification without any Google Play Services
/// dependency.
const _backgroundTaskName = 'novarise-mail-background-sync';
const notificationChannelId = 'novarise_mail_inbox';
const _prefsLastNotifiedUidKey = 'push_last_notified_uid';

final FlutterLocalNotificationsPlugin _notifications =
    FlutterLocalNotificationsPlugin();

Future<void> initLocalNotifications() async {
  const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
  const iosSettings = DarwinInitializationSettings();
  await _notifications.initialize(
    const InitializationSettings(android: androidSettings, iOS: iosSettings),
  );
  final android = _notifications.resolvePlatformSpecificImplementation<
      AndroidFlutterLocalNotificationsPlugin>();
  await android?.createNotificationChannel(const AndroidNotificationChannel(
    notificationChannelId,
    'Incoming mail',
    description: 'Notifies you when new mail arrives in your inbox.',
    importance: Importance.high,
  ));
  await android?.requestNotificationsPermission();
  await _notifications
      .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>()
      ?.requestPermissions(alert: true, badge: true, sound: true);
}

Future<void> showNewMailNotification({
  required String title,
  required String body,
  int? id,
}) async {
  const details = NotificationDetails(
    android: AndroidNotificationDetails(
      notificationChannelId,
      'Incoming mail',
      importance: Importance.high,
      priority: Priority.high,
      category: AndroidNotificationCategory.email,
    ),
    iOS: DarwinNotificationDetails(),
  );
  await _notifications.show(
    id ?? DateTime.now().millisecondsSinceEpoch.remainder(1 << 31),
    title,
    body,
    details,
  );
}

/// Maintains the live push WebSocket while the app is alive, reconnecting
/// with backoff, and surfaces every `new_mail` event as a local notification
/// plus an optional in-app callback (e.g. to refresh the inbox list).
class PushService {
  PushService(this._api);

  final ApiClient _api;
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  Timer? _reconnectTimer;
  int _backoffSeconds = 3;
  bool _stopped = true;
  void Function()? onNewMail;

  void start() {
    _stopped = false;
    _connect();
  }

  void stop() {
    _stopped = true;
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
    _channel = null;
  }

  void _connect() {
    if (_stopped) return;
    _subscription?.cancel();
    _channel?.sink.close();
    final channel = _api.connectEvents();
    if (channel == null) return;
    _channel = channel;
    _subscription = channel.stream.listen(
      _handleEvent,
      onDone: _scheduleReconnect,
      onError: (_) => _scheduleReconnect(),
      cancelOnError: true,
    );
    _backoffSeconds = 3;
  }

  void _handleEvent(dynamic raw) {
    if (raw is! String) return;
    try {
      final data = jsonDecode(raw) as Map<String, dynamic>;
      if (data['event'] == 'new_mail') {
        onNewMail?.call();
        final uid = data['uid'] as int?;
        unawaited(showNewMailNotification(
          title: 'New mail',
          body: 'You have a new message in your inbox',
          id: uid,
        ));
      }
    } catch (_) {
      // Ignore malformed frames; the socket keeps listening.
    }
  }

  void _scheduleReconnect() {
    if (_stopped) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(seconds: _backoffSeconds), _connect);
    _backoffSeconds = (_backoffSeconds * 2).clamp(3, 60);
  }
}

@pragma('vm:entry-point')
void backgroundSyncDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      final api = ApiClient();
      if (!await api.restoreSession()) return true;
      if (!await api.refresh()) return true;
      final page = await api.messages('INBOX', limit: 1);
      if (page.data.isEmpty) return true;
      final latest = page.data.first;
      final prefs = await SharedPreferences.getInstance();
      final lastNotifiedUid = prefs.getInt(_prefsLastNotifiedUidKey) ?? 0;
      if (latest.uid > lastNotifiedUid) {
        await initLocalNotifications();
        await showNewMailNotification(
          title: latest.sender.label.isEmpty ? 'New mail' : latest.sender.label,
          body: latest.subject,
          id: latest.uid,
        );
        await prefs.setInt(_prefsLastNotifiedUidKey, latest.uid);
      }
    } catch (_) {
      // Swallow errors: WorkManager retries on its own schedule.
    }
    return true;
  });
}

Future<void> registerBackgroundSync() async {
  if (!Platform.isAndroid) return;
  await Workmanager().initialize(backgroundSyncDispatcher);
  await Workmanager().registerPeriodicTask(
    _backgroundTaskName,
    _backgroundTaskName,
    frequency: const Duration(minutes: 15),
    constraints: Constraints(networkType: NetworkType.connected),
    existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
  );
}

Future<void> cancelBackgroundSync() async {
  if (!Platform.isAndroid) return;
  await Workmanager().cancelByUniqueName(_backgroundTaskName);
}
