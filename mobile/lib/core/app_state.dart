import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';
import 'models.dart';
import 'push_service.dart';

class AppState extends ChangeNotifier {
  AppState(this.api) : push = PushService(api);

  final ApiClient api;
  final PushService push;
  MailAccount? account;
  List<MailFolder> folders = const [];
  List<MailMessage> messages = const [];
  List<String> savedAccounts = const [];
  String currentFolder = 'INBOX';
  bool booting = true;
  bool busy = false;
  bool loadingMore = false;
  bool hasMore = false;
  bool offline = false;
  String? error;
  ThemeMode themeMode = ThemeMode.system;
  bool notificationsEnabled = true;

  int? _nextBeforeUid;
  String? _activeQuery;
  MessageFilter? _activeFilter;
  Timer? _refreshTimer;

  bool get authenticated => account != null;

  Future<void> bootstrap() async {
    await _loadPreferences();
    try {
      if (await api.restoreSession() && await api.refresh()) {
        account = await api.account();
        await _loadMailbox();
      }
    } catch (_) {
      await api.clearSession();
    } finally {
      savedAccounts = await api.savedAccountAddresses();
      booting = false;
      notifyListeners();
    }
  }

  Future<void> _loadPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    themeMode = switch (prefs.getString('theme_mode')) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
    notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    themeMode = mode;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('theme_mode', mode.name);
  }

  Future<void> setNotificationsEnabled(bool value) async {
    notificationsEnabled = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notifications_enabled', value);
    if (value) {
      await initLocalNotifications();
      push.start();
      await registerBackgroundSync();
    } else {
      push.stop();
      await cancelBackgroundSync();
    }
  }

  Future<void> login(String email, String password) async {
    await _guard(() async {
      _teardownMailbox();
      final session = await api.login(email, password);
      account = session.account;
      await _loadMailbox();
      savedAccounts = await api.savedAccountAddresses();
    });
  }

  /// Switches the active session to another saved account (see "Add
  /// account" / the account switcher). Returns false if that account's
  /// saved refresh token has since expired, in which case it's dropped from
  /// the saved list and the caller should prompt the user to log back in.
  Future<bool> switchAccount(String address) async {
    if (address == account?.address) return true;
    busy = true;
    notifyListeners();
    _teardownMailbox();
    final ok = await api.switchAccount(address);
    if (ok) {
      account = await api.account();
      await _loadMailbox();
    } else {
      account = null;
    }
    savedAccounts = await api.savedAccountAddresses();
    busy = false;
    notifyListeners();
    return ok;
  }

  /// Forgets one saved account. If it was the active one, signs it out
  /// server-side and switches to another saved account (or the login
  /// screen, if none remain).
  Future<void> removeAccount(String address) async {
    final wasCurrent = address == account?.address;
    if (wasCurrent) {
      _teardownMailbox();
      try {
        await api.logout();
      } catch (_) {
        // Best-effort server-side revoke; the local session is cleared
        // either way.
      }
    }
    await api.forgetAccount(address);
    savedAccounts = await api.savedAccountAddresses();
    if (!wasCurrent) {
      notifyListeners();
      return;
    }
    account = null;
    messages = const [];
    folders = const [];
    if (savedAccounts.isNotEmpty) {
      await switchAccount(savedAccounts.first);
    } else {
      notifyListeners();
    }
  }

  void _teardownMailbox() {
    _refreshTimer?.cancel();
    push.stop();
  }

  Future<void> _loadMailbox() async {
    folders = await api.folders();
    await loadMessages();
    _refreshTimer?.cancel();
    // Safety-net poll: the push WebSocket delivers new mail instantly, this
    // just guards against a silently-dropped connection.
    _refreshTimer = Timer.periodic(
      const Duration(minutes: 5),
      (_) => loadMessages(silent: true),
    );
    if (notificationsEnabled) {
      await initLocalNotifications();
      push.onNewMail = () => loadMessages(silent: true);
      push.start();
      await registerBackgroundSync();
    }
  }

  Future<void> selectFolder(String folder) async {
    currentFolder = folder;
    _activeQuery = null;
    _activeFilter = null;
    notifyListeners();
    await loadMessages();
  }

  String _cacheKey(String folder) => 'mail_cache_${account?.id ?? 'anon'}_$folder';

  Future<void> _cacheMessages(String folder, List<MailMessage> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _cacheKey(folder),
        jsonEncode(data.map((message) => message.toJson()).toList()),
      );
    } catch (_) {
      // Caching is a convenience, never let it disrupt a successful load.
    }
  }

  Future<bool> _loadFromCache(String folder) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey(folder));
      if (raw == null) return false;
      final list = jsonDecode(raw) as List<dynamic>;
      final cached = list
          .map((item) => MailMessage.fromJson(item as Map<String, dynamic>))
          .toList();
      if (cached.isEmpty) return false;
      messages = cached;
      hasMore = false;
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> loadMessages({
    String? query,
    MessageFilter? filter,
    bool silent = false,
  }) async {
    _activeQuery = query;
    _activeFilter = filter ?? _activeFilter;
    if (!silent) {
      busy = true;
      error = null;
      notifyListeners();
    }
    try {
      final page = await api.messages(
        currentFolder,
        query: _activeQuery,
        fromContains: _activeFilter?.fromContains,
        since: _activeFilter?.since,
        before: _activeFilter?.before,
        hasAttachment: _activeFilter?.hasAttachment,
      );
      messages = page.data;
      _nextBeforeUid = page.nextBeforeUid;
      hasMore = page.nextBeforeUid != null;
      offline = false;
      folders = await api.folders();
      final isPlainFolderView =
          (_activeQuery == null || _activeQuery!.isEmpty) &&
              (_activeFilter?.isEmpty ?? true);
      if (isPlainFolderView) unawaited(_cacheMessages(currentFolder, messages));
    } on ApiException catch (exception) {
      error = exception.message;
      await _fallBackToCacheIfPlainView();
    } catch (_) {
      error = 'Unable to connect. Check your internet connection.';
      await _fallBackToCacheIfPlainView();
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> _fallBackToCacheIfPlainView() async {
    final isPlainFolderView = (_activeQuery == null || _activeQuery!.isEmpty) &&
        (_activeFilter?.isEmpty ?? true);
    if (!isPlainFolderView) return;
    offline = await _loadFromCache(currentFolder);
  }

  Future<void> loadMore() async {
    if (loadingMore || !hasMore || _nextBeforeUid == null) return;
    loadingMore = true;
    notifyListeners();
    try {
      final page = await api.messages(
        currentFolder,
        query: _activeQuery,
        beforeUid: _nextBeforeUid,
        fromContains: _activeFilter?.fromContains,
        since: _activeFilter?.since,
        before: _activeFilter?.before,
        hasAttachment: _activeFilter?.hasAttachment,
      );
      messages = [...messages, ...page.data];
      _nextBeforeUid = page.nextBeforeUid;
      hasMore = page.nextBeforeUid != null;
    } catch (_) {
      // Keep the existing list; the user can retry by scrolling again.
    } finally {
      loadingMore = false;
      notifyListeners();
    }
  }

  /// Optimistically removes a message from the visible list (used by swipe
  /// actions) ahead of the backend confirming the move/delete. If the backend
  /// call ends up failing, the next silent reload restores it automatically.
  void removeLocally(MailMessage message) {
    messages = messages
        .where((item) =>
            !(item.uid == message.uid && item.folder == message.folder))
        .toList();
    notifyListeners();
  }

  Future<MailMessage> getMessage(MailMessage summary) async {
    final detail = await api.message(summary.folder, summary.uid);
    if (!summary.isRead) {
      await api.setRead(summary.folder, summary.uid, true);
      unawaited(loadMessages(silent: true));
    }
    return detail;
  }

  Future<void> toggleStar(MailMessage message) async {
    await _guard(() async {
      await api.setStar(message.folder, message.uid, !message.isStarred);
      await loadMessages(silent: true);
    }, showBusy: false);
  }

  Future<void> move(MailMessage message, String destination) async {
    await _guard(() async {
      await api.move(message.folder, message.uid, destination);
      await loadMessages(silent: true);
    }, showBusy: false);
  }

  Future<void> deleteMessage(MailMessage message) async {
    await _guard(() async {
      await api.deleteMessage(message.folder, message.uid);
      await loadMessages(silent: true);
    }, showBusy: false);
  }

  Future<void> snoozeMessage(MailMessage message, DateTime wakeAt) async {
    await _guard(() async {
      await api.snoozeMessage(message.folder, message.uid, wakeAt);
      removeLocally(message);
    }, showBusy: false);
  }

  /// Bulk actions used by inbox multi-select. Each removes the affected
  /// messages from the visible list immediately, fires the backend calls in
  /// parallel (best-effort — a failed item simply reappears on the next
  /// silent reload), then resyncs with the server.
  Future<void> bulkDelete(List<MailMessage> selected) async {
    for (final message in selected) {
      removeLocally(message);
    }
    await Future.wait(selected
        .map((message) => api.deleteMessage(message.folder, message.uid))
        .map((future) => future.catchError((_) {})));
    unawaited(loadMessages(silent: true));
  }

  Future<void> bulkMove(List<MailMessage> selected, String destination) async {
    for (final message in selected) {
      removeLocally(message);
    }
    await Future.wait(selected
        .map((message) => api.move(message.folder, message.uid, destination))
        .map((future) => future.catchError((_) {})));
    unawaited(loadMessages(silent: true));
  }

  Future<void> bulkSetRead(List<MailMessage> selected, bool value) async {
    await Future.wait(selected
        .map((message) => api.setRead(message.folder, message.uid, value))
        .map((future) => future.catchError((_) {})));
    await loadMessages(silent: true);
  }

  Future<void> send({
    required List<String> to,
    List<String> cc = const [],
    List<String> bcc = const [],
    required String subject,
    required String body,
    String? htmlBody,
    String? replyToMessageId,
    List<Map<String, dynamic>> attachments = const [],
  }) async {
    await _guard(() async {
      await api.send(
        to: to,
        cc: cc,
        bcc: bcc,
        subject: subject,
        textBody: body,
        htmlBody: htmlBody,
        replyToMessageId: replyToMessageId,
        attachments: attachments,
      );
    });
  }

  Future<void> updateProfile(
    String name,
    int cacheDays, {
    String? signature,
  }) async {
    await _guard(() async {
      account = await api.updateProfile(name, cacheDays, signature: signature);
    });
  }

  Future<void> updateAvatar(String path) async {
    await _guard(() async {
      account = await api.uploadAvatar(path);
    });
  }

  Future<void> changePassword(
      String currentPassword, String newPassword) async {
    await _guard(() => api.changePassword(currentPassword, newPassword));
  }

  Future<void> logout() async {
    await removeAccount(account?.address ?? '');
  }

  Future<void> _guard(
    Future<void> Function() operation, {
    bool showBusy = true,
  }) async {
    if (showBusy) busy = true;
    error = null;
    notifyListeners();
    try {
      await operation();
    } on ApiException catch (exception) {
      error = exception.message;
      rethrow;
    } catch (_) {
      error = 'Something went wrong. Please try again.';
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    push.stop();
    super.dispose();
  }
}
