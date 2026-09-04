import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../core/thread_utils.dart';
import '../auth/login_screen.dart';
import '../settings/settings_screen.dart';
import 'compose_screen.dart';
import 'organizer_screens.dart';
import 'thread_screen.dart';

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> with WidgetsBindingObserver {
  final _search = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _searchDebounce;
  final Set<String> _selectedKeys = {};
  String? _selectionFolder;
  MessageFilter _filter = const MessageFilter();

  bool get _selectionMode => _selectedKeys.isNotEmpty;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _search.dispose();
    _scrollController.dispose();
    _searchDebounce?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.read<AppState>().loadMessages(silent: true);
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels >
        _scrollController.position.maxScrollExtent - 400) {
      context.read<AppState>().loadMore();
    }
  }

  void _onSearchChanged(String value) {
    setState(() {});
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 400), () {
      context.read<AppState>().loadMessages(query: value, filter: _filter);
    });
  }

  Future<void> _openFilters() async {
    final result = await showModalBottomSheet<MessageFilter>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _FilterSheet(initial: _filter),
    );
    if (result == null || !mounted) return;
    setState(() => _filter = result);
    context.read<AppState>().loadMessages(query: _search.text, filter: result);
  }

  String _keyFor(MailMessage message) => '${message.folder}-${message.uid}';

  void _toggleSelect(MailMessage message) {
    setState(() {
      final key = _keyFor(message);
      if (_selectedKeys.remove(key)) {
        if (_selectedKeys.isEmpty) _selectionFolder = null;
      } else {
        _selectedKeys.add(key);
        _selectionFolder ??= message.folder;
      }
    });
  }

  void _clearSelection() => setState(() {
        _selectedKeys.clear();
        _selectionFolder = null;
      });

  List<MailMessage> _selectedMessages(List<MailMessage> all) =>
      all.where((message) => _selectedKeys.contains(_keyFor(message))).toList();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    if (_selectionFolder != null && _selectionFolder != state.currentFolder) {
      _selectedKeys.clear();
      _selectionFolder = null;
    }
    final threads = groupIntoThreads(state.messages);
    final threadLatestMessages = [for (final thread in threads) thread.latest];
    return Scaffold(
      appBar: _selectionMode
          ? _SelectionAppBar(
              count: _selectedKeys.length,
              allSelected: _selectedKeys.length == state.messages.length,
              onClose: _clearSelection,
              onSelectAll: () => setState(() {
                if (_selectedKeys.length == state.messages.length) {
                  _selectedKeys.clear();
                  _selectionFolder = null;
                } else {
                  _selectedKeys
                    ..clear()
                    ..addAll(state.messages.map(_keyFor));
                  _selectionFolder = state.currentFolder;
                }
              }),
              onMarkRead: () async {
                final selected = _selectedMessages(state.messages);
                _clearSelection();
                await state.bulkSetRead(selected, true);
              },
              onArchive: () async {
                final archiveFolder = state.folders.resolve(
                  flagHints: const [r'\Archive'],
                  nameHints: const ['archive'],
                );
                if (archiveFolder == null) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content:
                          Text('No archive folder found on this mailbox')));
                  return;
                }
                final selected = _selectedMessages(state.messages);
                _clearSelection();
                await state.bulkMove(selected, archiveFolder);
              },
              onDelete: () async {
                final selected = _selectedMessages(state.messages);
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: Text(
                        'Delete ${selected.length} ${selected.length == 1 ? 'email' : 'emails'}?'),
                    content: const Text('This cannot be undone.'),
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
                _clearSelection();
                await state.bulkDelete(selected);
              },
            )
          : AppBar(
              title: Text(_folderTitle(state.currentFolder),
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              actions: [
                IconButton(
                    onPressed: state.busy ? null : () => state.loadMessages(),
                    icon: const Icon(Icons.refresh)),
                IconButton(
                  onPressed: () => _openAccountSwitcher(context, state),
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
                      context.read<AppState>().loadMessages(filter: _filter);
                      setState(() {});
                    },
                    icon: const Icon(Icons.close),
                  ),
                IconButton(
                  tooltip: 'Filters',
                  onPressed: _openFilters,
                  icon: Icon(_filter.isEmpty
                      ? Icons.filter_list
                      : Icons.filter_alt),
                ),
              ],
              onChanged: _onSearchChanged,
              onSubmitted: (value) =>
                  state.loadMessages(query: value, filter: _filter),
            ),
          ),
          if (state.offline && state.messages.isNotEmpty)
            MaterialBanner(
              content: const Text('Offline — showing saved mail'),
              actions: [
                TextButton(
                    onPressed: () => state.loadMessages(),
                    child: const Text('Retry'))
              ],
            )
          else if (state.error != null)
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
                ? const _InboxSkeleton()
                : state.messages.isEmpty
                    ? _EmptyFolder(name: _folderTitle(state.currentFolder))
                    : RefreshIndicator(
                        onRefresh: state.loadMessages,
                        child: ListView.separated(
                          controller: _scrollController,
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: threads.length + (state.hasMore ? 1 : 0),
                          separatorBuilder: (_, __) =>
                              const Divider(height: 1, indent: 72),
                          itemBuilder: (context, index) {
                            if (index >= threads.length) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(vertical: 20),
                                child: Center(
                                    child: SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2))),
                              );
                            }
                            final thread = threads[index];
                            final latest = threadLatestMessages[index];
                            return _MessageTile(
                              thread: thread,
                              selectionMode: _selectionMode,
                              selected: _selectedKeys.contains(_keyFor(latest)),
                              onToggleSelect: () => _toggleSelect(latest),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Future<void> _openAccountSwitcher(BuildContext context, AppState state) async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => _AccountSwitcherSheet(state: state),
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

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({required this.initial});
  final MessageFilter initial;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late final TextEditingController _from;
  DateTime? _since;
  DateTime? _before;
  bool? _hasAttachment;

  @override
  void initState() {
    super.initState();
    _from = TextEditingController(text: widget.initial.fromContains ?? '');
    _since = widget.initial.since;
    _before = widget.initial.before;
    _hasAttachment = widget.initial.hasAttachment;
  }

  @override
  void dispose() {
    _from.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool isSince}) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: (isSince ? _since : _before) ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked == null) return;
    setState(() {
      if (isSince) {
        _since = picked;
      } else {
        _before = picked;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Search filters', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(
            controller: _from,
            decoration:
                const InputDecoration(labelText: 'From contains', hintText: 'name@example.com'),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _pickDate(isSince: true),
                  child: Text(_since == null
                      ? 'Since'
                      : DateFormat('MMM d, yyyy').format(_since!)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _pickDate(isSince: false),
                  child: Text(_before == null
                      ? 'Before'
                      : DateFormat('MMM d, yyyy').format(_before!)),
                ),
              ),
            ],
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Has attachment'),
            value: _hasAttachment ?? false,
            onChanged: (value) => setState(() => _hasAttachment = value),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context, const MessageFilter()),
                child: const Text('Clear'),
              ),
              const Spacer(),
              FilledButton(
                onPressed: () => Navigator.pop(
                  context,
                  MessageFilter(
                    fromContains:
                        _from.text.trim().isEmpty ? null : _from.text.trim(),
                    since: _since,
                    before: _before,
                    hasAttachment: _hasAttachment,
                  ),
                ),
                child: const Text('Apply'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AccountSwitcherSheet extends StatelessWidget {
  const _AccountSwitcherSheet({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final address in state.savedAccounts)
              ListTile(
                leading: CircleAvatar(
                  backgroundColor: address == state.account?.address
                      ? NovariseTheme.blue
                      : AppColors.of(context).subtleText,
                  foregroundColor: Colors.white,
                  child: Text(address.isEmpty ? '?' : address[0].toUpperCase()),
                ),
                title: Text(address),
                trailing: address == state.account?.address
                    ? const Icon(Icons.check_circle, color: NovariseTheme.blue)
                    : IconButton(
                        icon: const Icon(Icons.close),
                        tooltip: 'Remove account',
                        onPressed: () async {
                          Navigator.pop(context);
                          await state.removeAccount(address);
                        },
                      ),
                onTap: address == state.account?.address
                    ? null
                    : () async {
                        Navigator.pop(context);
                        final ok = await state.switchAccount(address);
                        if (!ok && context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text(
                                    'That account needs you to sign in again')),
                          );
                        }
                      },
              ),
            ListTile(
              leading: const Icon(Icons.person_add_alt_1),
              title: const Text('Add account'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => const LoginScreen(addingAccount: true)));
              },
            ),
            ListTile(
              leading: const Icon(Icons.settings_outlined),
              title: const Text('Profile & settings'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const SettingsScreen()));
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      );
}

