interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Faint x-axis date labels under the chart (Mercury style). */
  labels?: string[];
  /** 0..1 marker position; omit for the clean Mercury area look. */
  marker?: number;
  smooth?: boolean;
}

/** Smooth area chart — purple gradient @40% → transparent, no gridlines/axes. */
export function Sparkline({ data, width = 320, height = 150, color = "#3B7AF7", labels, marker, smooth = true }: Props) {
  if (data.length < 2) return null;
  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);

  const pts = data.map((v, i) => [x(i), y(v)] as const);

  // Catmull-Rom → cubic bezier for a smooth line.
  const line = smooth
    ? pts.reduce((d, p, i, a) => {
        if (i === 0) return `M ${p[0]},${p[1]}`;
        const p0 = a[i - 1];
        const pp = a[i - 2] ?? p0;
        const pn = a[i + 1] ?? p;
        const c1x = p0[0] + (p[0] - pp[0]) / 6;
        const c1y = p0[1] + (p[1] - pp[1]) / 6;
        const c2x = p[0] - (pn[0] - p0[0]) / 6;
        const c2y = p[1] - (pn[1] - p0[1]) / 6;
        return `${d} C ${c1x},${c1y} ${c2x},${c2y} ${p[0]},${p[1]}`;
      }, "")
    : "M " + pts.map((p) => `${p[0]},${p[1]}`).join(" L ");

  const area = `${line} L ${width - pad},${height - pad} L ${pad},${height - pad} Z`;
  const mi = marker != null ? Math.round(marker * (data.length - 1)) : -1;
  const gid = `spark-${color.replace("#", "")}`;

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden style={{ display: "block" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {mi >= 0 && <circle cx={x(mi)} cy={y(data[mi])} r="5" fill={color} stroke="#fff" strokeWidth="2.5" />}
      </svg>
      {labels && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {labels.map((l, i) => (
            <span key={i} className="tnum" style={{ fontSize: 11, color: "var(--ck-muted)" }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
