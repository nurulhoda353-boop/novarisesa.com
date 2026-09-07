import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import 'compose_screen.dart';

class ContactsScreen extends StatefulWidget {
  const ContactsScreen({super.key});
  @override
  State<ContactsScreen> createState() => _ContactsScreenState();
}

class _ContactsScreenState extends State<ContactsScreen> {
  late Future<List<MailContact>> _contacts;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _contacts = context.read<AppState>().api.contacts();

  Future<void> _editContact({MailContact? existing}) async {
    final api = context.read<AppState>().api;
    final name = TextEditingController(text: existing?.displayName ?? '');
    final email = TextEditingController(text: existing?.email ?? '');
    final phone = TextEditingController(text: existing?.phone ?? '');
    final company = TextEditingController(text: existing?.company ?? '');
    var favorite = existing?.isFavorite ?? false;
    final save = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(existing == null ? 'New contact' : 'Edit contact'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                    controller: name,
                    decoration: const InputDecoration(labelText: 'Name')),
                const SizedBox(height: 12),
                TextField(
                    controller: email,
                    enabled: existing == null,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 12),
                TextField(
                    controller: phone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Phone')),
                const SizedBox(height: 12),
                TextField(
                    controller: company,
                    decoration: const InputDecoration(labelText: 'Company')),
                CheckboxListTile(
                  value: favorite,
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Favorite'),
                  onChanged: (value) =>
                      setDialogState(() => favorite = value ?? false),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Save')),
          ],
        ),
      ),
    );
    if (save == true) {
      try {
        if (existing == null) {
          if (!email.text.contains('@')) return;
          await api.createContact(email.text.trim(), name.text.trim());
        } else {
          await api.updateContact(
            existing.id,
            displayName: name.text.trim(),
            phone: phone.text.trim().isEmpty ? null : phone.text.trim(),
            company: company.text.trim().isEmpty ? null : company.text.trim(),
            isFavorite: favorite,
          );
        }
        if (mounted) setState(_reload);
      } catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text('$error')));
        }
      }
    }
    name.dispose();
    email.dispose();
    phone.dispose();
    company.dispose();
  }

  Future<void> _delete(MailContact contact) async {
    final api = context.read<AppState>().api;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete ${contact.displayName.isEmpty ? contact.email : contact.displayName}?'),
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
    await api.deleteContact(contact.id);
    if (mounted) setState(_reload);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Contacts')),
        floatingActionButton: FloatingActionButton(
            onPressed: () => _editContact(),
            child: const Icon(Icons.person_add_alt_1)),
        body: FutureBuilder<List<MailContact>>(
          future: _contacts,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            final rows = snapshot.data ?? const [];
            if (snapshot.hasError) {
              return Center(child: Text('${snapshot.error}'));
            }
            if (rows.isEmpty) {
              return const Center(child: Text('No contacts yet'));
            }
            return ListView.separated(
              itemCount: rows.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, index) {
                final contact = rows[index];
                final label = contact.displayName.isEmpty
                    ? contact.email
                    : contact.displayName;
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AvatarPalette.forSeed(contact.email),
                    foregroundColor: Colors.white,
                    child: Text(label[0].toUpperCase()),
                  ),
                  title: Row(
                    children: [
                      Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
                      if (contact.isFavorite) ...[
                        const SizedBox(width: 6),
                        Icon(Icons.star, size: 15, color: AppColors.of(context).star),
                      ],
                    ],
                  ),
                  subtitle: Text([
                    contact.email,
                    if ((contact.company ?? '').isNotEmpty) contact.company!,
                  ].join(' • ')),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) =>
                            ComposeScreen(initialTo: contact.email)),
                  ),
                  trailing: PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'edit') {
                        _editContact(existing: contact);
                      } else {
                        _delete(contact);
                      }
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'edit', child: Text('Edit')),
                      PopupMenuItem(value: 'delete', child: Text('Delete')),
                    ],
                  ),
                );
              },
            );
          },
        ),
      );
}

/// Server-side auto-filing rules: new mail matching a From/Subject
/// condition is moved into a destination folder the moment it arrives.
/// Mirrors the web client's RulesTab (same destination presets, same
/// "first enabled rule wins" behavior against the shared `/mail/rules`
/// endpoints), since mobile had no equivalent screen before this.
class RulesScreen extends StatefulWidget {
  const RulesScreen({super.key});
  @override
  State<RulesScreen> createState() => _RulesScreenState();
}

class _RulesScreenState extends State<RulesScreen> {
  late Future<List<MailRule>> _rules;

  static const _destinationPresets = [
    ('INBOX.Archive', 'Archive'),
    ('INBOX.Junk', 'Spam'),
    ('INBOX.Trash', 'Trash'),
  ];

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _rules = context.read<AppState>().api.rules();

  String _folderLabel(String destination) {
    for (final preset in _destinationPresets) {
      if (preset.$1 == destination) return preset.$2;
    }
    return destination.replaceFirst(RegExp(r'^INBOX\.'), '');
  }

