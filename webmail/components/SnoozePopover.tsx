"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

export interface SnoozeTarget {
  anchor: HTMLElement;
}

function atTime(base: Date, hour: number, minute = 0): Date {
  const date = new Date(base);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function nextWeekday(base: Date, weekday: number): Date {
  const date = new Date(base);
  const diff = (weekday - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + diff);
  return atTime(date, 9);
}

export function SnoozePopover({ anchor, onPick, onClose }: { anchor: HTMLElement; onPick: (date: Date) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const rect = anchor.getBoundingClientRect();

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node) && event.target !== anchor) onClose();
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [anchor, onClose]);

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekend = nextWeekday(now, 6);

  const presets: { label: string; date: Date }[] = [
    { label: "Later today", date: new Date(now.getTime() + 3 * 60 * 60 * 1000) },
    { label: "Tomorrow morning", date: atTime(tomorrow, 9) },
    { label: "This weekend", date: weekend },
    { label: "Next week", date: nextWeekday(now, 1) },
  ];

  return (
    <div
      ref={ref}
      className="popover"
      style={{ top: rect.bottom + 6, left: Math.max(8, rect.right - 240) }}
    >
      {!showCustom ? (
        <>
          {presets.map((preset) => (
            <button key={preset.label} className="popover-item" onClick={() => onPick(preset.date)}>
              <Clock size={15} />
              <span style={{ flex: 1 }}>{preset.label}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                {preset.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </button>
          ))}
          <div className="popover-divider" />
          <button className="popover-item" onClick={() => setShowCustom(true)}>
            <Clock size={15} /> Pick date &amp; time
          </button>
        </>
      ) : (
        <div style={{ padding: 8 }}>
          <input
            type="datetime-local"
            className="form-input"
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            min={new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
          />
          <button
            className="btn btn-primary sm"
            style={{ marginTop: 10, width: "100%" }}
            disabled={!customValue}
            onClick={() => customValue && onPick(new Date(customValue))}
          >
            Snooze
          </button>
        </div>
      )}
    </div>
  );
}
