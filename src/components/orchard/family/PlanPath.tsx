// components/orchard/family/PlanPath.tsx
// The plan as a path up a hill (Shalom 2026-11-11: "can this be more
// visual? like theyre on a path"). One stop per plan step: the ones behind
// the family are filled, a pin stands on the step they are on now, a flag
// waits at the top. Drawn in the same line style as the KDH Plus hill
// (components/kdh/PlusIllos.tsx). A picture only: the steps themselves are
// the list under it. Styles: theme/orchard-fam-plan.css (.opl-pathsvg).
import type { CSSProperties } from "react";

const INK = "#1C2E29", LIME = "#D7F36E", YEL = "#FFE870";
const W = 340, H = 150, X0 = 18, X1 = 306;

/** The ridge of the hill at u (0 = left edge, 1 = right edge). */
const hill = (u: number) => 98 - 44 * u + 8 * Math.sin(u * 7.6 + 0.4);
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/** A point on the trail, t from 0 (the start) to 1 (the flag). The trail
 *  runs along the slope and climbs onto the ridge as it reaches the flag. */
const trail = (t: number) => {
  const x = X0 + t * (X1 - X0);
  return { x, y: hill(x / W) + 22 * (1 - smooth(0.84, 1, t)) };
};
const r1 = (v: number) => Math.round(v * 10) / 10;
function trailLine(from: number, to: number) {
  const steps = Math.max(2, Math.round((to - from) * 60));
  return Array.from({ length: steps + 1 }, (_, k) => { const p = trail(from + ((to - from) * k) / steps); return `${k ? "L" : "M"}${r1(p.x)} ${r1(p.y)}`; }).join("");
}
const RIDGE = Array.from({ length: 41 }, (_, k) => `${k ? "L" : "M"}${r1((W * k) / 40)} ${r1(hill(k / 40))}`).join("");
/** Where stop i of n sits along the trail. */
const stopAt = (i: number, n: number) => (i + 0.7) / (n + 0.7);
const delay = (sec: number): CSSProperties => ({ animationDelay: `${sec}s` });

export function PlanPath({ done, current }: { done: boolean[]; current: number | null }) {
  const n = done.length;
  if (!n) return null;
  const r = Math.min(15, ((X1 - X0) / (n + 0.7)) * 0.4);
  const walked = current == null ? 1 : stopAt(current, n);
  const here = current == null ? trail(1) : trail(stopAt(current, n));
  const flag = trail(1);
  return (
    <svg className="opl-pathsvg" viewBox={`0 0 ${W} ${H}`} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle className="opl-sun" cx={256} cy={26} r={13} fill={YEL} />
      <path d={`${RIDGE}V${H}H0Z`} fill="#E4F2B8" stroke="none" />
      <path d={RIDGE} />
      {/* two small trees on the slope */}
      <g className="opl-tree"><circle cx={266} cy={124} r={8} fill={LIME} /><path d="M266 132v9" /></g>
      <g className="opl-tree" style={delay(0.5)}><circle cx={324} cy={104} r={7} fill={LIME} /><path d="M324 111v8" /></g>

      {/* the whole trail (dashed), then the part already walked (solid) */}
      <path className="opl-trail" d={trailLine(0, 1)} strokeDasharray="5 7" strokeOpacity={0.55} />
      <path className="opl-walked" d={trailLine(0, walked)} pathLength={1} strokeDasharray={1} stroke="var(--oc-forest, #2F7556)" strokeWidth={5} />

      {/* the flag at the top */}
      <path className="opl-pole" d={`M${r1(flag.x)} ${r1(flag.y)}V${r1(flag.y - 38)}`} />
      <path className="opl-flag" d={`M${r1(flag.x)} ${r1(flag.y - 38)}l24 9-24 9z`} fill={LIME} style={{ transformOrigin: `${r1(flag.x)}px ${r1(flag.y - 29)}px` }} />

      {done.map((isDone, i) => {
        const p = trail(stopAt(i, n));
        const now = i === current;
        return (
          <g key={i} className="opl-stop" style={{ ...delay(0.35 + i * 0.09), transformOrigin: `${r1(p.x)}px ${r1(p.y)}px` }}>
            {now && <circle className="opl-halo" cx={r1(p.x)} cy={r1(p.y)} r={r + 5} stroke="var(--oc-forest, #2F7556)" strokeWidth={2} style={{ transformOrigin: `${r1(p.x)}px ${r1(p.y)}px` }} />}
            <circle cx={r1(p.x)} cy={r1(p.y)} r={r} fill={isDone ? "var(--oc-forest, #2F7556)" : now ? LIME : "#fff"} />
            {isDone
              ? <path d={`M${r1(p.x - r * 0.38)} ${r1(p.y + r * 0.04)}l${r1(r * 0.26)} ${r1(r * 0.28)} ${r1(r * 0.5)}-${r1(r * 0.56)}`} stroke="#fff" strokeWidth={Math.max(1.8, r * 0.19)} />
              : n <= 9 && <text x={r1(p.x)} y={r1(p.y)} textAnchor="middle" dominantBaseline="central" fill={INK} stroke="none" fontSize={r1(r * 0.98)} fontWeight={800}>{i + 1}</text>}
          </g>
        );
      })}

      {/* you are here: a pin that stands on the current stop and breathes */}
      {current != null && (
        <g className="opl-pin" style={{ transform: `translate(${r1(here.x)}px, ${r1(here.y - r - 5)}px)` }}>
          <g className="opl-pin-in">
            <path d="M0 0c-6.5-8.5-9.5-12.5-9.5-17a9.5 9.5 0 0 1 19 0c0 4.5-3 8.5-9.5 17z" fill="var(--oc-forest, #2F7556)" />
            <circle cx={0} cy={-17} r={3.4} fill="#fff" stroke="none" />
          </g>
        </g>
      )}
      {current == null && (
        <g className="opl-sparks">
          <path d={`M${r1(flag.x - 22)} ${r1(flag.y - 46)}v8m-4-4h8`} />
          <path d={`M${r1(flag.x + 20)} ${r1(flag.y - 8)}v6m-3-3h6`} style={delay(0.5)} />
        </g>
      )}
    </svg>
  );
}
