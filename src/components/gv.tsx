/**
 * gv.tsx — the Grove / Emitly primitives for the app (2026-10-31).
 * Everything here maps 1:1 onto the CSS in src/theme/index.css so pages
 * stay thin: Card, Eyebrow, Pill, Btn, Strip (stat row), CountUp, Bars,
 * Track, Av (initials on a pastel), Row, Evt (pastel schedule row), the
 * chip row, and a few line drawings that sketch themselves in.
 *
 * Rules (same as the CRM + portal):
 *  - one forest primary button per screen; lime marks the ONE live thing
 *  - pills are tinted fills with matching ink, radius 8, never bordered
 *  - cards are white, 20px, soft shadow, never nested
 *  - numbers count up; cards rise in with a 60ms stagger (style --i)
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { monogram, tintFor } from "@/lib/colorHash";

export type Tint = "mint" | "sky" | "apricot" | "plum" | "rose" | "yellow" | "lavender" | "lime" | "up" | "down" | "go" | "none";
export const TINTS: Tint[] = ["mint", "sky", "apricot", "plum", "rose", "lavender"];

/** Deterministic pastel per name (same six the CRM uses). */
export function tintName(name: string): Tint {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

const idx = (i?: number) => (i != null ? ({ "--i": i } as CSSProperties) : undefined);

export function Card({ children, i, flat, inset, className = "", style, onClick }: { children: ReactNode; i?: number; flat?: boolean; inset?: boolean; className?: string; style?: CSSProperties; onClick?: () => void }) {
  const cls = `gv-card${flat ? " flat" : ""}${inset ? " inset" : ""}${i != null ? " gv-rise" : ""} ${className}`.trim();
  if (onClick) {
    return <button onClick={onClick} className={cls} style={{ ...idx(i), width: "100%", textAlign: "left", border: 0, cursor: "pointer", font: "inherit", color: "inherit", ...style }}>{children}</button>;
  }
  return <div className={cls} style={{ ...idx(i), ...style }}>{children}</div>;
}

export function Eyebrow({ children, right, onRight, style }: { children: ReactNode; right?: string; onRight?: () => void; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "20px 2px 10px", ...style }}>
      <span className="gv-eyebrow">{children}</span>
      {right && <button className="gv-link" onClick={onRight}>{right}</button>}
    </div>
  );
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
      <h3 className="gv-h2" style={{ fontSize: 15.5 }}>{children}</h3>
      {right}
    </div>
  );
}

export function Pill({ children, tint = "none", sm, i, style }: { children: ReactNode; tint?: Tint; sm?: boolean; i?: number; style?: CSSProperties }) {
  return <span className={`gv-pill ${tint === "none" ? "" : tint}${sm ? " sm" : ""}${i != null ? " gv-pop" : ""}`} style={{ ...idx(i), ...style }}>{children}</span>;
}

export function Btn({ children, onClick, ghost, soft, sm, block, disabled, href, style, ariaLabel }: { children: ReactNode; onClick?: () => void; ghost?: boolean; soft?: boolean; sm?: boolean; block?: boolean; disabled?: boolean; href?: string; style?: CSSProperties; ariaLabel?: string }) {
  const cls = `gv-btn${ghost ? " ghost" : ""}${soft ? " soft" : ""}${sm ? " sm" : ""}${block ? " block" : ""}`;
  if (href) return <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cls} style={{ textDecoration: "none", ...style }} aria-label={ariaLabel}>{children}</a>;
  return <button className={cls} onClick={onClick} disabled={disabled} style={style} aria-label={ariaLabel}>{children}</button>;
}

/** Counts a number up over ~700ms (once). Pass formatted via `fmt`. */
export function CountUp({ to, fmt, ms = 700 }: { to: number; fmt?: (n: number) => string; ms?: number }) {
  const [v, setV] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) { setV(to); return; }
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !to) { setV(to); done.current = true; return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(to * e);
      if (p < 1) raf = requestAnimationFrame(tick); else done.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  const n = Number.isInteger(to) ? Math.round(v) : Math.round(v * 10) / 10;
  return <>{fmt ? fmt(n) : n.toLocaleString("en-US")}</>;
}

export interface Stat { label: string; value: number | string; unit?: string; warn?: boolean; fmt?: (n: number) => string; onClick?: () => void }

