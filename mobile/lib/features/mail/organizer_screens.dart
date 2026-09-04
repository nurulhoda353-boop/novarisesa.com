import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
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

  Future<void> _add() async {
    final api = context.read<AppState>().api;
    final name = TextEditingController();
    final email = TextEditingController();
    final save = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New contact'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
                controller: name,
                decoration: const InputDecoration(labelText: 'Name')),
            const SizedBox(height: 12),
            TextField(
                controller: email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email')),
          ],
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
    );
    if (save == true && email.text.contains('@')) {
      await api.createContact(email.text.trim(), name.text.trim());
      if (mounted) setState(_reload);
    }
    name.dispose();
    email.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Contacts')),
        floatingActionButton: FloatingActionButton(
            onPressed: _add, child: const Icon(Icons.person_add_alt_1)),
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
                  leading: CircleAvatar(child: Text(label[0].toUpperCase())),
                  title: Text(label),
                  subtitle: Text(contact.email),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) =>
                            ComposeScreen(initialTo: contact.email)),
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () async {
                      await context
                          .read<AppState>()
                          .api
                          .deleteContact(contact.id);
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
