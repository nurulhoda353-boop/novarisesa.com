import 'package:flutter_test/flutter_test.dart';
import 'package:novarise_mail/core/models.dart';
import 'package:novarise_mail/core/thread_utils.dart';

MailMessage _msg({
  required int uid,
  required String subject,
  String? messageId,
  String? inReplyTo,
  List<String> references = const [],
  String senderEmail = 'a@novarisesa.com',
  List<String> recipientEmails = const ['b@novarisesa.com'],
  DateTime? receivedAt,
}) =>
    MailMessage(
      uid: uid,
      folder: 'INBOX',
      subject: subject,
      sender: MailAddress(name: '', email: senderEmail),
      recipients: [for (final e in recipientEmails) MailAddress(name: '', email: e)],
      preview: '',
      flags: const [r'\Seen'],
      messageId: messageId,
      inReplyTo: inReplyTo,
      references: references,
      receivedAt: receivedAt,
    );

void main() {
  test('messages with no thread headers each become their own thread', () {
    final threads = groupIntoThreads([
      _msg(uid: 1, subject: 'Hello', messageId: '<1@x>'),
      _msg(uid: 2, subject: 'Different topic', messageId: '<2@x>'),
    ]);
    expect(threads, hasLength(2));
    expect(threads.every((t) => t.messages.length == 1), isTrue);
  });

  test('a reply groups with its parent via In-Reply-To', () {
    final root = _msg(uid: 1, subject: 'Project update', messageId: '<root@x>');
    final reply = _msg(
      uid: 2,
      subject: 'Re: Project update',
      messageId: '<reply@x>',
      inReplyTo: '<root@x>',
      references: const ['<root@x>'],
    );
    final threads = groupIntoThreads([root, reply]);
    expect(threads, hasLength(1));
    expect(threads.first.messages, hasLength(2));
    // Oldest first within the thread.
    expect(threads.first.messages.first.uid, 1);
    expect(threads.first.messages.last.uid, 2);
  });

  test('a three-message chain groups via the References list', () {
    final first = _msg(uid: 1, subject: 'Quote request', messageId: '<a@x>');
    final second = _msg(
      uid: 2,
      subject: 'Re: Quote request',
      messageId: '<b@x>',
      inReplyTo: '<a@x>',
      references: const ['<a@x>'],
    );
    final third = _msg(
      uid: 3,
      subject: 'Re: Quote request',
      messageId: '<c@x>',
      inReplyTo: '<b@x>',
      references: const ['<a@x>', '<b@x>'],
    );
    final threads = groupIntoThreads([first, second, third]);
    expect(threads, hasLength(1));
    expect(threads.first.messages.map((m) => m.uid), [1, 2, 3]);
  });

  test('unrelated messages that happen to share a plain subject stay separate', () {
    final threads = groupIntoThreads([
      _msg(uid: 1, subject: 'Hello', messageId: '<1@x>', senderEmail: 'a@x.com'),
      _msg(uid: 2, subject: 'Hello', messageId: '<2@x>', senderEmail: 'z@x.com'),
    ]);
    expect(threads, hasLength(2));
  });

  test('a Re: reply with no headers still joins by subject and participant overlap', () {
    final root = _msg(
      uid: 1,
      subject: 'Delivery schedule',
      messageId: '<root@x>',
      senderEmail: 'buyer@novarisesa.com',
      recipientEmails: const ['seller@novarisesa.com'],
    );
    // Some broken client stripped References/In-Reply-To entirely.
    final strippedReply = _msg(
      uid: 2,
      subject: 'RE: Delivery schedule',
      messageId: '<reply@x>',
      senderEmail: 'seller@novarisesa.com',
      recipientEmails: const ['buyer@novarisesa.com'],
    );
    final threads = groupIntoThreads([root, strippedReply]);
    expect(threads, hasLength(1));
    expect(threads.first.messages, hasLength(2));
  });

  test('unreadCount and hasStarred reflect the messages in the thread', () {
    final read = _msg(uid: 1, subject: 'A', messageId: '<1@x>');
    final unreadStarred = MailMessage(
      uid: 2,
      folder: 'INBOX',
      subject: 'Re: A',
      sender: const MailAddress(name: '', email: 'a@novarisesa.com'),
      recipients: const [MailAddress(name: '', email: 'b@novarisesa.com')],
      preview: '',
      flags: const [r'\Flagged'],
      messageId: '<2@x>',
      inReplyTo: '<1@x>',
      references: const ['<1@x>'],
    );
    final threads = groupIntoThreads([read, unreadStarred]);
    expect(threads.first.unreadCount, 1);
    expect(threads.first.hasStarred, isTrue);
  });
}
