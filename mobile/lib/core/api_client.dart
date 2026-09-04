import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import 'models.dart';

typedef MessagePage = ({List<MailMessage> data, int? nextBeforeUid});

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
    await _rememberAccount(session.account.address, session.refreshToken);
    return session;
  }

  // --- Multi-account switching -------------------------------------------
  //
  // Each successful login/refresh remembers its (address -> refresh_token)
  // pair, so the user can hold several mailboxes on one device and switch
  // between them without re-entering a password each time. Only one
  // account's tokens are ever "current" (used by `_request`); the rest sit
  // idle in secure storage until switched to.
  static const _savedAccountsKey = 'mail_saved_accounts';

  Future<List<Map<String, dynamic>>> _savedAccountsRaw() async {
    final raw = await _storage.read(key: _savedAccountsKey);
    if (raw == null) return [];
    return List<Map<String, dynamic>>.from(jsonDecode(raw) as List<dynamic>);
  }

  Future<void> _rememberAccount(String address, String refreshToken) async {
    final list = await _savedAccountsRaw();
    list.removeWhere((item) => item['address'] == address);
    list.add({'address': address, 'refresh_token': refreshToken});
    await _storage.write(key: _savedAccountsKey, value: jsonEncode(list));
  }

  Future<List<String>> savedAccountAddresses() async =>
      (await _savedAccountsRaw())
          .map((item) => item['address'] as String)
          .toList();

  Future<void> forgetAccount(String address) async {
    final list = await _savedAccountsRaw();
    list.removeWhere((item) => item['address'] == address);
    await _storage.write(key: _savedAccountsKey, value: jsonEncode(list));
  }

  /// Switches the active session to a previously saved account, refreshing
  /// its access token. Returns false if the account isn't saved or its
  /// refresh token has since expired (caller should drop it and prompt for
  /// a fresh login in that case).
  Future<bool> switchAccount(String address) async {
    final list = await _savedAccountsRaw();
    final match = list.where((item) => item['address'] == address);
    if (match.isEmpty) return false;
    _refreshToken = match.first['refresh_token'] as String;
    _accessToken = null;
    final ok = await refresh();
    if (!ok) await forgetAccount(address);
    return ok;
  }

  /// Refresh tokens rotate server-side (using one invalidates it and issues a
  /// new one), so two concurrent 401s must never fire two /auth/refresh
  /// calls: the loser would submit an already-rotated-out token, fail, and
  /// wipe out the winner's freshly-stored valid session. Callers share one
  /// in-flight refresh instead of racing.
  Future<bool>? _refreshInFlight;

  Future<bool> refresh() {
    if (_refreshToken == null) return Future.value(false);
    return _refreshInFlight ??= _performRefresh().whenComplete(() {
      _refreshInFlight = null;
    });
  }

  Future<bool> _performRefresh() async {
    final response = await _client.post(
      Uri.parse('$baseUrl/mail/auth/refresh'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': _refreshToken}),
    );
    if (response.statusCode != 200) {
      await clearSession();
      return false;
    }
    final session =
        MobileSession.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
    await _storeSession(session);
    await _rememberAccount(session.account.address, session.refreshToken);
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

  Future<MessagePage> messages(
    String folder, {
    String? query,
    int limit = 30,
    int? beforeUid,
    String? fromContains,
    DateTime? since,
    DateTime? before,
    bool? hasAttachment,
  }) async {
    String isoDate(DateTime value) =>
        '${value.year.toString().padLeft(4, '0')}-'
        '${value.month.toString().padLeft(2, '0')}-'
        '${value.day.toString().padLeft(2, '0')}';
    final response = await _request(
      'GET',
      '/mail/messages',
      query: {
        'folder': folder,
        'limit': limit,
        if (beforeUid != null) 'before_uid': beforeUid,
        if (query?.isNotEmpty ?? false) 'q': query,
        if (fromContains?.isNotEmpty ?? false) 'from_contains': fromContains,
        if (since != null) 'since': isoDate(since),
        if (before != null) 'before': isoDate(before),
        if (hasAttachment != null) 'has_attachment': hasAttachment,
      },
    );
    final body = _decode(response) as Map<String, dynamic>;
    final data = (body['data'] as List<dynamic>)
        .map((row) => MailMessage.fromJson(row as Map<String, dynamic>))
        .toList();
    return (data: data, nextBeforeUid: body['next_before_uid'] as int?);
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
    String? htmlBody,
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
      'html_body': htmlBody,
      'reply_to_message_id': replyToMessageId,
      'attachments': attachments,
    });
  }

  Future<MailAccount> updateProfile(
    String displayName,
    int cacheDays, {
    String? signature,
  }) async =>
      MailAccount.fromJson(
        _decode(await _request('PATCH', '/mail/account', body: {
          'display_name': displayName,
          'cache_ttl_days': cacheDays,
          'signature': signature,
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

  Future<Map<String, dynamic>> managementUpdate(
          String resource, String id, Map<String, dynamic> body) async =>
      Map<String, dynamic>.from(
        _decode(await _request('PUT', '/mail/management/$resource/$id',
            body: body)) as Map<String, dynamic>,
      );

  Future<void> managementDelete(String resource, String id) =>
      _request('DELETE', '/mail/management/$resource/$id');

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

  Future<MailContact> updateContact(
    String id, {
    required String displayName,
    String? phone,
    String? company,
    required bool isFavorite,
  }) async =>
      MailContact.fromJson(
        _decode(await _request('PATCH', '/mail/contacts/$id', body: {
          'display_name': displayName,
          'phone': phone,
          'company': company,
          'is_favorite': isFavorite,
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
    List<String> cc = const [],
    List<String> bcc = const [],
    required String subject,
    required String body,
  }) async {
    final response = await _request(
      id == null ? 'POST' : 'PUT',
      id == null ? '/mail/drafts' : '/mail/drafts/$id',
      body: {
        'to': to,
        'cc': cc,
        'bcc': bcc,
        'subject': subject,
        'text_body': body,
      },
    );
    return MailDraft.fromJson(_decode(response) as Map<String, dynamic>);
  }

  Future<void> deleteDraft(String id) => _request('DELETE', '/mail/drafts/$id');

  /// Opens the self-hosted push channel (IMAP IDLE events over WebSocket,
  /// replacing Firebase Cloud Messaging) for the current session.
  WebSocketChannel? connectEvents() {
    if (_accessToken == null) return null;
    final httpUri = Uri.parse('$baseUrl/mail/ws');
    final wsUri = httpUri.replace(
        scheme: httpUri.scheme == 'https' ? 'wss' : 'ws');
    return IOWebSocketChannel.connect(
      wsUri,
      headers: {'Authorization': 'Bearer $_accessToken'},
      pingInterval: const Duration(seconds: 30),
    );
  }

  Future<String> _installationId() async {
    final existing = await _storage.read(key: 'mail_installation_id');
    if (existing != null) return existing;
    final value =
        '${Platform.operatingSystem}-${DateTime.now().microsecondsSinceEpoch}';
    await _storage.write(key: 'mail_installation_id', value: value);
    return value;
  }
}
