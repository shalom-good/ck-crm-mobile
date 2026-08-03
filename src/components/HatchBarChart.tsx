/**
 * Hand-sketched bar chart: vertical bars alternating between solid ink and the
 * same shape filled with a 45° diagonal hatch (SVG pattern). No gridlines,
 * two y-ticks, day/category labels in secondary text. Color never encodes
 * meaning — weight + hatch do.
 */
export interface Bar { label: string; value: number }

export function HatchBarChart({ data, max, height = 150 }: { data: Bar[]; max?: number; height?: number }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  const W = 320, padL = 24, padB = 22, padT = 8;
  const chartH = height - padB - padT;
  const cw = (W - padL) / Math.max(1, data.length);
  const bw = Math.min(24, cw * 0.46);
  const ticks = [0, m / 2, m];

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <pattern id="hbc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#141414" strokeWidth="1.3" />
        </pattern>
      </defs>
      {ticks.map((t, i) => {
        const y = padT + chartH - (m ? (t / m) * chartH : 0);
        return <text key={i} x={0} y={y + 3} fontSize="9.5" fill="var(--ck-muted)">{Math.round(t)}</text>;
      })}
      {data.map((d, i) => {
        const x = padL + i * cw + cw / 2;
        const h = m ? Math.max(2, (d.value / m) * chartH) : 2;
        const y = padT + chartH - h;
        const solid = i % 2 === 0;
        return (
          <g key={i}>
            <rect x={x - bw / 2} y={y} width={bw} height={h} rx={3}
              fill={solid ? "#141414" : "url(#hbc-hatch)"} stroke={solid ? "none" : "#141414"} strokeWidth={solid ? 0 : 1} />
            <text x={x} y={height - 6} fontSize="10.5" fill="var(--ck-body)" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
