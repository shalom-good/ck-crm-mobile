import type { ReactNode } from "react";

export type TintName = "sky" | "lilac" | "mint" | "cream" | "peach" | "rose";

/** Background + foreground CSS vars for a pastel tint (kept for back-compat). */
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
 * Quiet white stat tile — Lightfield idiom: hairline border, a small inline
 * icon + muted label on top, a big ink number, and an optional delta. No
 * pastel fill, no floating icon chip (that read as generic "AI dashboard").
 * `tint` is accepted for back-compat but no longer drives a fill.
 */
export function StatTile({ value, label, delta, deltaUp = true, icon, onClick }: StatTileProps) {
  return (
    <button
      onClick={onClick}
      className="shadow-card"
      style={{
        flex: 1, minWidth: 0, textAlign: "left", cursor: onClick ? "pointer" : "default",
        backgroundColor: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 18,
        padding: "13px 14px", display: "flex", flexDirection: "column", gap: 12, minHeight: 96,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ck-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: "auto" }}>
        <span className="tnum" style={{ fontSize: 24, fontWeight: 600, color: "var(--ck-title)", lineHeight: "26px", letterSpacing: "-0.02em" }}>{value}</span>
        {delta && (
          <span className="tnum" style={{ fontSize: 12, fontWeight: 600, color: deltaUp ? "var(--ck-success)" : "var(--ck-danger)" }}>{delta}</span>
        )}
      </div>
    </button>
  );
}
