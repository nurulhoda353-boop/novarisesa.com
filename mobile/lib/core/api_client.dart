import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'models.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.novarisesa.com/api/v1',
  );
  static const _storage = FlutterSecureStorage();
  final http.Client _client;
  String? _accessToken;
  String? _refreshToken;

  Future<bool> restoreSession() async {
    _accessToken = await _storage.read(key: 'mail_access_token');
    _refreshToken = await _storage.read(key: 'mail_refresh_token');
    return _refreshToken != null;
  }

  Future<void> _storeSession(MobileSession session) async {
    _accessToken = session.accessToken;
    _refreshToken = session.refreshToken;
    await Future.wait([
      _storage.write(key: 'mail_access_token', value: session.accessToken),
      _storage.write(key: 'mail_refresh_token', value: session.refreshToken),
    ]);
  }

  Future<void> clearSession() async {
    _accessToken = null;
    _refreshToken = null;
    await Future.wait([
      _storage.delete(key: 'mail_access_token'),
      _storage.delete(key: 'mail_refresh_token'),
    ]);
  }

  Future<MobileSession> login(String email, String password) async {
    final installationId = await _installationId();
    final response = await _client.post(
      Uri.parse('$baseUrl/mail/auth/login'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email.trim().toLowerCase(),
        'password': password,
        'credential_type': 'mailbox_password',
        'platform': Platform.isIOS ? 'ios' : 'android',
        'installation_id': installationId,
      }),
    );
    final data = _decode(response);
    final session = MobileSession.fromJson(data as Map<String, dynamic>);
    await _storeSession(session);
    return session;
  }

  Future<bool> refresh() async {
    if (_refreshToken == null) return false;
    final response = await _client.post(
      Uri.parse('$baseUrl/mail/auth/refresh'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': _refreshToken}),
    );
    if (response.statusCode != 200) {
      await clearSession();
      return false;
    }
    await _storeSession(
      MobileSession.fromJson(jsonDecode(response.body) as Map<String, dynamic>),
    );
    return true;
  }

  Future<http.Response> _request(
    String method,
    String path, {
    Map<String, dynamic>? query,
    Object? body,
    bool retry = true,
  }) async {
    final uri = Uri.parse('$baseUrl$path').replace(
      queryParameters: query?.map((key, value) => MapEntry(key, '$value')),
    );
    final headers = <String, String>{'Accept': 'application/json'};
    if (_accessToken != null) headers['Authorization'] = 'Bearer $_accessToken';
    if (body != null) headers['Content-Type'] = 'application/json';
    late http.Response response;
    switch (method) {
      case 'GET':
        response = await _client.get(uri, headers: headers);
        break;
      case 'POST':
        response =
            await _client.post(uri, headers: headers, body: jsonEncode(body));
        break;
      case 'PUT':
        response =
            await _client.put(uri, headers: headers, body: jsonEncode(body));
        break;
      case 'PATCH':
        response =
            await _client.patch(uri, headers: headers, body: jsonEncode(body));
        break;
      case 'DELETE':
        response = await _client.delete(uri, headers: headers);
        break;
      default:
        throw ArgumentError('Unsupported HTTP method: $method');
    }
    if (response.statusCode == 401 && retry && await refresh()) {
      return _request(method, path, query: query, body: body, retry: false);
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      _decode(response);
    }
    return response;
  }

  dynamic _decode(http.Response response) {
    final dynamic decoded =
        response.body.isEmpty ? null : jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final detail = decoded is Map<String, dynamic> ? decoded['detail'] : null;
      throw ApiException(detail?.toString() ?? 'Request failed',
          statusCode: response.statusCode);
    }
    return decoded;
  }

  Future<MailAccount> account() async => MailAccount.fromJson(
        _decode(await _request('GET', '/mail/account')) as Map<String, dynamic>,
      );

  Future<List<MailFolder>> folders() async {
    final rows =
        _decode(await _request('GET', '/mail/folders')) as List<dynamic>;
    return rows
        .map((row) => MailFolder.fromJson(row as Map<String, dynamic>))
        .toList();
  }

  Future<List<MailMessage>> messages(String folder, {String? query}) async {
    final response = await _request(
      'GET',
      '/mail/messages',
      query: {'folder': folder, if (query?.isNotEmpty ?? false) 'q': query},
    );
    final body = _decode(response) as Map<String, dynamic>;
    return (body['data'] as List<dynamic>)
        .map((row) => MailMessage.fromJson(row as Map<String, dynamic>))
        .toList();
  }

  Future<MailMessage> message(String folder, int uid) async =>
      MailMessage.fromJson(
        _decode(await _request('GET', '/mail/messages/$uid',
            query: {'folder': folder})) as Map<String, dynamic>,
      );

  Future<List<int>> downloadAttachment(
      String folder, int uid, String partNumber) async {
    final response = await _request(
      'GET',
      '/mail/messages/$uid/attachments/$partNumber',
      query: {'folder': folder},
    );
    return response.bodyBytes;
  }

  Future<void> setRead(String folder, int uid, bool value) => _request(
        'PUT',
        '/mail/messages/$uid/read',
        query: {'folder': folder},
        body: {'value': value},
      );

  Future<void> setStar(String folder, int uid, bool value) => _request(
        'PUT',
        '/mail/messages/$uid/star',
        query: {'folder': folder},
        body: {'value': value},
      );

  Future<void> move(String folder, int uid, String destination) => _request(
        'POST',
        '/mail/messages/$uid/move',
        query: {'folder': folder},
        body: {'destination': destination},
      );

  Future<void> deleteMessage(String folder, int uid) => _request(
        'DELETE',
        '/mail/messages/$uid',
        query: {'folder': folder},
      );

  Future<void> send({
    required List<String> to,
    required String subject,
    required String textBody,
    List<String> cc = const [],
    List<String> bcc = const [],
    String? replyToMessageId,
    List<Map<String, dynamic>> attachments = const [],
  }) async {
    await _request('POST', '/mail/messages/send', body: {
      'to': to,
      'cc': cc,
      'bcc': bcc,
      'subject': subject,
      'text_body': textBody,
      'reply_to_message_id': replyToMessageId,
      'attachments': attachments,
    });
  }

  Future<MailAccount> updateProfile(String displayName, int cacheDays) async =>
      MailAccount.fromJson(
        _decode(await _request('PATCH', '/mail/account', body: {
          'display_name': displayName,
          'cache_ttl_days': cacheDays,
        })) as Map<String, dynamic>,
      );

  Future<MailAccount> uploadAvatar(String filePath) async {
    final request = http.MultipartRequest(
        'POST', Uri.parse('$baseUrl/mail/account/avatar'));
    request.headers['Authorization'] = 'Bearer $_accessToken';
    request.files.add(await http.MultipartFile.fromPath('avatar', filePath));
    var response = await http.Response.fromStream(await request.send());
    if (response.statusCode == 401 && await refresh()) {
      final retry = http.MultipartRequest(
          'POST', Uri.parse('$baseUrl/mail/account/avatar'));
      retry.headers['Authorization'] = 'Bearer $_accessToken';
      retry.files.add(await http.MultipartFile.fromPath('avatar', filePath));
      response = await http.Response.fromStream(await retry.send());
    }
    return MailAccount.fromJson(_decode(response) as Map<String, dynamic>);
  }

  Future<void> changePassword(String currentPassword, String newPassword) =>
      _request(
        'POST',
        '/mail/account/password',
        body: {
          'current_password': currentPassword,
          'new_password': newPassword
        },
      );

  Future<List<Map<String, dynamic>>> managementList(String resource) async =>
      List<Map<String, dynamic>>.from(
        _decode(await _request('GET', '/mail/management/$resource'))
            as List<dynamic>,
      );

  Future<Map<String, dynamic>> managementCreate(
          String resource, Map<String, dynamic> body) async =>
      Map<String, dynamic>.from(
        _decode(await _request('POST', '/mail/management/$resource',
            body: body)) as Map<String, dynamic>,
      );

  Future<void> logout() async {
    try {
      await _request('POST', '/mail/auth/logout');
    } finally {
      await clearSession();
    }
  }

  Future<List<MailContact>> contacts() async {
    final rows =
        _decode(await _request('GET', '/mail/contacts')) as List<dynamic>;
    return rows
        .map((row) => MailContact.fromJson(row as Map<String, dynamic>))
        .toList();
  }

  Future<MailContact> createContact(String email, String displayName) async =>
      MailContact.fromJson(
        _decode(await _request('POST', '/mail/contacts', body: {
          'email': email,
          'display_name': displayName,
          'is_favorite': false,
        })) as Map<String, dynamic>,
      );

  Future<void> deleteContact(String id) =>
      _request('DELETE', '/mail/contacts/$id');

  Future<List<MailDraft>> drafts() async {
    final rows =
        _decode(await _request('GET', '/mail/drafts')) as List<dynamic>;
    return rows
        .map((row) => MailDraft.fromJson(row as Map<String, dynamic>))
        .toList();
  }

  Future<MailDraft> saveDraft({
    String? id,
    required List<String> to,
    required String subject,
    required String body,
  }) async {
    final response = await _request(
      id == null ? 'POST' : 'PUT',
      id == null ? '/mail/drafts' : '/mail/drafts/$id',
      body: {'to': to, 'subject': subject, 'text_body': body},
    );
    return MailDraft.fromJson(_decode(response) as Map<String, dynamic>);
  }

  Future<void> deleteDraft(String id) => _request('DELETE', '/mail/drafts/$id');

  Future<String> _installationId() async {
    final existing = await _storage.read(key: 'mail_installation_id');
    if (existing != null) return existing;
    final value =
        '${Platform.operatingSystem}-${DateTime.now().microsecondsSinceEpoch}';
    await _storage.write(key: 'mail_installation_id', value: value);
    return value;
  }
}
