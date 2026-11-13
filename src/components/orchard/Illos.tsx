// components/orchard/Illos.tsx
// The shared illustration set (2026-11-11, Shalom: "more animation like this
// with imagery like this for the rest"; Leivi on the KDH Plus hill: "lets
// use this for the rest"). Same hand as components/kdh/PlusIllos: monoline
// scenes, 2.2px ink strokes, round caps, lime and yellow fills, one small
// thing that keeps moving. The KDH Plus drawings are reused as they are;
// the new ones below are drawn to sit beside them.
//
// Every drawing is decorative (aria-hidden) and small: `w` is its width in
// the card. Motion comes from theme/orchard-kdhplus.css (.okp-illo: popin,
// risein, draw, wave, sunrise, sprout, drop, day, tick, steam, beat) plus
// theme/orchard-illos.css (.oil: sway, drift, glow). All of it stops under
// prefers-reduced-motion.
import { useId, type CSSProperties, type ReactNode } from "react";
import { IlloBank, IlloDone, IlloFamily, IlloHand, IlloJar, IlloPair, IlloPath, IlloSearch, IlloSession } from "@/components/kdh/PlusIllos";

const INK = "#1C2E29", LIME = "#D7F36E", YEL = "#FFE870", LINE = "#C9D2C6", PAPER = "#F3F5F1", PINK = "#F3D9F7", PEACH = "#FBE1D8", SKY = "#DCE8F7";

export type OilName =
  | "path" | "session" | "jar" | "family" | "done" | "search" | "bank" | "hand" | "pair"
  | "call" | "signpost" | "stack" | "trail" | "folder" | "screen" | "book" | "table" | "fridge" | "phone2" | "sign"
  | "cal" | "kite" | "cup" | "build" | "grow";

/** What the calendar drawing shows: today, the next meeting, a few after it. */
export interface CalInfo { today?: Date; next?: Date | null; more?: Date[] }

const d = (sec: number, origin?: string): CSSProperties => ({ animationDelay: `${sec}s`, ...(origin ? { transformOrigin: origin } : {}) });

function Sv({ h = 150, children }: { h?: number; children: ReactNode }) {
  return (
    <div className="okp-illo">
      <svg viewBox={`0 0 240 ${h}`} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
    </div>
  );
}
const Ground = ({ y = 138 }: { y?: number }) => <path d={`M12 ${y}h216`} stroke={LINE} />;
const Spark = ({ x, y, quiet, t }: { x: number; y: number; quiet?: boolean; t?: number }) =>
  <path className={t != null ? "popin" : undefined} d={`M${x} ${y - 5}l0 10M${x - 5} ${y}h10`} stroke={quiet ? LINE : undefined} style={t != null ? d(t, `${x}px ${y}px`) : undefined} />;

/** A phone, and two speech bubbles going back and forth. */
function Call() {
  return (
    <Sv>
      <Ground />
      <rect x={92} y={22} width={58} height={116} rx={12} fill="#fff" />
      <path d="M112 32h18" stroke={LINE} />
      <circle cx={121} cy={126} r={3} fill={INK} stroke="none" />
      <g className="popin" style={d(0.5, "160px 62px")}>
        <path d="M158 38h44a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10h-22l-10 9v-9h-12a10 10 0 0 1-10-10V48a10 10 0 0 1 10-10z" fill={LIME} />
        <path d="M162 52h34M162 62h20" />
      </g>
      <g className="popin" style={d(1.1, "84px 96px")}>
        <path d="M36 78h42a10 10 0 0 1 10 10v12a10 10 0 0 1-10 10H66v8l-9-8H36a10 10 0 0 1-10-10V88a10 10 0 0 1 10-10z" fill={YEL} />
        <g className="oil-dots"><circle cx={44} cy={94} r={2.4} fill={INK} stroke="none" /><circle cx={57} cy={94} r={2.4} fill={INK} stroke="none" /><circle cx={70} cy={94} r={2.4} fill={INK} stroke="none" /></g>
      </g>
      <Spark x={206} y={104} t={1.7} />
      <Spark x={44} y={44} quiet />
    </Sv>
  );
}

/** A signpost with two ways to go. */
function Signpost() {
  return (
    <Sv>
      <Ground />
      <path d="M120 138V30" />
      <g className="sway" style={d(0, "120px 56px")}>
        <path className="risein" d="M120 40h58l14 14-14 14h-58z" fill={LIME} style={d(0.5)} />
      </g>
      <path className="risein" d="M120 78H66L52 92l14 14h54z" fill={YEL} style={d(0.9)} />
      <path d="M136 54h30M76 92h30" />
      <path d="M40 138c0-10 6-16 14-18 0 10-6 16-14 18z" fill={LIME} />
      <path d="M196 138c0-8-5-13-12-15 0 8 5 13 12 15z" fill={LIME} />
      <Spark x={206} y={30} t={1.5} />
      <Spark x={38} y={56} quiet />
    </Sv>
  );
}

