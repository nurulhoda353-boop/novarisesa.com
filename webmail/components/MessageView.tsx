"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Archive,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Forward,
  Inbox as InboxIcon,
  MailOpen,
  Reply,
  ReplyAll,
  Star,
  Trash2,
} from "lucide-react";
import * as api from "@/lib/api";
import type { MailAccount, MailAttachmentInfo, MailMessageDetail, MailMessageSummary } from "@/lib/types";
import { SYSTEM_FOLDERS, type ComposeInitial } from "@/lib/types";
import type { MailThread } from "@/lib/threads";
import { avatarColorFor } from "@/lib/avatar";
import { displayName, formatBytes, fullTimestamp, initials } from "@/lib/format";
import { attachmentIcon, isImageContentType } from "@/lib/attachment-style";
import { buildReplyInitial } from "@/lib/compose-helpers";
import { replaceCidSources, sanitizeEmailHtml, wrapForIframe } from "@/lib/sanitize";
import { saveBlob } from "@/lib/download";
import { useToast } from "@/lib/toast";
import { AttachmentLightbox } from "./AttachmentLightbox";

export function MessageView({
  thread,
  folder,
  account,
  onBack,
  onThreadAction,
  onSnoozeRequest,
  onCompose,
}: {
  thread: MailThread;
  folder: string;
  account: MailAccount;
  onBack: () => void;
  onThreadAction: (action: "archive" | "trash" | "unread" | "moveToInbox") => void;
  onSnoozeRequest: (anchor: HTMLElement) => void;
  onCompose: (initial: ComposeInitial) => void;
}) {
  const latest = thread.messages[thread.messages.length - 1];
  const starred = thread.messages.some((message) => message.flags.includes("\\Flagged"));
  const toast = useToast();
  const showArchive = folder === SYSTEM_FOLDERS.inbox;
  const showMoveToInbox = (
    [SYSTEM_FOLDERS.archive, SYSTEM_FOLDERS.spam, SYSTEM_FOLDERS.trash] as string[]
  ).includes(folder);
  const isTrash = folder === SYSTEM_FOLDERS.trash;

  async function toggleThreadStar() {
    try {
      await Promise.all(thread.messages.map((message) => api.setStar(folder, message.uid, !starred)));
    } catch {
      toast.show("Could not update the star");
    }
  }

  return (
    <div className="reading-pane">
      <div className="reading-toolbar">
        <button className="icon-btn" onClick={onBack} title="Back to list">
          <ArrowLeft size={19} />
        </button>
        <div className="divider" />
        {showArchive && (
          <button className="icon-btn" title="Archive" onClick={() => onThreadAction("archive")}>
            <Archive size={19} />
          </button>
        )}
        {showMoveToInbox && (
          <button className="icon-btn" title="Move to inbox" onClick={() => onThreadAction("moveToInbox")}>
            <InboxIcon size={19} />
          </button>
        )}
        <button className="icon-btn" title={isTrash ? "Delete forever" : "Move to trash"} onClick={() => onThreadAction("trash")}>
          <Trash2 size={19} />
        </button>
        <button className="icon-btn" title="Snooze" onClick={(event) => onSnoozeRequest(event.currentTarget)}>
          <Clock size={19} />
        </button>
        <button className="icon-btn" title="Mark as unread" onClick={() => onThreadAction("unread")}>
          <MailOpen size={19} />
        </button>
        <div className="divider" />
        <button className={`icon-btn ${starred ? "active" : ""}`} title="Star" onClick={toggleThreadStar}>
          <Star size={19} fill={starred ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="reading-subject">{latest.subject || "(no subject)"}</div>
      <div className="reading-body">
        {thread.messages.map((message, index) => (
          <MessageCard
            key={message.uid}
            message={message}
            folder={folder}
            account={account}
            defaultExpanded={index === thread.messages.length - 1}
            onCompose={onCompose}
          />
        ))}
      </div>
    </div>
  );
}

function MessageCard({
  message,
  folder,
  account,
  defaultExpanded,
  onCompose,
}: {
  message: MailMessageSummary;
  folder: string;
  account: MailAccount;
  defaultExpanded: boolean;
  onCompose: (initial: ComposeInitial) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [detail, setDetail] = useState<MailMessageDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [allowRemoteImages, setAllowRemoteImages] = useState(false);
  const [hadRemoteImages, setHadRemoteImages] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("");
  const [iframeHeight, setIframeHeight] = useState(80);
  const [preview, setPreview] = useState<{ url: string; filename: string; blob: Blob } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!expanded || detail || loading) return;
    setLoading(true);
    api
      .getMessage(folder, message.uid)
      .then((result) => {
        setDetail(result);
        if (!message.flags.includes("\\Seen")) {
          api.setRead(folder, message.uid, true).catch(() => {});
        }
      })
      .catch(() => toast.show("Could not load this message"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  useEffect(() => {
    if (!detail?.html_body) {
      setIframeSrc("");
      return;
    }
    let cancelled = false;
    const isDark = document.documentElement.classList.contains("dark");
    const { html, hadRemoteImages } = sanitizeEmailHtml(detail.html_body, allowRemoteImages);
    const cidAttachments = detail.attachments.filter((item) => item.content_id);

    async function resolveCidAndRender() {
      const resolved = new Map<string, string>();
      await Promise.all(
        cidAttachments.map(async (attachment) => {
          try {
            const { blob } = await api.downloadAttachment(folder, message.uid, attachment.part);
            const url = URL.createObjectURL(blob);
            resolved.set((attachment.content_id ?? "").replace(/^<|>$/g, ""), url);
          } catch {
            // leave unresolved; the broken-image icon is an acceptable fallback
          }
        }),
      );
      if (cancelled) return;
      const withCid = replaceCidSources(html, resolved);
      setIframeSrc(wrapForIframe(withCid, isDark));
      setHadRemoteImages(hadRemoteImages);
    }
    resolveCidAndRender();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, allowRemoteImages]);

  function handleIframeLoad() {
    const doc = iframeRef.current?.contentDocument;
    if (doc?.body) setIframeHeight(Math.min(Math.max(doc.body.scrollHeight + 24, 60), 4000));
  }

  function reply() {
    if (detail) onCompose(buildReplyInitial(detail, "reply", account.address));
  }
  function replyAll() {
    if (detail) onCompose(buildReplyInitial(detail, "replyAll", account.address));
  }
  function forward() {
    if (detail) onCompose(buildReplyInitial(detail, "forward", account.address));
  }

  async function handleDownload(attachment: MailAttachmentInfo) {
    try {
      const { blob, filename } = await api.downloadAttachment(folder, message.uid, attachment.part);
      saveBlob(blob, filename || attachment.filename);
    } catch {
      toast.show("Could not download the attachment");
    }
  }

  async function handleAttachmentClick(attachment: MailAttachmentInfo) {
    if (isImageContentType(attachment.content_type)) {
      try {
        const { blob, filename } = await api.downloadAttachment(folder, message.uid, attachment.part);
        setPreview({ url: URL.createObjectURL(blob), filename: filename || attachment.filename, blob });
      } catch {
        toast.show("Could not preview the attachment");
      }
      return;
    }
    if (attachment.content_type === "application/pdf") {
      try {
        const { blob } = await api.downloadAttachment(folder, message.uid, attachment.part);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch {
        toast.show("Could not open the attachment");
      }
      return;
    }
    handleDownload(attachment);
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  const from = message.sender;

  return (
    <div className={`message-card ${expanded ? "" : "collapsed"}`}>
      <div className="message-card-head" onClick={() => setExpanded((v) => !v)}>
        <span className="avatar" style={{ background: avatarColorFor(from.email) }}>
          {initials(from.name, from.email)}
        </span>
        <div className="who">
          <strong>{displayName(from.name, from.email)}</strong>
          {expanded ? (
            <div className="to-line">to {message.recipients.map((item) => item.email).join(", ") || "me"}</div>
          ) : (
            <div className="collapsed-preview">{message.preview}</div>
          )}
        </div>
        <div className="when">
          {fullTimestamp(message.received_at)}
          {expanded ? <ChevronUp size={16} style={{ marginLeft: 8 }} /> : <ChevronDown size={16} style={{ marginLeft: 8 }} />}
        </div>
      </div>
      {expanded && (
        <div className="message-card-body">
          {loading && <p style={{ padding: "12px 0", color: "var(--muted)", fontSize: 13 }}>Loading message…</p>}
          {detail && (
            <>
              {hadRemoteImages && (
                <div className="remote-image-bar">
                  Images are hidden to protect your privacy.
                  <button onClick={() => setAllowRemoteImages(true)}>Show images</button>
                </div>
              )}
              {detail.html_body ? (
                iframeSrc && (
                  <iframe
                    ref={iframeRef}
                    srcDoc={iframeSrc}
                    sandbox="allow-same-origin allow-popups"
                    style={{ height: iframeHeight }}
                    onLoad={handleIframeLoad}
                    title="Message body"
                  />
                )
              ) : (
                <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6, padding: "8px 0" }}>{detail.text_body}</p>
              )}
              {detail.attachments.filter((item) => !item.content_id).length > 0 && (
                <div className="attachment-strip">
                  {detail.attachments
                    .filter((item) => !item.content_id)
                    .map((attachment) => {
                      const Icon = attachmentIcon(attachment.content_type);
                      const isImage = isImageContentType(attachment.content_type);
                      return (
                        <button key={attachment.part} className="attachment-card" onClick={() => handleAttachmentClick(attachment)}>
                          {!isImage && (
                            <span className="icon">
                              <Icon size={17} />
                            </span>
                          )}
                          <span className="info">
                            <span className="name">{attachment.filename}</span>
                            <span className="size">{formatBytes(attachment.size)}</span>
                          </span>
                          <Download
                            size={15}
                            className="download"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDownload(attachment);
                            }}
                          />
                        </button>
                      );
                    })}
                </div>
              )}
              <div className="reply-bar">
                <button className="btn btn-secondary sm" onClick={reply}>
                  <Reply size={14} /> Reply
                </button>
                <button className="btn btn-secondary sm" onClick={replyAll}>
                  <ReplyAll size={14} /> Reply all
                </button>
                <button className="btn btn-secondary sm" onClick={forward}>
                  <Forward size={14} /> Forward
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {preview && (
        <AttachmentLightbox url={preview.url} filename={preview.filename} blob={preview.blob} onClose={closePreview} />
      )}
    </div>
  );
}
