import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';

class ComposeScreen extends StatefulWidget {
  const ComposeScreen({
    super.key,
    this.replyTo,
    this.draft,
    this.initialTo,
    this.isForward = false,
  });
  final MailMessage? replyTo;
  final MailDraft? draft;
  final String? initialTo;
  final bool isForward;

  @override
  State<ComposeScreen> createState() => _ComposeScreenState();
}

class _ComposeScreenState extends State<ComposeScreen> {
  late final TextEditingController _to;
  late final TextEditingController _subject;
  late final TextEditingController _body;
  final List<Map<String, dynamic>> _attachments = [];

  @override
  void initState() {
    super.initState();
    final reply = widget.replyTo;
    _to = TextEditingController(
      text: widget.draft?.to.join(', ') ??
          widget.initialTo ??
          (widget.isForward ? '' : reply?.sender.email) ??
          '',
    );
    _subject = TextEditingController(
      text: widget.draft?.subject ??
          (reply == null
              ? ''
              : widget.isForward
                  ? (reply.subject.startsWith('Fwd:')
                      ? reply.subject
                      : 'Fwd: ${reply.subject}')
                  : (reply.subject.startsWith('Re:')
                      ? reply.subject
                      : 'Re: ${reply.subject}')),
    );
    final forwardedBody = reply == null
        ? ''
        : '\n\n---------- Forwarded message ----------\n'
            'From: ${reply.sender.label} <${reply.sender.email}>\n'
            'Subject: ${reply.subject}\n\n'
            '${reply.textBody ?? reply.preview}';
    _body = TextEditingController(
      text: widget.draft?.textBody ?? (widget.isForward ? forwardedBody : ''),
    );
  }

  @override
  void dispose() {
    _to.dispose();
    _subject.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _attach() async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    final file = result?.files.single;
    if (file?.bytes == null) return;
    setState(() {
      _attachments.add({
        'filename': file!.name,
        'content_type': 'application/octet-stream',
        'content_base64': base64Encode(file.bytes!),
      });
    });
  }

  Future<void> _send() async {
    final recipients = _to.text
        .split(RegExp(r'[,;]'))
        .map((value) => value.trim())
        .where((value) => value.contains('@'))
        .toList();
    if (recipients.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Add at least one recipient')));
      return;
    }
    final state = context.read<AppState>();
    try {
      await state.send(
        to: recipients,
        subject: _subject.text,
        body: _body.text,
        replyToMessageId: widget.isForward ? null : widget.replyTo?.messageId,
        attachments: _attachments,
      );
      if (widget.draft != null) {
        await state.api.deleteDraft(widget.draft!.id);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (_) {}
  }

  Future<void> _saveDraft() async {
    final recipients = _to.text
        .split(RegExp(r'[,;]'))
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toList();
    await context.read<AppState>().api.saveDraft(
          id: widget.draft?.id,
          to: recipients,
          subject: _subject.text,
          body: _body.text,
        );
    if (mounted) Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final busy = context.watch<AppState>().busy;
    return Scaffold(
      appBar: AppBar(
        title: const Text('New message'),
        actions: [
          IconButton(
              onPressed: busy ? null : _saveDraft,
              tooltip: 'Save draft',
              icon: const Icon(Icons.save_outlined)),
          IconButton(
              onPressed: busy ? null : _send,
              tooltip: 'Send',
              icon: const Icon(Icons.send_rounded)),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
              controller: _to,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'To')),
          const SizedBox(height: 10),
          TextField(
              controller: _subject,
              decoration: const InputDecoration(labelText: 'Subject')),
          const SizedBox(height: 10),
          TextField(
            controller: _body,
            minLines: 12,
            maxLines: null,
            keyboardType: TextInputType.multiline,
            decoration: const InputDecoration(
                hintText: 'Write your message…', alignLabelWithHint: true),
          ),
          if (_attachments.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: _attachments
                  .map((item) => InputChip(
                        label: Text(item['filename'] as String),
                        onDeleted: () =>
                            setState(() => _attachments.remove(item)),
                      ))
                  .toList(),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              IconButton(
                  onPressed: _attach,
                  tooltip: 'Attach file',
                  icon: const Icon(Icons.attach_file)),
              const Spacer(),
              FilledButton.icon(
                  onPressed: busy ? null : _send,
                  icon: const Icon(Icons.send),
                  label: const Text('Send')),
            ],
          ),
        ],
      ),
    );
  }
}
