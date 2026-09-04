import 'package:flutter_test/flutter_test.dart';
import 'package:novarise_mail/core/rich_text.dart';

void main() {
  group('wrapSelection', () {
    test('wraps a selected range and keeps it selected', () {
      final result = wrapSelection('Hello world', 6, 11, '**', '**');
      expect(result.text, 'Hello **world**');
      expect(result.selectionStart, 8);
      expect(result.selectionEnd, 13);
    });

    test('inserts markers at the cursor with nothing selected', () {
      final result = wrapSelection('Hello ', 6, 6, '*', '*');
      expect(result.text, 'Hello **');
      expect(result.selectionStart, 7);
      expect(result.selectionEnd, 7);
    });
  });

  group('toggleLinePrefix', () {
    test('adds a bullet marker to the current line', () {
      final result = toggleLinePrefix('todo item', 4, '- ');
      expect(result.text, '- todo item');
      expect(result.cursor, 6);
    });

    test('removes the marker if the line already has it', () {
      final result = toggleLinePrefix('- todo item', 6, '- ');
      expect(result.text, 'todo item');
      expect(result.cursor, 4);
    });

    test('only affects the line containing the cursor in multi-line text', () {
      final text = 'first\nsecond\nthird';
      final cursor = text.indexOf('second') + 3;
      final result = toggleLinePrefix(text, cursor, '1. ');
      expect(result.text, 'first\n1. second\nthird');
    });
  });

  group('markdownLiteToHtml', () {
    test('converts bold and italic', () {
      final html = markdownLiteToHtml('**bold** and *italic*');
      expect(html, '<p><b>bold</b> and <i>italic</i></p>');
    });

    test('converts a bullet list', () {
      final html = markdownLiteToHtml('- one\n- two');
      expect(html, '<ul><li>one</li><li>two</li></ul>');
    });

    test('converts a numbered list', () {
      final html = markdownLiteToHtml('1. one\n2. two');
      expect(html, '<ol><li>one</li><li>two</li></ol>');
    });

    test('converts a link', () {
      final html = markdownLiteToHtml('[Novarise](https://novarisesa.com)');
      expect(html, '<p><a href="https://novarisesa.com">Novarise</a></p>');
    });

    test('escapes raw HTML in the input', () {
      final html = markdownLiteToHtml('<script>alert(1)</script>');
      expect(html, contains('&lt;script&gt;'));
      expect(html, isNot(contains('<script>')));
    });

    test('closes a list when a plain paragraph follows it', () {
      final html = markdownLiteToHtml('- one\nplain text');
      expect(html, '<ul><li>one</li></ul><p>plain text</p>');
    });
  });
}
