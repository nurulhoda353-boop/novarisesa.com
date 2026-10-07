import type { ComposeInitial, ComposeMode, MailAttachmentInfo, MailMessageDetail } from "./types";
import { displayName, fullTimestamp } from "./format";
import { downloadAttachment } from "./api";

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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Forwarding carries the original message's attachments along, same as
 * every mainstream webmail client - a forward that silently drops the PDF
 * or photo the sender attached isn't useful. Inline/CID images (logos,
 * signature images) referenced from the quoted HTML are resolved to
 * data: URIs so they (a) render in the compose preview, where a bare
 * cid: src can't load at all, and (b) get picked back up as proper inline
 * attachments by ComposeWindow's extractInlineImages, which already knows
 * how to turn a data: <img> back into a cid:-referenced SendAttachment on
 * send - same path a pasted/dragged-in image goes through. Best-effort:
 * a failed download leaves that one image as a broken icon rather than
 * failing the whole forward.
 */
async function resolveInlineCidImages(html: string, folder: string, uid: number, attachments: MailAttachmentInfo[]): Promise<string> {
  if (typeof DOMParser === "undefined") return html;
  const cidAttachments = attachments.filter((item) => item.content_id);
  if (cidAttachments.length === 0) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const imgs = Array.from(doc.querySelectorAll('img[src^="cid:"]'));
  if (imgs.length === 0) return html;
  await Promise.all(
    imgs.map(async (img) => {
      const cid = (img.getAttribute("src") ?? "").slice(4).replace(/^<|>$/g, "");
      const attachment = cidAttachments.find((item) => (item.content_id ?? "").replace(/^<|>$/g, "") === cid);
      if (!attachment) return;
      try {
        const { blob } = await downloadAttachment(folder, uid, attachment.part);
        img.setAttribute("src", await blobToDataUrl(blob));
      } catch {
        // leave the cid: src - renders as a broken-image icon, same
        // fallback as any other image that fails to load
      }
    }),
  );
  return doc.body.innerHTML;
}

/** Downloads every non-inline attachment on the original message as a
 * File, for ComposeInitial.attachmentFiles. Best-effort per file, same
 * reasoning as resolveInlineCidImages. */
async function downloadForwardAttachments(folder: string, uid: number, attachments: MailAttachmentInfo[]): Promise<File[]> {
  const regular = attachments.filter((item) => !item.content_id);
  const files = await Promise.all(
    regular.map(async (attachment) => {
      try {
        const { blob, filename } = await downloadAttachment(folder, uid, attachment.part);
        return new File([blob], filename || attachment.filename, { type: attachment.content_type });
      } catch {
        return null;
      }
    }),
  );
  return files.filter((file): file is File => file !== null);
}

/** Builds the ComposeInitial for reply/replyAll/forward from a fully-loaded
 * message detail — shared by the reply bar inside a thread card and the
 * `r`/`a`/`f` keyboard shortcuts, which fetch the detail themselves. */
export async function buildReplyInitial(detail: MailMessageDetail, mode: ComposeMode, accountAddress: string): Promise<ComposeInitial> {
  if (mode === "reply") {
    return {
      mode,
      to: [detail.sender.email],
      subject: prefixSubject(detail.subject, "Re:"),
      quoteHtml: buildQuoteHtml(detail),
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
      quoteHtml: buildQuoteHtml(detail),
      replyToMessageId: detail.message_id,
    };
  }
  const [quoteHtml, attachmentFiles] = await Promise.all([
    resolveInlineCidImages(buildQuoteHtml(detail), detail.folder, detail.uid, detail.attachments),
    downloadForwardAttachments(detail.folder, detail.uid, detail.attachments),
  ]);
  return {
    mode: "forward",
    subject: prefixSubject(detail.subject, "Fwd:"),
    quoteHtml,
    attachmentFiles,
  };
}
