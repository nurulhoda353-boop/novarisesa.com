"use client";

import { useEffect, useRef } from "react";

export interface SearchFilters {
  from_contains: string;
  has_attachment: boolean;
  since: string;
  before: string;
}

export const EMPTY_FILTERS: SearchFilters = { from_contains: "", has_attachment: false, since: "", before: "" };

export function hasActiveFilters(filters: SearchFilters): boolean {
  return Boolean(filters.from_contains || filters.has_attachment || filters.since || filters.before);
}

export function SearchFilterPopover({
  filters,
  onChange,
  onApply,
  onClose,
}: {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  return (
    <div ref={ref} className="popover" style={{ top: "calc(100% + 8px)", right: 0, left: "auto", width: 300, padding: 16 }}>
      <div className="form-group" style={{ marginBottom: 14 }}>
        <label>From contains</label>
        <input
          className="form-input"
          placeholder="name@example.com"
          value={filters.from_contains}
          onChange={(event) => onChange({ ...filters, from_contains: event.target.value })}
        />
      </div>
      <div className="form-row" style={{ marginBottom: 14 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Since</label>
          <input
            className="form-input"
            type="date"
            value={filters.since}
            onChange={(event) => onChange({ ...filters, since: event.target.value })}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Before</label>
          <input
            className="form-input"
            type="date"
            value={filters.before}
            onChange={(event) => onChange({ ...filters, before: event.target.value })}
          />
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={filters.has_attachment}
          onChange={(event) => onChange({ ...filters, has_attachment: event.target.checked })}
        />
        Has attachment
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-secondary sm"
          onClick={() => {
            onChange(EMPTY_FILTERS);
          }}
        >
          Clear
        </button>
        <div className="spacer" />
        <button
          className="btn btn-primary sm"
          onClick={() => {
            onApply();
            onClose();
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
