import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import 'package:html/dom.dart' as dom;
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_state.dart';
import '../../core/models.dart';

/// Renders a message's body (HTML with inline `cid:` images resolved, or
/// plain text) plus its attachment list with Open/Save actions. Shared by
/// [MessageScreen] and [ThreadScreen] so both stay in sync.
class MessageBodyView extends StatelessWidget {
  const MessageBodyView({super.key, required this.message});
  final MailMessage message;

  Future<bool> _openLink(BuildContext context, String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Could not open $url')));
      }
      return false;
    }
  }

  Widget? _inlineImage(dom.Element element) {
    if (element.localName != 'img') return null;
    final src = element.attributes['src'] ?? '';
    if (!src.startsWith('cid:')) return null;
    final cid = src.substring(4);
    MailAttachment? attachment;
    for (final candidate in message.attachments) {
      if (candidate.contentId == cid) {
        attachment = candidate;
        break;
      }
    }
    if (attachment == null) return null;
    return _CidImage(message: message, attachment: attachment);
  }

  Future<void> _download(BuildContext context, MailAttachment attachment) async {
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
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${attachment.filename} saved')),
        );
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not save attachment: $error')),
        );
      }
    }
  }

  Future<void> _open(BuildContext context, MailAttachment attachment) async {
    try {
      final bytes = await context.read<AppState>().api.downloadAttachment(
            message.folder,
            message.uid,
            attachment.part,
          );
      final dir = await getTemporaryDirectory();
      final safeName =
          attachment.filename.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
      final file = File('${dir.path}/$safeName');
      await file.writeAsBytes(bytes);
      final result = await OpenFilex.open(file.path);
      if (result.type != ResultType.done && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not open: ${result.message}')));
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open attachment: $error')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if ((message.htmlBody ?? '').trim().isNotEmpty)
          HtmlWidget(
            message.htmlBody!,
            onTapUrl: (url) => _openLink(context, url),
            textStyle: const TextStyle(fontSize: 16, height: 1.5),
            customWidgetBuilder: _inlineImage,
          )
        else
          SelectableText(
            (message.textBody ?? message.preview).trim(),
            style: const TextStyle(fontSize: 16, height: 1.55),
          ),
        if (message.attachments.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text('Attachments', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ...message.attachments.map(
            (attachment) => Card(
              child: ListTile(
                leading: const Icon(Icons.attach_file),
                title: Text(attachment.filename),
                subtitle: Text(attachment.contentType),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      tooltip: 'Open',
                      icon: const Icon(Icons.open_in_new),
                      onPressed: () => _open(context, attachment),
                    ),
                    IconButton(
                      tooltip: 'Save',
                      icon: const Icon(Icons.download_rounded),
                      onPressed: () => _download(context, attachment),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _CidImage extends StatefulWidget {
  const _CidImage({required this.message, required this.attachment});
  final MailMessage message;
  final MailAttachment attachment;

  @override
  State<_CidImage> createState() => _CidImageState();
}

class _CidImageState extends State<_CidImage> {
  Uint8List? _bytes;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final bytes = await context.read<AppState>().api.downloadAttachment(
            widget.message.folder,
            widget.message.uid,
            widget.attachment.part,
          );
      if (mounted) setState(() => _bytes = Uint8List.fromList(bytes));
    } catch (_) {
      if (mounted) setState(() => _failed = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) return const SizedBox.shrink();
    final bytes = _bytes;
    if (bytes == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }
    return Image.memory(bytes, fit: BoxFit.contain);
  }
}
