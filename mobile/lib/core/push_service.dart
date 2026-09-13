import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:workmanager/workmanager.dart';

import 'api_client.dart';
import 'models.dart';

/// Self-hosted replacement for Firebase Cloud Messaging.
///
/// While the app process is alive (foreground or recently backgrounded) new
/// mail arrives instantly over the `/mail/ws` WebSocket, which the backend
/// feeds from an IMAP IDLE watcher. When the app has been fully killed,
/// Android's WorkManager runs a lightweight check roughly every 15 minutes
/// (the platform's minimum interval for periodic background work) so mail
/// still surfaces as a notification without any Google Play Services
/// dependency. Both paths funnel through [checkAndNotifyNewMail] so the
/// content, dedupe, and grouping behavior is identical either way.
///
/// iOS has no equivalent background path today (no BGTaskScheduler/APNs is
/// registered) - on iOS, mail only surfaces while the app is foregrounded or
/// briefly suspended, same as before this file's dedupe/grouping rewrite.
const _backgroundTaskName = 'novarise-mail-background-sync';
const _reminderTaskName = 'reminder';
const notificationChannelId = 'novarise_mail_inbox';

// Keeps a per-account "summary" notification id out of the way of uid-based
// message notification ids (IMAP uids are small positive ints in practice).
const _summaryNotificationIdBase = 900000000;

const _lastNotifiedUidPrefix = 'push_last_notified_uid_';
const _activeUidsPrefix = 'push_active_uids_';

final FlutterLocalNotificationsPlugin _notifications =
    FlutterLocalNotificationsPlugin();

/// Broadcasts the decoded `{account, folder, uid}` payload whenever the user
/// taps a mail notification while the app is already running (foreground or
/// backgrounded-but-alive). A cold start instead goes through
/// [consumeLaunchPayload], since there's no listener alive yet to catch it.
final StreamController<Map<String, dynamic>> notificationTaps =
    StreamController<Map<String, dynamic>>.broadcast();

bool _pluginInitialized = false;
bool? _lastPermissionGranted;

/// Whether the OS notification permission was granted the last time it was
/// requested (`initLocalNotifications`), or `null` if that hasn't happened
/// yet this run. Lets the settings screen warn the user instead of silently
/// leaving the in-app toggle "on" while nothing is actually delivered.
bool? get notificationsPermissionGranted => _lastPermissionGranted;

Map<String, dynamic>? _decodePayload(String? payload) {
  if (payload == null || payload.isEmpty) return null;
  try {
    return jsonDecode(payload) as Map<String, dynamic>;
  } catch (_) {
    return null;
  }
}

void _onNotificationTap(NotificationResponse response) {
  final data = _decodePayload(response.payload);
  if (data != null) notificationTaps.add(data);
}

// Runs in a separate background isolate when the user taps a notification
// while the app process isn't alive to receive it any other way. There's no
// UI to navigate from here; tapping still relaunches the app, which then
// reads the same payload back via `getNotificationAppLaunchDetails()`
// (see [consumeLaunchPayload]) on cold start.
@pragma('vm:entry-point')
void _onBackgroundNotificationTap(NotificationResponse response) {}

Future<bool> initLocalNotifications() async {
  if (!_pluginInitialized) {
    const androidSettings =
        AndroidInitializationSettings('@drawable/ic_stat_mail');
    const iosSettings = DarwinInitializationSettings();
    await _notifications.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
      onDidReceiveNotificationResponse: _onNotificationTap,
      onDidReceiveBackgroundNotificationResponse: _onBackgroundNotificationTap,
    );
    _pluginInitialized = true;
  }
  final android = _notifications.resolvePlatformSpecificImplementation<
      AndroidFlutterLocalNotificationsPlugin>();
  await android?.createNotificationChannel(const AndroidNotificationChannel(
    notificationChannelId,
    'Incoming mail',
    description: 'Notifies you when new mail arrives in your inbox.',
    importance: Importance.high,
  ));
  final androidGranted = await android?.requestNotificationsPermission();
  final iosGranted = await _notifications
      .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>()
      ?.requestPermissions(alert: true, badge: true, sound: true);
  // Neither plugin implementation exists on the other platform, so exactly
  // one of these is ever non-null; default to true (rather than treating
  // "no permission system to ask" as a denial) if somehow both are null.
  _lastPermissionGranted = androidGranted ?? iosGranted ?? true;
  return _lastPermissionGranted!;
}

