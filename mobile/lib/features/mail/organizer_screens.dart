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
