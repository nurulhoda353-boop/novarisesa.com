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

  test('mail message parses cc recipients', () {
    final message = MailMessage.fromJson({
      'uid': 11,
      'folder': 'INBOX',
      'subject': 'Team update',
      'sender': {'name': 'Novarise', 'email': 'team@novarisesa.com'},
      'recipients': [
        {'name': '', 'email': 'to@novarisesa.com'}
      ],
      'cc': [
        {'name': 'Second', 'email': 'second@novarisesa.com'}
      ],
      'preview': 'Hello',
      'flags': <String>[],
    });
    expect(message.cc, hasLength(1));
    expect(message.cc.first.email, 'second@novarisesa.com');
  });

  test('mail folder parses unseen and total counts, defaulting to zero', () {
    final withCounts = MailFolder.fromJson({
      'name': 'INBOX',
      'flags': <String>[],
      'unseen': 4,
      'total': 20,
    });
    expect(withCounts.unseen, 4);
    expect(withCounts.total, 20);

    final withoutCounts = MailFolder.fromJson({'name': 'Sent', 'flags': <String>[]});
    expect(withoutCounts.unseen, 0);
    expect(withoutCounts.total, 0);
  });

  test('mail contact parses phone, company and favorite flag', () {
    final contact = MailContact.fromJson({
      'id': 'abc',
      'email': 'friend@novarisesa.com',
      'display_name': 'Friend',
      'phone': '+1 555 0100',
      'company': 'Novarise',
      'is_favorite': true,
    });
    expect(contact.phone, '+1 555 0100');
    expect(contact.company, 'Novarise');
    expect(contact.isFavorite, isTrue);
  });

  test('folder resolution prefers special-use flag over name heuristic', () {
    final folders = [
      const MailFolder(name: 'Old Archive', flags: []),
      const MailFolder(name: 'Trashed Junk', flags: [r'\Archive']),
    ];
    final resolved = folders.resolve(
      flagHints: const [r'\Archive'],
      nameHints: const ['archive'],
    );
    expect(resolved, 'Trashed Junk');
  });

  test('folder resolution falls back to a name heuristic when no flag matches', () {
    final folders = [
      const MailFolder(name: 'Inbox', flags: []),
      const MailFolder(name: 'Junk E-mail', flags: []),
    ];
    final resolved = folders.resolve(
      flagHints: const [r'\Junk'],
      nameHints: const ['spam', 'junk'],
    );
    expect(resolved, 'Junk E-mail');
  });

  test('folder resolution returns null when nothing matches', () {
    final folders = [const MailFolder(name: 'Inbox', flags: [])];
    final resolved = folders.resolve(
      flagHints: const [r'\Archive'],
      nameHints: const ['archive'],
    );
    expect(resolved, isNull);
  });
}