/// Reads back the payload of the notification that launched the app from a
/// fully-killed state, if the user tapped one to get here. Call once, early,
/// after the app finishes booting.
Future<Map<String, dynamic>?> consumeLaunchPayload() async {
  final details = await _notifications.getNotificationAppLaunchDetails();
  if (details?.didNotificationLaunchApp != true) return null;
  return _decodePayload(details?.notificationResponse?.payload);
}

/// Stable per-(account, message) notification id, so re-showing the same
/// message (e.g. a duplicate poll) replaces rather than stacks, and so two
/// accounts' notifications never collide on id.
int _messageNotificationId(String accountAddress, int uid) =>
    (accountAddress.hashCode & 0x7fffffff) ^ uid;

int _summaryNotificationId(String accountAddress) =>
    _summaryNotificationIdBase + (accountAddress.hashCode & 0x7fffff);

Future<void> _showMessageNotification({
  required String accountAddress,
  required MailMessage message,
}) async {
  final title = message.sender.label.isEmpty ? 'New mail' : message.sender.label;
  final body = message.subject.isEmpty ? '(no subject)' : message.subject;
  final payload = jsonEncode({
    'account': accountAddress,
    'folder': message.folder,
    'uid': message.uid,
  });
  final details = NotificationDetails(
    android: AndroidNotificationDetails(
      notificationChannelId,
      'Incoming mail',
      importance: Importance.high,
      priority: Priority.high,
      category: AndroidNotificationCategory.email,
      groupKey: accountAddress,
      styleInformation: BigTextStyleInformation(
        message.preview.isEmpty ? body : '$body\n${message.preview}',
        contentTitle: title,
        htmlFormatBigText: false,
      ),
    ),
    iOS: const DarwinNotificationDetails(),
  );
  await _notifications.show(
    _messageNotificationId(accountAddress, message.uid),
    title,
    body,
    details,
    payload: payload,
  );
}

/// Gmail-style stack summary - only posted when a poll surfaces more than
/// one new message at once, so a single arrival still just reads as itself.
Future<void> _showGroupSummary({
  required String accountAddress,
  required List<MailMessage> newMessages,
}) async {
  if (newMessages.length < 2) return;
  final lines = [
    for (final message in newMessages)
      '${message.sender.label.isEmpty ? "Unknown sender" : message.sender.label}: '
          '${message.subject.isEmpty ? "(no subject)" : message.subject}',
  ];
  final title = '${newMessages.length} new messages';
  final details = NotificationDetails(
    android: AndroidNotificationDetails(
      notificationChannelId,
      'Incoming mail',
      importance: Importance.high,
      priority: Priority.high,
      category: AndroidNotificationCategory.email,
      groupKey: accountAddress,
      setAsGroupSummary: true,
      styleInformation: InboxStyleInformation(
        lines,
        contentTitle: title,
        summaryText: accountAddress,
      ),
    ),
    iOS: const DarwinNotificationDetails(),
  );
  await _notifications.show(
    _summaryNotificationId(accountAddress),
    title,
    accountAddress,
    details,
  );
}

