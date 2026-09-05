import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_state.dart';
import '../../core/theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController _name;
  late final TextEditingController _signature;
  late int _cacheDays;

  @override
  void initState() {
    super.initState();
    final account = context.read<AppState>().account!;
    _name = TextEditingController(text: account.displayName);
    _signature = TextEditingController(text: account.signature ?? '');
    _cacheDays = account.cacheTtlDays;
  }

  @override
  void dispose() {
    _name.dispose();
    _signature.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final file = await ImagePicker().pickImage(
        source: ImageSource.gallery, imageQuality: 88, maxWidth: 1200);
    if (file == null || !mounted) return;
    try {
      await context.read<AppState>().updateAvatar(file.path);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not update your photo')));
      }
    }
  }

  Future<void> _save() async {
    try {
      await context.read<AppState>().updateProfile(
            _name.text,
            _cacheDays,
            signature: _signature.text.trim().isEmpty ? null : _signature.text,
          );
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Profile saved')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not save. Please retry.')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final account = state.account!;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile & settings')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Stack(
              children: [
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: AppGradients.brand,
                  ),
                  child: CircleAvatar(
                    radius: 46,
                    backgroundImage: account.avatarUrl == null
                        ? null
                        : NetworkImage(account.avatarUrl!),
                    child: account.avatarUrl == null
                        ? Text(
                            (account.displayName.isEmpty
                                    ? account.address
                                    : account.displayName)[0]
                                .toUpperCase(),
                            style: const TextStyle(
                                fontSize: 30, fontWeight: FontWeight.w700))
                        : null,
                  ),
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: IconButton.filled(
                      onPressed: _pickAvatar,
                      icon: const Icon(Icons.camera_alt_outlined, size: 19)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text(
              account.displayName.isEmpty ? account.address : account.displayName,
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700)),
          Text(account.address,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  TextField(
                      controller: _name,
                      decoration: const InputDecoration(
                          labelText: 'Sender name',
                          prefixIcon: Icon(Icons.badge_outlined))),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _signature,
                    minLines: 2,
                    maxLines: 5,
                    decoration: const InputDecoration(
                        labelText: 'Email signature',
                        hintText: 'Added to the end of new messages',
                        alignLabelWithHint: true,
                        prefixIcon: Icon(Icons.draw_outlined)),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<int>(
                    initialValue: _cacheDays,
                    decoration: const InputDecoration(labelText: 'Email body cache'),
                    items: const [
                      DropdownMenuItem(value: 7, child: Text('7 days')),
                      DropdownMenuItem(value: 14, child: Text('14 days')),
                      DropdownMenuItem(value: 30, child: Text('30 days')),
                      DropdownMenuItem(value: 90, child: Text('90 days')),
                    ],
                    onChanged: (value) => setState(() => _cacheDays = value ?? 30),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                      onPressed: state.busy ? null : _save,
                      child: const Text('Save changes')),
                ],
              ),
            ),
          ),
          const SizedBox(height: 26),
          const _SectionTitle('Appearance'),
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: RadioGroup<ThemeMode>(
              groupValue: state.themeMode,
              onChanged: (mode) => state.setThemeMode(mode!),
              child: const Column(
                children: [
                  RadioListTile<ThemeMode>(
                    title: Text('Match system'),
                    value: ThemeMode.system,
                  ),
                  RadioListTile<ThemeMode>(
                    title: Text('Light'),
                    value: ThemeMode.light,
                  ),
                  RadioListTile<ThemeMode>(
                    title: Text('Dark'),
                    value: ThemeMode.dark,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          const _SectionTitle('Notifications'),
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: SwitchListTile(
              title: const Text('New mail notifications'),
              subtitle: const Text(
                  'Instant while the app is open, periodic checks otherwise'),
              value: state.notificationsEnabled,
              onChanged: state.setNotificationsEnabled,
            ),
          ),
          const SizedBox(height: 18),
          const _SectionTitle('Mailbox management'),
          _SettingsTile(
            icon: Icons.password_outlined,
            title: 'Change mailbox password',
            subtitle: 'Updates the password at Hostinger',
            onTap: () => showDialog(
                context: context,
                builder: (_) => const _ChangePasswordDialog()),
          ),
          _SettingsTile(
            icon: Icons.alternate_email,
            title: 'Email aliases',
            subtitle: 'Create additional sending addresses',
            onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) =>
                        const _ManagementScreen(resource: 'aliases'))),
          ),
          _SettingsTile(
            icon: Icons.forward_to_inbox_outlined,
            title: 'Forwarding',
            subtitle: 'Forward incoming messages',
            onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) =>
                        const _ManagementScreen(resource: 'forwarders'))),
          ),
          _SettingsTile(
            icon: Icons.schedule_send_outlined,
            title: 'Automatic reply',
            subtitle: 'Configure out-of-office messages',
            onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) =>
                        const _ManagementScreen(resource: 'autoreplies'))),
          ),
          const SizedBox(height: 22),
          const _SectionTitle('Security'),
          _SettingsTile(
              icon: Icons.shield_outlined,
              title: 'Encrypted connection',
              subtitle: 'IMAP and SMTP over TLS',
              onTap: () {}),
          _SettingsTile(
            icon: Icons.logout,
            title: 'Sign out from all devices',
            subtitle: 'Revokes active Novamail sessions',
            onTap: () async {
              await state.logout();
              if (context.mounted) {
                Navigator.popUntil(context, (route) => route.isFirst);
              }
            },
          ),
        ],
      ),
    );
  }
}

