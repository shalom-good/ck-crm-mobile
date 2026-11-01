import type { ReactNode } from "react";

export type TintName = "sky" | "lilac" | "mint" | "cream" | "peach" | "rose";

/** Background + foreground CSS vars for a pastel tint (kept for back-compat;
 *  the --tint-* names are remapped onto the Grove pastels in variables.css). */
export function tintVars(name: TintName) {
  return { bg: `var(--tint-${name}-bg)`, fg: `var(--tint-${name}-fg)` };
}

interface StatTileProps {
  tint: TintName;
  value: string;
  label: string;
  delta?: string;
  deltaUp?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
}

/**
 * Quiet white stat tile: gv-card (no border), a small inline icon + quiet
 * label on top, a big ink number, and an optional up / down delta.
 * `tint` is accepted for back-compat but does not drive a fill — prefer
 * the `Strip` primitive for a row of stats.
 */
export function StatTile({ value, label, delta, deltaUp = true, icon, onClick }: StatTileProps) {
  return (
    <button
      onClick={onClick}
      className="gv-card"
      style={{
        flex: 1, minWidth: 0, textAlign: "left", cursor: onClick ? "pointer" : "default", border: 0, font: "inherit",
        padding: "13px 14px", display: "flex", flexDirection: "column", gap: 12, minHeight: 96,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        {icon}
        <span className="gv-meta" style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: "auto", minWidth: 0 }}>
        <span className="tnum" style={{ fontSize: 24, fontWeight: 800, color: "var(--gv-ink)", lineHeight: "26px", letterSpacing: "-0.02em" }}>{value}</span>
        {delta && (
          <span className="tnum" style={{ fontSize: 12, fontWeight: 700, color: deltaUp ? "var(--gv-up)" : "var(--gv-down)" }}>{delta}</span>
        )}
      </div>
    </button>
  );
}
