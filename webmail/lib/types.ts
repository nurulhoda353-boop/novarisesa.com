export interface MailAddress {
  name: string;
  email: string;
}

export interface MailMessageSummary {
  uid: number;
  folder: string;
  message_id: string | null;
  in_reply_to: string | null;
  references: string[];
  subject: string;
  sender: MailAddress;
  recipients: MailAddress[];
  received_at: string | null;
  flags: string[];
  preview: string;
  size_bytes: number | null;
  has_attachments: boolean;
}

export interface MailAttachmentInfo {
  part: string;
  filename: string;
  content_type: string;
  content_id: string | null;
  size: number | null;
}

export interface MailMessageDetail extends MailMessageSummary {
  text_body: string;
  html_body: string | null;
  cc: MailAddress[];
  attachments: MailAttachmentInfo[];
}

export interface MailMessageList {
  data: MailMessageSummary[];
  folder: string;
  next_before_uid: number | null;
}

export interface FolderInfo {
  name: string;
  delimiter: string | null;
  flags: string[];
  unseen: number;
  total: number;
}

export interface MailAccount {
  id: string;
  address: string;
  display_name: string;
  avatar_url: string | null;
  cache_ttl_days: number;
  hostinger_mailbox_id: string | null;
  signature: string | null;
  role: "admin" | "member";
  /** True only when an admin switched into this mailbox - the mailbox's
      own `role` above still reflects what it really is (so the UI still
      looks like that mailbox), this just means the current session has
      full admin permissions here regardless. */
  acting_as_admin: boolean;
}

export interface MailChangeRequestInfo {
  id: string;
  request_type: "password" | "display_name" | "avatar" | "delete_message";
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface AdminAccountInfo {
  id: string;
  address: string;
  display_name: string;
  avatar_url: string | null;
  role: "admin" | "member";
  is_active: boolean;
  last_connected_at: string | null;
}

export interface AdminChangeRequestInfo {
  id: string;
  account_id: string;
  account_address: string;
  request_type: "password" | "display_name" | "avatar" | "delete_message";
  preview: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by_address: string | null;
}

export interface AdminAuditLogEntry {
  id: string;
  actor_address: string | null;
  target_address: string | null;
  action: string;
  detail: string | null;
  created_at: string;
}

export interface HostingerMailboxInfo {
  address: string;
  connected: boolean;
  account_id: string | null;
  role: "admin" | "member" | null;
  storage_used: number | null;
  storage_quota: number | null;
  messages_used: number | null;
  messages_quota: number | null;
}

export interface AdminContactInfo {
  address: string;
  display_name: string;
}

export interface MobileSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  account: MailAccount;
}

export interface SendAttachment {
  filename: string;
  content_type: string;
  content_base64: string;
}

export interface SendMailRequest {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text_body: string;
  html_body: string | null;
  reply_to_message_id: string | null;
  attachments: SendAttachment[];
  from_address?: string | null;
}

export interface ContactInfo {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
  company: string | null;
  is_favorite: boolean;
}

export interface DraftInfo {
  id: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text_body: string;
  html_body: string | null;
  attachments: Record<string, unknown>[];
  updated_at: string;
}

export interface SnoozeInfo {
  id: string;
  message_id: string;
  subject: string;
  original_folder: string;
  wake_at: string;
}

export interface AliasInfo {
  id: string;
  address: string;
  local_part?: string;
}

export interface ForwarderInfo {
  id: string;
  destination: string;
  is_keep_copy_enabled: boolean;
}

export interface AutoreplyInfo {
  id: string;
  subject: string;
  body: string;
  display_name: string;
  starts_at: string | null;
  ends_at: string | null;
}

export interface MailRuleInfo {
  id: string;
  name: string;
  from_contains: string | null;
  subject_contains: string | null;
  destination_folder: string;
  is_enabled: boolean;
  sort_order: number;
}

export const SYSTEM_FOLDERS = {
  inbox: "INBOX",
  starred: "__starred__",
  snoozed: "INBOX.Snoozed",
  sent: "INBOX.Sent",
  drafts: "__drafts__",
  archive: "INBOX.Archive",
  spam: "INBOX.Junk",
  trash: "INBOX.Trash",
} as const;

export type ComposeMode = "new" | "reply" | "replyAll" | "forward";

export interface ComposeInitial {
  mode: ComposeMode;
  to?: string[];
  cc?: string[];
  subject?: string;
  bodyHtml?: string;
  quoteHtml?: string;
  replyToMessageId?: string | null;
  draftId?: string | null;
  fromAddress?: string | null;
  attachmentFiles?: File[];
}
