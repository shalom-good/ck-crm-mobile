/** 4px track, ink fill, with a right-aligned tabular percentage. */
export function ProgressBar({ value, showLabel = true }: { value: number; showLabel?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 999, background: "var(--ck-hairline)", overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", borderRadius: 999, background: "var(--ck-ink)" }} />
      </div>
      {showLabel && <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--ck-title)" }}>{Math.round(v)}%</span>}
    </div>
  );
}
