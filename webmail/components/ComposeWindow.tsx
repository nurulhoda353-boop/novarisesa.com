"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Paperclip,
  Send,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import * as api from "@/lib/api";
import type { ComposeInitial, MailAccount, SendAttachment } from "@/lib/types";
import { formatBytes } from "@/lib/format";
import { attachmentIcon } from "@/lib/attachment-style";
import { useToast } from "@/lib/toast";
import { ChipInput } from "./ChipInput";

export interface ComposeWindowHandle {
  id: number;
  initial: ComposeInitial;
}

export function ComposeWindow({
  handle,
  account,
  onClose,
}: {
  handle: ComposeWindowHandle;
  account: MailAccount;
  onClose: (id: number) => void;
}) {
  const { initial } = handle;
  const [to, setTo] = useState<string[]>(initial.to ?? []);
  const [cc, setCc] = useState<string[]>(initial.cc ?? []);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState((initial.cc?.length ?? 0) > 0);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(initial.subject ?? "");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(initial.draftId ?? null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!editorRef.current) return;
    const signature = account.signature ? `<br/><br/>${account.signature.replace(/\n/g, "<br/>")}` : "";
    editorRef.current.innerHTML = `${initial.bodyHtml ?? ""}${signature}${initial.quoteHtml ?? ""}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function insertLink() {
    const url = window.prompt("Link URL");
    if (url) exec("createLink", url);
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSend() {
    if (to.length === 0) {
      toast.show("Add at least one recipient");
      return;
    }
    setSending(true);
    try {
      const htmlBody = editorRef.current?.innerHTML ?? "";
      const textBody = editorRef.current?.innerText ?? "";
      const sendAttachments: SendAttachment[] = await Promise.all(
        attachments.map(async (file) => ({
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          content_base64: await fileToBase64(file),
        })),
      );
      await api.sendMessage({
        to,
        cc,
        bcc,
        subject,
        text_body: textBody,
        html_body: htmlBody,
        reply_to_message_id: initial.replyToMessageId ?? null,
        attachments: sendAttachments,
      });
      if (draftId) await api.deleteDraft(draftId).catch(() => {});
      toast.show("Message sent");
      onClose(handle.id);
    } catch {
      toast.show("Could not send the message. It's still here — try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleDiscard() {
    if (draftId) await api.deleteDraft(draftId).catch(() => {});
    onClose(handle.id);
  }

  async function handleCloseAndSaveDraft() {
    const htmlBody = editorRef.current?.innerHTML ?? "";
    const hasContent = to.length > 0 || subject.trim() || htmlBody.replace(/<[^>]+>/g, "").trim();
    if (!hasContent) {
      onClose(handle.id);
      return;
    }
    try {
      const payload = { to, cc, bcc, subject, text_body: editorRef.current?.innerText ?? "", html_body: htmlBody, attachments: [] };
      if (draftId) {
        await api.updateDraft(draftId, payload);
      } else {
        const created = await api.createDraft(payload);
        setDraftId(created.id);
      }
      toast.show("Draft saved");
    } catch {
      // best-effort — don't block closing the window on a draft-save failure
    }
    onClose(handle.id);
  }

  const title = to[0] ? `${subject || "(no subject)"}` : "New message";

  return (
    <div className={`compose-dock ${minimized ? "minimized" : ""} ${maximized ? "maximized" : ""}`}>
      <div className="compose-titlebar" onClick={() => minimized && setMinimized(false)}>
        <span className="title">{title}</span>
        <div className="titlebar-actions">
          <button onClick={(event) => { event.stopPropagation(); setMinimized((v) => !v); }} title="Minimize">
            <Minus size={16} />
          </button>
          <button onClick={(event) => { event.stopPropagation(); setMaximized((v) => !v); }} title="Maximize">
            {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={(event) => { event.stopPropagation(); handleCloseAndSaveDraft(); }} title="Save & close">
            <X size={16} />
          </button>
        </div>
      </div>
      {!minimized && (
        <div className="compose-body">
          <ChipInput
            label="To"
            values={to}
            onChange={setTo}
            autoFocus={to.length === 0}
            trailing={
              !showCc || !showBcc ? (
                <div className="cc-bcc-toggle">
                  {!showCc && <button onClick={() => setShowCc(true)}>Cc</button>}
                  {!showBcc && <button onClick={() => setShowBcc(true)}>Bcc</button>}
                </div>
              ) : null
            }
          />
          {showCc && <ChipInput label="Cc" values={cc} onChange={setCc} />}
          {showBcc && <ChipInput label="Bcc" values={bcc} onChange={setBcc} />}
          <div className="compose-subject">
            <input placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          </div>
          <div
            ref={editorRef}
            className="compose-editor"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Write your message…"
          />
          {attachments.length > 0 && (
            <div className="compose-attachments">
              {attachments.map((file, index) => {
                const Icon = attachmentIcon(file.type || "application/octet-stream");
                return (
                  <span className="chip" key={`${file.name}-${index}`}>
                    <Icon size={13} />
                    {file.name} · {formatBytes(file.size)}
                    <button onClick={() => removeAttachment(index)}>
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="compose-editor-toolbar">
            <button onClick={() => exec("bold")} title="Bold"><Bold size={16} /></button>
            <button onClick={() => exec("italic")} title="Italic"><Italic size={16} /></button>
            <button onClick={() => exec("underline")} title="Underline"><Underline size={16} /></button>
            <button onClick={() => exec("insertUnorderedList")} title="Bulleted list"><List size={16} /></button>
            <button onClick={() => exec("insertOrderedList")} title="Numbered list"><ListOrdered size={16} /></button>
            <button onClick={insertLink} title="Insert link"><LinkIcon size={16} /></button>
          </div>
          <div className="compose-footer">
            <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
              <Send size={15} /> {sending ? "Sending…" : "Send"}
            </button>
            <button className="icon-btn" title="Attach files" onClick={() => fileInputRef.current?.click()}>
              <Paperclip size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(event) => handleFilesSelected(event.target.files)}
            />
            <div className="spacer" />
            <button className="icon-btn" title="Discard draft" onClick={handleDiscard}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
