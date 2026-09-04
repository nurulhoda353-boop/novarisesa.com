class MailAccount {
  const MailAccount({
    required this.id,
    required this.address,
    required this.displayName,
    required this.cacheTtlDays,
    this.avatarUrl,
  });

  final String id;
  final String address;
  final String displayName;
  final String? avatarUrl;
  final int cacheTtlDays;

  factory MailAccount.fromJson(Map<String, dynamic> json) => MailAccount(
        id: json['id'] as String,
        address: json['address'] as String,
        displayName: json['display_name'] as String? ?? '',
        avatarUrl: json['avatar_url'] as String?,
        cacheTtlDays: json['cache_ttl_days'] as int? ?? 30,
      );
}

class MailAddress {
  const MailAddress({required this.name, required this.email});
  final String name;
  final String email;

  factory MailAddress.fromJson(Map<String, dynamic>? json) => MailAddress(
        name: json?['name'] as String? ?? '',
        email: json?['email'] as String? ?? '',
      );

  String get label => name.trim().isEmpty ? email : name;
}

class MailMessage {
  const MailMessage({
    required this.uid,
    required this.folder,
    required this.subject,
    required this.sender,
    required this.preview,
    required this.flags,
    required this.recipients,
    this.cc = const [],
    this.receivedAt,
    this.messageId,
    this.textBody,
    this.htmlBody,
    this.hasAttachments = false,
    this.attachments = const [],
  });

  final int uid;
  final String folder;
  final String subject;
  final MailAddress sender;
  final List<MailAddress> recipients;
  final List<MailAddress> cc;
  final DateTime? receivedAt;
  final String? messageId;
  final String preview;
  final List<String> flags;
  final String? textBody;
  final String? htmlBody;
  final bool hasAttachments;
  final List<MailAttachment> attachments;

  bool get isRead => flags.contains(r'\Seen');
  bool get isStarred => flags.contains(r'\Flagged');

  factory MailMessage.fromJson(Map<String, dynamic> json) => MailMessage(
        uid: json['uid'] as int,
        folder: json['folder'] as String? ?? 'INBOX',
        subject: json['subject'] as String? ?? '(No subject)',
        sender: MailAddress.fromJson(json['sender'] as Map<String, dynamic>?),
        recipients: (json['recipients'] as List<dynamic>? ?? const [])
            .map((item) => MailAddress.fromJson(item as Map<String, dynamic>))
            .toList(),
        cc: (json['cc'] as List<dynamic>? ?? const [])
            .map((item) => MailAddress.fromJson(item as Map<String, dynamic>))
            .toList(),
        receivedAt: json['received_at'] == null
            ? null
            : DateTime.tryParse(json['received_at'] as String),
        messageId: json['message_id'] as String?,
        preview: json['preview'] as String? ?? '',
        flags: List<String>.from(json['flags'] as List<dynamic>? ?? const []),
        textBody: json['text_body'] as String?,
        htmlBody: json['html_body'] as String?,
        hasAttachments: json['has_attachments'] as bool? ?? false,
        attachments: (json['attachments'] as List<dynamic>? ?? const [])
            .map(
                (item) => MailAttachment.fromJson(item as Map<String, dynamic>))
            .toList(),
      );
}

class MailAttachment {
  const MailAttachment({
    required this.part,
    required this.filename,
    required this.contentType,
    this.size,
  });

  final String part;
  final String filename;
  final String contentType;
  final int? size;

  factory MailAttachment.fromJson(Map<String, dynamic> json) => MailAttachment(
        part: json['part'] as String,
        filename: json['filename'] as String,
        contentType:
            json['content_type'] as String? ?? 'application/octet-stream',
        size: json['size'] as int?,
      );
}

class MailFolder {
  const MailFolder({
    required this.name,
    required this.flags,
    this.unseen = 0,
    this.total = 0,
  });
  final String name;
  final List<String> flags;
  final int unseen;
  final int total;

  factory MailFolder.fromJson(Map<String, dynamic> json) => MailFolder(
        name: json['name'] as String,
        flags: List<String>.from(json['flags'] as List<dynamic>? ?? const []),
        unseen: json['unseen'] as int? ?? 0,
        total: json['total'] as int? ?? 0,
      );
}

extension MailFolderResolution on List<MailFolder> {
  /// Finds a real folder name by IMAP special-use flag first (e.g. `\Archive`,
  /// `\Junk`), falling back to a name heuristic. Servers name folders
  /// differently (`Junk` vs `Spam`), so callers must never hardcode a guess.
  String? resolve({
    required List<String> flagHints,
    required List<String> nameHints,
  }) {
    for (final folder in this) {
      if (folder.flags.any(flagHints.contains)) return folder.name;
    }
    for (final folder in this) {
      final lower = folder.name.toLowerCase();
      if (nameHints.any(lower.contains)) return folder.name;
    }
    return null;
  }
}

class MobileSession {
  const MobileSession({
    required this.accessToken,
    required this.refreshToken,
    required this.account,
  });
  final String accessToken;
  final String refreshToken;
  final MailAccount account;

  factory MobileSession.fromJson(Map<String, dynamic> json) => MobileSession(
        accessToken: json['access_token'] as String,
        refreshToken: json['refresh_token'] as String,
        account: MailAccount.fromJson(json['account'] as Map<String, dynamic>),
      );
}

class MailContact {
  const MailContact({
    required this.id,
    required this.email,
    required this.displayName,
    this.phone,
    this.company,
    this.isFavorite = false,
  });
  final String id;
  final String email;
  final String displayName;
  final String? phone;
  final String? company;
  final bool isFavorite;

  factory MailContact.fromJson(Map<String, dynamic> json) => MailContact(
        id: json['id'] as String,
        email: json['email'] as String,
        displayName: json['display_name'] as String? ?? '',
        phone: json['phone'] as String?,
        company: json['company'] as String?,
        isFavorite: json['is_favorite'] as bool? ?? false,
      );
}

class MailDraft {
  const MailDraft({
    required this.id,
    required this.to,
    required this.subject,
    required this.textBody,
    required this.updatedAt,
    this.cc = const [],
    this.bcc = const [],
  });
  final String id;
  final List<String> to;
  final List<String> cc;
  final List<String> bcc;
  final String subject;
  final String textBody;
  final DateTime updatedAt;

  factory MailDraft.fromJson(Map<String, dynamic> json) => MailDraft(
        id: json['id'] as String,
        to: List<String>.from(json['to'] as List<dynamic>? ?? const []),
        cc: List<String>.from(json['cc'] as List<dynamic>? ?? const []),
        bcc: List<String>.from(json['bcc'] as List<dynamic>? ?? const []),
        subject: json['subject'] as String? ?? '',
        textBody: json['text_body'] as String? ?? '',
        updatedAt: DateTime.parse(json['updated_at'] as String),
      );
}
