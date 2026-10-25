import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';

import 'dio_setup_io.dart' if (dart.library.html) 'dio_setup_web.dart' as dio_setup;

/// Defaults to the production API so a plain `flutter build web --release`
/// (no flags) produces a deployable build; local dev overrides with
/// `--dart-define=API_BASE_URL=http://127.0.0.1:8010/api/v1`.
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://api.novarisesa.com/api/v1',
);

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);

  final int? statusCode;
  final String message;

  @override
  String toString() => message;
}

/// Thin wrapper around the same cookie-session FastAPI backend the
/// Next.js dashboard uses, so NovaFin logs in with the exact same
/// admin/owner account and permission system (novafin.view / novafin.manage).
class ApiClient {
  ApiClient() : _dio = Dio(BaseOptions(baseUrl: kApiBaseUrl)) {
    dio_setup.configureDio(_dio);
  }

  final Dio _dio;

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _dio.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException(e.response?.statusCode, _messageFrom(e));
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } on DioException {
      // Best-effort; a stale cookie will just fail the next authenticated call.
    }
  }

  Future<T> get<T>(String path) => _request<T>('GET', path);
  Future<T> post<T>(String path, {Object? data}) => _request<T>('POST', path, data: data);
  Future<T> put<T>(String path, {Object? data}) => _request<T>('PUT', path, data: data);
  Future<T> patch<T>(String path, {Object? data}) => _request<T>('PATCH', path, data: data);
  Future<void> delete(String path) => _request<void>('DELETE', path);

  // Writes carry an Idempotency-Key so the server creates the document once even
  // if the same save arrives twice (double-click, retry). The key is reused for an
  // identical request made within a few seconds, which is exactly a double-submit.
  final Map<String, ({String key, DateTime at})> _recentWrites = {};
  final Random _random = Random.secure();

  String? _idempotencyKeyFor(String method, String path, Object? data) {
    if (method == 'GET') return null;
    final signature = '$method $path ${data == null ? '' : jsonEncode(data)}';
    final now = DateTime.now();
    _recentWrites.removeWhere((_, v) => now.difference(v.at) > const Duration(seconds: 20));
    final existing = _recentWrites[signature];
    if (existing != null) return existing.key;
    final key = List.generate(16, (_) => _random.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
    _recentWrites[signature] = (key: key, at: now);
    return key;
  }

  final Map<String, Future<dynamic>> _inFlightWrites = {};

  /// Called when any call comes back 401 (the session cookie expired mid-use).
  void Function()? onSessionExpired;

  Future<T> _request<T>(String method, String path, {Object? data}) {
    if (method == 'GET') return _send<T>(method, path, data: data);
    final signature = '$method $path ${data == null ? '' : jsonEncode(data)}';
    final running = _inFlightWrites[signature];
    if (running != null) return running.then((value) => value as T);
    final future = _send<T>(method, path, data: data);
    _inFlightWrites[signature] = future;
    return future.whenComplete(() => _inFlightWrites.remove(signature));
  }

  Future<T> _send<T>(String method, String path, {Object? data}) async {
    try {
      final idempotencyKey = _idempotencyKeyFor(method, path, data);
      final response = await _dio.request<T>(
        path,
        data: data,
        options: Options(
          method: method,
          headers: idempotencyKey == null ? null : {'Idempotency-Key': idempotencyKey},
        ),
      );
      return response.data as T;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 && !path.startsWith('/auth/')) onSessionExpired?.call();
      throw ApiException(e.response?.statusCode, _messageFrom(e));
    }
  }

  String _messageFrom(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['detail'] != null) {
      final detail = data['detail'];
      if (detail is String) return detail;
      return detail.toString();
    }
    return e.message ?? 'Network error';
  }
}