class _SelectionAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _SelectionAppBar({
    required this.count,
    required this.allSelected,
    required this.onClose,
    required this.onSelectAll,
    required this.onMarkRead,
    required this.onArchive,
    required this.onDelete,
  });

  final int count;
  final bool allSelected;
  final VoidCallback onClose;
  final VoidCallback onSelectAll;
  final VoidCallback onMarkRead;
  final VoidCallback onArchive;
  final VoidCallback onDelete;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) => AppBar(
        leading: IconButton(onPressed: onClose, icon: const Icon(Icons.close)),
        title: Text('$count selected'),
        actions: [
          IconButton(
            tooltip: allSelected ? 'Deselect all' : 'Select all',
            onPressed: onSelectAll,
            icon: Icon(allSelected ? Icons.deselect : Icons.select_all),
          ),
          IconButton(
              tooltip: 'Mark as read',
              onPressed: onMarkRead,
              icon: const Icon(Icons.mark_email_read_outlined)),
          IconButton(
              tooltip: 'Archive',
              onPressed: onArchive,
              icon: const Icon(Icons.archive_outlined)),
          IconButton(
              tooltip: 'Delete',
              onPressed: onDelete,
              icon: const Icon(Icons.delete_outline)),
        ],
      );
}

class _InboxSkeleton extends StatelessWidget {
  const _InboxSkeleton();

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).brightness == Brightness.dark
        ? Colors.grey.shade800
        : Colors.grey.shade300;
    final highlight = Theme.of(context).brightness == Brightness.dark
        ? Colors.grey.shade700
        : Colors.grey.shade100;
    return Shimmer.fromColors(
      baseColor: base,
      highlightColor: highlight,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 4),
        itemCount: 8,
        separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
        itemBuilder: (_, __) => ListTile(
          leading: const CircleAvatar(backgroundColor: Colors.white),
          title: Container(height: 12, width: 140, color: Colors.white),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Container(height: 10, width: 220, color: Colors.white),
          ),
        ),
      ),
    );
  }
}

