import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_state.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController _name;
  late int _cacheDays;

  @override
  void initState() {
    super.initState();
    final account = context.read<AppState>().account!;
    _name = TextEditingController(text: account.displayName);
    _cacheDays = account.cacheTtlDays;
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final file = await ImagePicker().pickImage(
        source: ImageSource.gallery, imageQuality: 88, maxWidth: 1200);
    if (file == null || !mounted) return;
    try {
      await context.read<AppState>().updateAvatar(file.path);
    } catch (_) {}
  }

  Future<void> _save() async {
    try {
      await context.read<AppState>().updateProfile(_name.text, _cacheDays);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Profile saved')));
      }
    } catch (_) {}
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
                CircleAvatar(
                  radius: 48,
                  backgroundImage: account.avatarUrl == null
                      ? null
                      : NetworkImage(account.avatarUrl!),
                  child: account.avatarUrl == null
                      ? Text(
                          (account.displayName.isEmpty
                                  ? account.address
                                  : account.displayName)[0]
                              .toUpperCase(),
                          style: const TextStyle(fontSize: 30))
                      : null,
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: IconButton.filledTonal(
                      onPressed: _pickAvatar,
                      icon: const Icon(Icons.camera_alt_outlined, size: 19)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(account.address,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.blueGrey)),
          const SizedBox(height: 28),
          TextField(
              controller: _name,
              decoration: const InputDecoration(
                  labelText: 'Sender name',
                  prefixIcon: Icon(Icons.badge_outlined))),
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
          const SizedBox(height: 18),
          FilledButton(
              onPressed: state.busy ? null : _save,
              child: const Text('Save changes')),
          const SizedBox(height: 26),
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
            subtitle: 'Revokes active Novarise Mail sessions',
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
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              if (next.text.length < 8) return;
              try {
                await context
                    .read<AppState>()
                    .changePassword(current.text, next.text);
                if (context.mounted) Navigator.pop(context);
              } catch (_) {}
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

  Future<void> _add() async {
    final first = TextEditingController();
    final second = TextEditingController();
    final created = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
            'Add ${widget.resource == 'aliases' ? 'alias' : widget.resource == 'forwarders' ? 'forwarder' : 'automatic reply'}'),
        content: Column(
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
            ],
          ],
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
                                  ''
                        },
            ),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    first.dispose();
    second.dispose();
    if (created == null || !mounted) return;
    try {
      await context
          .read<AppState>()
          .api
          .managementCreate(widget.resource, created);
      setState(_reload);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: Text(widget.resource[0].toUpperCase() +
                widget.resource.substring(1))),
        floatingActionButton:
            FloatingActionButton(onPressed: _add, child: const Icon(Icons.add)),
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
                    subtitle: Text((row['status'] ?? 'Active').toString()));
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
                color: Colors.blueGrey, fontWeight: FontWeight.w700)),
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
