"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { FileText, Trash2 } from "lucide-react";
import * as api from "@/lib/api";
import type { ComposeInitial, DraftInfo } from "@/lib/types";
import { listTimestamp } from "@/lib/format";
import { useToast } from "@/lib/toast";

export function DraftsList({ onOpenDraft, refreshKey }: { onOpenDraft: (initial: ComposeInitial) => void; refreshKey: number }) {
  const [drafts, setDrafts] = useState<DraftInfo[] | null>(null);
  const toast = useToast();

  useEffect(() => {
    api.listDrafts().then(setDrafts).catch(() => setDrafts([]));
  }, [refreshKey]);

  async function remove(id: string, event: MouseEvent) {
    event.stopPropagation();
    try {
      await api.deleteDraft(id);
      setDrafts((prev) => (prev ?? []).filter((item) => item.id !== id));
    } catch {
      toast.show("Could not delete the draft");
    }
  }

  if (drafts === null) {
    return (
      <div className="empty-state">
        <p>Loading…</p>
      </div>
    );
  }
  if (drafts.length === 0) {
    return (
      <div className="empty-state">
        <FileText size={48} strokeWidth={1.2} />
        <h3>No drafts</h3>
        <p>Messages you start but don&rsquo;t send are saved here.</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {drafts.map((draft) => (
        <div
          className="message-row"
          key={draft.id}
          style={{ gridTemplateColumns: "44px 1fr auto" }}
          onClick={() =>
            onOpenDraft({
              mode: "new",
              to: draft.to,
              cc: draft.cc,
              subject: draft.subject,
              bodyHtml: draft.html_body ?? draft.text_body,
              draftId: draft.id,
            })
          }
        >
          <span style={{ color: "var(--danger)", fontSize: 12, fontWeight: 700 }}>Draft</span>
          <div className="subject-line">
            <span className="subject">{draft.subject || "(no subject)"}</span>
            <span className="preview">— {draft.to.join(", ") || "No recipients"}</span>
          </div>
          <div className="meta">
            <button className="icon-btn" onClick={(event) => remove(draft.id, event)} title="Delete draft">
              <Trash2 size={16} />
            </button>
            <span>{listTimestamp(draft.updated_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
