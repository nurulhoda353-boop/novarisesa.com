/// Lightweight compose formatting: markdown-lite syntax (**bold**,
/// *italic*, "- " / "1. " lists, [text](url) links) typed or inserted via a
/// toolbar, converted to real HTML at send time alongside the plain-text
/// body. Deliberately not a full markdown implementation — just enough to
/// give compose real formatting without pulling in a heavy rich-text editor
/// package.
library;

/// Wraps `text[start:end]` with [prefix]/[suffix] (e.g. "**"/"**" for
/// bold). If nothing is selected, the markers are inserted at the cursor
/// with the cursor left between them so typing continues inside the
/// formatting.
({String text, int selectionStart, int selectionEnd}) wrapSelection(
  String text,
  int start,
  int end,
  String prefix,
  String suffix,
) {
  final before = text.substring(0, start);
  final selected = text.substring(start, end);
  final after = text.substring(end);
  final newText = '$before$prefix$selected$suffix$after';
  if (selected.isEmpty) {
    final cursor = start + prefix.length;
    return (text: newText, selectionStart: cursor, selectionEnd: cursor);
  }
  return (
    text: newText,
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + selected.length,
  );
}

/// Toggles [marker] (e.g. "- ") at the start of the line containing
/// [cursor], for bullet/numbered list buttons.
({String text, int cursor}) toggleLinePrefix(String text, int cursor, String marker) {
  final lineStart = cursor == 0 ? 0 : text.lastIndexOf('\n', cursor - 1) + 1;
  final restOfLine = text.substring(lineStart);
  final lineBreak = restOfLine.indexOf('\n');
  final line = lineBreak == -1 ? restOfLine : restOfLine.substring(0, lineBreak);
  if (line.startsWith(marker)) {
    final newText = text.replaceRange(lineStart, lineStart + marker.length, '');
    final newCursor = cursor - marker.length < lineStart ? lineStart : cursor - marker.length;
    return (text: newText, cursor: newCursor);
  }
  final newText = text.replaceRange(lineStart, lineStart, marker);
  return (text: newText, cursor: cursor + marker.length);
}

String _escapeHtml(String value) =>
    value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

String _inline(String line) {
  var result = line;
  result = result.replaceAllMapped(
      RegExp(r'\*\*(.+?)\*\*'), (match) => '<b>${match.group(1)}</b>');
  result = result.replaceAllMapped(
      RegExp(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)'),
      (match) => '<i>${match.group(1)}</i>');
  result = result.replaceAllMapped(
      RegExp(r'\[(.+?)\]\((https?://[^\s)]+)\)'),
      (match) => '<a href="${match.group(2)}">${match.group(1)}</a>');
  return result;
}

/// Converts markdown-lite [text] into HTML for `html_body`.
String markdownLiteToHtml(String text) {
  final lines = _escapeHtml(text).split('\n');
  final buffer = StringBuffer();
  var inBulletList = false;
  var inNumberedList = false;

  void closeLists() {
    if (inBulletList) {
      buffer.write('</ul>');
      inBulletList = false;
    }
    if (inNumberedList) {
      buffer.write('</ol>');
      inNumberedList = false;
    }
  }

  final bulletPattern = RegExp(r'^-\s+(.*)$');
  final numberedPattern = RegExp(r'^\d+\.\s+(.*)$');

  for (final rawLine in lines) {
    final bulletMatch = bulletPattern.firstMatch(rawLine);
    final numberedMatch = numberedPattern.firstMatch(rawLine);
    if (bulletMatch != null) {
      if (inNumberedList) {
        buffer.write('</ol>');
        inNumberedList = false;
      }
      if (!inBulletList) {
        buffer.write('<ul>');
        inBulletList = true;
      }
      buffer.write('<li>${_inline(bulletMatch.group(1)!)}</li>');
      continue;
    }
    if (numberedMatch != null) {
      if (inBulletList) {
        buffer.write('</ul>');
        inBulletList = false;
      }
      if (!inNumberedList) {
        buffer.write('<ol>');
        inNumberedList = true;
      }
      buffer.write('<li>${_inline(numberedMatch.group(1)!)}</li>');
      continue;
    }
    closeLists();
    if (rawLine.trim().isEmpty) {
      buffer.write('<br>');
    } else {
      buffer.write('<p>${_inline(rawLine)}</p>');
    }
  }
  closeLists();
  return buffer.toString();
}
