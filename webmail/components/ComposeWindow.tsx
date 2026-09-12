"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Eraser,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  MoreVertical,
  Palette,
  Paperclip,
  Printer,
  Quote,
  Send,
  Smile,
  Strikethrough,
  Trash2,
  Type as FontIcon,
  Underline,
  X,
} from "lucide-react";
import * as api from "@/lib/api";
import type { ComposeInitial, MailAccount, SendAttachment, SendMailRequest } from "@/lib/types";
import { formatBytes } from "@/lib/format";
import { attachmentIcon } from "@/lib/attachment-style";
import { useToast } from "@/lib/toast";
import { ChipInput } from "./ChipInput";

export interface ComposeWindowHandle {
  id: number;
  initial: ComposeInitial;
}

const TEXT_COLORS = ["#0b1739", "#3a4658", "#d64545", "#dfa247", "#1e9e63", "#3563e9", "#9455d3"];
const HIGHLIGHT_COLORS = [
  { value: "#fff3c4", label: "Yellow" },
  { value: "#c7f0d8", label: "Green" },
  { value: "#ffd9d9", label: "Red" },
  { value: "#d8e6ff", label: "Blue" },
  { value: "#eadcff", label: "Purple" },
  { value: "transparent", label: "None" },
];
const FONT_SIZES: [string, string][] = [
  ["Small", "2"],
  ["Normal", "3"],
  ["Large", "5"],
  ["Huge", "7"],
];
const EMOJIS = [
  "😀", "😂", "🙂", "😉", "😍", "🤔", "😮", "😢", "😎", "🙏",
  "👍", "👏", "🎉", "🔥", "❤️", "✅", "⚠️", "📌", "💡", "🚀",
];

function atHour(base: Date, hour: number): Date {
  const next = new Date(base);
  next.setHours(hour, 0, 0, 0);
  return next;
}

function nextWeekday(base: Date, isoWeekday: number): Date {
  const diff = (isoWeekday - (base.getDay() || 7) + 7) % 7;
  const target = new Date(base);
  target.setDate(target.getDate() + (diff === 0 ? 7 : diff));
  return atHour(target, 9);
}

function sendLaterPresets(): { label: string; date: Date }[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return [
    { label: "Later today", date: new Date(now.getTime() + 3 * 60 * 60 * 1000) },
    { label: "Tomorrow morning", date: atHour(tomorrow, 9) },
    { label: "Monday morning", date: nextWeekday(now, 1) },
  ];
}