/** The Emitly stat strip: cells with vertical hairlines, numbers count up. */
export function Strip({ stats, i }: { stats: Stat[]; i?: number }) {
  return (
    <div className={`gv-strip${i != null ? " gv-rise" : ""}`} style={idx(i)}>
      {stats.map((s) => (
        <button key={s.label} className="gv-st" onClick={s.onClick} style={{ cursor: s.onClick ? "pointer" : "default" }}>
          <small>{s.label}</small>
          <span className={`v${s.warn ? " warn" : ""}`}>
            {typeof s.value === "number" ? <CountUp to={s.value} fmt={s.fmt} /> : s.value}
            {s.unit && <em>{s.unit}</em>}
          </span>
        </button>
      ))}
    </div>
  );
}

export interface Bar { label: string; value: number; on?: boolean; go?: boolean; mint?: boolean }

/** Rounded grey bars, one coral (`on`), optional dashed average line. */
export function Bars({ bars, avg, height = 72, labels = true }: { bars: Bar[]; avg?: { value: number; label: string }; height?: number; labels?: boolean }) {
  const max = Math.max(1, ...bars.map((b) => Math.abs(b.value)), avg ? avg.value : 0);
  return (
    <div>
      <div className="gv-bars" style={{ height }}>
        {avg && <div className="avg" style={{ bottom: `${(avg.value / max) * 100}%` }}><b>{avg.label}</b></div>}
        {bars.map((b, k) => (
          <i key={k} className={b.on ? "on" : b.go ? "go" : b.mint ? "mint" : ""} style={{ height: `${Math.max(4, (Math.abs(b.value) / max) * 100)}%`, ...idx(k) }} title={`${b.label}: ${b.value}`} />
        ))}
      </div>
      {labels && <div className="gv-xlab">{bars.map((b, k) => <span key={k} className={b.on ? "on" : ""}>{b.label}</span>)}</div>}
    </div>
  );
}

/** Journey / meter track: `done` of `total`, the current one lime. */
export function Track({ total, done, current, bad }: { total: number; done: number; current?: number; bad?: number }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {Array.from({ length: total }, (_, k) => (
        <div key={k} className="gv-track">
          {k < done && <i style={idx(k)} />}
          {k === current && k >= done && <i className="cur" style={idx(k)} />}
          {k === bad && <i className="bad" style={idx(k)} />}
        </div>
      ))}
    </div>
  );
}

/** Initials on a pastel. Square 12px for families, `round` for people. */
export function Av({ name, size = 40, round, tint, photo, style }: { name: string; size?: number; round?: boolean; tint?: Tint; photo?: string; style?: CSSProperties }) {
  if (photo) return <img src={photo} alt={name} width={size} height={size} style={{ width: size, height: size, borderRadius: round ? "50%" : 12, objectFit: "cover", flex: "none", ...style }} />;
  const t = tintFor(name);
  const bg = tint && tint !== "none" ? `var(--gv-${tint})` : t.bg;
  const fg = tint && tint !== "none" ? `var(--gv-${tint}Ink)` : t.fg;
  return (
    <span className={`gv-av${round ? " round" : ""}`} aria-label={name} style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: bg, color: fg, ...style }}>
      {monogram(name)}
    </span>
  );
}