class _ChangePasswordDialog extends StatefulWidget {
  const _ChangePasswordDialog();
  @override
  State<_ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends State<_ChangePasswordDialog> {
  final current = TextEditingController();
  final next = TextEditingController();
  String? _error;

  @override
  void dispose() {
    current.dispose();
    next.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: const Text('Change mailbox password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
                controller: current,
                obscureText: true,
                decoration:
                    const InputDecoration(labelText: 'Current password')),
            const SizedBox(height: 12),
            TextField(
                controller: next,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'New password')),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              if (next.text.length < 8) {
                setState(() => _error = 'New password must be at least 8 characters');
                return;
              }
              try {
                await context
                    .read<AppState>()
                    .changePassword(current.text, next.text);
                if (context.mounted) Navigator.pop(context);
              } on ApiException catch (error) {
                setState(() => _error = error.message);
              } catch (_) {
                setState(() => _error = 'Could not update the password');
              }
            },
            child: const Text('Update'),
          ),
        ],
      );
}

class _ManagementScreen extends StatefulWidget {
  const _ManagementScreen({required this.resource});
  final String resource;

  @override
  State<_ManagementScreen> createState() => _ManagementScreenState();
}

class _ManagementScreenState extends State<_ManagementScreen> {
  late Future<List<Map<String, dynamic>>> _items;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _items = context.read<AppState>().api.managementList(widget.resource);
  }

  String get _singular => widget.resource == 'aliases'
      ? 'alias'
      : widget.resource == 'forwarders'
          ? 'forwarder'
          : 'automatic reply';

  Future<void> _upsert({Map<String, dynamic>? existing}) async {
    final first = TextEditingController(
      text: widget.resource == 'aliases'
          ? ''
          : widget.resource == 'forwarders'
              ? (existing?['destination']?.toString() ?? '')
              : (existing?['subject']?.toString() ?? ''),
    );
    final second =
        TextEditingController(text: existing?['body']?.toString() ?? '');
    DateTime? startsAt = _parseDate(existing?['starts_at']);
    DateTime? endsAt = _parseDate(existing?['ends_at']);

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(
              '${existing == null ? 'Add' : 'Edit'} $_singular'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: first,
                  decoration: InputDecoration(
                      labelText: widget.resource == 'aliases'
                          ? 'Name before @'
                          : widget.resource == 'forwarders'
                              ? 'Destination email'
                              : 'Subject'),
                ),
                if (widget.resource == 'autoreplies') ...[
                  const SizedBox(height: 12),
                  TextField(
                      controller: second,
                      minLines: 3,
                      maxLines: 5,
                      decoration: const InputDecoration(labelText: 'Message')),
                  const SizedBox(height: 12),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(startsAt == null
                        ? 'Start date (optional)'
                        : 'Starts ${startsAt!.toLocal()}'.split('.').first),
                    trailing: const Icon(Icons.calendar_today_outlined, size: 18),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: startsAt ?? DateTime.now(),
                        firstDate: DateTime.now().subtract(const Duration(days: 1)),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) setDialogState(() => startsAt = picked);
                    },
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(endsAt == null
                        ? 'End date (optional)'
                        : 'Ends ${endsAt!.toLocal()}'.split('.').first),
                    trailing: const Icon(Icons.calendar_today_outlined, size: 18),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: endsAt ?? DateTime.now(),
                        firstDate: DateTime.now().subtract(const Duration(days: 1)),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) setDialogState(() => endsAt = picked);
                    },
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () => Navigator.pop(
                context,
                widget.resource == 'aliases'
                    ? {'local_part': first.text}
                    : widget.resource == 'forwarders'
                        ? {'destination': first.text, 'keep_copy': true}
                        : {
                            'subject': first.text,
                            'body': second.text,
                            'display_name':
                                context.read<AppState>().account?.displayName ??
                                    '',
                            if (startsAt != null)
                              'starts_at': startsAt!.toUtc().toIso8601String(),
                            if (endsAt != null)
                              'ends_at': endsAt!.toUtc().toIso8601String(),
                          },
              ),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    first.dispose();
    second.dispose();
    if (result == null || !mounted) return;
    try {
      final api = context.read<AppState>().api;
      if (existing != null && widget.resource == 'autoreplies') {
        await api.managementUpdate(
            widget.resource, existing['id'].toString(), result);
      } else {
        await api.managementCreate(widget.resource, result);
      }
      setState(_reload);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _delete(Map<String, dynamic> item) async {
    final api = context.read<AppState>().api;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete this $_singular?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await api.managementDelete(widget.resource, item['id'].toString());
      if (mounted) setState(_reload);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  static DateTime? _parseDate(dynamic value) {
    if (value is! String || value.isEmpty) return null;
    return DateTime.tryParse(value);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: Text(widget.resource[0].toUpperCase() +
                widget.resource.substring(1))),
        floatingActionButton: FloatingActionButton(
            onPressed: () => _upsert(), child: const Icon(Icons.add)),
        body: FutureBuilder<List<Map<String, dynamic>>>(
          future: _items,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(
                  child: Text('Could not load settings\n${snapshot.error}',
                      textAlign: TextAlign.center));
            }
            final rows = snapshot.data ?? const [];
            if (rows.isEmpty) {
              return const Center(child: Text('Nothing configured yet'));
            }
            return ListView.separated(
              itemCount: rows.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, index) {
                final row = rows[index];
                final title = row['address'] ??
                    row['destination'] ??
                    row['subject'] ??
                    row['name'] ??
                    'Setting';
                return ListTile(
                    leading: const Icon(Icons.check_circle_outline),
                    title: Text(title.toString()),
                    subtitle: Text((row['status'] ?? 'Active').toString()),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (widget.resource == 'autoreplies')
                          IconButton(
                            icon: const Icon(Icons.edit_outlined),
                            onPressed: () => _upsert(existing: row),
                          ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline),
                          onPressed: () => _delete(row),
                        ),
                      ],
                    ));
              },
            );
          },
        ),
      );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700)),
      );
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile(
      {required this.icon,
      required this.title,
      required this.subtitle,
      required this.onTap});
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
            leading: Icon(icon),
            title: Text(title),
            subtitle: Text(subtitle),
            trailing: const Icon(Icons.chevron_right),
            onTap: onTap),
      );
}