class _MessageTile extends StatelessWidget {
  const _MessageTile({
    required this.thread,
    required this.selectionMode,
    required this.selected,
    required this.onToggleSelect,
  });
  final MailThread thread;
  final bool selectionMode;
  final bool selected;
  final VoidCallback onToggleSelect;

  MailMessage get message => thread.latest;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final unread = thread.unreadCount > 0;
    final weight = unread ? FontWeight.w700 : FontWeight.w400;
    final state = context.read<AppState>();
    final row = Material(
      color: selected
          ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.10)
          : (unread ? colors.unreadTint : null),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
        onLongPress: onToggleSelect,
        leading: GestureDetector(
          onTap: onToggleSelect,
          child: selectionMode
              ? CircleAvatar(
                  backgroundColor:
                      selected ? NovariseTheme.blue : colors.subtleText,
                  foregroundColor: Colors.white,
                  child: selected ? const Icon(Icons.check, size: 18) : null,
                )
              : CircleAvatar(
                  backgroundColor: AvatarPalette.forSeed(message.sender.email),
                  foregroundColor: Colors.white,
                  child: Text(message.sender.label.isEmpty
                      ? '?'
                      : message.sender.label[0].toUpperCase()),
                ),
        ),
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
            Row(
              children: [
                Expanded(
                  child: Text(
                      thread.messages.length > 1
                          ? '${message.subject}  (${thread.messages.length})'
                          : message.subject,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontWeight: weight)),
                ),
                if (message.hasAttachments) ...[
                  const SizedBox(width: 6),
                  Icon(Icons.attach_file, size: 14, color: colors.subtleText),
                ],
              ],
            ),
            Text(message.preview,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: colors.subtleText)),
          ],
        ),
        trailing: selectionMode
            ? null
            : Icon(thread.hasStarred ? Icons.star : Icons.star_border,
                color: thread.hasStarred ? colors.star : colors.subtleText,
                size: 21),
        onTap: selectionMode
            ? onToggleSelect
            : () => Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => ThreadScreen(thread: thread))),
      ),
    );
    if (selectionMode) return row;

    return Dismissible(
      key: ValueKey('${message.folder}-${message.uid}'),
      background: _swipeBackground(
        alignment: Alignment.centerLeft,
        color: colors.success,
        icon: Icons.archive_outlined,
        label: 'Archive',
      ),
      secondaryBackground: _swipeBackground(
        alignment: Alignment.centerRight,
        color: Theme.of(context).colorScheme.error,
        icon: Icons.delete_outline,
        label: 'Delete',
      ),
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.endToStart) {
          final confirmed = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Delete this email?'),
              content: const Text('This cannot be undone.'),
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
          if (confirmed != true) return false;
          state.removeLocally(message);
          unawaited(state.deleteMessage(message));
          return true;
        }
        final archiveFolder = state.folders.resolve(
          flagHints: const [r'\Archive'],
          nameHints: const ['archive'],
        );
        if (archiveFolder == null) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('No archive folder found on this mailbox')));
          return false;
        }
        state.removeLocally(message);
        unawaited(state.move(message, archiveFolder));
        return true;
      },
      child: row,
    );
  }

  Widget _swipeBackground({
    required Alignment alignment,
    required Color color,
    required IconData icon,
    required String label,
  }) {
    return Container(
      color: color,
      alignment: alignment,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white),
          Text(label,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w600)),
        ],
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
    final inbox = state.folders.where((folder) => folder.name == 'INBOX');
    final inboxUnseen = inbox.isEmpty ? 0 : inbox.first.unseen;
    return NavigationDrawer(
      children: [
        DrawerHeader(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Image.asset('assets/novarise-icon-mark.png', width: 42),
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
          trailing: _unreadBadge(inboxUnseen),
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
            trailing: _unreadBadge(folder.unseen),
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

  Widget? _unreadBadge(int count) {
    if (count <= 0) return null;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: NovariseTheme.blue,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        count > 99 ? '99+' : '$count',
        style: const TextStyle(
            color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
      ),
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
                size: 58, color: AppColors.of(context).subtleText),
            const SizedBox(height: 14),
            Text('$name is empty',
                style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      );
}
