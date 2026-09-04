import 'package:flutter_test/flutter_test.dart';
import 'package:novarise_mail/core/models.dart';

void main() {
  test('mail message exposes read and starred state', () {
    final message = MailMessage.fromJson({
      'uid': 10,
      'folder': 'INBOX',
      'subject': 'Welcome',
      'sender': {'name': 'Novarise', 'email': 'team@novarisesa.com'},
      'recipients': <Map<String, String>>[],
      'preview': 'Hello',
      'flags': [r'\Seen', r'\Flagged'],
    });
    expect(message.isRead, isTrue);
    expect(message.isStarred, isTrue);
    expect(message.sender.label, 'Novarise');
  });
}
