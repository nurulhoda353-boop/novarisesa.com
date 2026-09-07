import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/push_service.dart';
import '../../core/theme.dart';
import '../../core/thread_utils.dart';
import 'compose_screen.dart';
import 'message_body_view.dart';

/// Gmail-style conversation view: every message in the thread, oldest
/// first, collapsed to a one-line summary except the newest (which starts
/// expanded) — tapping a row toggles it.
class ThreadScreen extends StatefulWidget {
  const ThreadScreen({super.key, required this.thread});
  final MailThread thread;

  @override
  State<ThreadScreen> createState() => _ThreadScreenState();
}

class _ThreadScreenState extends State<ThreadScreen> {
  late final List<MailMessage> _summaries;
  late final Set<int> _expandedUids;
  final Map<int, Future<MailMessage>> _details = {};

  @override
  void initState() {
    super.initState();
    _summaries = widget.thread.messages;
    _expandedUids = {_summaries.last.uid};
    _ensureLoaded(_summaries.last);
  }

  void _ensureLoaded(MailMessage summary) {
    _details.putIfAbsent(
        summary.uid, () => context.read<AppState>().getMessage(summary));
  }

  void _toggle(MailMessage summary) {
    setState(() {
      if (_expandedUids.remove(summary.uid)) return;
      _expandedUids.add(summary.uid);
      _ensureLoaded(summary);
    });
  }

  Future<MailMessage> _resolvedLatest() =>
      _details[_summaries.last.uid] ?? Future.value(_summaries.last);

  /// Real (server-side) snooze for the newest message in the thread -
  /// mirrors the web client's SnoozePopover presets (Later today / Tomorrow
  /// morning / This weekend / Next week / custom). A local notification is
  /// also scheduled so the device pings at the right moment, alongside the
  /// backend's own scheduler moving the message back on its own.
  static DateTime _atHour(DateTime base, int hour) =>
      DateTime(base.year, base.month, base.day, hour);

  static DateTime _nextWeekday(DateTime base, int isoWeekday) {
    final diff = (isoWeekday - base.weekday + 7) % 7;
    final target = base.add(Duration(days: diff == 0 ? 7 : diff));
    return _atHour(target, 9);
  }

