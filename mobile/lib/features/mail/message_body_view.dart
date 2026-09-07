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
import '../../core/attachment_style.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

/// Renders a message's body (HTML with inline `cid:` images resolved, or
/// plain text) plus its attachment list with Open/Save actions. Shared by
/// [MessageScreen] and [ThreadScreen] so both stay in sync.
///
/// Remote (non-`cid:`, non-`data:`) images are blocked by default, the same
/// Gmail-style privacy behavior the web client's sanitizeEmailHtml() applies
/// - a sender can otherwise use a remote image as a read-receipt/tracking
/// pixel the instant the body renders. A bar above the body lets the user
/// opt back in for this message.
class MessageBodyView extends StatefulWidget {
  const MessageBodyView({super.key, required this.message});
  final MailMessage message;

  @override
  State<MessageBodyView> createState() => _MessageBodyViewState();
}

class _MessageBodyViewState extends State<MessageBodyView> {
  bool _allowRemoteImages = false;

  MailMessage get message => widget.message;

  static final _imgSrcPattern =
      RegExp(r'''<img\b[^>]*\bsrc\s*=\s*["']([^"']*)["']''', caseSensitive: false);

  bool get _hasRemoteImages {
    final html = message.htmlBody;
    if (html == null || html.isEmpty) return false;
    for (final match in _imgSrcPattern.allMatches(html)) {
      final src = match.group(1) ?? '';
      if (!src.startsWith('cid:') && !src.startsWith('data:')) return true;
    }
    return false;
  }

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
    if (src.startsWith('cid:')) {
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
    if (!_allowRemoteImages && !src.startsWith('data:')) {
      return const _BlockedRemoteImage();
    }
    return null;
  }

  void _showDownloading(BuildContext context, String filename) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 30),
        content: Row(
          children: [
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            const SizedBox(width: 14),
            Expanded(child: Text('Downloading $filename…')),
          ],
        ),
      ),
    );
  }

  Future<void> _download(BuildContext context, MailAttachment attachment) async {
    _showDownloading(context, attachment.filename);
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
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${attachment.filename} saved')),
        );
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not save attachment: $error')),
        );
      }
    }
  }

  Future<void> _open(BuildContext context, MailAttachment attachment) async {
    _showDownloading(context, attachment.filename);
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
      if (context.mounted) ScaffoldMessenger.of(context).hideCurrentSnackBar();
      final result = await OpenFilex.open(file.path);
      if (result.type != ResultType.done && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not open: ${result.message}')));
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open attachment: $error')),
        );
      }
    }
  }

  Widget _buildAttachments(BuildContext context) {
    final colors = AppColors.of(context);
    final images = message.attachments.where((a) => isImageContentType(a.contentType)).toList();
    final files = message.attachments.where((a) => !isImageContentType(a.contentType)).toList();
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${message.attachments.length} attachment${message.attachments.length == 1 ? '' : 's'}',
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          if (images.isNotEmpty)
            SizedBox(
              height: 96,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: images.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) => ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  child: SizedBox(
                    width: 96,
                    height: 96,
                    child: GestureDetector(
                      onTap: () => _open(context, images[index]),
                      child: _CidImage(message: message, attachment: images[index]),
                    ),
                  ),
                ),
              ),
            ),
          if (images.isNotEmpty && files.isNotEmpty) const SizedBox(height: 10),
          for (final attachment in files)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                decoration: BoxDecoration(
                  color: colors.elevatedSurface,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: colors.divider),
                ),
                child: ListTile(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md)),
                  leading: Icon(attachmentIcon(attachment.contentType)),
                  title: Text(attachment.filename,
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text(attachment.size != null
                      ? formatBytes(attachment.size!)
                      : attachment.contentType),
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
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!_allowRemoteImages && _hasRemoteImages)
          _RemoteImageBar(onShow: () => setState(() => _allowRemoteImages = true)),
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
        if (message.attachments.isNotEmpty) _buildAttachments(context),
      ],
    );
  }
}

class _RemoteImageBar extends StatelessWidget {
  const _RemoteImageBar({required this.onShow});
  final VoidCallback onShow;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: colors.unreadTint,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Row(
        children: [
          Icon(Icons.image_outlined, size: 18, color: colors.subtleText),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Images are hidden to protect your privacy',
              style: TextStyle(fontSize: 12.5, color: colors.subtleText),
            ),
          ),
          TextButton(
            onPressed: onShow,
            child: const Text('Show images'),
          ),
        ],
      ),
    );
  }
}

class _BlockedRemoteImage extends StatelessWidget {
  const _BlockedRemoteImage();

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: colors.elevatedSurface,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: colors.divider),
      ),
      child: Icon(Icons.image_outlined, size: 18, color: colors.subtleText),
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
