import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_state.dart';
import '../../core/models.dart';

class ComposeScreen extends StatefulWidget {
  const ComposeScreen({
    super.key,
    this.replyTo,
    this.draft,
    this.initialTo,
    this.isForward = false,
    this.replyAll = false,
  });
  final MailMessage? replyTo;
  final MailDraft? draft;
  final String? initialTo;
  final bool isForward;
  final bool replyAll;

  @override
  State<ComposeScreen> createState() => _ComposeScreenState();
}

class _ComposeScreenState extends State<ComposeScreen> {
  late final TextEditingController _to;
  late final TextEditingController _cc;
  late final TextEditingController _bcc;
  late final TextEditingController _subject;
  late final TextEditingController _body;
  final List<Map<String, dynamic>> _attachments = [];
  bool _showCcBcc = false;

  @override
  void initState() {
    super.initState();
    final reply = widget.replyTo;
    final selfAddress = context.read<AppState>().account?.address.toLowerCase();
    _to = TextEditingController(
      text: widget.draft?.to.join(', ') ??
          widget.initialTo ??
          (widget.isForward ? '' : reply?.sender.email) ??
          '',
    );
    final ccPrefill = <String>{};
    if (widget.draft != null) {
      ccPrefill.addAll(widget.draft!.cc);
    } else if (reply != null && !widget.isForward && widget.replyAll) {
      for (final address in [...reply.recipients, ...reply.cc]) {
        final email = address.email.toLowerCase();
        if (email.isEmpty || email == selfAddress || email == reply.sender.email.toLowerCase()) {
          continue;
        }
        ccPrefill.add(address.email);
      }
    }
    _cc = TextEditingController(text: ccPrefill.join(', '));
    _bcc = TextEditingController(text: widget.draft?.bcc.join(', ') ?? '');
    _showCcBcc = ccPrefill.isNotEmpty || _bcc.text.isNotEmpty;
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
    _cc.dispose();
    _bcc.dispose();
    _subject.dispose();
    _body.dispose();
    super.dispose();
  }

  List<String> _splitAddresses(String value) => value
      .split(RegExp(r'[,;]'))
      .map((item) => item.trim())
      .where((item) => item.isNotEmpty)
      .toList();

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
    final recipients =
        _splitAddresses(_to.text).where((value) => value.contains('@')).toList();
    if (recipients.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Add at least one recipient')));
      return;
    }
    final state = context.read<AppState>();
    try {
      await state.send(
        to: recipients,
        cc: _splitAddresses(_cc.text),
        bcc: _splitAddresses(_bcc.text),
        subject: _subject.text,
        body: _body.text,
        replyToMessageId: widget.isForward ? null : widget.replyTo?.messageId,
        attachments: _attachments,
      );
      if (widget.draft != null) {
        await state.api.deleteDraft(widget.draft!.id);
      }
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not send. Please retry.')));
      }
    }
  }

  Future<void> _saveDraft() async {
    try {
      await context.read<AppState>().api.saveDraft(
            id: widget.draft?.id,
            to: _splitAddresses(_to.text),
            cc: _splitAddresses(_cc.text),
            bcc: _splitAddresses(_bcc.text),
            subject: _subject.text,
            body: _body.text,
          );
      if (mounted) Navigator.pop(context, true);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not save draft. Please retry.')));
      }
    }
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
          Row(
            children: [
              Expanded(
                child: TextField(
                    controller: _to,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'To')),
              ),
              if (!_showCcBcc)
                TextButton(
                  onPressed: () => setState(() => _showCcBcc = true),
                  child: const Text('Cc/Bcc'),
                ),
            ],
          ),
          if (_showCcBcc) ...[
            const SizedBox(height: 10),
            TextField(
                controller: _cc,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Cc')),
            const SizedBox(height: 10),
            TextField(
                controller: _bcc,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Bcc')),
          ],
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