  Future<DateTime?> _pickSnoozeTime() async {
    final now = DateTime.now();
    final tomorrow = now.add(const Duration(days: 1));
    final presets = <String, DateTime>{
      'Later today': now.add(const Duration(hours: 3)),
      'Tomorrow morning': _atHour(tomorrow, 9),
      'This weekend': _nextWeekday(now, DateTime.saturday),
      'Next week': _nextWeekday(now, DateTime.monday),
    };
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final entry in presets.entries)
              ListTile(
                leading: const Icon(Icons.snooze_outlined),
                title: Text(entry.key),
                trailing: Text(DateFormat('MMM d, h:mm a').format(entry.value)),
                onTap: () => Navigator.pop(context, entry.key),
              ),
            ListTile(
              leading: const Icon(Icons.calendar_month_outlined),
              title: const Text('Pick date & time'),
              onTap: () => Navigator.pop(context, 'custom'),
            ),
          ],
        ),
      ),
    );
    if (choice == null) return null;
    if (choice != 'custom') return presets[choice];
    if (!mounted) return null;
    final date = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return null;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(now.add(const Duration(hours: 1))),
    );
    if (time == null) return null;
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  Future<void> _snoozeThread() async {
    final message = _summaries.last;
    final target = await _pickSnoozeTime();
    if (target == null || !mounted) return;
    if (target.isBefore(DateTime.now())) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Pick a time in the future')));
      return;
    }
    final state = context.read<AppState>();
    try {
      await state.snoozeMessage(message, target);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Could not snooze this email. Please retry.')));
      }
      return;
    }
    await scheduleReminder(
      id: message.uid,
      delay: target.difference(DateTime.now()),
      title: message.sender.label.isEmpty ? 'Snoozed mail' : message.sender.label,
      body: message.subject,
    );
    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Snoozed until ${DateFormat('MMM d, h:mm a').format(target)}')));
    }
  }

  Future<void> _archiveThread() async {
    final state = context.read<AppState>();
    final archiveFolder = state.folders.resolve(
        flagHints: const [r'\Archive'], nameHints: const ['archive']);
    if (archiveFolder == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('No archive folder found on this mailbox')));
      return;
    }
    await state.bulkMove(_summaries, archiveFolder);
    if (mounted) Navigator.pop(context);
  }

  Future<void> _deleteThread() async {
    final state = context.read<AppState>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
            'Delete this conversation (${_summaries.length} ${_summaries.length == 1 ? 'email' : 'emails'})?'),
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
    await state.bulkDelete(_summaries);
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final latest = _summaries.last;
    return Scaffold(
      appBar: AppBar(
        title: Text(
            _summaries.length > 1
                ? '(${_summaries.length}) ${latest.subject}'
                : latest.subject,
            overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
              tooltip: 'Snooze',
              onPressed: _snoozeThread,
              icon: const Icon(Icons.snooze_outlined)),
          IconButton(
              tooltip: 'Archive',
              onPressed: _archiveThread,
              icon: const Icon(Icons.archive_outlined)),
          IconButton(
              tooltip: 'Delete',
              onPressed: _deleteThread,
              icon: const Icon(Icons.delete_outline)),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _summaries.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final summary = _summaries[index];
                final expanded = _expandedUids.contains(summary.uid);
                return _ThreadMessageCard(
                  summary: summary,
                  expanded: expanded,
                  onToggle: () => _toggle(summary),
                  detail: expanded ? _details[summary.uid] : null,
                );
              },
            ),
          ),
          const Divider(height: 1),
          FutureBuilder<MailMessage>(
            future: _resolvedLatest(),
            builder: (context, snapshot) {
              final resolved = snapshot.data;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Wrap(
                  spacing: 10,
                  children: [
                    OutlinedButton.icon(
                      onPressed: resolved == null
                          ? null
                          : () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) =>
                                      ComposeScreen(replyTo: resolved))),
                      icon: const Icon(Icons.reply),
                      label: const Text('Reply'),
                    ),
                    if (resolved != null &&
                        resolved.recipients.length + resolved.cc.length > 1)
                      OutlinedButton.icon(
                        onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => ComposeScreen(
                                    replyTo: resolved, replyAll: true))),
                        icon: const Icon(Icons.reply_all),
                        label: const Text('Reply all'),
                      ),
                    OutlinedButton.icon(
                      onPressed: resolved == null
                          ? null
                          : () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => ComposeScreen(
                                      replyTo: resolved, isForward: true))),
                      icon: const Icon(Icons.forward),
                      label: const Text('Forward'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ThreadMessageCard extends StatelessWidget {
  const _ThreadMessageCard({
    required this.summary,
    required this.expanded,
    required this.onToggle,
    required this.detail,
  });
  final MailMessage summary;
  final bool expanded;
  final VoidCallback onToggle;
  final Future<MailMessage>? detail;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: AvatarPalette.forSeed(summary.sender.email),
                    foregroundColor: Colors.white,
                    child: Text(summary.sender.label.isEmpty
                        ? '?'
                        : summary.sender.label[0].toUpperCase()),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(summary.sender.label,
                            style: TextStyle(
                                fontWeight: summary.isRead
                                    ? FontWeight.w500
                                    : FontWeight.w700)),
                        if (!expanded)
                          Text(summary.preview,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: colors.subtleText)),
                      ],
                    ),
                  ),
                  if (summary.receivedAt != null)
                    Text(
                        DateFormat('MMM d, h:mm a')
                            .format(summary.receivedAt!.toLocal()),
                        style: TextStyle(fontSize: 12, color: colors.subtleText)),
                ],
              ),
            ),
          ),
          if (expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
              child: FutureBuilder<MailMessage>(
                future: detail,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 20),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  if (snapshot.hasError || snapshot.data == null) {
                    return const Text('Could not load this message');
                  }
                  return MessageBodyView(message: snapshot.data!);
                },
              ),
            ),
        ],
      ),
    );
  }
}