/** Three stacks of coins, each smaller than the last, and a line going down. */
function Stack() {
  const stack = (x: number, n: number, fill: string, t: number) => Array.from({ length: n }, (_, i) => {
    const y = 128 - i * 9;
    return <ellipse key={`${x}-${i}`} className="coin" cx={x} cy={y} rx={21} ry={7} fill={fill} style={d(Math.round((t + i * 0.1) * 100) / 100, `${x}px ${y}px`)} />;
  });
  return (
    <Sv>
      <Ground />
      {stack(56, 6, "#fff", 0.3)}
      {stack(120, 4, YEL, 0.9)}
      {stack(184, 2, LIME, 1.4)}
      <path className="draw" d="M40 62c36 6 84 18 144 46" strokeDasharray="6 6" pathLength={100} style={d(1.6)} />
      <path className="popin" d="M176 98l12 11-16 3" style={d(2.6, "184px 108px")} />
      <Spark x={206} y={48} t={2.9} />
    </Sv>
  );
}

/** The hill and its flag, with a marker for how far along the family is. */
const TRAIL: [number, number][] = [[22, 144], [44, 130], [64, 124], [94, 118], [118, 104], [146, 94], [174, 82]];
function Trail({ frac = 0 }: { frac?: number }) {
  const f = Math.max(0, Math.min(1, frac)) * (TRAIL.length - 1);
  const a = TRAIL[Math.floor(f)], b = TRAIL[Math.min(TRAIL.length - 1, Math.floor(f) + 1)], t = f - Math.floor(f);
  const x = Math.round(a[0] + (b[0] - a[0]) * t), y = Math.round(a[1] + (b[1] - a[1]) * t);
  return (
    <Sv>
      <circle className="sunrise" cx={198} cy={40} r={14} fill={YEL} style={d(0.3)} />
      <path d="M0 126c40-26 80-6 118-28s70-30 122-14v66H0z" fill="#EDF8CF" stroke="none" />
      <path d="M0 126c40-26 80-6 118-28s70-30 122-14" />
      <path className="draw" d="M22 144c30-22 46-6 72-26s50-24 80-36" strokeDasharray="6 6" pathLength={100} style={d(0.7)} />
      <path className="risein" d="M176 84V44" style={d(1.6)} />
      <path className="wave" d="M176 44l30 10-30 10z" fill={LIME} style={d(1.9, "176px 54px")} />
      <g className="popin" style={d(2.1, `${x}px ${y}px`)}>
        <g className="beat" style={d(0, `${x}px ${y - 8}px`)}>
          <circle cx={x} cy={y - 8} r={8} fill="#fff" />
          <circle cx={x} cy={y - 8} r={3} fill={INK} stroke="none" />
        </g>
      </g>
      <circle cx={216} cy={100} r={8} fill={LIME} /><path d="M216 108v10" />
    </Sv>
  );
}

/** A folder with papers coming out of it. */
function Folder() {
  return (
    <Sv>
      <Ground />
      <path d="M52 50a8 8 0 0 1 8-8h36l12 14h72a8 8 0 0 1 8 8v64H52z" fill="#fff" />
      <g className="sway" style={d(0, "120px 96px")}>
        <rect className="risein" x={74} y={30} width={74} height={70} rx={7} fill="#fff" style={d(0.5)} />
        <path className="risein" d="M86 46h50M86 58h50M86 70h30" stroke={LINE} style={d(0.7)} />
      </g>
      <rect className="risein" x={112} y={48} width={66} height={56} rx={7} fill={YEL} style={d(0.9)} />
      <path className="risein" d="M124 64h42M124 76h26" style={d(1.1)} />
      <path d="M44 84h152l-10 44a10 10 0 0 1-10 8H64a10 10 0 0 1-10-8z" fill={LIME} />
      <path className="day tick" d="M108 108l6 6 12-13" style={d(1.6)} />
      <Spark x={208} y={36} t={1.9} />
    </Sv>
  );
}

