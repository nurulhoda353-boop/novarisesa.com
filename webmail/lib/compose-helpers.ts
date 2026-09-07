import type { ComposeInitial, ComposeMode, MailMessageDetail } from "./types";
import { displayName, fullTimestamp } from "./format";

export function prefixSubject(subject: string, prefix: string): string {
  if (new RegExp(`^${prefix}`, "i").test(subject.trim())) return subject;
  return `${prefix} ${subject}`;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

export function buildQuoteHtml(detail: MailMessageDetail): string {
  return `<br/><br/><div>On ${fullTimestamp(detail.received_at)}, ${displayName(detail.sender.name, detail.sender.email)} &lt;${detail.sender.email}&gt; wrote:</div><blockquote>${detail.html_body ?? `<p>${escapeHtml(detail.text_body)}</p>`}</blockquote>`;
}

/** Builds the ComposeInitial for reply/replyAll/forward from a fully-loaded
 * message detail — shared by the reply bar inside a thread card and the
 * `r`/`a`/`f` keyboard shortcuts, which fetch the detail themselves. */
export function buildReplyInitial(detail: MailMessageDetail, mode: ComposeMode, accountAddress: string): ComposeInitial {
  const quoteHtml = buildQuoteHtml(detail);
  if (mode === "reply") {
    return {
      mode,
      to: [detail.sender.email],
      subject: prefixSubject(detail.subject, "Re:"),
      quoteHtml,
      replyToMessageId: detail.message_id,
    };
  }
  if (mode === "replyAll") {
    const others = [...detail.recipients, ...(detail.cc ?? [])]
      .map((item) => item.email)
      .filter((email) => email.toLowerCase() !== accountAddress.toLowerCase());
    return {
      mode,
      to: [detail.sender.email, ...others],
      subject: prefixSubject(detail.subject, "Re:"),
      quoteHtml,
      replyToMessageId: detail.message_id,
    };
  }
  return {
    mode: "forward",
    subject: prefixSubject(detail.subject, "Fwd:"),
    quoteHtml,
  };
}
