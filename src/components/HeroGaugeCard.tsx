/**
 * Cream hero card with a semicircle tick-mark gauge (ticks fill clockwise by
 * value), a big centered percentage, and a label underneath. Hand-drawn data
 * feel — ticks, not a smooth arc.
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
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i < filled ? "#141414" : "rgba(20,20,20,0.13)"} strokeWidth="2.4" strokeLinecap="round" />;
  });
  return (
    <div style={{ background: "var(--ck-paper)", borderRadius: 24, padding: "22px 16px 20px", border: "1px solid var(--ck-hairline)", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox="0 0 240 132" width="100%" style={{ maxWidth: 268 }}>
        {lines}
        <text x="120" y="106" textAnchor="middle" fontSize="38" fontWeight="700" fill="#111111" style={{ letterSpacing: "-0.03em" }}>{Math.round(v)}%</text>
      </svg>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ck-title)", marginTop: 2 }}>{label}</div>
      {caption && <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ck-body)", marginTop: 3 }}>{caption}</div>}
    </div>
  );
}
