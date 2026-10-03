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

  AuthStatus status = AuthStatus.signedOut;
  NfUser? user;
  String? lastError;
  bool isBusy = false;

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

  Future<void> logout() async {
    await _api.logout();
    user = null;
    status = AuthStatus.signedOut;
    notifyListeners();
  }
}
