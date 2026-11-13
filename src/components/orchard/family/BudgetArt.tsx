// components/orchard/family/BudgetArt.tsx
// The drawing on the Budget tab's hero (Shalom 2026-11-11: "add the image
// animation... like this and it moves"). Same hand as the KDH Plus scenes:
// 2.2px ink lines, lime and yellow fills. A jar that fills as the month gets
// better, a sprout that grows with it, and a coin that keeps dropping in.
// `level` is 0..6 coins. Decorative only. Motion lives in
// theme/orchard-fam-budget.css (.obg-art) and stops under reduced motion.

const INK = "#1C2E29", LIME = "#D7F36E", YEL = "#FFE870", LINE = "#C9D2C6";

// Two stacks of three, filled from the bottom, left then right.
const COINS: [number, number][] = [[80, 138], [112, 138], [80, 129], [112, 129], [80, 120], [112, 120]];

export function BudgetArt({ level = 3, width = 140 }: { level?: number; width?: number }) {
  const n = Math.max(0, Math.min(COINS.length, Math.round(level)));
  // The sprout stands a little taller with every coin.
  const grow = 0.76 + (n / COINS.length) * 0.24;
  return (
    <div className="obg-art" style={{ width }} aria-hidden="true">
      <svg viewBox="0 0 200 170" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {/* ground, and a soft patch of light under the jar */}
        <ellipse cx={98} cy={154} rx={62} ry={7} fill="#EDF8CF" stroke="none" />
        <path d="M14 154h172" stroke={LINE} />

        {/* the jar: open at the top */}
        <path d="M56 70h80v68a14 14 0 0 1-14 14H70a14 14 0 0 1-14-14z" fill="#fff" fillOpacity={0.78} />
        <path d="M64 80v52" stroke={LINE} />

        {/* the sprout, growing up out of the jar; taller with every coin */}
        <g className="obg-grow" style={{ transform: `scaleY(${grow})`, transformOrigin: "96px 120px" }}>
          <g className="obg-sway" style={{ transformOrigin: "96px 120px" }}>
            <path d="M96 120c0-28 1-46 8-62" />
            <path d="M102 72c-15-2-23-12-23-25 13 0 23 8 23 25z" fill={LIME} />
            <path d="M106 56c0-15 8-24 23-25 0 15-8 24-23 25z" fill={LIME} />
          </g>
        </g>

        {/* the rim sits in front of the stem */}
        <path d="M52 62h88v8H52z" fill="#fff" />

        {/* coins: one per step of progress */}
        {COINS.map(([x, y], k) => (
          <ellipse key={k} className={`obg-coin${k < n ? " is-on" : ""}`} cx={x} cy={y} rx={14} ry={4.8} fill={YEL}
            style={{ animationDelay: `${k * 80}ms` }} />
        ))}

        {/* one more on its way in */}
        <ellipse className="obg-drop" cx={118} cy={40} rx={11} ry={4.2} fill={YEL} />

        {/* small sparks */}
        <path className="obg-glow" d="M164 40l0 10M159 45h10" />
        <path className="obg-glow obg-glow--2" d="M34 84l0 8M30 88h8" stroke={LINE} />
        <circle className="obg-glow obg-glow--3" cx={158} cy={96} r={2.4} fill={INK} stroke="none" />
      </svg>
    </div>
  );
}
