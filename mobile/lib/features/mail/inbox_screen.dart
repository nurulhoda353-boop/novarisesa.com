import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../settings/settings_screen.dart';
import 'compose_screen.dart';
import 'message_screen.dart';
import 'organizer_screens.dart';

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> with WidgetsBindingObserver {
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _search.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.read<AppState>().loadMessages(silent: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return Scaffold(
      appBar: AppBar(
        title: Text(_folderTitle(state.currentFolder),
            style: const TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
              onPressed: state.busy ? null : () => state.loadMessages(),
              icon: const Icon(Icons.refresh)),
          IconButton(
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const SettingsScreen())),
            icon: _avatar(state.account),
          ),
        ],
      ),
      drawer: _MailboxDrawer(state: state),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(
            context, MaterialPageRoute(builder: (_) => const ComposeScreen())),
        icon: const Icon(Icons.edit_outlined),
        label: const Text('Compose'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
            child: SearchBar(
              controller: _search,
              hintText: 'Search mail',
              leading: const Icon(Icons.search),
              trailing: [
                if (_search.text.isNotEmpty)
                  IconButton(
                    onPressed: () {
                      _search.clear();
                      state.loadMessages();
                      setState(() {});
                    },
                    icon: const Icon(Icons.close),
                  ),
              ],
              onChanged: (_) => setState(() {}),
              onSubmitted: (value) => state.loadMessages(query: value),
            ),
          ),
          if (state.error != null)
            MaterialBanner(
              content: Text(state.error!),
              actions: [
                TextButton(
                    onPressed: () => state.loadMessages(),
                    child: const Text('Retry'))
              ],
            ),
          if (state.busy && state.messages.isNotEmpty)
            const LinearProgressIndicator(minHeight: 2),
          Expanded(
            child: state.busy && state.messages.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : state.messages.isEmpty
                    ? _EmptyFolder(name: _folderTitle(state.currentFolder))
                    : RefreshIndicator(
                        onRefresh: state.loadMessages,
                        child: ListView.separated(
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: state.messages.length,
                          separatorBuilder: (_, __) =>
                              const Divider(height: 1, indent: 72),
                          itemBuilder: (context, index) =>
                              _MessageTile(message: state.messages[index]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _avatar(MailAccount? account) {
    if (account?.avatarUrl != null) {
      return CircleAvatar(
          radius: 15, backgroundImage: NetworkImage(account!.avatarUrl!));
    }
    final label = account?.displayName.trim().isNotEmpty == true
        ? account!.displayName
        : account?.address ?? 'N';
    return CircleAvatar(
        radius: 15,
        child:
            Text(label[0].toUpperCase(), style: const TextStyle(fontSize: 12)));
  }

  String _folderTitle(String folder) =>
      folder.split('.').last.replaceAll('INBOX', 'Inbox');
}

class _MessageTile extends StatelessWidget {
  const _MessageTile({required this.message});
  final MailMessage message;

  @override
  Widget build(BuildContext context) {
    final weight = message.isRead ? FontWeight.w400 : FontWeight.w700;
    return Material(
      color: message.isRead ? Colors.white : const Color(0xFFF2F6FF),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
        leading: CircleAvatar(
            child: Text(message.sender.label.isEmpty
                ? '?'
                : message.sender.label[0].toUpperCase())),
        title: Row(
          children: [
            Expanded(
                child: Text(message.sender.label,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontWeight: weight))),
            if (message.receivedAt != null)
              Text(_date(message.receivedAt!),
                  style: TextStyle(fontSize: 11, fontWeight: weight)),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message.subject,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: weight, color: Colors.black87)),
            Text(message.preview, maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
        trailing: Icon(message.isStarred ? Icons.star : Icons.star_border,
            color: message.isStarred ? Colors.amber.shade700 : Colors.blueGrey,
            size: 21),
        onTap: () => Navigator.push(context,
            MaterialPageRoute(builder: (_) => MessageScreen(summary: message))),
      ),
    );
  }

  static String _date(DateTime date) {
    final local = date.toLocal();
    return DateUtils.isSameDay(local, DateTime.now())
        ? DateFormat('h:mm a').format(local)
        : DateFormat('MMM d').format(local);
  }
}

class _MailboxDrawer extends StatelessWidget {
  const _MailboxDrawer({required this.state});
  final AppState state;

  IconData _icon(MailFolder folder) {
    final value = '${folder.name} ${folder.flags.join(' ')}'.toLowerCase();
    if (value.contains('sent')) return Icons.send_outlined;
    if (value.contains('draft')) return Icons.drafts_outlined;
    if (value.contains('trash')) return Icons.delete_outline;
    if (value.contains('spam') || value.contains('junk')) {
      return Icons.report_outlined;
    }
    if (value.contains('archive')) return Icons.archive_outlined;
    return Icons.folder_outlined;
  }

  @override
  Widget build(BuildContext context) {
    return NavigationDrawer(
      children: [
        DrawerHeader(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Image.asset('assets/novarise-logo-mark.png', width: 42),
              const SizedBox(height: 10),
              const Text('Novarise Mail',
                  style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800)),
              Text(state.account?.address ?? '',
                  style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
        ListTile(
          selected: state.currentFolder == 'INBOX',
          leading: const Icon(Icons.inbox_outlined),
          title: const Text('Inbox'),
          onTap: () {
            Navigator.pop(context);
            state.selectFolder('INBOX');
          },
        ),
        for (final folder
            in state.folders.where((folder) => folder.name != 'INBOX'))
          ListTile(
            selected: state.currentFolder == folder.name,
            leading: Icon(_icon(folder)),
            title: Text(folder.name.split('.').last),
            onTap: () {
              Navigator.pop(context);
              state.selectFolder(folder.name);
            },
          ),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.contacts_outlined),
          title: const Text('Contacts'),
          onTap: () {
            Navigator.pop(context);
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const ContactsScreen()));
          },
        ),
        ListTile(
          leading: const Icon(Icons.drafts_outlined),
          title: const Text('Saved drafts'),
          onTap: () {
            Navigator.pop(context);
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const DraftsScreen()));
          },
        ),
        ListTile(
          leading: const Icon(Icons.settings_outlined),
          title: const Text('Settings'),
          onTap: () {
            Navigator.pop(context);
            Navigator.push(context,
                MaterialPageRoute(builder: (_) => const SettingsScreen()));
          },
        ),
      ],
    );
  }
}

class _EmptyFolder extends StatelessWidget {
  const _EmptyFolder({required this.name});
  final String name;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.mark_email_read_outlined,
                size: 58, color: Colors.blueGrey.shade300),
            const SizedBox(height: 14),
            Text('$name is empty',
                style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      );
}