/** A screen with an episode ready to play, and something growing beside it. */
function Screen() {
  return (
    <Sv>
      <Ground />
      <rect x={40} y={30} width={124} height={84} rx={12} fill="#fff" />
      <path d="M86 138h32M102 114v24" />
      <g className="beat" style={d(0, "102px 72px")}>
        <circle className="popin" cx={102} cy={72} r={20} fill={LIME} style={d(0.6, "102px 72px")} />
        <path className="popin" d="M96 62v20l16-10z" fill={INK} style={d(0.9, "102px 72px")} />
      </g>
      <g className="sprout" style={d(1.3, "196px 138px")}>
        <g className="sway" style={d(0, "196px 138px")}>
          <path d="M196 138c0-20 2-34 8-46" />
          <path d="M200 110c-12-2-18-10-18-20 10 0 18 6 18 20z" fill={LIME} />
          <path d="M203 96c0-12 6-19 18-20 0 12-6 19-18 20z" fill={YEL} />
        </g>
      </g>
      <Spark x={186} y={40} t={1.9} />
      <Spark x={26} y={54} quiet />
    </Sv>
  );
}

/** An open book with a coin and a leaf rising from the page. */
function Book() {
  return (
    <Sv>
      <Ground />
      <path d="M120 60c-22-14-48-14-70-4v68c22-10 48-10 70 4z" fill="#fff" />
      <path d="M120 60c22-14 48-14 70-4v68c-22-10-48-10-70 4z" fill="#fff" />
      <path d="M120 60v68" />
      <path d="M64 74c14-5 28-5 42 0M64 88c14-5 28-5 42 0M134 74c14-5 28-5 42 0M134 88c14-5 28-5 42 0M64 102c10-4 20-4 28-2" stroke={LINE} />
      <g className="sprout" style={d(0.9, "120px 60px")}>
        <g className="sway" style={d(0, "120px 60px")}>
          <path d="M120 60c0-14 1-22 6-30" />
          <path d="M123 44c-10-2-15-8-15-17 9 0 15 5 15 17z" fill={LIME} />
          <path d="M125 34c0-10 5-16 15-17 0 10-5 16-15 17z" fill={LIME} />
        </g>
      </g>
      <ellipse className="coin" cx={196} cy={44} rx={13} ry={5} fill={YEL} style={d(1.5, "196px 44px")} />
      <Spark x={44} y={38} t={1.8} />
    </Sv>
  );
}

/** A kitchen table at night: the lamp on, a cup, the papers. */
function Table() {
  return (
    <Sv>
      <Ground />
      <path d="M120 8v22" />
      <path d="M96 58l10-28h28l10 28z" fill={YEL} />
      <g className="glow"><path d="M88 70l-8 12M120 72v14M152 70l8 12" stroke={YEL} strokeWidth={3} /></g>
      <path d="M34 104h172" />
      <path d="M48 104v34M192 104v34" />
      <rect className="risein" x={62} y={88} width={44} height={16} rx={3} fill="#fff" style={d(0.6)} />
      <path className="risein" d="M70 96h28" stroke={LINE} style={d(0.7)} />
      <rect className="risein" x={74} y={80} width={40} height={14} rx={3} fill={PEACH} transform="rotate(-6 94 87)" style={d(0.8)} />
      <path d="M150 84h26v10a10 10 0 0 1-10 10h-6a10 10 0 0 1-10-10z" fill="#fff" />
      <path d="M176 88h5a5 5 0 0 1 0 10h-5" />
      <path className="steam" d="M158 76c-3-5 3-8 0-13" stroke={LINE} style={d(0)} />
      <path className="steam" d="M168 76c-3-5 3-8 0-13" stroke={LINE} style={d(1.1)} />
      <g className="beat" style={d(0, "206px 52px")}>
        <path className="popin" d="M206 62c-9-6-12-11-12-15a6 6 0 0 1 12-3 6 6 0 0 1 12 3c0 4-3 9-12 15z" fill={LIME} style={d(1.6, "206px 52px")} />
      </g>
      <Spark x={34} y={48} quiet />
    </Sv>
  );
}

/** The envelope on the fridge. */
function Fridge() {
  return (
    <Sv>
      <Ground />
      <rect x={78} y={14} width={84} height={124} rx={12} fill="#fff" />
      <path d="M78 54h84" />
      <path d="M90 28v14M90 66v22" />
      <g className="sway" style={d(0, "126px 72px")}>
        <rect className="risein" x={104} y={72} width={44} height={30} rx={4} fill={YEL} style={d(0.6)} />
        <path className="risein" d="M104 75l22 15 22-15" style={d(0.7)} />
        <circle className="popin" cx={126} cy={72} r={5} fill={LIME} style={d(1.1, "126px 72px")} />
      </g>
      <path d="M100 116h40" stroke={LINE} />
      <g className="popin" style={d(1.6, "200px 92px")}>
        <path d="M186 70h30a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8h-12l-8 8v-8h-0a8 8 0 0 1-8-8V78a8 8 0 0 1 8-8z" fill={LIME} />
        <path className="day tick" d="M193 85l5 5 10-10" style={d(2.0)} />
      </g>
      <Spark x={42} y={50} t={1.9} />
      <Spark x={48} y={104} quiet />
    </Sv>
  );
}

