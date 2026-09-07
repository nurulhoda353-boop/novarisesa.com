"use client";

import {
  AlertOctagon,
  Archive,
  Clock,
  FileText,
  Inbox as InboxIcon,
  Pencil,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { SYSTEM_FOLDERS } from "@/lib/types";

export interface RailCounts {
  inboxUnread: number;
  draftCount: number;
  snoozeCount: number;
}

export function Sidebar({
  collapsed,
  mobileOpen,
  activeFolder,
  counts,
  onSelectFolder,
  onCompose,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  activeFolder: string;
  counts: RailCounts;
  onSelectFolder: (folder: string) => void;
  onCompose: () => void;
}) {
  const items: { key: string; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: SYSTEM_FOLDERS.inbox, label: "Inbox", icon: <InboxIcon size={18} />, count: counts.inboxUnread || undefined },
    { key: SYSTEM_FOLDERS.starred, label: "Starred", icon: <Star size={18} /> },
    { key: SYSTEM_FOLDERS.snoozed, label: "Snoozed", icon: <Clock size={18} />, count: counts.snoozeCount || undefined },
    { key: SYSTEM_FOLDERS.sent, label: "Sent", icon: <Send size={18} /> },
    { key: SYSTEM_FOLDERS.drafts, label: "Drafts", icon: <FileText size={18} />, count: counts.draftCount || undefined },
    { key: SYSTEM_FOLDERS.archive, label: "Archive", icon: <Archive size={18} /> },
    { key: SYSTEM_FOLDERS.spam, label: "Spam", icon: <AlertOctagon size={18} /> },
    { key: SYSTEM_FOLDERS.trash, label: "Trash", icon: <Trash2 size={18} /> },
  ];

  return (
    <nav className={`rail ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      <button className="compose-btn" onClick={onCompose}>
        <Pencil size={18} />
        <span>Compose</span>
      </button>
      <div className="rail-nav">
        {items.map((item) => (
          <button
            key={item.key}
            className={`rail-item ${activeFolder === item.key ? "active" : ""}`}
            onClick={() => onSelectFolder(item.key)}
            title={item.label}
          >
            {item.icon}
            <span className="label">{item.label}</span>
            {item.count ? <span className="count">{item.count}</span> : null}
          </button>
        ))}
      </div>
    </nav>
  );
}
