import type { MailMessageSummary } from "./types";

export interface MailThread {
  messages: MailMessageSummary[];
}

export function threadLatest(thread: MailThread): MailMessageSummary {
  return thread.messages[thread.messages.length - 1];
}
export function threadUnreadCount(thread: MailThread): number {
  return thread.messages.filter((message) => !message.flags.includes("\\Seen")).length;
}
export function threadHasStarred(thread: MailThread): boolean {
  return thread.messages.some((message) => message.flags.includes("\\Flagged"));
}

function looksLikeReply(subject: string): boolean {
  return /^(re|fwd?|fw)\s*:/i.test(subject.trim());
}

function normalizeSubject(subject: string): string {
  return subject
    .toLowerCase()
    .replace(/^(re|fwd?|fw)\s*:\s*/i, "")
    .trim();
}

function participantsOf(message: MailMessageSummary): Set<string> {
  const set = new Set<string>([message.sender.email.toLowerCase()]);
  message.recipients.forEach((recipient) => set.add(recipient.email.toLowerCase()));
  return set;
}

function hasIntersection(a: Set<string>, b: Set<string>): boolean {
  for (const value of a) if (b.has(value)) return true;
  return false;
}

function byReceivedAt(a: MailMessageSummary, b: MailMessageSummary): number {
  const aTime = a.received_at ? Date.parse(a.received_at) : null;
  const bTime = b.received_at ? Date.parse(b.received_at) : null;
  if (aTime === null && bTime === null) return 0;
  if (aTime === null) return -1;
  if (bTime === null) return 1;
  return aTime - bTime;
}

/**
 * Groups a folder's message summaries into conversations, mirroring the
 * mobile app's thread_utils.dart heuristic: primarily the References /
 * In-Reply-To chain, falling back to normalized-subject + participant
 * overlap for clients that strip those headers.
 */
export function groupIntoThreads(messages: MailMessageSummary[]): MailThread[] {
  const byMessageId = new Map<string, number>();
  const groups: MailMessageSummary[][] = [];

  for (const message of messages) {
    let target: number | undefined;
    for (let i = message.references.length - 1; i >= 0; i -= 1) {
      const candidate = byMessageId.get(message.references[i]);
      if (candidate !== undefined) {
        target = candidate;
        break;
      }
    }
    if (target === undefined && message.in_reply_to) {
      target = byMessageId.get(message.in_reply_to);
    }
    if (target !== undefined) {
      groups[target].push(message);
    } else {
      target = groups.length;
      groups.push([message]);
    }
    if (message.message_id) byMessageId.set(message.message_id, target);
  }

  const consumed = new Set<number>();
  for (let i = 0; i < groups.length; i += 1) {
    if (groups[i].length !== 1) continue;
    const message = groups[i][0];
    if (!looksLikeReply(message.subject)) continue;
    const subjectKey = normalizeSubject(message.subject);
    const participants = participantsOf(message);
    for (let j = 0; j < groups.length; j += 1) {
      if (j === i || consumed.has(j)) continue;
      const matches = groups[j].some(
        (candidate) => normalizeSubject(candidate.subject) === subjectKey && hasIntersection(participantsOf(candidate), participants),
      );
      if (matches) {
        groups[j].push(message);
        consumed.add(i);
        break;
      }
    }
  }

  const result: MailThread[] = [];
  for (let i = 0; i < groups.length; i += 1) {
    if (consumed.has(i)) continue;
    result.push({ messages: [...groups[i]].sort(byReceivedAt) });
  }
  return result;
}
