import type { CountItem } from "@/lib/types";

export const PALETTE = ["#dfa247", "var(--c2)", "#ff7e05", "#2f8f5b", "#6b8fd6", "#b8566b", "#8a6bbf", "#4aa3a0"];

/** Catmull-Rom spline through the points, as a cubic Bezier SVG path (soft, wave-like line). */
function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Wave line with a soft area underneath and the latest value highlighted. */
export function SmoothLine({ items }: { items: CountItem[] }) {
  const W = 560;
  const H = 210;
  const pad = { l: 34, r: 14, t: 26, b: 28 };
  const max = Math.max(4, ...items.map((item) => item.count));
  const top = Math.ceil(max / 4) * 4;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, items.length - 1);
  const y = (value: number) => pad.t + (1 - value / top) * (H - pad.t - pad.b);
  const points = items.map((item, i): [number, number] => [x(i), y(item.count)]);
  const line = smoothPath(points);
  const last = points[points.length - 1];
  const area = `${line} L${last[0]},${H - pad.b} L${points[0][0]},${H - pad.b} Z`;
  const ticks = [0, 1, 2, 3, 4].map((n) => (top / 4) * n);
  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Entries trend">
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={W - pad.r} y1={y(tick)} y2={y(tick)} stroke="var(--line-soft)" strokeDasharray="3 5" />
          <text x={pad.l - 8} y={y(tick) + 4} textAnchor="end" fontSize="10.5" fill="var(--muted)">
            {tick}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#lineFill)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {items.map((item, i) => (
        <text key={item.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--muted)">
          {item.label.slice(5)}
        </text>
      ))}
      <circle cx={last[0]} cy={last[1]} r="9" fill="var(--accent)" opacity="0.15" />
      <circle cx={last[0]} cy={last[1]} r="5" fill="var(--card)" stroke="var(--accent)" strokeWidth="3" />
      <g transform={`translate(${Math.min(last[0] - 18, W - 52)},${Math.max(last[1] - 34, 2)})`}>
        <rect width="36" height="20" rx="10" fill="var(--accent)" />
        <text x="18" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--on-accent)">
          {items[items.length - 1].count}
        </text>
      </g>
    </svg>
  );
}

/** Two slim bars per month: entries (accent) and valid ones (gold). */
export function PairedBars({ items }: { items: CountItem[] }) {
  const W = 560;
  const H = 200;
  const pad = { l: 30, r: 8, t: 10, b: 26 };
  const max = Math.max(4, ...items.map((item) => item.count));
  const top = Math.ceil(max / 4) * 4;
  const slot = (W - pad.l - pad.r) / items.length;
  const h = (value: number) => (value / top) * (H - pad.t - pad.b);
  const base = H - pad.b;
  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Entries versus valid">
      {[0, 1, 2, 3, 4].map((n) => {
        const value = (top / 4) * n;
        const yy = base - h(value);
        return (
          <g key={n}>
            <line x1={pad.l} x2={W - pad.r} y1={yy} y2={yy} stroke="var(--line-soft)" strokeDasharray="3 5" />
            <text x={pad.l - 7} y={yy + 4} textAnchor="end" fontSize="10.5" fill="var(--muted)">
              {value}
            </text>
          </g>
        );
      })}
      {items.map((item, i) => {
        const cx = pad.l + slot * i + slot / 2;
        const valid = item.valid ?? 0;
        return (
          <g key={item.label}>
            <rect x={cx - 9} y={base - h(item.count)} width="7" height={Math.max(h(item.count), item.count ? 3 : 0)} rx="3.5" fill="var(--c2)" />
            <rect x={cx + 2} y={base - h(valid)} width="7" height={Math.max(h(valid), valid ? 3 : 0)} rx="3.5" fill="var(--gold)" opacity="0.9" />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--muted)">
              {item.label.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Progress ring with the percentage in the middle. */
export function Ring({ percent, caption }: { percent: number; caption: string }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, percent));
  return (
    <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label={`${caption} ${Math.round(value)}%`}>
      <circle cx="85" cy="85" r={r} fill="none" stroke="var(--line-soft)" strokeWidth="13" />
      <circle
        cx="85"
        cy="85"
        r={r}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform="rotate(-90 85 85)"
      />
      <text x="85" y="88" textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--heading)">
        {Math.round(value)}%
      </text>
      <text x="85" y="108" textAnchor="middle" fontSize="11.5" fill="var(--muted)">
        {caption}
      </text>
    </svg>
  );
}

/** Tiny trend line for stat cards. */
export function Sparkline({ values }: { values: number[] }) {
  const W = 220;
  const H = 54;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i): [number, number] => [(i * (W - 8)) / Math.max(1, values.length - 1) + 4, H - 6 - (v / max) * (H - 14)]);
  const last = pts[pts.length - 1];
  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <defs>
        <linearGradient id="sparkStroke" x1="0" x2="1">
          <stop offset="0%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--orange)" />
        </linearGradient>
      </defs>
      <path d={smoothPath(pts)} fill="none" stroke="url(#sparkStroke)" strokeWidth="3" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill="var(--orange)" />
    </svg>
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
