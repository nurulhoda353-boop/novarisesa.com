import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/cms_users_repository.dart';
import '../../core/theme.dart';
import '../../widgets/generic_list_screen.dart' show StatusChip;
import '../../widgets/nf_widgets.dart';

class UserRolesScreen extends StatefulWidget {
  const UserRolesScreen({super.key});

  @override
  State<UserRolesScreen> createState() => _UserRolesScreenState();
}

class _UsersData {
  _UsersData({required this.users, required this.summary, required this.roles});
  final List<Map<String, dynamic>> users;
  final Map<String, dynamic> summary;
  final List<Map<String, dynamic>> roles;
}

class _UserRolesScreenState extends State<UserRolesScreen> {
  late Future<_UsersData> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _future = _load();

  Future<_UsersData> _load() async {
    final repo = context.read<CmsUsersRepository>();
    final usersResp = await repo.listUsers();
    final roles = await repo.listRoles();
    return _UsersData(
      users: (usersResp['items'] as List).cast<Map<String, dynamic>>(),
      summary: (usersResp['summary'] as Map).cast<String, dynamic>(),
      roles: roles,
    );
  }

  Future<void> _refresh() async {
    setState(_reload);
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: NfPageTitle('User Roles'),
            ),
            ElevatedButton.icon(
              onPressed: () => _openCreateDialog(context),
              icon: const Icon(Icons.person_add_alt, size: 18),
              label: const Text('New User'),
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          'Everyone who can sign in to NovaFin uses the same login as the main site dashboard — manage them here.',
          style: TextStyle(color: NfColors.muted, fontSize: 12.5),
        ),
        const SizedBox(height: 18),
        Expanded(
          child: FutureBuilder<_UsersData>(
            future: _future,
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                if (snapshot.hasError) return Text('${snapshot.error}');
                return const Center(child: CircularProgressIndicator());
              }
              final data = snapshot.data!;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(spacing: 24, runSpacing: 8, children: [
                    _summaryText('Total', data.summary['total']),
                    _summaryText('Active', data.summary['active']),
                    _summaryText('Suspended', data.summary['suspended']),
                    _summaryText('Super Admins', data.summary['super_admins']),
                  ]),
                  const SizedBox(height: 14),
                  Expanded(
                    child: NfPanel(
                      eyebrow: 'Access',
                      title: 'Team Members',
                      padded: false,
                      scrollableContent: true,
                      child: data.users.isEmpty
                          ? const NfEmptyState(message: 'No users yet.')
                          : SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: DataTable(
                                columns: const [
                                  DataColumn(label: Text('Name')),
                                  DataColumn(label: Text('Email')),
                                  DataColumn(label: Text('Role')),
                                  DataColumn(label: Text('Status')),
                                  DataColumn(label: Text('Sessions'), numeric: true),
                                  DataColumn(label: Text('Last Login')),
                                  DataColumn(label: Text('')),
                                ],
                                rows: [
                                  for (final u in data.users)
                                    DataRow(cells: [
                                      DataCell(Text(u['full_name']?.toString() ?? '—')),
                                      DataCell(Text(u['email'].toString())),
                                      DataCell(Text(u['role_label']?.toString() ?? '—')),
                                      DataCell(_statusChip(u['status'].toString())),
                                      DataCell(Text('${u['active_sessions'] ?? 0}')),
                                      DataCell(Text(_fmtDate(u['last_login_at']))),
                                      DataCell(_rowActions(context, u, data.roles)),
                                    ]),
                                ],
                              ),
                            ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _summaryText(String label, dynamic value) {
    return Text('$label: ${value ?? 0}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13));
  }

  Widget _statusChip(String status) {
    switch (status) {
      case 'active':
        return const StatusChip(label: 'Active', color: NfColors.success);
      case 'suspended':
        return const StatusChip(label: 'Suspended', color: NfColors.danger);
      case 'password_change_required':
        return const StatusChip(label: 'Password Reset Needed', color: NfColors.warning);
      case 'deleted':
        return const StatusChip(label: 'Deleted', color: NfColors.muted);
      default:
        return StatusChip(label: status, color: NfColors.muted);
    }
  }

  String _fmtDate(dynamic v) {
    if (v == null) return 'Never';
    final d = DateTime.tryParse(v.toString());
    if (d == null) return '—';
    return DateFormat('dd/MM/yyyy HH:mm').format(d.toLocal());
  }

  Widget _rowActions(BuildContext context, Map<String, dynamic> u, List<Map<String, dynamic>> roles) {
    final isDeleted = u['status'] == 'deleted';
    if (isDeleted) {
      return TextButton(
        onPressed: () async {
          await context.read<CmsUsersRepository>().restoreUser(u['id'] as String);
          await _refresh();
        },
        child: const Text('Restore'),
      );
    }
    return Row(mainAxisSize: MainAxisSize.min, children: [
      IconButton(
        tooltip: 'Edit',
        icon: const Icon(Icons.edit_outlined, size: 18),
        onPressed: () => _openEditDialog(context, u, roles),
      ),
      IconButton(
        tooltip: 'Reset Password',
        icon: const Icon(Icons.lock_reset, size: 18),
        onPressed: () => _openResetPasswordDialog(context, u),
      ),
      IconButton(
        tooltip: 'Sign Out Everywhere',
        icon: const Icon(Icons.logout, size: 18),
        onPressed: () => _openRevokeSessionsDialog(context, u),
      ),
      IconButton(
        tooltip: 'Delete',
        icon: const Icon(Icons.delete_outline, size: 18, color: NfColors.danger),
        onPressed: () => _confirmDelete(context, u),
      ),
    ]);
  }

  Future<void> _openCreateDialog(BuildContext context) async {
    final repo = context.read<CmsUsersRepository>();
    final data = await _future;
    final roles = data.roles;
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final passwordCtrl = TextEditingController();
    String role = roles.isNotEmpty ? roles.last['name'] as String : 'editor';
    bool isActive = true;
    String? error;

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        return AlertDialog(
          title: const Text('New User'),
          content: SizedBox(
            width: 440,
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextFormField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(labelText: 'Full Name'),
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: emailCtrl,
                      decoration: const InputDecoration(labelText: 'Email'),
                      keyboardType: TextInputType.emailAddress,
                      validator: (v) => (v == null || !v.contains('@')) ? 'Valid email required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: passwordCtrl,
                      decoration: const InputDecoration(labelText: 'Temporary Password (min 12 characters)'),
                      obscureText: true,
                      validator: (v) => (v == null || v.length < 12) ? 'At least 12 characters' : null,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: role,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Role'),
                      items: [for (final r in roles) DropdownMenuItem(value: r['name'] as String, child: Text(r['label'].toString()))],
                      onChanged: (v) => setDialogState(() => role = v ?? role),
                    ),
                    const SizedBox(height: 12),
                    CheckboxListTile(
                      value: isActive,
                      title: const Text('Active immediately'),
                      contentPadding: EdgeInsets.zero,
                      onChanged: (v) => setDialogState(() => isActive = v ?? true),
                    ),
                    if (error != null) ...[
                      const SizedBox(height: 8),
                      Text(error!, style: const TextStyle(color: NfColors.danger, fontSize: 12.5)),
                    ],
                  ],
                ),
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                try {
                  await repo.createUser({
                    'full_name': nameCtrl.text.trim(),
                    'email': emailCtrl.text.trim(),
                    'password': passwordCtrl.text,
                    'role': role,
                    'is_active': isActive,
                  });
                  if (dialogContext.mounted) Navigator.pop(dialogContext);
                  await _refresh();
                } on ApiException catch (e) {
                  setDialogState(() => error = e.message);
                }
              },
              child: const Text('Create User'),
            ),
          ],
        );
      }),
    );
  }

  Future<void> _openEditDialog(BuildContext context, Map<String, dynamic> u, List<Map<String, dynamic>> roles) async {
    final repo = context.read<CmsUsersRepository>();
    final nameCtrl = TextEditingController(text: u['full_name']?.toString() ?? '');
    final userRoles = (u['roles'] as List).cast<String>();
    String role = userRoles.isNotEmpty ? userRoles.first : 'editor';
    bool isActive = u['is_active'] == true;
    String? error;

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        return AlertDialog(
          title: Text('Edit ${u['full_name']}'),
          content: SizedBox(
            width: 420,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Full Name')),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: role,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Role'),
                  items: [for (final r in roles) DropdownMenuItem(value: r['name'] as String, child: Text(r['label'].toString()))],
                  onChanged: (v) => setDialogState(() => role = v ?? role),
                ),
                const SizedBox(height: 12),
                CheckboxListTile(
                  value: isActive,
                  title: const Text('Active'),
                  contentPadding: EdgeInsets.zero,
                  onChanged: (v) => setDialogState(() => isActive = v ?? true),
                ),
                if (error != null) ...[
                  const SizedBox(height: 8),
                  Text(error!, style: const TextStyle(color: NfColors.danger, fontSize: 12.5)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                try {
                  await repo.updateUser(u['id'] as String, {
                    'full_name': nameCtrl.text.trim(),
                    'role': role,
                    'is_active': isActive,
                  });
                  if (dialogContext.mounted) Navigator.pop(dialogContext);
                  await _refresh();
                } on ApiException catch (e) {
                  setDialogState(() => error = e.message);
                }
              },
              child: const Text('Save'),
            ),
          ],
        );
      }),
    );
  }

  Future<void> _openResetPasswordDialog(BuildContext context, Map<String, dynamic> u) async {
    final repo = context.read<CmsUsersRepository>();
    final currentPasswordCtrl = TextEditingController();
    final newPasswordCtrl = TextEditingController();
    bool requireChange = true;
    String? error;

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        return AlertDialog(
          title: Text('Reset Password — ${u['full_name']}'),
          content: SizedBox(
            width: 420,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: newPasswordCtrl,
                  decoration: const InputDecoration(labelText: 'New Password (min 12 characters)'),
                  obscureText: true,
                ),
                const SizedBox(height: 12),
                CheckboxListTile(
                  value: requireChange,
                  title: const Text('Ask them to change it on next login'),
                  contentPadding: EdgeInsets.zero,
                  onChanged: (v) => setDialogState(() => requireChange = v ?? true),
                ),
                const Divider(height: 24),
                TextFormField(
                  controller: currentPasswordCtrl,
                  decoration: const InputDecoration(labelText: 'Your Password (to confirm this action)'),
                  obscureText: true,
                ),
                if (error != null) ...[
                  const SizedBox(height: 8),
                  Text(error!, style: const TextStyle(color: NfColors.danger, fontSize: 12.5)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (newPasswordCtrl.text.length < 12 || currentPasswordCtrl.text.isEmpty) {
                  setDialogState(() => error = 'Fill in both fields (new password needs 12+ characters).');
                  return;
                }
                try {
                  await repo.resetPassword(u['id'] as String, {
                    'current_password': currentPasswordCtrl.text,
                    'new_password': newPasswordCtrl.text,
                    'require_password_change': requireChange,
                  });
                  if (dialogContext.mounted) Navigator.pop(dialogContext);
                  await _refresh();
                } on ApiException catch (e) {
                  setDialogState(() => error = e.message);
                }
              },
              child: const Text('Reset Password'),
            ),
          ],
        );
      }),
    );
  }

  Future<void> _openRevokeSessionsDialog(BuildContext context, Map<String, dynamic> u) async {
    final repo = context.read<CmsUsersRepository>();
    final currentPasswordCtrl = TextEditingController();
    String? error;

    if (!context.mounted) return;
    await showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) {
        return AlertDialog(
          title: Text('Sign ${u['full_name']} out everywhere?'),
          content: SizedBox(
            width: 380,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: currentPasswordCtrl,
                  decoration: const InputDecoration(labelText: 'Your Password (to confirm this action)'),
                  obscureText: true,
                ),
                if (error != null) ...[
                  const SizedBox(height: 8),
                  Text(error!, style: const TextStyle(color: NfColors.danger, fontSize: 12.5)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (currentPasswordCtrl.text.isEmpty) {
                  setDialogState(() => error = 'Enter your password to confirm.');
                  return;
                }
                try {
                  await repo.revokeSessions(u['id'] as String, {'current_password': currentPasswordCtrl.text});
                  if (dialogContext.mounted) Navigator.pop(dialogContext);
                  await _refresh();
                } on ApiException catch (e) {
                  setDialogState(() => error = e.message);
                }
              },
              child: const Text('Sign Out'),
            ),
          ],
        );
      }),
    );
  }

  Future<void> _confirmDelete(BuildContext context, Map<String, dynamic> u) async {
    final repo = context.read<CmsUsersRepository>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Delete ${u['full_name']}?'),
        content: const Text('They will immediately lose access. This can be undone later from the deleted list.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await repo.deleteUser(u['id'] as String);
      await _refresh();
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}
