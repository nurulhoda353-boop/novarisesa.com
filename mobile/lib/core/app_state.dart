import 'dart:async';

import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'models.dart';

class AppState extends ChangeNotifier {
  AppState(this.api);

  final ApiClient api;
  MailAccount? account;
  List<MailFolder> folders = const [];
  List<MailMessage> messages = const [];
  String currentFolder = 'INBOX';
  bool booting = true;
  bool busy = false;
  String? error;
  Timer? _refreshTimer;

  bool get authenticated => account != null;

  Future<void> bootstrap() async {
    try {
      if (await api.restoreSession() && await api.refresh()) {
        account = await api.account();
        await _loadMailbox();
      }
    } catch (_) {
      await api.clearSession();
    } finally {
      booting = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    await _guard(() async {
      final session = await api.login(email, password);
      account = session.account;
      await _loadMailbox();
    });
  }

  Future<void> _loadMailbox() async {
    folders = await api.folders();
    await loadMessages();
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(
      const Duration(minutes: 2),
      (_) => loadMessages(silent: true),
    );
  }

  Future<void> selectFolder(String folder) async {
    currentFolder = folder;
    notifyListeners();
    await loadMessages();
  }

  Future<void> loadMessages({String? query, bool silent = false}) async {
    if (!silent) {
      busy = true;
      error = null;
      notifyListeners();
    }
    try {
      messages = await api.messages(currentFolder, query: query);
    } on ApiException catch (exception) {
      error = exception.message;
    } catch (_) {
      error = 'Unable to connect. Check your internet connection.';
    } finally {
      busy = false;
      notifyListeners();
    }
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

  Future<void> send({
    required List<String> to,
    required String subject,
    required String body,
    String? replyToMessageId,
    List<Map<String, dynamic>> attachments = const [],
  }) async {
    await _guard(() async {
      await api.send(
        to: to,
        subject: subject,
        textBody: body,
        replyToMessageId: replyToMessageId,
        attachments: attachments,
      );
    });
  }

  Future<void> updateProfile(String name, int cacheDays) async {
    await _guard(() async {
      account = await api.updateProfile(name, cacheDays);
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
    _refreshTimer?.cancel();
    await api.logout();
    account = null;
    messages = const [];
    folders = const [];
    notifyListeners();
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
    super.dispose();
  }
}