/** Two people, one phone between them, the numbers finally in the open. */
function Phone2() {
  return (
    <Sv>
      <Ground />
      <g className="popin" style={d(0.3, "62px 110px")}><circle cx={62} cy={78} r={14} fill={YEL} /><path d="M38 138v-16a24 24 0 0 1 48 0v16" fill="#fff" /></g>
      <g className="popin" style={d(0.6, "178px 110px")}><circle cx={178} cy={78} r={14} fill={PINK} /><path d="M154 138v-16a24 24 0 0 1 48 0v16" fill="#fff" /></g>
      <g className="risein" style={d(1.0)}>
        <rect x={100} y={48} width={40} height={72} rx={9} fill="#fff" />
        <path d="M114 56h12" stroke={LINE} />
        <rect x={108} y={96} width={6} height={14} rx={2} fill={LIME} />
        <rect x={117} y={86} width={6} height={24} rx={2} fill={LIME} />
        <rect x={126} y={74} width={6} height={36} rx={2} fill={LIME} />
      </g>
      <g className="beat" style={d(0, "120px 26px")}>
        <path className="popin" d="M120 36c-9-6-12-11-12-15a6 6 0 0 1 12-3 6 6 0 0 1 12 3c0 4-3 9-12 15z" fill={LIME} style={d(1.6, "120px 26px")} />
      </g>
      <Spark x={212} y={44} t={1.9} />
      <Spark x={28} y={52} quiet />
    </Sv>
  );
}

/** A plan on paper, a pen signing the last line. */
function Sign() {
  return (
    <Sv>
      <Ground />
      <rect x={62} y={22} width={104} height={116} rx={10} fill="#fff" />
      <path d="M78 44h72M78 58h72M78 72h48" stroke={LINE} />
      <rect x={78} y={86} width={40} height={10} rx={5} fill={SKY} stroke="none" />
      <path className="draw" d="M80 118c8-12 14 8 22-4s12 6 22-2 14 2 22 0" pathLength={100} strokeDasharray="100" style={d(0.9)} />
      <g className="sway" style={d(0, "170px 104px")}>
        <path className="risein" d="M150 112l42-52 12 10-42 52-16 6z" fill={LIME} style={d(0.5)} />
        <path className="risein" d="M184 70l12 10" style={d(0.6)} />
      </g>
      <Spark x={42} y={40} t={1.9} />
    </Sv>
  );
}

/** A wall calendar. The old page lifts away, today pops in yellow, a ring is
 *  drawn around the day of the next meeting and a dot lands in it. The grid
 *  is the real one: three weeks from this Sunday. */
function Cal({ cal }: { cal?: CalInfo }) {
  const today = cal?.today ?? new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  const idx = (dt?: Date | null) => (dt ? Math.round((Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) - start) / 86400000) : -1);
  const ti = today.getDay();
  const inGrid = (i: number) => i >= ti && i < 21;
  const ni = idx(cal?.next);
  const next = inGrid(ni) ? ni : -1;
  const more = [...new Set((cal?.more || []).map(idx))].filter((i) => inGrid(i) && i !== next && i !== ti).slice(0, 3);
  const cx = (i: number) => 48 + (i % 7) * 24, cy = (i: number) => 77 + Math.floor(i / 7) * 22;
  const o = (i: number) => `${cx(i)}px ${cy(i)}px`;
  return (
    <Sv>
      <Ground />
      <rect x={30} y={24} width={180} height={114} rx={14} fill="#fff" />
      <path d="M30 56V38a14 14 0 0 1 14-14h152a14 14 0 0 1 14 14v18z" fill={LIME} />
      <path d="M76 14v20M164 14v20" />
      {Array.from({ length: 21 }, (_, i) => <circle key={i} cx={cx(i)} cy={cy(i)} r={3.6} fill={LINE} stroke="none" opacity={i < ti ? 0.45 : 1} />)}
      <g className={next === ti ? "beat" : undefined} style={next === ti ? d(0, o(ti)) : undefined}>
        <circle className="day" cx={cx(ti)} cy={cy(ti)} r={8.5} fill={YEL} style={d(1.3, o(ti))} />
      </g>
      {more.map((i, k) => <circle key={i} className="popin" cx={cx(i)} cy={cy(i)} r={6} fill={LIME} style={d(2.7 + k * 0.25, o(i))} />)}
      {next >= 0 && (
        <>
          {next !== ti && (
            <g className="beat" style={d(0, o(next))}>
              <circle className="popin" cx={cx(next)} cy={cy(next)} r={6} fill={LIME} style={d(2.3, o(next))} />
            </g>
          )}
          <circle className="draw" cx={cx(next)} cy={cy(next)} r={11.5} pathLength={100} strokeDasharray="100" transform={`rotate(-90 ${cx(next)} ${cy(next)})`} style={d(1.7)} />
        </>
      )}
      {/* yesterday's page, lifting away from the binding */}
      <g className="flipaway" style={d(0.45, "120px 56px")}>
        <path d="M30 56h180v68a14 14 0 0 1-14 14H44a14 14 0 0 1-14-14z" fill="#fff" />
        <path d="M52 80h136M52 100h136M52 120h80" stroke={LINE} />
      </g>
      <Spark x={226} y={30} t={2.9} />
    </Sv>
  );
}

