import 'dart:async';

import 'package:flutter/foundation.dart';

import 'api_client.dart';

class NfUser {
  NfUser({required this.email, required this.fullName, required this.permissions});

  factory NfUser.fromJson(Map<String, dynamic> json) => NfUser(
        email: json['email'] as String,
        fullName: json['full_name'] as String? ?? json['email'] as String,
        permissions: (json['permissions'] as List).cast<String>(),
      );

  final String email;
  final String fullName;
  final List<String> permissions;

  bool get canManage => permissions.contains('novafin.manage');
}

enum AuthStatus { unknown, signedOut, signedIn }

class AuthState extends ChangeNotifier {
  AuthState(this._api);

  final ApiClient _api;

  AuthStatus status = AuthStatus.unknown;
  Timer? _keepAlive;
  NfUser? user;
  String? lastError;
  bool isBusy = false;

  /// On page load: if the browser still holds a valid session, go straight back in instead of asking for a password.
  Future<void> restore() async {
    var data = await _api.currentUser();
    if (data == null && await _api.refreshSession()) data = await _api.currentUser();
    if (data != null) {
      final restored = NfUser.fromJson(data);
      if (restored.permissions.contains('novafin.view') || restored.canManage) {
        user = restored;
        status = AuthStatus.signedIn;
        _startKeepAlive();
        notifyListeners();
        return;
      }
    }
    status = AuthStatus.signedOut;
    notifyListeners();
  }

  void _startKeepAlive() {
    _keepAlive?.cancel();
    _keepAlive = Timer.periodic(const Duration(minutes: 10), (_) => _api.refreshSession());
  }

  Future<bool> login(String email, String password) async {
    isBusy = true;
    lastError = null;
    notifyListeners();
    try {
      final data = await _api.login(email, password);
      user = NfUser.fromJson(data['user'] as Map<String, dynamic>);
      if (!user!.permissions.contains('novafin.view') && !user!.canManage) {
        user = null;
        lastError = 'This account does not have NovaFin access yet.';
        status = AuthStatus.signedOut;
        return false;
      }
      status = AuthStatus.signedIn;
      _startKeepAlive();
      return true;
    } on ApiException catch (e) {
      lastError = e.message;
      status = AuthStatus.signedOut;
      return false;
    } finally {
      isBusy = false;
      notifyListeners();
    }
  }

  /// The server stopped recognising the session cookie: go back to the login screen.
  void expireSession() {
    if (status != AuthStatus.signedIn) return;
    _keepAlive?.cancel();
    user = null;
    lastError = 'Your session expired. Please log in again.';
    status = AuthStatus.signedOut;
    notifyListeners();
  }

  Future<void> logout() async {
    _keepAlive?.cancel();
    await _api.logout();
    user = null;
    status = AuthStatus.signedOut;
    notifyListeners();
  }
}
