/**
 * White hero card (20px, no border, Grove shadow) with a semicircle tick
 * gauge — ticks fill clockwise in forest over the resting bar grey — a big
 * centred ink percentage, and a label underneath.
 */
export function HeroGaugeCard({ value, label, caption }: { value: number; label: string; caption?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const TICKS = 44;
  const filled = Math.round((v / 100) * TICKS);
  const cx = 120, cy = 116, rIn = 78, rOut = 98;
  const lines = Array.from({ length: TICKS }).map((_, i) => {
    const a = Math.PI * (1 - i / (TICKS - 1)); // 180° → 0°
    const x1 = cx + rIn * Math.cos(a), y1 = cy - rIn * Math.sin(a);
    const x2 = cx + rOut * Math.cos(a), y2 = cy - rOut * Math.sin(a);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: i < filled ? "var(--gv-go)" : "var(--gv-bar)" }} strokeWidth="2.4" strokeLinecap="round" />;
  });
  return (
    <div className="gv-card" style={{ padding: "22px 16px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox="0 0 240 132" width="100%" style={{ maxWidth: 268 }}>
        {lines}
        <text x="120" y="106" textAnchor="middle" fontSize="36" fontWeight="800" className="tnum" style={{ fill: "var(--gv-ink)", letterSpacing: "-0.025em" }}>{Math.round(v)}%</text>
      </svg>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--gv-ink)", marginTop: 2, textAlign: "center" }}>{label}</div>
      {caption && <div className="gv-meta" style={{ marginTop: 3, textAlign: "center" }}>{caption}</div>}
    </div>
  );
}