/** Nothing waiting: a kite out on a clear day. */
function Kite() {
  return (
    <Sv>
      <Ground />
      <circle className="sunrise" cx={48} cy={42} r={13} fill={YEL} style={d(0.3)} />
      <g transform="translate(6 -6)">
        <g className="drift">
          <path className="risein" d="M178 106h30a7 7 0 0 0 0-14 11 11 0 0 0-21-3 8.5 8.5 0 0 0-9 17z" fill="#fff" style={d(0.5)} />
        </g>
      </g>
      <g className="sway" style={d(0, "84px 138px")}>
        <path className="draw" d="M146 86c-8 24-34 40-62 52" pathLength={100} strokeDasharray="100" style={d(0.9)} />
        <g className="popin" style={d(0.5, "146px 54px")}>
          <path d="M146 20l24 30-24 36-24-36z" fill={LIME} />
          <path d="M146 20v66M122 50h48" />
        </g>
        <path className="popin" d="M132 104l-9-2 5 9z" fill={YEL} style={d(1.9, "128px 106px")} />
        <path className="popin" d="M112 120l-9-1 6 8z" fill={PINK} style={d(2.1, "108px 122px")} />
      </g>
      <path d="M76 138c0-7 3-11 8-13 1 6-2 11-8 13zM92 138c0-6-3-10-7-12-1 6 2 10 7 12z" fill={LIME} />
      <g className="popin" style={d(2.4, "204px 44px")}>
        <circle cx={204} cy={44} r={13} fill="#fff" />
        <path className="day tick" d="M198 44l5 5 8-10" style={d(2.7)} />
      </g>
      <Spark x={30} y={92} quiet />
    </Sv>
  );
}

/** Nothing to do yet: a warm cup, and something small growing beside it. */
function Cup() {
  return (
    <Sv>
      <Ground />
      <path d="M70 76h72v30a26 26 0 0 1-26 26H96a26 26 0 0 1-26-26z" fill="#fff" />
      <path d="M142 86h8a12 12 0 0 1 0 24h-8" />
      <path d="M70 92h72" stroke={LINE} />
      <path className="popin" d="M106 116c-7-5-10-9-10-12a5 5 0 0 1 10-3 5 5 0 0 1 10 3c0 3-3 7-10 12z" fill={LIME} style={d(0.9, "106px 108px")} />
      <path className="steam" d="M92 64c-4-7 4-11 0-18" stroke={LINE} style={d(0)} />
      <path className="steam" d="M106 62c-4-7 4-11 0-18" stroke={LINE} style={d(0.9)} />
      <path className="steam" d="M120 64c-4-7 4-11 0-18" stroke={LINE} style={d(1.8)} />
      <path d="M176 116h30l-4 22h-22z" fill={YEL} />
      <g className="sprout" style={d(1.2, "191px 116px")}>
        <g className="sway" style={d(0, "191px 116px")}>
          <path d="M191 116c0-14 1-24 5-32" />
          <path d="M193 98c-10-1-15-8-15-16 9 0 15 5 15 16z" fill={LIME} />
          <path d="M195 88c0-10 5-16 14-17 0 10-5 16-14 17z" fill={LIME} />
        </g>
      </g>
      <Spark x={212} y={46} t={1.9} />
      <Spark x={40} y={52} quiet />
    </Sv>
  );
}

