import 'models.dart';

/// A conversation: one or more messages that belong together, oldest first
/// (so a thread reads top-to-bottom like the exchange happened).
class MailThread {
  const MailThread(this.messages);
  final List<MailMessage> messages;

  MailMessage get latest => messages.last;
  int get unreadCount => messages.where((message) => !message.isRead).length;
  bool get hasStarred => messages.any((message) => message.isStarred);
}

bool _looksLikeReply(String subject) =>
    RegExp(r'^(re|fwd?|fw)\s*:', caseSensitive: false).hasMatch(subject.trim());

String _normalizeSubject(String subject) => subject
    .toLowerCase()
    .replaceAll(RegExp(r'^(re|fwd?|fw)\s*:\s*', caseSensitive: false), '')
    .trim();

Set<String> _participantsOf(MailMessage message) => {
      message.sender.email.toLowerCase(),
      for (final recipient in message.recipients) recipient.email.toLowerCase(),
    };

int _byReceivedAt(MailMessage a, MailMessage b) {
  final aTime = a.receivedAt;
  final bTime = b.receivedAt;
  if (aTime == null && bTime == null) return 0;
  if (aTime == null) return -1;
  if (bTime == null) return 1;
  return aTime.compareTo(bTime);
}

/// Groups a folder's messages into conversations.
///
/// Primary signal is the References/In-Reply-To chain (a reply names the
/// Message-ID of the message it answers). As a fallback — for the rare
/// sender whose client strips those headers — a lone "Re:"/"Fwd:" message
/// still joins another group that shares its normalized subject and at
/// least one participant, rather than becoming its own thread.
///
/// Threads are emitted in the order their first message appears in
/// [messages] (so a newest-first folder listing stays newest-thread-first);
/// messages within a thread are sorted oldest first.
List<MailThread> groupIntoThreads(List<MailMessage> messages) {
  final byMessageId = <String, int>{};
  final groups = <List<MailMessage>>[];

  for (final message in messages) {
    int? target;
    for (final ref in message.references.reversed) {
      final candidate = byMessageId[ref];
      if (candidate != null) {
        target = candidate;
        break;
      }
    }
    target ??= message.inReplyTo == null ? null : byMessageId[message.inReplyTo];
    if (target != null) {
      groups[target].add(message);
    } else {
      target = groups.length;
      groups.add([message]);
    }
    if (message.messageId != null) {
      byMessageId[message.messageId!] = target;
    }
  }

  final consumed = <int>{};
  for (var i = 0; i < groups.length; i++) {
    if (groups[i].length != 1) continue;
    final message = groups[i].first;
    if (!_looksLikeReply(message.subject)) continue;
    final subjectKey = _normalizeSubject(message.subject);
    final participants = _participantsOf(message);
    for (var j = 0; j < groups.length; j++) {
      if (j == i || consumed.contains(j)) continue;
      final matches = groups[j].any((candidate) =>
          _normalizeSubject(candidate.subject) == subjectKey &&
          _participantsOf(candidate).intersection(participants).isNotEmpty);
      if (matches) {
        groups[j].add(message);
        consumed.add(i);
        break;
      }
    }
  }

  return [
    for (var i = 0; i < groups.length; i++)
      if (!consumed.contains(i))
        MailThread(List.unmodifiable(groups[i]..sort(_byReceivedAt))),
  ];
}
