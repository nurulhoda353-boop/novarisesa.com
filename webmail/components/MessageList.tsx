"use client";

import {
  Archive,
  Check,
  ChevronDown,
  Clock,
  Inbox,
  Mail,
  MailOpen,
  Minus,
  Paperclip,
  Star,
  Trash2,
} from "lucide-react";
import type { MailMessageSummary } from "@/lib/types";
import { SYSTEM_FOLDERS } from "@/lib/types";
import { avatarColorFor } from "@/lib/avatar";
import { displayName, initials, listTimestamp } from "@/lib/format";

export function MessageList({
  folder,
  messages,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onOpen,
  onToggleStar,
  onArchive,
  onDelete,
  onSnooze,
  onMarkRead,
  hasMore,
  loadingMore,
  onLoadMore,
  loading,
  readOnly,
}: {
  folder: string;
  messages: MailMessageSummary[];
  selected: Set<number>;
  onToggleSelect: (uid: number) => void;
  onToggleSelectAll: () => void;
  onOpen: (message: MailMessageSummary) => void;
  onToggleStar: (message: MailMessageSummary) => void;
  onArchive: (message: MailMessageSummary) => void;
  onDelete: (message: MailMessageSummary) => void;
  onSnooze: (message: MailMessageSummary, anchor: HTMLElement) => void;
  onMarkRead: (message: MailMessageSummary, value: boolean) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  loading: boolean;
  /** Members can't archive mail at all (admin-only per the access policy) -
      keep the button visible but disabled with an explanation, rather than
      hiding it (which just looks broken) or letting it fail silently
      against the backend's 403. Delete is different: a member's click
      still goes through (onDelete branches to a request-to-admin instead
      of a real delete - see MailApp), so it's never disabled here. */
  readOnly?: boolean;
}) {
  const allSelected = messages.length > 0 && selected.size === messages.length;
  const someSelected = selected.size > 0 && !allSelected;
  const showArchive = folder === SYSTEM_FOLDERS.inbox;
  const isTrash = folder === SYSTEM_FOLDERS.trash;
  const restrictedTitle = "Members can't archive mail — ask your admin";
  const deleteTitle = readOnly ? "Request deletion from admin" : isTrash ? "Delete forever" : "Move to trash";
  const showSnooze = !(
    [SYSTEM_FOLDERS.snoozed, SYSTEM_FOLDERS.drafts, SYSTEM_FOLDERS.sent, SYSTEM_FOLDERS.trash] as string[]
  ).includes(folder);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="list-toolbar">
        <button
          className={`checkbox ${allSelected ? "checked" : someSelected ? "indeterminate" : ""}`}
          onClick={onToggleSelectAll}
        >
          {allSelected && <Check size={12} />}
          {someSelected && <Minus size={12} />}
        </button>
        {selected.size > 0 ? (
          <>
            <button className="icon-btn" title="Mark as read" onClick={() => selected.forEach((uid) => {
              const message = messages.find((item) => item.uid === uid);
              if (message) onMarkRead(message, true);
            })}>
              <MailOpen size={17} />
            </button>
            <button className="icon-btn" title="Mark as unread" onClick={() => selected.forEach((uid) => {
              const message = messages.find((item) => item.uid === uid);
              if (message) onMarkRead(message, false);
            })}>
              <Mail size={17} />
            </button>
            {showArchive && (
              <button
                className="icon-btn"
                title={readOnly ? restrictedTitle : "Archive"}
                disabled={readOnly}
                onClick={() => selected.forEach((uid) => {
                  const message = messages.find((item) => item.uid === uid);
                  if (message) onArchive(message);
                })}
              >
                <Archive size={17} />
              </button>
            )}
            <button
              className="icon-btn"
              title={deleteTitle}
              onClick={() => selected.forEach((uid) => {
                const message = messages.find((item) => item.uid === uid);
                if (message) onDelete(message);
              })}
            >
              <Trash2 size={17} />
            </button>
          </>
        ) : (
          <span className="page-info">{messages.length} conversations</span>
        )}
        <div className="spacer" />
      </div>

      <div className="message-list">
        {loading && messages.length === 0 ? (
          <div className="empty-state">
            <p>Loading…</p>
          </div>
        ) : messages.length === 0 ? (
          <EmptyFolder folder={folder} />
        ) : (
          messages.map((message) => (
            <MessageRow
              key={message.uid}
              message={message}
              selected={selected.has(message.uid)}
              onToggleSelect={() => onToggleSelect(message.uid)}
              onOpen={() => onOpen(message)}
              onToggleStar={() => onToggleStar(message)}
              onArchive={showArchive ? () => onArchive(message) : undefined}
              onDelete={() => onDelete(message)}
              onSnooze={showSnooze ? (anchor) => onSnooze(message, anchor) : undefined}
              readOnly={readOnly}
              restrictedTitle={restrictedTitle}
              deleteTitle={deleteTitle}
            />
          ))
        )}
        {hasMore && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <button className="btn btn-secondary sm" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load more"}
              <ChevronDown size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageRow({
  message,
  selected,
  onToggleSelect,
  onOpen,
  onToggleStar,
  onArchive,
  onDelete,
  onSnooze,
  readOnly,
  restrictedTitle,
  deleteTitle,
}: {
  message: MailMessageSummary;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onToggleStar: () => void;
  onArchive?: () => void;
  onDelete: () => void;
  onSnooze?: (anchor: HTMLElement) => void;
  readOnly?: boolean;
  restrictedTitle?: string;
  deleteTitle: string;
}) {
  const unread = !message.flags.includes("\\Seen");
  const starred = message.flags.includes("\\Flagged");
  const from = message.sender;

  return (
    <div
      className={`message-row ${unread ? "unread" : ""} ${selected ? "selected" : ""}`}
      onClick={onOpen}
    >
      <div className="col-center" onClick={(event) => { event.stopPropagation(); onToggleSelect(); }}>
        <span className={`checkbox ${selected ? "checked" : ""}`}>{selected && <Check size={12} />}</span>
      </div>
      <div className="col-center" onClick={(event) => { event.stopPropagation(); onToggleStar(); }}>
        <button className={`star-btn ${starred ? "active" : ""}`}>
          <Star size={17} fill={starred ? "currentColor" : "none"} />
        </button>
      </div>
      <span
        className="avatar sm"
        style={{ background: avatarColorFor(from.email) }}
      >
        {initials(from.name, from.email)}
      </span>
      <span className="sender">{displayName(from.name, from.email)}</span>
      <div className="subject-line">
        <span className="subject">{message.subject || "(no subject)"}</span>
        <span className="preview">— {message.preview}</span>
        {message.has_attachments && <Paperclip size={13} color="var(--muted)" />}
      </div>
      <div className="meta">
        <span className="hover-actions">
          {onSnooze && (
            <button className="icon-btn" title="Snooze" onClick={(event) => { event.stopPropagation(); onSnooze(event.currentTarget); }}>
              <Clock size={16} />
            </button>
          )}
          {onArchive && (
            <button
              className="icon-btn"
              title={readOnly ? restrictedTitle : "Archive"}
              disabled={readOnly}
              onClick={(event) => { event.stopPropagation(); if (!readOnly) onArchive(); }}
            >
              <Archive size={16} />
            </button>
          )}
          <button
            className="icon-btn"
            title={deleteTitle}
            onClick={(event) => { event.stopPropagation(); onDelete(); }}
          >
            <Trash2 size={16} />
          </button>
        </span>
        <span className="meta-date">{listTimestamp(message.received_at)}</span>
      </div>
    </div>
  );
}

function EmptyFolder({ folder }: { folder: string }) {
  const copy: Record<string, { title: string; body: string }> = {
    [SYSTEM_FOLDERS.inbox]: { title: "Your inbox is empty", body: "New mail will show up here." },
    [SYSTEM_FOLDERS.starred]: { title: "No starred messages", body: "Star important messages to find them faster." },
    [SYSTEM_FOLDERS.snoozed]: { title: "Nothing snoozed", body: "Snoozed messages come back at the time you choose." },
    [SYSTEM_FOLDERS.sent]: { title: "No sent messages", body: "Messages you send will appear here." },
    [SYSTEM_FOLDERS.archive]: { title: "Archive is empty", body: "Archived conversations show up here." },
    [SYSTEM_FOLDERS.spam]: { title: "No spam here", body: "Messages marked as spam will appear here." },
    [SYSTEM_FOLDERS.trash]: { title: "Trash is empty", body: "Deleted messages show up here for a while." },
  };
  const content = copy[folder] ?? { title: "Nothing here", body: "" };
  return (
    <div className="empty-state">
      <Inbox size={48} strokeWidth={1.2} />
      <h3>{content.title}</h3>
      <p>{content.body}</p>
    </div>
  );
}
