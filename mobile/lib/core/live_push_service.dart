import 'dart:io';

import 'package:flutter_foreground_task/flutter_foreground_task.dart';

import 'api_client.dart';
import 'push_service.dart';

/// Keeps the mail push WebSocket alive in an Android foreground service, so
/// new-mail notifications keep arriving in real time even after the app is
/// swiped away from recents. This is the only way to get that on Android
/// without depending on Firebase/Google Play Services - the tradeoff
/// Android forces on any such background service is a permanently visible,
/// low-priority notification while it runs.
///
/// This runs *alongside* [PushService] (which stays foreground-only, to
/// drive the instant "refresh the open inbox" behavior) and the WorkManager
/// poll in push_service.dart. If the OS still kills this service anyway
/// (some OEMs do, even past the battery-optimization exemption), that
/// 15-minute poll remains the fallback net under both.
const _liveSyncChannelId = 'novarise_mail_live_sync';
const _liveSyncServiceId = 4004;

bool _initialized = false;

void _ensureInitialized() {
  if (_initialized) return;
  FlutterForegroundTask.init(
    androidNotificationOptions: AndroidNotificationOptions(
      channelId: _liveSyncChannelId,
      channelName: 'Live mail sync',
      channelDescription:
          'Keeps a live connection open so new mail notifies you instantly, even when the app is closed.',
      onlyAlertOnce: true,
    ),
    iosNotificationOptions: const IOSNotificationOptions(
      showNotification: false,
      playSound: false,
    ),
    foregroundTaskOptions: ForegroundTaskOptions(
      eventAction: ForegroundTaskEventAction.nothing(),
      autoRunOnBoot: true,
      autoRunOnMyPackageReplaced: true,
      allowWakeLock: true,
      allowWifiLock: true,
    ),
  );
  _initialized = true;
}

/// Starts (or restarts) the foreground service that keeps the mail
/// WebSocket alive in the background. No-op on anything but Android.
Future<void> startLivePushService() async {
  if (!Platform.isAndroid) return;
  _ensureInitialized();
  if (await FlutterForegroundTask.isRunningService) {
    await FlutterForegroundTask.restartService();
    return;
  }
  await FlutterForegroundTask.startService(
    serviceId: _liveSyncServiceId,
    notificationTitle: 'Novamail',
    notificationText: 'Watching for new mail…',
    callback: _liveSyncStartCallback,
  );
}

Future<void> stopLivePushService() async {
  if (!Platform.isAndroid) return;
  if (await FlutterForegroundTask.isRunningService) {
    await FlutterForegroundTask.stopService();
  }
}

// Runs in its own isolate, spun up by the platform foreground-service
// plugin - has no access to the main isolate's state, so it restores its
// own session and opens its own WebSocket via the same PushService class
// the main isolate uses in the foreground.
@pragma('vm:entry-point')
void _liveSyncStartCallback() {
  FlutterForegroundTask.setTaskHandler(_LiveSyncTaskHandler());
}

class _LiveSyncTaskHandler extends TaskHandler {
  PushService? _push;

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    final api = ApiClient();
    if (!await api.restoreSession()) return;
    if (!await api.refresh()) return;
    await initLocalNotifications();
    final address = (await api.account()).address;
    final push = PushService(api)..accountAddress = address;
    _push = push;
    push.start();
  }

  @override
  void onRepeatEvent(DateTime timestamp) {}

  @override
  Future<void> onDestroy(DateTime timestamp) async {
    _push?.stop();
  }
}