  Future<void> _toggle(MailRule rule) async {
    try {
      await context.read<AppState>().api.updateRule(
            rule.id,
            name: rule.name,
            fromContains: rule.fromContains,
            subjectContains: rule.subjectContains,
            destinationFolder: rule.destinationFolder,
            isEnabled: !rule.isEnabled,
          );
      if (mounted) setState(_reload);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  Future<void> _addRule() async {
    final api = context.read<AppState>().api;
    final fromContains = TextEditingController();
    final subjectContains = TextEditingController();
    final customLabel = TextEditingController();
    var destinationPreset = _destinationPresets.first.$1;
    var useCustom = false;
    final save = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('New rule'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                    controller: fromContains,
                    decoration:
                        const InputDecoration(labelText: 'From contains')),
                const SizedBox(height: 12),
                TextField(
                    controller: subjectContains,
                    decoration:
                        const InputDecoration(labelText: 'Subject contains')),
                const SizedBox(height: 16),
                const Text('Move matching mail to'),
                for (final preset in _destinationPresets)
                  RadioListTile<String>(
                    contentPadding: EdgeInsets.zero,
                    value: preset.$1,
                    groupValue: useCustom ? null : destinationPreset,
                    title: Text(preset.$2),
                    onChanged: (value) => setDialogState(() {
                      useCustom = false;
                      destinationPreset = value!;
                    }),
                  ),
                RadioListTile<bool>(
                  contentPadding: EdgeInsets.zero,
                  value: true,
                  groupValue: useCustom,
                  title: const Text('Custom folder…'),
                  onChanged: (_) => setDialogState(() => useCustom = true),
                ),
                if (useCustom)
                  TextField(
                      controller: customLabel,
                      decoration:
                          const InputDecoration(labelText: 'Folder name')),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Add rule')),
          ],
        ),
      ),
    );
    if (save == true) {
      if (fromContains.text.trim().isEmpty && subjectContains.text.trim().isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Add a From or Subject condition first')));
        }
      } else if (useCustom && customLabel.text.trim().isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Name the custom folder first')));
        }
      } else {
        final destination = useCustom
            ? 'INBOX.${customLabel.text.trim().replaceAll(RegExp(r'[^a-zA-Z0-9 _-]'), '').replaceAll(RegExp(r'\s+'), '-')}'
            : destinationPreset;
        try {
          await api.createRule(
            name: fromContains.text.trim().isNotEmpty
                ? fromContains.text.trim()
                : subjectContains.text.trim(),
            fromContains:
                fromContains.text.trim().isEmpty ? null : fromContains.text.trim(),
            subjectContains: subjectContains.text.trim().isEmpty
                ? null
                : subjectContains.text.trim(),
            destinationFolder: destination,
          );
          if (mounted) setState(_reload);
        } catch (error) {
          if (mounted) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text('$error')));
          }
        }
      }
    }
    fromContains.dispose();
    subjectContains.dispose();
    customLabel.dispose();
  }

  Future<void> _delete(MailRule rule) async {
    await context.read<AppState>().api.deleteRule(rule.id);
    if (mounted) setState(_reload);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Rules')),
        floatingActionButton: FloatingActionButton(
          onPressed: _addRule,
          child: const Icon(Icons.add),
        ),
        body: FutureBuilder<List<MailRule>>(
          future: _rules,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('${snapshot.error}'));
            }
            final rows = snapshot.data ?? const [];
            return ListView(
              children: [
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'New mail matching a rule is filed automatically the moment it '
                    'arrives — the first enabled rule that matches wins.',
                  ),
                ),
                if (rows.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Text('No rules yet.'),
                  ),
                for (final rule in rows)
                  ListTile(
                    leading: Switch(
                        value: rule.isEnabled, onChanged: (_) => _toggle(rule)),
                    title: Text([
                      if (rule.fromContains != null)
                        'From contains "${rule.fromContains}"',
                      if (rule.subjectContains != null)
                        'Subject contains "${rule.subjectContains}"',
                    ].join(' and ')),
                    subtitle: Text('Move to ${_folderLabel(rule.destinationFolder)}'),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () => _delete(rule),
                    ),
                  ),
              ],
            );
          },
        ),
      );
}

class DraftsScreen extends StatefulWidget {
  const DraftsScreen({super.key});
  @override
  State<DraftsScreen> createState() => _DraftsScreenState();
}

class _DraftsScreenState extends State<DraftsScreen> {
  late Future<List<MailDraft>> _drafts;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() => _drafts = context.read<AppState>().api.drafts();

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Drafts')),
        body: FutureBuilder<List<MailDraft>>(
          future: _drafts,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            final rows = snapshot.data ?? const [];
            if (snapshot.hasError) {
              return Center(child: Text('${snapshot.error}'));
            }
            if (rows.isEmpty) {
              return const Center(child: Text('No saved drafts'));
            }
            return ListView.separated(
              itemCount: rows.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, index) {
                final draft = rows[index];
                return ListTile(
                  leading: const Icon(Icons.drafts_outlined),
                  title: Text(
                      draft.subject.isEmpty ? '(No subject)' : draft.subject),
                  subtitle: Text(
                      '${draft.to.join(', ')} • ${DateFormat('MMM d, h:mm a').format(draft.updatedAt.toLocal())}',
                      maxLines: 1),
                  onTap: () async {
                    await Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => ComposeScreen(draft: draft)));
                    if (mounted) setState(_reload);
                  },
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () async {
                      await context.read<AppState>().api.deleteDraft(draft.id);
                      if (mounted) setState(_reload);
                    },
                  ),
                );
              },
            );
          },
        ),
      );
}