/** A page being set up: a small house drawing itself, a light coming on. */
function Build() {
  return (
    <Sv>
      <Ground />
      <path className="draw" d="M74 138V84l46-38 46 38v54" pathLength={100} strokeDasharray="100" fill="none" style={d(0.3)} />
      <path className="draw" d="M62 92l58-48 58 48" pathLength={100} strokeDasharray="100" style={d(0.9)} />
      <rect className="risein" x={108} y={104} width={24} height={34} rx={4} fill={LIME} style={d(1.7)} />
      <g className="glow"><rect className="popin" x={138} y={92} width={18} height={18} rx={4} fill={YEL} style={d(2.1, "147px 101px")} /></g>
      <rect className="popin" x={84} y={92} width={18} height={18} rx={4} fill="#fff" style={d(2.3, "93px 101px")} />
      <g className="beat" style={d(0, "120px 22px")}>
        <path className="popin" d="M120 30c-8-5-11-10-11-13a5.5 5.5 0 0 1 11-3 5.5 5.5 0 0 1 11 3c0 3-3 8-11 13z" fill={PINK} style={d(2.6, "120px 22px")} />
      </g>
      <g className="sprout" style={d(1.4, "200px 138px")}>
        <g className="sway" style={d(0, "200px 138px")}>
          <path d="M200 138c0-12 1-20 4-28" />
          <path d="M202 122c-9-1-13-7-13-14 8 0 13 4 13 14z" fill={LIME} />
          <path d="M204 114c0-9 4-14 12-15 0 9-4 14-12 15z" fill={LIME} />
        </g>
      </g>
      <Spark x={204} y={52} t={2.9} />
      <Spark x={40} y={60} quiet />
    </Sv>
  );
}

/** A little, then more, then a lot: three sprouts, each taller than the last. */
function Grow() {
  const sprout = (x: number, h: number, t: number, fill: string) => (
    <g className="sprout" style={d(t, `${x}px 138px`)}>
      <g className="sway" style={d(t * 0.6, `${x}px 138px`)}>
        <path d={`M${x} 138c0-${Math.round(h * 0.5)} 1-${Math.round(h * 0.8)} 4-${h}`} />
        <path d={`M${x + 2} ${138 - h * 0.55}c-${Math.round(h * 0.22)}-2-${Math.round(h * 0.32)}-${Math.round(h * 0.16)}-${Math.round(h * 0.32)}-${Math.round(h * 0.32)} ${Math.round(h * 0.2)} 0 ${Math.round(h * 0.32)} ${Math.round(h * 0.12)} ${Math.round(h * 0.32)} ${Math.round(h * 0.32)}z`} fill={fill} />
        <path d={`M${x + 4} ${138 - h * 0.8}c0-${Math.round(h * 0.2)} ${Math.round(h * 0.1)}-${Math.round(h * 0.3)} ${Math.round(h * 0.3)}-${Math.round(h * 0.32)} 0 ${Math.round(h * 0.2)}-${Math.round(h * 0.1)} ${Math.round(h * 0.3)}-${Math.round(h * 0.3)} ${Math.round(h * 0.32)}z`} fill={LIME} />
      </g>
    </g>
  );
  return (
    <Sv>
      <Ground />
      <circle className="sunrise" cx={212} cy={28} r={12} fill={YEL} style={d(0.2)} />
      {sprout(62, 34, 0.5, YEL)}
      {sprout(116, 56, 1.0, LIME)}
      {sprout(170, 78, 1.5, LIME)}
      <path className="drop" d="M62 58c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z" fill={SKY} style={d(2.2, "62px 66px")} />
      <Spark x={30} y={44} t={2.4} />
    </Sv>
  );
}

const NEW: Partial<Record<OilName, (p: { frac?: number; cal?: CalInfo }) => JSX.Element>> = {
  call: Call, signpost: Signpost, stack: Stack, trail: Trail, folder: Folder, screen: Screen, book: Book, table: Table, fridge: Fridge, phone2: Phone2, sign: Sign,
  cal: Cal, kite: Kite, cup: Cup, build: Build, grow: Grow,
};
const PLUS: Partial<Record<OilName, (p: { size?: "" | "sm" | "xs" }) => JSX.Element>> = {
  path: IlloPath, session: IlloSession, jar: IlloJar, family: IlloFamily, done: IlloDone, search: IlloSearch, bank: IlloBank, hand: IlloHand, pair: IlloPair,
};

