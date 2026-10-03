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

  Future<T> _request<T>(String method, String path, {Object? data}) async {
    try {
      final response = await _dio.request<T>(
        path,
        data: data,
        options: Options(method: method),
      );
      return response.data as T;
    } on DioException catch (e) {
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