function formatWhen(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ComposeWindow({
  handle,
  account,
  onClose,
  onSendRequest,
}: {
  handle: ComposeWindowHandle;
  account: MailAccount;
  onClose: (id: number) => void;
  onSendRequest: (payload: SendMailRequest, meta: { draftId: string | null; files: File[]; initial: ComposeInitial }) => void;
}) {
  const { initial } = handle;
  const [to, setTo] = useState<string[]>(initial.to ?? []);
  const [cc, setCc] = useState<string[]>(initial.cc ?? []);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState((initial.cc?.length ?? 0) > 0);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(initial.subject ?? "");
  const [attachments, setAttachments] = useState<File[]>(initial.attachmentFiles ?? []);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(initial.draftId ?? null);
  const [sendAddresses, setSendAddresses] = useState<string[]>([account.address]);
  const [fromAddress, setFromAddress] = useState(initial.fromAddress ?? account.address);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [plainText, setPlainText] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showSendLater, setShowSendLater] = useState(false);
  const [customSendAt, setCustomSendAt] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!editorRef.current) return;
    const signature = account.signature ? `<br/><br/>${account.signature.replace(/\n/g, "<br/>")}` : "";
    editorRef.current.innerHTML = `${initial.bodyHtml ?? ""}${signature}${initial.quoteHtml ?? ""}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api
      .listAliases()
      .then((aliases) => {
        const addresses = aliases.map((item) => item.address).filter((value): value is string => !!value);
        if (addresses.length > 0) setSendAddresses([account.address, ...addresses]);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clicking a toolbar button that opens a popover (font size, colors,
  // emoji) moves focus off the contentEditable div, which collapses/
  // drops whatever text was selected there - by the time the user then
  // clicks a size or color inside the popover, execCommand would apply
  // to nothing. Saved on mousedown (fires before the blur) and restored
  // right before every execCommand call.
  const savedRangeRef = useRef<Range | null>(null);

  function saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
  }

  function exec(command: string, value?: string) {
    restoreSelection();
    document.execCommand(command, false, value);
  }

  function insertLink() {
    const url = window.prompt("Link URL");
    if (url) exec("createLink", url);
  }

  function togglePlainText() {
    if (!editorRef.current) return;
    if (!plainText) {
      // Dropping into plain text mode discards formatting/inline images for
      // good, the same one-way trade Gmail's own toggle makes.
      editorRef.current.innerText = editorRef.current.innerText;
    }
    setPlainText((value) => !value);
  }

  function handlePrint() {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(
      `<html><head><title>${subject || "Message"}</title></head><body>${editorRef.current?.innerHTML ?? ""}</body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  }

  function insertImageDataUrl(dataUrl: string) {
    editorRef.current?.focus();
    const cid = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    exec("insertHTML", `<img src="${dataUrl}" data-cid="${cid}" style="max-width:100%;">`);
  }

  function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => insertImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  function handleEditorPaste(event: ClipboardEvent<HTMLDivElement>) {
    if (plainText) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageFile(file);
        return;
      }
    }
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    for (const file of files) {
      if (!plainText && file.type.startsWith("image/")) handleImageFile(file);
      else setAttachments((prev) => [...prev, file]);
    }
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

  // Split a composed HTML body's <img src="data:..."> tags out into
  // separate inline attachments referenced by cid: - the shape the SMTP
  // side (and every real email client on the receiving end) expects,
  // rather than a multi-megabyte data: URL sitting in the HTML itself.
  function extractInlineImages(html: string): { html: string; inline: SendAttachment[] } {
    if (typeof document === "undefined") return { html, inline: [] };
    const container = document.createElement("div");
    container.innerHTML = html;
    const inline: SendAttachment[] = [];
    container.querySelectorAll('img[src^="data:"]').forEach((img, index) => {
      const src = img.getAttribute("src") || "";
      const match = /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]*)$/.exec(src);
      if (!match) return;
      const [, contentType, base64] = match;
      const cid = img.getAttribute("data-cid") || `inline-${index}-${Date.now()}`;
      const extension = contentType.split("/")[1] || "png";
      inline.push({
        filename: `${cid}.${extension}`,
        content_type: contentType,
        content_base64: base64,
        content_id: cid,
        is_inline: true,
      });
      img.setAttribute("src", `cid:${cid}`);
      img.removeAttribute("data-cid");
    });
    return { html: container.innerHTML, inline };
  }

  async function buildPayload(): Promise<Omit<SendMailRequest, "from_address"> & { from_address: string | null }> {
    const rawHtml = editorRef.current?.innerHTML ?? "";
    const textBody = editorRef.current?.innerText ?? "";
    const { html: cleanedHtml, inline } = plainText ? { html: "", inline: [] } : extractInlineImages(rawHtml);
    const fileAttachments: SendAttachment[] = await Promise.all(
      attachments.map(async (file) => ({
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        content_base64: await fileToBase64(file),
      })),
    );
    return {
      to,
      cc,
      bcc,
      subject,
      text_body: textBody,
      html_body: plainText ? null : cleanedHtml,
      reply_to_message_id: initial.replyToMessageId ?? null,
      attachments: [...fileAttachments, ...inline],
      from_address: fromAddress !== account.address ? fromAddress : null,
    };
  }

  async function handleSend() {
    if (to.length === 0) {
      toast.show("Add at least one recipient");
      return;
    }
    const payload = await buildPayload();
    onSendRequest(payload as SendMailRequest, {
      draftId,
      files: attachments,
      initial: { ...initial, to, cc, subject, bodyHtml: payload.html_body ?? "", fromAddress, attachmentFiles: attachments },
    });
    onClose(handle.id);
  }

  async function handleSendLater(date: Date) {
    if (to.length === 0) {
      toast.show("Add at least one recipient");
      return;
    }
    const payload = await buildPayload();
    try {
      const scheduled = await api.scheduleSend({ ...payload, send_at: date.toISOString() });
      if (draftId) await api.deleteDraft(draftId).catch(() => {});
      toast.show(`Scheduled for ${formatWhen(date)}`, {
        actionLabel: "Cancel",
        onAction: () => {
          api.cancelScheduledSend(scheduled.id).catch(() => {
            toast.show("Could not cancel — check Sent, it may have gone out already");
          });
        },
      });
      onClose(handle.id);
    } catch {
      toast.show("Could not schedule this message");
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
    <div
      className={`compose-dock ${minimized ? "minimized" : ""} ${maximized ? "maximized" : ""} ${dragActive ? "drag-active" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
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
          {sendAddresses.length > 1 && (
            <div className="field-row" style={{ position: "relative" }}>
              <label>From</label>
              <button className="from-picker" onClick={() => setShowFromPicker((v) => !v)}>
                {fromAddress}
                <ChevronDown size={13} />
              </button>
              {showFromPicker && (
                <div className="popover" style={{ top: "calc(100% + 4px)", left: 40 }}>
                  {sendAddresses.map((address) => (
                    <button
                      key={address}
                      className="popover-item"
                      onClick={() => {
                        setFromAddress(address);
                        setShowFromPicker(false);
                      }}
                    >
                      {address}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
            onPaste={handleEditorPaste}
          />
          {dragActive && (
            <div className="compose-drop-hint">Drop to attach{plainText ? "" : " (images insert inline)"}</div>
          )}
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
          {!plainText && (
            <div className="compose-editor-toolbar">
              <button onClick={() => exec("bold")} title="Bold"><Bold size={16} /></button>
              <button onClick={() => exec("italic")} title="Italic"><Italic size={16} /></button>
              <button onClick={() => exec("underline")} title="Underline"><Underline size={16} /></button>
              <button onClick={() => exec("strikeThrough")} title="Strikethrough"><Strikethrough size={16} /></button>
              <span className="toolbar-divider" />
              <div className="toolbar-popover-anchor">
                <button onMouseDown={saveSelection} onClick={() => setShowFontSize((v) => !v)} title="Font size">
                  <FontIcon size={16} />
                </button>
                {showFontSize && (
                  <div className="toolbar-popover menu" onMouseLeave={() => setShowFontSize(false)}>
                    {FONT_SIZES.map(([label, value]) => (
                      <button key={value} onClick={() => { exec("fontSize", value); setShowFontSize(false); }}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="toolbar-popover-anchor">
                <button onMouseDown={saveSelection} onClick={() => setShowTextColor((v) => !v)} title="Text color">
                  <Palette size={16} />
                </button>
                {showTextColor && (
                  <div className="toolbar-popover swatches" onMouseLeave={() => setShowTextColor(false)}>
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color}
                        className="swatch"
                        style={{ background: color }}
                        title={color}
                        onClick={() => { exec("foreColor", color); setShowTextColor(false); }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="toolbar-popover-anchor">
                <button onMouseDown={saveSelection} onClick={() => setShowHighlight((v) => !v)} title="Highlight color">
                  <Highlighter size={16} />
                </button>
                {showHighlight && (
                  <div className="toolbar-popover swatches" onMouseLeave={() => setShowHighlight(false)}>
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        className="swatch"
                        style={{ background: color.value === "transparent" ? "#fff" : color.value }}
                        title={color.label}
                        onClick={() => { exec("hiliteColor", color.value); setShowHighlight(false); }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <span className="toolbar-divider" />
              <button onClick={() => exec("justifyLeft")} title="Align left"><AlignLeft size={16} /></button>
              <button onClick={() => exec("justifyCenter")} title="Align center"><AlignCenter size={16} /></button>
              <button onClick={() => exec("justifyRight")} title="Align right"><AlignRight size={16} /></button>
              <span className="toolbar-divider" />
              <button onClick={() => exec("insertUnorderedList")} title="Bulleted list"><List size={16} /></button>
              <button onClick={() => exec("insertOrderedList")} title="Numbered list"><ListOrdered size={16} /></button>
              <button onClick={() => exec("outdent")} title="Decrease indent"><IndentDecrease size={16} /></button>
              <button onClick={() => exec("indent")} title="Increase indent"><IndentIncrease size={16} /></button>
              <button onClick={() => exec("formatBlock", "blockquote")} title="Quote"><Quote size={16} /></button>
              <span className="toolbar-divider" />
              <button onClick={insertLink} title="Insert link"><LinkIcon size={16} /></button>
              <div className="toolbar-popover-anchor">
                <button onMouseDown={saveSelection} onClick={() => setShowEmoji((v) => !v)} title="Emoji"><Smile size={16} /></button>
                {showEmoji && (
                  <div className="toolbar-popover emoji-grid" onMouseLeave={() => setShowEmoji(false)}>
                    {EMOJIS.map((emoji) => (
                      <button key={emoji} onClick={() => { exec("insertText", emoji); setShowEmoji(false); }}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onMouseDown={saveSelection} onClick={() => imageInputRef.current?.click()} title="Insert photo"><ImageIcon size={16} /></button>
              <button onClick={() => exec("removeFormat")} title="Remove formatting"><Eraser size={16} /></button>
              <div className="toolbar-popover-anchor" style={{ marginLeft: "auto" }}>
                <button onClick={() => setShowMore((v) => !v)} title="More options"><MoreVertical size={16} /></button>
                {showMore && (
                  <div className="toolbar-popover menu align-right" onMouseLeave={() => setShowMore(false)}>
                    <button onClick={() => { togglePlainText(); setShowMore(false); }}>Plain text mode</button>
                    <button onClick={() => { handlePrint(); setShowMore(false); }}>
                      <Printer size={14} style={{ marginRight: 6 }} /> Print
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {plainText && (
            <div className="compose-editor-toolbar">
              <span className="plain-text-label">Plain text mode</span>
              <button
                className="link-button"
                style={{ marginLeft: "auto" }}
                onClick={() => setPlainText(false)}
              >
                Rich formatting
              </button>
            </div>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const file = event.target.files?.[0];
              if (file) handleImageFile(file);
              event.target.value = "";
            }}
          />
          <div className="compose-footer">
            <div className="send-split">
              <button className="btn btn-primary send-main" onClick={handleSend}>
                <Send size={15} /> Send
              </button>
              <button className="btn btn-primary send-caret" onClick={() => setShowSendLater((v) => !v)} title="Schedule send">
                <ChevronDown size={14} />
              </button>
              {showSendLater && (
                <div className="toolbar-popover menu send-later-menu" onMouseLeave={() => setShowSendLater(false)}>
                  <div className="popover-title">Schedule send</div>
                  {sendLaterPresets().map((preset) => (
                    <button key={preset.label} onClick={() => { setShowSendLater(false); handleSendLater(preset.date); }}>
                      <span>{preset.label}</span>
                      <span className="preset-time">{formatWhen(preset.date)}</span>
                    </button>
                  ))}
                  <div className="custom-datetime">
                    <input
                      type="datetime-local"
                      value={customSendAt}
                      onChange={(event) => setCustomSendAt(event.target.value)}
                    />
                    <button
                      disabled={!customSendAt}
                      onClick={() => {
                        if (!customSendAt) return;
                        setShowSendLater(false);
                        handleSendLater(new Date(customSendAt));
                      }}
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              )}
            </div>
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