/**
 * One small drawing for a card. `w` is its width in px (84 to 120 reads
 * well). `corner` pins it to the card's top right, behind nothing: the card
 * needs `oil-host` and the heading `oil-clear` so text keeps clear of it.
 * `dropAt` hides it on phones narrower than that many px.
 */
export function Oil({ name, w = 96, frac, cal, corner, className = "", style }: { name: OilName; w?: number; frac?: number; cal?: CalInfo; corner?: boolean; className?: string; style?: CSSProperties }) {
  const N = NEW[name], P = PLUS[name];
  return (
    <span className={`oil${corner ? " is-corner" : ""} ${className}`.trim()} style={{ "--oil-w": `${w}px`, ...style } as CSSProperties} aria-hidden="true">
      {N ? <N frac={frac} cal={cal} /> : P ? <P /> : null}
    </span>
  );
}

/* ── The wide scene on the family's Home hero ─────────────────────────
   Shalom 2026-11-11: "make this like the budgeting one with the animation
   and more gorgeous ... like this and it moves." The same hill and flag as
   KDH Plus, drawn wide: the family's house at the start of a trail, the
   flag at the end, one marker for every step of their plan (done ones lime,
   the one they are on beating softly), and a sky that follows the clock:
   a sun coming up in the morning, high in the afternoon, a moon and stars
   in the evening with the window lit. */
export type DayPart = "morning" | "afternoon" | "evening";
/** The same cut-offs as the greeting (lib/quotes greetingWord). */
export const dayPart = (h = new Date().getHours()): DayPart => (h < 12 ? "morning" : h < 17 ? "afternoon" : "evening");

type Pt = [number, number];
const HERO_TRAIL: [Pt, Pt, Pt, Pt][] = [
  [[50, 107], [78, 88], [102, 104], [140, 88]],
  [[140, 88], [182, 72], [214, 80], [258, 62]],
  [[258, 62], [280, 53], [296, 46], [306, 37]],
];
const bez = (s: [Pt, Pt, Pt, Pt], t: number): Pt => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
  return [Math.round((a * s[0][0] + b * s[1][0] + c * s[2][0] + e * s[3][0]) * 10) / 10, Math.round((a * s[0][1] + b * s[1][1] + c * s[2][1] + e * s[3][1]) * 10) / 10];
};
const HERO_TRAIL_D = `M${HERO_TRAIL[0][0].join(" ")}` + HERO_TRAIL.map((s) => `C${s[1].join(" ")} ${s[2].join(" ")} ${s[3].join(" ")}`).join("");

