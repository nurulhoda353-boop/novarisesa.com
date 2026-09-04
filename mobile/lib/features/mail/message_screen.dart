import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import 'compose_screen.dart';

class MessageScreen extends StatefulWidget {
  const MessageScreen({super.key, required this.summary});
  final MailMessage summary;

  @override
  State<MessageScreen> createState() => _MessageScreenState();
}

class _MessageScreenState extends State<MessageScreen> {
  late final Future<MailMessage> _message;

  @override
  void initState() {
    super.initState();
    _message = context.read<AppState>().getMessage(widget.summary);
  }

  Future<bool> _openLink(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Could not open $url')));
      }
      return false;
    }
  }

  Future<void> _download(MailMessage message, MailAttachment attachment) async {
    try {
      final bytes = await context.read<AppState>().api.downloadAttachment(
            message.folder,
            message.uid,
            attachment.part,
          );
      await FilePicker.platform.saveFile(
        dialogTitle: 'Save attachment',
        fileName: attachment.filename,
        bytes: Uint8List.fromList(bytes),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${attachment.filename} saved')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not save attachment: $error')),
        );
      }
    }
  }

  Future<void> _act(BuildContext context, String action, MailMessage message) async {
    final state = context.read<AppState>();
    if (action == 'delete') {
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
      if (confirmed != true) return;
      await state.deleteMessage(message);
      if (context.mounted) Navigator.pop(context);
      return;
    }
    final destination = action == 'archive'
        ? state.folders.resolve(
            flagHints: const [r'\Archive'], nameHints: const ['archive'])
        : state.folders.resolve(
            flagHints: const [r'\Junk'], nameHints: const ['spam', 'junk']);
    if (destination == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(action == 'archive'
              ? 'No archive folder found on this mailbox'
              : 'No spam/junk folder found on this mailbox')));
      return;
    }
    await state.move(message, destination);
    if (context.mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return FutureBuilder<MailMessage>(
      future: _message,
      builder: (context, snapshot) {
        final message = snapshot.data;
        return Scaffold(
          appBar: AppBar(
            title: Text(message?.subject ?? widget.summary.subject,
                overflow: TextOverflow.ellipsis),
            actions: [
              IconButton(
                tooltip: 'Star',
                onPressed: () => context
                    .read<AppState>()
                    .toggleStar(message ?? widget.summary),
                icon: Icon((message ?? widget.summary).isStarred
                    ? Icons.star
                    : Icons.star_border),
              ),
              if (message != null)
                PopupMenuButton<String>(
                  onSelected: (value) => _act(context, value, message),
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'archive', child: Text('Archive')),
                    PopupMenuItem(value: 'spam', child: Text('Mark as spam')),
                    PopupMenuItem(value: 'delete', child: Text('Delete')),
                  ],
                ),
            ],
          ),
          body: snapshot.connectionState != ConnectionState.done
              ? const Center(child: CircularProgressIndicator())
              : snapshot.hasError
                  ? Center(
                      child: Text(
                          'Could not open this email\n${snapshot.error}',
                          textAlign: TextAlign.center))
                  : ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        Text(message!.subject,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 18),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(
                              backgroundColor:
                                  AvatarPalette.forSeed(message.sender.email),
                              foregroundColor: Colors.white,
                              child: Text(message.sender.label.isEmpty
                                  ? '?'
                                  : message.sender.label[0].toUpperCase()),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(message.sender.label,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w700)),
                                  Text(message.sender.email,
                                      style: TextStyle(color: colors.subtleText)),
                                  if (message.recipients.isNotEmpty)
                                    Text(
                                      'To: ${message.recipients.map((a) => a.label).join(', ')}',
                                      style: TextStyle(
                                          fontSize: 12, color: colors.subtleText),
                                    ),
                                  if (message.cc.isNotEmpty)
                                    Text(
                                      'Cc: ${message.cc.map((a) => a.label).join(', ')}',
                                      style: TextStyle(
                                          fontSize: 12, color: colors.subtleText),
                                    ),
                                ],
                              ),
                            ),
                            if (message.receivedAt != null)
                              Text(
                                  DateFormat('MMM d, h:mm a')
                                      .format(message.receivedAt!.toLocal()),
                                  style: TextStyle(color: colors.subtleText)),
                          ],
                        ),
                        const Divider(height: 34),
                        if ((message.htmlBody ?? '').trim().isNotEmpty)
                          HtmlWidget(
                            message.htmlBody!,
                            onTapUrl: _openLink,
                            textStyle: const TextStyle(fontSize: 16, height: 1.5),
                          )
                        else
                          SelectableText(
                            (message.textBody ?? message.preview).trim(),
                            style: const TextStyle(fontSize: 16, height: 1.55),
                          ),
                        if (message.attachments.isNotEmpty) ...[
                          const SizedBox(height: 20),
                          Text('Attachments',
                              style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 8),
                          ...message.attachments.map(
                            (attachment) => Card(
                              child: ListTile(
                                leading: const Icon(Icons.attach_file),
                                title: Text(attachment.filename),
                                subtitle: Text(attachment.contentType),
                                trailing: IconButton(
                                  tooltip: 'Download',
                                  icon: const Icon(Icons.download_rounded),
                                  onPressed: () =>
                                      _download(message, attachment),
                                ),
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 28),
                        Wrap(
                          spacing: 10,
                          children: [
                            OutlinedButton.icon(
                              onPressed: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) =>
                                        ComposeScreen(replyTo: message)),
                              ),
                              icon: const Icon(Icons.reply),
                              label: const Text('Reply'),
                            ),
                            if (message.recipients.length + message.cc.length > 1)
                              OutlinedButton.icon(
                                onPressed: () => Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                      builder: (_) => ComposeScreen(
                                          replyTo: message, replyAll: true)),
                                ),
                                icon: const Icon(Icons.reply_all),
                                label: const Text('Reply all'),
                              ),
                            OutlinedButton.icon(
                              onPressed: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) => ComposeScreen(
                                        replyTo: message, isForward: true)),
                              ),
                              icon: const Icon(Icons.forward),
                              label: const Text('Forward'),
                            ),
                          ],
                        ),
                      ],
                    ),
        );
      },
    );
  }
}