/// The one-off "remind me about this later" nudge (see [scheduleReminder]).
/// Kept separate from the inbox-notification machinery above since it isn't
/// about real inbox state - it's just a plain scheduled alarm.
Future<void> showReminderNotification({
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

Future<void> cancelNotificationFor(String accountAddress, int uid) =>
    _notifications.cancel(_messageNotificationId(accountAddress, uid));

// --- Per-account bookkeeping: what's already been notified, and what's
// still sitting in the tray (so it can be cancelled once read) -------------

Future<int> _lastNotifiedUid(SharedPreferences prefs, String address) async =>
    prefs.getInt('$_lastNotifiedUidPrefix$address') ?? 0;

Future<void> _setLastNotifiedUid(
        SharedPreferences prefs, String address, int uid) =>
    prefs.setInt('$_lastNotifiedUidPrefix$address', uid);

Future<Set<int>> _activeUids(SharedPreferences prefs, String address) async {
  final raw = prefs.getStringList('$_activeUidsPrefix$address');
  return raw?.map(int.parse).toSet() ?? <int>{};
}

Future<void> _setActiveUids(
        SharedPreferences prefs, String address, Set<int> uids) =>
    prefs.setStringList(
        '$_activeUidsPrefix$address', uids.map((uid) => '$uid').toList());

/// Cancels the tray notification for any message in [freshMessages] that has
/// since been read - in this app, on the webmail client, or anywhere else
/// IMAP sync reaches - so a phone notification never outlives the email it
/// was for. Called after every inbox fetch, foreground or background.
Future<void> reconcileReadNotifications(
    String accountAddress, List<MailMessage> freshMessages) async {
  final prefs = await SharedPreferences.getInstance();
  final active = await _activeUids(prefs, accountAddress);
  if (active.isEmpty) return;
  final nowRead = freshMessages
      .where((message) => active.contains(message.uid) && message.isRead)
      .map((message) => message.uid)
      .toSet();
  if (nowRead.isEmpty) return;
  for (final uid in nowRead) {
    await _notifications.cancel(_messageNotificationId(accountAddress, uid));
  }
  await _setActiveUids(prefs, accountAddress, active.difference(nowRead));
}

/// Checks one account's inbox and notifies about anything new, deduped
/// against what this account has already been notified for. Shared by the
/// live WebSocket path and the WorkManager background poll so both produce
/// identical notifications regardless of which one happens to fire.
Future<void> checkAndNotifyNewMail(ApiClient api, String accountAddress) async {
  final page = await api.messages('INBOX', limit: 10);
  if (page.data.isEmpty) return;
  await reconcileReadNotifications(accountAddress, page.data);
  final prefs = await SharedPreferences.getInstance();
  final lastNotifiedUid = await _lastNotifiedUid(prefs, accountAddress);
  final fresh = page.data
      .where((message) => message.uid > lastNotifiedUid && !message.isRead)
      .toList()
    ..sort((a, b) => a.uid.compareTo(b.uid));
  if (fresh.isEmpty) return;
  for (final message in fresh) {
    await _showMessageNotification(accountAddress: accountAddress, message: message);
  }
  await _showGroupSummary(accountAddress: accountAddress, newMessages: fresh);
  final active = await _activeUids(prefs, accountAddress);
  active.addAll(fresh.map((message) => message.uid));
  await _setActiveUids(prefs, accountAddress, active);
  await _setLastNotifiedUid(
      prefs, accountAddress, fresh.map((message) => message.uid).reduce((a, b) => a > b ? a : b));
}

/// Maintains the live push WebSocket while the app is alive, reconnecting
/// with backoff, and triggers [checkAndNotifyNewMail] on every `new_mail`
/// event plus an optional in-app callback (e.g. to refresh the inbox list).
class PushService {
  PushService(this._api);

  final ApiClient _api;
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;
  Timer? _reconnectTimer;
  int _backoffSeconds = 3;
  bool _stopped = true;
  void Function()? onNewMail;

  /// The mailbox this WebSocket is currently open for - set by AppState
  /// whenever the active account changes, so notifications are attributed
  /// (and deduped/grouped) correctly per-account.
  String? accountAddress;

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
        final address = accountAddress;
        if (address != null) {
          unawaited(checkAndNotifyNewMail(_api, address));
        }
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
      if (task == _reminderTaskName) {
        await initLocalNotifications();
        await showReminderNotification(
          title: inputData?['title'] as String? ?? 'Reminder',
          body: inputData?['body'] as String? ?? '',
          id: inputData?['id'] as int?,
        );
        return true;
      }
      final api = ApiClient();
      if (!await api.restoreSession()) return true;
      if (!await api.refresh()) return true;
      await initLocalNotifications();
      // Every saved mailbox gets checked, not just whichever was last
      // foregrounded - switching accounts below temporarily changes which
      // one `api`'s tokens point at, so the original is restored at the end
      // regardless of poll order.
      final originalAddress = (await api.account()).address;
      final addresses = await api.savedAccountAddresses();
      for (final address in addresses) {
        try {
          if (address != originalAddress) {
            final switched = await api.switchAccount(address);
            if (!switched) continue;
          }
          await checkAndNotifyNewMail(api, address);
        } catch (_) {
          // One account's failure (expired token, transient network error)
          // shouldn't stop the rest from being checked.
        }
      }
      if (addresses.length > 1) {
        await api.switchAccount(originalAddress);
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

/// Schedules a one-off local notification (a "remind me about this email
/// later" nudge). This does not hide or move the message the way Gmail's
/// server-side snooze does — there is no scheduler on our backend for that
/// yet — it only pops a reminder notification at the chosen time.
Future<void> scheduleReminder({
  required int id,
  required Duration delay,
  required String title,
  required String body,
}) async {
  if (!Platform.isAndroid) return;
  await Workmanager().initialize(backgroundSyncDispatcher);
  await Workmanager().registerOneOffTask(
    'novarise-mail-reminder-$id-${DateTime.now().millisecondsSinceEpoch}',
    _reminderTaskName,
    initialDelay: delay,
    inputData: {'title': title, 'body': body, 'id': id},
  );
}