export function HeroScene({ part = dayPart(), done = 0, total = 0, className = "" }: { part?: DayPart; done?: number; total?: number; className?: string }) {
  // One marker per step, nine at most (a longer plan is shown in proportion).
  const n = Math.max(0, Math.min(9, Math.round(total)));
  const doneN = total > 0 ? Math.max(0, Math.min(n, Math.round((done / total) * n))) : 0;
  const marks = Array.from({ length: n }, (_, i) => {
    const u = ((i + 1) / (n + 1)) * HERO_TRAIL.length;
    const k = Math.min(HERO_TRAIL.length - 1, Math.floor(u));
    return bez(HERO_TRAIL[k], u - k);
  });
  const evening = part === "evening";
  const maskId = `oilhero${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <div className={`oil oil-scene is-${part} ${className}`.trim()} aria-hidden="true">
      <div className="okp-illo">
        <svg viewBox="0 0 350 116" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {/* the far ridge */}
          <path d="M0 80C52 54 110 76 176 54s120-34 174-18v80H0z" fill="#fff" fillOpacity={0.5} stroke="none" />

          {/* the sky, by the clock */}
          {part === "morning" && (
            <>
              <g className="glow"><path d="M212 26v-8M190 34l-6-6M234 34l6-6M180 52h-8M244 52h8" stroke="#E9C93A" /></g>
              <circle className="sunrise" cx={212} cy={52} r={13} fill={YEL} style={d(0.3)} />
              <g className="drift"><path d="M246 20q4-5 8 0q4-5 8 0M268 30q3-4 6 0q3-4 6 0" strokeWidth={1.8} /></g>
            </>
          )}
          {part === "afternoon" && (
            <>
              <g className="glow"><path d="M236 4v6M236 38v6M216 24h6M250 24h6M222 10l4 4M246 34l4 4M250 10l-4 4M226 34l-4 4" stroke="#E9C93A" /></g>
              <circle className="sunrise" cx={236} cy={24} r={11} fill={YEL} style={d(0.3)} />
              <g transform="translate(-48 2)"><g className="drift"><path className="risein" d="M152 46h28a6.5 6.5 0 0 0 0-13 10 10 0 0 0-19-3 8 8 0 0 0-9 16z" fill="#fff" style={d(0.6)} /></g></g>
            </>
          )}
          {evening && (
            <>
              <path className="sunrise" d="M244 10a13 13 0 1 0 9 22 10.5 10.5 0 0 1-9-22z" fill={YEL} style={d(0.3)} />
              <g className="glow"><path d="M196 30v8M192 34h8" /></g>
              <g className="glow" style={d(1.3)}><path d="M276 12v6M273 15h6" /></g>
              <g className="glow" style={d(2.2)}><path d="M338 46v6M335 49h6" /></g>
            </>
          )}

          {/* the hill */}
          <path d="M0 92C40 70 84 90 132 74c44-14 82-12 130-28 34-11 64-12 88-16v86H0z" fill="#EDF8CF" stroke="none" />
          <path d="M0 92C40 70 84 90 132 74c44-14 82-12 130-28 34-11 64-12 88-16" />
          <g className="sway" style={d(0, "90px 81px")}><path d="M90 81V69" /><circle cx={90} cy={61} r={9} fill={LIME} /></g>
          <g className="sway" style={d(1.2, "170px 65px")}><path d="M170 65v-8" /><path d="M170 36l9 21h-18z" fill={LIME} /></g>

          {/* the trail, and a marker for each step of the plan */}
          <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={350} height={116}>
            <path className="draw" d={HERO_TRAIL_D} stroke="#fff" strokeWidth={8} pathLength={100} strokeDasharray="100" style={{ ...d(0.6), animationDuration: "1.8s" }} />
          </mask>
          <path d={HERO_TRAIL_D} strokeDasharray="6 7" mask={`url(#${maskId})`} />
          {marks.map(([x, y], i) => i < doneN ? (
            <circle key={i} className="popin" cx={x} cy={y} r={5} fill={LIME} style={d(1.2 + i * 0.14, `${x}px ${y}px`)} />
          ) : i === doneN ? (
            <g key={i} className="popin" style={d(1.2 + i * 0.14, `${x}px ${y}px`)}>
              <g className="beat" style={d(0, `${x}px ${y}px`)}>
                <circle cx={x} cy={y} r={7.5} fill="#fff" />
                <circle cx={x} cy={y} r={2.8} fill={INK} stroke="none" />
              </g>
            </g>
          ) : (
            <circle key={i} className="popin" cx={x} cy={y} r={3.2} fill={PAPER} stroke={INK} strokeOpacity={0.35} strokeWidth={1.6} style={d(1.2 + i * 0.14, `${x}px ${y}px`)} />
          ))}

          {/* the flag at the end */}
          <path className="risein" d="M306 37V8" style={d(1.9)} />
          <path className="wave" d="M306 8l24 8-24 8z" fill={total > 0 && done >= total ? YEL : LIME} style={d(2.2, "306px 16px")} />

          {/* home, at the start */}
          <path className="steam" d="M42 66c-3-5 3-8 0-13" stroke={LINE} style={d(0.4)} />
          <path d="M39 80V71h6v14" fill="#fff" />
          <path d="M16 108V88h30v20z" fill="#fff" />
          <path d="M11 89l20-18 20 18z" fill={PEACH} />
          <rect x={20} y={96} width={8} height={12} rx={2} fill={LIME} />
          <g className={evening ? "glow" : undefined}><rect x={33} y={94} width={8} height={8} rx={2} fill={evening ? YEL : "#fff"} /></g>

          {/* near ground */}
          <g className="sway" style={d(0.7, "334px 106px")}><path d="M334 106V92" /><circle cx={334} cy={82} r={10} fill={LIME} /></g>
          <path d="M238 104c0-5 2-8 5-9 1 4-1 8-5 9zM248 104c0-4-2-7-5-8-1 4 1 7 5 8z" fill={LIME} strokeWidth={1.6} />
          <path d="M160 112c0-4 2-7 4-8 1 4-1 7-4 8zM168 112c0-4-2-6-4-7-1 3 1 6 4 7z" fill={LIME} strokeWidth={1.6} />
        </svg>
      </div>
    </div>
  );
}

/** The drawing for a "right now" task, by its kind. */
export const oilForKind = (kind: string | undefined | null): OilName =>
  kind === "book" ? "session" : kind === "meet" ? "pair" : kind === "message" ? "call" : kind === "sign" ? "sign" : kind === "onus" ? "session" : "done";
