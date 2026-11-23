import type { CountItem } from "@/lib/types";

export const PALETTE = ["#dfa247", "var(--c2)", "#ff7e05", "#2f8f5b", "#6b8fd6", "#b8566b", "#8a6bbf", "#4aa3a0"];

/** Month columns, oldest to newest; the current month is highlighted in orange. */
export function MonthlyBars({ items }: { items: CountItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="bars" role="img" aria-label="Entries per month">
      {items.map((item, index) => (
        <div className="col" key={item.label} title={`${item.label}: ${item.count}`}>
          <span className="val">{item.count || ""}</span>
          <div
            className="bar"
            style={{ height: `${Math.max(item.count ? 4 : 0, (item.count / max) * 100)}%`, animationDelay: `${index * 40}ms` }}
          />
          <span className="mo">{item.label.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

/** Horizontal ranked bars. */
export function HBars({ items, tone = "var(--c2)" }: { items: CountItem[]; tone?: string }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="hbars">
      {items.map((item, index) => (
        <div className="hbar" key={item.label}>
          <div className="top">
            <span>{item.label}</span>
            <b>{item.count}</b>
          </div>
          <div className="track">
            <div
              className="fill"
              style={{ width: `${(item.count / max) * 100}%`, animationDelay: `${index * 60}ms`, ["--tone" as string]: tone }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Donut with a legend. */
export function Donut({ items, centerLabel }: { items: CountItem[]; centerLabel: string }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={centerLabel}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--line-soft)" strokeWidth="16" />
        {total > 0 &&
          items.map((item, index) => {
            const length = (item.count / total) * circumference;
            const circle = (
              <circle
                key={item.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={PALETTE[index % PALETTE.length]}
                strokeWidth="16"
                strokeDasharray={`${Math.max(length - 2, 0)} ${circumference - Math.max(length - 2, 0)}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              />
            );
            offset += length;
            return circle;
          })}
        <text x="70" y="68" textAnchor="middle" fontSize="24" fontWeight="600" fill="var(--heading)">
          {total}
        </text>
        <text x="70" y="86" textAnchor="middle" fontSize="11" fill="var(--muted)">
          {centerLabel}
        </text>
      </svg>
      <div className="legend">
        {items.map((item, index) => (
          <div key={item.label}>
            <i style={{ background: PALETTE[index % PALETTE.length] }} />
            <span>{item.label}</span>
            <b>{item.count}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