export function Row({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  if (onClick) return <button className="gv-row" onClick={onClick} style={{ cursor: "pointer", ...style }}>{children}</button>;
  return <div className="gv-row" style={style}>{children}</div>;
}

export function Evt({ tint, icon, title, sub, right, i, onClick }: { tint: "yellow" | "lavender" | "mint" | "sky" | "lime"; icon?: ReactNode; title: string; sub?: string; right?: ReactNode; i?: number; onClick?: () => void }) {
  const body = (
    <>
      {icon && <span className="ic">{icon}</span>}
      <span style={{ flex: 1, minWidth: 0 }}><b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</b>{sub && <span>{sub}</span>}</span>
      {right}
    </>
  );
  const cls = `gv-evt ${tint}${i != null ? " gv-rise" : ""}`;
  if (onClick) return <button className={cls} onClick={onClick} style={{ ...idx(i), width: "100%", border: 0, textAlign: "left", cursor: "pointer", font: "inherit" }}>{body}</button>;
  return <div className={cls} style={idx(i)}>{body}</div>;
}

export function Chips<T extends string>({ items, active, onChange }: { items: { key: T; label: string; count?: number }[]; active: T; onChange: (k: T) => void }) {
  return (
    <div className="gv-chips no-scrollbar">
      {items.map((c) => (
        <button key={c.key} className={`gv-chip${c.key === active ? " on" : ""}`} onClick={() => onChange(c.key)}>
          {c.label}{c.count != null ? <span className="tnum" style={{ marginLeft: 6, opacity: .75 }}>{c.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Quiet empty line with one text action, no illustration block. */
export function Empty({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="gv-card flat" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 13.5, color: "var(--gv-mid)", lineHeight: 1.45 }}>{children}</span>
      {action && <button className="gv-link" onClick={onAction} style={{ flex: "none" }}>{action}</button>}
    </div>
  );
}

/* ── line drawings (2.4px ink strokes, lime / coral flat fills) ── */

export function HouseArt({ width = 220 }: { width?: number }) {
  return (
    <svg className="gv-draw gv-float" width={width} viewBox="0 0 320 220" fill="none" stroke="#1C2E29" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="20" y1="200" x2="300" y2="200" stroke="#86928C" />
      <path d="M70 200V112l90-62 90 62v88" />
      <rect x="140" y="140" width="40" height="60" rx="4" />
      <rect x="90" y="122" width="34" height="30" rx="4" /><rect x="196" y="122" width="34" height="30" rx="4" />
      <path d="M160 92s-14-8-14-17a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 9-14 17-14 17z" stroke="#E8714F" />
      <circle className="fill" cx="268" cy="62" r="16" fill="#D7F36E" stroke="none" />
      <circle cx="268" cy="62" r="16" stroke="#B9D44A" />
      <path d="M40 200c0-20 12-30 12-30s12 10 12 30" stroke="#2E5146" />
    </svg>
  );
}

export function TeamArt({ width = 220 }: { width?: number }) {
  return (
    <svg className="gv-draw gv-float" width={width} viewBox="0 0 320 220" fill="none" stroke="#1C2E29" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="20" y1="200" x2="300" y2="200" stroke="#86928C" />
      <rect x="54" y="60" width="212" height="120" rx="16" />
      <line x1="54" y1="96" x2="266" y2="96" />
      <circle cx="78" cy="78" r="5" /><circle cx="96" cy="78" r="5" /><circle cx="114" cy="78" r="5" />
      <rect className="fill" x="74" y="114" width="92" height="12" rx="6" fill="#D7F36E" stroke="none" />
      <rect x="74" y="114" width="92" height="12" rx="6" />
      <rect x="74" y="140" width="140" height="12" rx="6" />
      <rect x="190" y="112" width="56" height="44" rx="10" stroke="#2E5146" />
      <path d="M204 134l8 8 16-18" stroke="#2E5146" />
      <circle cx="262" cy="44" r="14" stroke="#E8714F" />
      <path d="M250 198c0-26 12-36 12-36s12 10 12 36" stroke="#2E5146" />
    </svg>
  );
}

export function CalendarArt({ width = 200 }: { width?: number }) {
  return (
    <svg className="gv-draw" width={width} viewBox="0 0 260 200" fill="none" stroke="#1C2E29" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="40" y="40" width="180" height="140" rx="16" />
      <line x1="40" y1="78" x2="220" y2="78" />
      <line x1="84" y1="24" x2="84" y2="54" /><line x1="176" y1="24" x2="176" y2="54" />
      <rect className="fill" x="104" y="100" width="52" height="40" rx="10" fill="#D7F36E" stroke="none" />
      <path d="M118 120l9 9 17-19" stroke="#2E5146" />
      <circle cx="70" cy="110" r="4" /><circle cx="190" cy="110" r="4" /><circle cx="70" cy="150" r="4" /><circle cx="190" cy="150" r="4" stroke="#E8714F" />
    </svg>
  );
}

export function PlantArt({ width = 160 }: { width?: number }) {
  return (
    <svg className="gv-draw" width={width} viewBox="0 0 200 200" fill="none" stroke="#1C2E29" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M70 140h60l-8 44H78z" />
      <line x1="100" y1="140" x2="100" y2="70" stroke="#2E5146" />
      <path d="M100 110c-30 0-44-18-44-40 24 0 44 14 44 40z" stroke="#2E5146" />
      <path d="M100 92c0-26 16-44 46-44 0 26-18 44-46 44z" stroke="#2E5146" />
      <circle className="fill" cx="100" cy="64" r="9" fill="#D7F36E" stroke="none" />
      <circle cx="100" cy="64" r="9" stroke="#B9D44A" />
      <line x1="30" y1="184" x2="170" y2="184" stroke="#86928C" />
    </svg>
  );
}
