// components/orchard/tools/ToolsKit.tsx
// Small Orchard pieces for the tools screens (Resources, Payments, Job
// Funnel, Settings). Presentational only; styles in theme/orchard-tools.css.

import type { CSSProperties, ReactNode } from "react";

/** Pastel hero card: two-tone title ("Resources." + a soft second line), a short sub. */
export function ToolHero({ title, tone, sub, bg = "var(--oc-summary)", top, aside, children }: {
  title: ReactNode; tone?: ReactNode; sub?: ReactNode; bg?: string;
  /** Row above the title (back button, eyebrow). */
  top?: ReactNode;
  /** Right of the title (one action). */
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="oco-hero" style={{ background: bg }}>
      {top && <div className="oco-hero-top">{top}</div>}
      <div className="oco-hero-row">
        <h1 className="oco-hero-title">{title}{tone ? <span>{tone}</span> : null}</h1>
        {aside}
      </div>
      {sub && <p className="oco-hero-sub">{sub}</p>}
      {children}
    </header>
  );
}

export interface ToolTile { key: string; label: string; value: ReactNode; bg: string; on?: boolean; onClick?: () => void }

/** Pastel stat tiles; a tile with onClick is a filter (ring when on). */
export function ToolTiles({ tiles, cols }: { tiles: ToolTile[]; cols?: number }) {
  return (
    <div className="oco-tiles" style={{ gridTemplateColumns: `repeat(${cols ?? tiles.length}, minmax(0, 1fr))` } as CSSProperties}>
      {tiles.map((t) => {
        const body = <><b>{t.value}</b><span>{t.label}</span></>;
        return t.onClick ? (
          <button key={t.key} type="button" className={`oco-tile${t.on ? " is-on" : ""}`} aria-pressed={!!t.on} onClick={t.onClick} style={{ background: t.bg }}>{body}</button>
        ) : (
          <div key={t.key} className="oco-tile" style={{ background: t.bg }}>{body}</div>
        );
      })}
    </div>
  );
}

/** Pastel per category name, stable. */
export const TOOL_TINTS = [
  { bg: "#DDEFE3", ink: "#1F5E3A" }, { bg: "#DCE8F5", ink: "#244A73" }, { bg: "#F8DCC9", ink: "#8A4B10" },
  { bg: "#EBDDF5", ink: "#5B2D7A" }, { bg: "#FBE1D8", ink: "#9A3A22" }, { bg: "#FBEFA6", ink: "#6B5A00" },
];
export function tintOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return TOOL_TINTS[Math.abs(h) % TOOL_TINTS.length];
}

/** Empty / nothing-found panel with one optional action. */
export function ToolEmpty({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="oco-empty">
      <span>{children}</span>
      {action && onAction ? <button type="button" className="oc-btn" onClick={onAction}>{action}</button> : null}
    </div>
  );
}
