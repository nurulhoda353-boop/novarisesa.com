import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';
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

  String _readableBody(MailMessage message) {
    if ((message.textBody ?? '').trim().isNotEmpty) return message.textBody!;
    return (message.htmlBody ?? '')
        .replaceAll(RegExp(r'<(br|/p|/div)>', caseSensitive: false), '\n')
        .replaceAll(RegExp('<[^>]*>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
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

  @override
  Widget build(BuildContext context) {
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
              PopupMenuButton<String>(
                onSelected: (value) async {
                  if (value == 'delete') {
                    await context
                        .read<AppState>()
                        .deleteMessage(message ?? widget.summary);
                    if (context.mounted) Navigator.pop(context);
                  } else {
                    await context
                        .read<AppState>()
                        .move(message ?? widget.summary, value);
                    if (context.mounted) Navigator.pop(context);
                  }
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'Archive', child: Text('Archive')),
                  PopupMenuItem(value: 'Spam', child: Text('Mark as spam')),
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
                                child: Text(message.sender.label.isEmpty
                                    ? '?'
                                    : message.sender.label[0].toUpperCase())),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(message.sender.label,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w700)),
                                  Text(message.sender.email,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall),
                                ],
                              ),
                            ),
                            if (message.receivedAt != null)
                              Text(
                                  DateFormat('MMM d, h:mm a')
                                      .format(message.receivedAt!.toLocal()),
                                  style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                        const Divider(height: 34),
                        SelectableText(_readableBody(message),
                            style: const TextStyle(fontSize: 16, height: 1.55)),
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
