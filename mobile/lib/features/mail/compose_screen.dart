import 'dart:async';
import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_state.dart';
import '../../core/models.dart';
import '../../core/rich_text.dart';

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
  Timer? _pendingSendTimer;

  @override
  void initState() {
    super.initState();
    final reply = widget.replyTo;
    final account = context.read<AppState>().account;
    final selfAddress = account?.address.toLowerCase();
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
    final signature = account?.signature?.trim();
    final hasSignature =
        widget.draft == null && signature != null && signature.isNotEmpty;
    final signatureBlock = hasSignature ? '\n\n$signature' : '';
    _body = TextEditingController(
      text: widget.draft?.textBody ??
          (widget.isForward ? '$signatureBlock$forwardedBody' : signatureBlock),
    );
    if (hasSignature) {
      _body.selection = const TextSelection.collapsed(offset: 0);
    }
  }

  @override
  void dispose() {
    _pendingSendTimer?.cancel();
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
    final result = await FilePicker.platform.pickFiles(
      withData: true,
      allowMultiple: true,
    );
    final files = result?.files.where((file) => file.bytes != null) ?? const [];
    if (files.isEmpty) return;
    setState(() {
      for (final file in files) {
        _attachments.add({
          'filename': file.name,
          'content_type': 'application/octet-stream',
          'content_base64': base64Encode(file.bytes!),
        });
      }
    });
  }

  int get _selectionStart {
    final start = _body.selection.start;
    return start < 0 ? _body.text.length : start;
  }

  int get _selectionEnd {
    final end = _body.selection.end;
    return end < 0 ? _body.text.length : end;
  }

  void _applyWrap(String prefix, String suffix) {
    final result =
        wrapSelection(_body.text, _selectionStart, _selectionEnd, prefix, suffix);
    _body.value = TextEditingValue(
      text: result.text,
      selection:
          TextSelection(baseOffset: result.selectionStart, extentOffset: result.selectionEnd),
    );
  }

  void _applyLinePrefix(String marker) {
    final cursor = _body.selection.baseOffset < 0
        ? _body.text.length
        : _body.selection.baseOffset;
    final result = toggleLinePrefix(_body.text, cursor, marker);
    _body.value = TextEditingValue(
      text: result.text,
      selection: TextSelection.collapsed(offset: result.cursor),
    );
  }

  Future<void> _insertLink() async {
    final start = _selectionStart;
    final end = _selectionEnd;
    final selectedText = _body.text.substring(start, end);
    final urlController = TextEditingController();
    final url = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add link'),
        content: TextField(
          controller: urlController,
          autofocus: true,
          keyboardType: TextInputType.url,
          decoration: const InputDecoration(hintText: 'https://example.com'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, urlController.text.trim()),
              child: const Text('Add')),
        ],
      ),
    );
    urlController.dispose();
    if (!mounted || url == null || url.isEmpty) return;
    final label = selectedText.isEmpty ? 'link' : selectedText;
    final replacement = '[$label]($url)';
    final newText = _body.text.replaceRange(start, end, replacement);
    _body.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: start + replacement.length),
    );
  }

  /// Sending is delayed a few seconds behind a dismissable "Undo" snackbar,
  /// matching Gmail's undo-send — there is no real recall once the SMTP
  /// send has actually happened, this just gives a window to cancel before
  /// that call is made at all.
  void _send() {
    final recipients =
        _splitAddresses(_to.text).where((value) => value.contains('@')).toList();
    if (recipients.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Add at least one recipient')));
      return;
    }
    final state = context.read<AppState>();
    _pendingSendTimer?.cancel();
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 5),
        content: const Text('Sending…'),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () {
            _pendingSendTimer?.cancel();
            _pendingSendTimer = null;
          },
        ),
      ),
    );
    _pendingSendTimer = Timer(const Duration(seconds: 5), () {
      _pendingSendTimer = null;
      _performSend(state, recipients);
    });
  }

  Future<void> _performSend(AppState state, List<String> recipients) async {
    try {
      await state.send(
        to: recipients,
        cc: _splitAddresses(_cc.text),
        bcc: _splitAddresses(_bcc.text),
        subject: _subject.text,
        body: _body.text,
        htmlBody: _body.text.trim().isEmpty ? null : markdownLiteToHtml(_body.text),
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
      body: Column(
        children: [
          Expanded(
            child: ListView(
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
              ],
            ),
          ),
          const Divider(height: 1),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Row(
              children: [
                IconButton(
                    onPressed: () => _applyWrap('**', '**'),
                    tooltip: 'Bold',
                    icon: const Icon(Icons.format_bold)),
                IconButton(
                    onPressed: () => _applyWrap('*', '*'),
                    tooltip: 'Italic',
                    icon: const Icon(Icons.format_italic)),
                IconButton(
                    onPressed: () => _applyLinePrefix('- '),
                    tooltip: 'Bullet list',
                    icon: const Icon(Icons.format_list_bulleted)),
                IconButton(
                    onPressed: () => _applyLinePrefix('1. '),
                    tooltip: 'Numbered list',
                    icon: const Icon(Icons.format_list_numbered)),
                IconButton(
                    onPressed: _insertLink,
                    tooltip: 'Add link',
                    icon: const Icon(Icons.link)),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(
              children: [
                IconButton(
                    onPressed: _attach,
                    tooltip: 'Attach files',
                    icon: const Icon(Icons.attach_file)),
                const Spacer(),
                FilledButton.icon(
                    onPressed: busy ? null : _send,
                    icon: const Icon(Icons.send),
                    label: const Text('Send')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
