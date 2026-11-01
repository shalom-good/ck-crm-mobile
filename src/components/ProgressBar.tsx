/** Grove track: grey rail, forest fill that grows in, with a right-aligned
 *  tabular percentage. */
export function ProgressBar({ value, showLabel = true }: { value: number; showLabel?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div className="gv-track">
        <i style={{ right: `${100 - v}%` }} />
      </div>
      {showLabel && <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: "var(--gv-ink)", flex: "none" }}>{Math.round(v)}%</span>}
    </div>
  );
}
