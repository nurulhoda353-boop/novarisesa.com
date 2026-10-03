import 'api_client.dart';

/// Talks to the existing `/api/v1/cms/users` + `/cms/roles` endpoints — the
/// SAME shared login system the main site's CMS dashboard already uses.
/// NovaFin doesn't get its own separate user/role backend; this just gives
/// the owner a NovaFin-themed way to manage who can sign in, without having
/// to switch over to the CMS dashboard for something this basic.
class CmsUsersRepository {
  CmsUsersRepository(this._api);

  final ApiClient _api;

  Future<Map<String, dynamic>> listUsers() => _api.get<Map<String, dynamic>>('/cms/users');

  Future<List<Map<String, dynamic>>> listRoles() async {
    final data = await _api.get<Map<String, dynamic>>('/cms/roles');
    return (data['items'] as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> createUser(Map<String, dynamic> body) =>
      _api.post<Map<String, dynamic>>('/cms/users', data: body);

  Future<Map<String, dynamic>> updateUser(String id, Map<String, dynamic> body) =>
      _api.patch<Map<String, dynamic>>('/cms/users/$id', data: body);

  Future<Map<String, dynamic>> resetPassword(String id, Map<String, dynamic> body) =>
      _api.post<Map<String, dynamic>>('/cms/users/$id/reset-password', data: body);

  Future<Map<String, dynamic>> revokeSessions(String id, Map<String, dynamic> body) =>
      _api.post<Map<String, dynamic>>('/cms/users/$id/revoke-sessions', data: body);

  Future<void> deleteUser(String id) => _api.delete('/cms/users/$id');

  Future<Map<String, dynamic>> restoreUser(String id) =>
      _api.post<Map<String, dynamic>>('/cms/users/$id/restore');
}
