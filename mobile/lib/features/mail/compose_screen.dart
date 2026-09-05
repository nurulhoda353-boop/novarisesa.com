import 'dart:async';
import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import '../../core/app_state.dart';
import '../../core/attachment_style.dart';
import '../../core/models.dart';
import '../../core/rich_text.dart';
import '../../core/theme.dart';
import 'recipient_field.dart';

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
  final _toKey = GlobalKey<RecipientChipFieldState>();
  final _ccKey = GlobalKey<RecipientChipFieldState>();
  final _bccKey = GlobalKey<RecipientChipFieldState>();
  late final List<String> _toInitial;
  late final List<String> _ccInitial;
  late final List<String> _bccInitial;
  late final TextEditingController _subject;
  late final TextEditingController _body;
  final List<Map<String, dynamic>> _attachments = [];
  bool _showCcBcc = false;
  Timer? _pendingSendTimer;

  List<String> get _toEmails => _toKey.currentState?.emails ?? _toInitial;
  List<String> get _ccEmails => _ccKey.currentState?.emails ?? _ccInitial;
  List<String> get _bccEmails => _bccKey.currentState?.emails ?? _bccInitial;

  @override
  void initState() {
    super.initState();
    final reply = widget.replyTo;
    final account = context.read<AppState>().account;
    final selfAddress = account?.address.toLowerCase();
    _toInitial = widget.draft?.to ??
        (widget.initialTo != null ? [widget.initialTo!] : null) ??
        (widget.isForward ? const [] : (reply != null ? [reply.sender.email] : const []));
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
    _ccInitial = ccPrefill.toList();
    _bccInitial = widget.draft?.bcc ?? const [];
    _showCcBcc = _ccInitial.isNotEmpty || _bccInitial.isNotEmpty;
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
    _subject.dispose();
    _body.dispose();
    super.dispose();
  }

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
          'content_type': guessContentType(file.name),
          'content_base64': base64Encode(file.bytes!),
          'size': file.size,
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
    final recipients = _toEmails;
    if (recipients.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Add at least one recipient')));
      return;
    }
    final state = context.read<AppState>();
    final cc = _ccEmails;
    final bcc = _bccEmails;
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
      _performSend(state, recipients, cc, bcc);
    });
  }

  Future<void> _performSend(
    AppState state,
    List<String> recipients,
    List<String> cc,
    List<String> bcc,
  ) async {
    try {
      await state.send(
        to: recipients,
        cc: cc,
        bcc: bcc,
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
            to: _toEmails,
            cc: _ccEmails,
            bcc: _bccEmails,
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
    final colors = AppColors.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.draft != null
            ? 'Edit draft'
            : widget.isForward
                ? 'Forward'
                : widget.replyTo != null
                    ? 'Reply'
                    : 'New message'),
        actions: [
          IconButton(
              onPressed: busy ? null : _saveDraft,
              tooltip: 'Save draft',
              icon: const Icon(Icons.save_outlined)),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: DecoratedBox(
              decoration: const BoxDecoration(
                gradient: AppGradients.brand,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                onPressed: busy ? null : _send,
                tooltip: 'Send',
                icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: RecipientChipField(
                        key: _toKey,
                        label: 'To',
                        icon: Icons.person_outline,
                        initial: _toInitial,
                      ),
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
                  RecipientChipField(
                    key: _ccKey,
                    label: 'Cc',
                    icon: Icons.people_outline,
                    initial: _ccInitial,
                  ),
                  const SizedBox(height: 10),
                  RecipientChipField(
                    key: _bccKey,
                    label: 'Bcc',
                    icon: Icons.visibility_off_outlined,
                    initial: _bccInitial,
                  ),
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
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _attachments
                        .map((item) => _AttachmentPreviewChip(
                              filename: item['filename'] as String,
                              contentType: item['content_type'] as String,
                              size: item['size'] as int?,
                              onRemove: () =>
                                  setState(() => _attachments.remove(item)),
                            ))
                        .toList(),
                  ),
                ],
              ],
            ),
          ),
          Divider(height: 1, color: colors.divider),
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
          Divider(height: 1, color: colors.divider),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
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

class _AttachmentPreviewChip extends StatelessWidget {
  const _AttachmentPreviewChip({
    required this.filename,
    required this.contentType,
    required this.size,
    required this.onRemove,
  });
  final String filename;
  final String contentType;
  final int? size;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      padding: const EdgeInsets.only(left: 10, right: 4, top: 6, bottom: 6),
      decoration: BoxDecoration(
        color: colors.chipBackground,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: colors.chipBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(attachmentIcon(contentType), size: 18, color: colors.subtleText),
          const SizedBox(width: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 140),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(filename,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                if (size != null)
                  Text(formatBytes(size!),
                      style: TextStyle(fontSize: 11, color: colors.subtleText)),
              ],
            ),
          ),
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            icon: const Icon(Icons.close, size: 16),
            onPressed: onRemove,
          ),
        ],
      ),
    );
  }
}
