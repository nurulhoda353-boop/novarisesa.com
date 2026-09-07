"use client";

import { X } from "lucide-react";

const SHORTCUTS: [string, string][] = [
  ["c", "Compose new message"],
  ["/", "Focus search"],
  ["u", "Back to the message list"],
  ["e", "Archive the open conversation"],
  ["#", "Move the open conversation to trash"],
  ["r", "Reply"],
  ["a", "Reply all"],
  ["f", "Forward"],
  ["Esc", "Close compose / go back"],
  ["?", "Show this list"],
];

export function ShortcutsHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>Keyboard shortcuts</h2>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {SHORTCUTS.map(([key, label]) => (
            <div className="list-item-row" key={key}>
              <span
                style={{
                  minWidth: 32,
                  textAlign: "center",
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "var(--chip-bg)",
                  border: "1px solid var(--chip-border)",
                  fontSize: 12.5,
                  fontWeight: 700,
                  fontFamily: "monospace",
                }}
              >
                {key}
              </span>
              <span className="grow" style={{ fontSize: 13, color: "var(--ink2)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
