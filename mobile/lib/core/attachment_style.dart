import 'package:flutter/material.dart';

/// Shared attachment presentation helpers — file-type icon and human file
/// size — used by compose's attachment chips and the message view's
/// attachment cards so both look consistent.

const Map<String, String> extensionMimeTypes = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx':
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx':
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'zip': 'application/zip',
  'txt': 'text/plain',
  'csv': 'text/csv',
  'mp4': 'video/mp4',
  'mp3': 'audio/mpeg',
};

String guessContentType(String filename) {
  final ext = filename.contains('.') ? filename.split('.').last.toLowerCase() : '';
  return extensionMimeTypes[ext] ?? 'application/octet-stream';
}

bool isImageContentType(String contentType) => contentType.startsWith('image/');

IconData attachmentIcon(String contentType) {
  if (contentType.startsWith('image/')) return Icons.image_outlined;
  if (contentType.startsWith('video/')) return Icons.videocam_outlined;
  if (contentType.startsWith('audio/')) return Icons.audiotrack_outlined;
  if (contentType == 'application/pdf') return Icons.picture_as_pdf_outlined;
  if (contentType.contains('word')) return Icons.description_outlined;
  if (contentType.contains('sheet') || contentType.contains('excel')) {
    return Icons.table_chart_outlined;
  }
  if (contentType.contains('presentation') || contentType.contains('powerpoint')) {
    return Icons.slideshow_outlined;
  }
  if (contentType.contains('zip')) return Icons.folder_zip_outlined;
  return Icons.insert_drive_file_outlined;
}

String formatBytes(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
  return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
}
