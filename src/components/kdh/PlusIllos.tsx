// components/kdh/PlusIllos.tsx
// The KDH Plus illustration set (2026-11-11): monoline scenes, 2.2px ink
// strokes, lime and yellow fills. Each scene builds itself in, then one
// small thing keeps moving. Decorative only (aria-hidden).
// Motion lives in theme/orchard-kdhplus.css (.okp-illo); it stops under
// prefers-reduced-motion.
import type { CSSProperties, ReactNode } from "react";

export type IlloSize = "" | "sm" | "xs";
export type IlloName = "session" | "jar" | "family" | "path" | "done" | "search" | "bank" | "hand" | "pair";

const INK = "#1C2E29", LIME = "#D7F36E", YEL = "#FFE870", LINE = "#C9D2C6", PAPER = "#F3F5F1";

/** animation-delay (+ the point a pop or wave turns around). */
const d = (sec: number, origin?: string): CSSProperties => ({ animationDelay: `${sec}s`, ...(origin ? { transformOrigin: origin } : {}) });

function Sv({ w, h, size = "", children }: { w: number; h: number; size?: IlloSize; children: ReactNode }) {
  return (
    <div className={`okp-illo${size ? ` is-${size}` : ""}`}>
      <svg viewBox={`0 0 ${w} ${h}`} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
    </div>
  );
}
const Ground = ({ y = 138 }: { y?: number }) => <path d={`M12 ${y}h216`} stroke={LINE} />;

/** A calendar with one day picked, and a warm cup beside it. */
export function IlloSession({ size }: { size?: IlloSize }) {
  const days: ReactNode[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const k = r * 4 + c, pick = c === 2 && r === 1;
    days.push(<rect key={k} className="day" x={50 + c * 25} y={64 + r * 20} width={14} height={12} rx={3} fill={pick ? YEL : PAPER} style={d(Math.round((0.9 + k * 0.14) * 100) / 100, `${57 + c * 25}px ${70 + r * 20}px`)} />);
  }
  return (
    <Sv w={240} h={150} size={size}>
      <rect x={36} y={32} width={114} height={100} rx={10} fill="#fff" />
      <path d="M36 54h114" />
      <path d="M36 42a10 10 0 0 1 10-10h94a10 10 0 0 1 10 10v12H36z" fill={LIME} />
      <path d="M62 24v16M124 24v16" />
      {days}
      <path className="day tick" d="M103 90l3 3 6-6" style={d(2.75, "109px 90px")} />
      <path d="M176 92h40v18a18 18 0 0 1-18 18h-4a18 18 0 0 1-18-18z" fill="#fff" />
      <path d="M216 98h8a8 8 0 0 1 0 16h-8" />
      <path className="steam" d="M186 80c-3-5 3-8 0-13" stroke={LINE} style={d(0)} />
      <path className="steam" d="M198 80c-3-5 3-8 0-13" stroke={LINE} style={d(1.1)} />
      <Ground />
    </Sv>
  );
}

/** A jar filling with coins, a sprout growing out of it. */
export function IlloJar({ size }: { size?: IlloSize }) {
  const coins: [number, number, number][] = [[97, 124, 0.6], [126, 124, 0.8], [97, 116, 1.0], [126, 116, 1.2], [97, 108, 1.4]];
  return (
    <Sv w={240} h={150} size={size}>
      <Ground />
      <rect x={78} y={34} width={64} height={12} rx={4} fill="#fff" />
      <path d="M72 50h76v70a16 16 0 0 1-16 16H88a16 16 0 0 1-16-16z" fill="#fff" />
      <path d="M80 58v58" stroke={LINE} />
      {coins.map(([x, y, t], i) => <ellipse key={i} className="coin" cx={x} cy={y} rx={15} ry={5} fill={YEL} style={d(t, `${x}px ${y}px`)} />)}
      <g className="sprout" style={d(1.7, "112px 102px")}>
        <path d="M112 102c0-18 2-30 10-42" />
        <path d="M118 78c-12-2-18-10-18-20 10 0 18 6 18 20z" fill={LIME} />
        <path d="M121 66c0-12 6-19 18-20 0 12-6 19-18 20z" fill={LIME} />
      </g>
      <ellipse className="drop" cx={190} cy={52} rx={13} ry={5} fill={YEL} transform="rotate(-20 190 52)" style={d(2.4)} />
      <path d="M212 28l0 10M207 33h10" />
      <path d="M40 60l0 8M36 64h8" stroke={LINE} />
    </Sv>
  );
}

/** A house and the people it is for. */
export function IlloFamily({ size }: { size?: IlloSize }) {
  return (
    <Sv w={240} h={130} size={size}>
      <Ground y={118} />
      <path d="M78 66v52h84V66" fill="#fff" />
      <path d="M66 72l54-40 54 40" fill="#fff" />
      <rect x={110} y={88} width={20} height={30} rx={3} fill={LIME} />
      <rect x={88} y={78} width={14} height={12} rx={2} fill={YEL} />
      <rect x={138} y={78} width={14} height={12} rx={2} fill={YEL} />
      <g className="popin" style={d(0.7, "188px 96px")}><circle cx={188} cy={88} r={8} fill="#F3D9F7" /><path d="M188 96v22" /></g>
      <g className="popin" style={d(1.0, "208px 102px")}><circle cx={208} cy={96} r={6} fill={LIME} /><path d="M208 102v16" /></g>
      <g className="popin" style={d(1.3, "46px 100px")}><circle cx={46} cy={92} r={7} fill={YEL} /><path d="M46 99v19" /></g>
      <path className="popin" d="M200 40l0 8M196 44h8" stroke={LINE} style={d(1.8, "200px 44px")} />
    </Sv>
  );
}

/** A path over the hills to a flag. */
export function IlloPath({ size }: { size?: IlloSize }) {
  return (
    <Sv w={240} h={150} size={size}>
      <circle className="sunrise" cx={198} cy={40} r={14} fill={YEL} style={d(0.3)} />
      <path d="M0 126c40-26 80-6 118-28s70-30 122-14v66H0z" fill="#EDF8CF" stroke="none" />
      <path d="M0 126c40-26 80-6 118-28s70-30 122-14" />
      <path className="draw" d="M22 144c30-22 46-6 72-26s50-24 80-36" strokeDasharray="6 6" pathLength={100} style={d(0.7)} />
      <path className="risein" d="M176 84V44" style={d(1.9)} />
      <path className="wave" d="M176 44l30 10-30 10z" fill={LIME} style={d(2.2, "176px 54px")} />
      <circle cx={58} cy={104} r={10} fill={LIME} /><path d="M58 114v12" />
      <circle cx={216} cy={100} r={8} fill={LIME} /><path d="M216 108v10" />
    </Sv>
  );
}

/** A checklist ticking itself off. */
export function IlloDone({ size }: { size?: IlloSize }) {
  return (
    <Sv w={240} h={150} size={size}>
      <Ground />
      <rect x={70} y={30} width={100} height={106} rx={10} fill="#fff" />
      <rect x={100} y={22} width={40} height={16} rx={6} fill={LIME} />
      {[0, 1, 2].map((i) => {
        const y = 62 + i * 24;
        return (
          <g key={i}>
            <rect className="day" x={84} y={54 + i * 24} width={16} height={16} rx={5} fill={i < 2 ? LIME : PAPER} style={d(Math.round((0.6 + i * 0.35) * 100) / 100, `92px ${y}px`)} />
            <path className="day tick" d={`M88 ${y}l3 3 6-6`} style={d(Math.round((0.95 + i * 0.35) * 100) / 100, `92px ${y}px`)} />
            <path d={`M108 ${y}h${i === 1 ? 40 : 48}`} stroke={LINE} />
          </g>
        );
      })}
      <path className="wave" d="M190 60l0 10M185 65h10" style={d(1.8, "190px 65px")} />
      <path d="M44 48l0 8M40 52h8" stroke={LINE} />
    </Sv>
  );
}

/** Cards on a table, a glass over one of them. */
export function IlloSearch({ size }: { size?: IlloSize }) {
  return (
    <Sv w={240} h={150} size={size}>
      <Ground />
      <rect x={40} y={48} width={60} height={44} rx={8} fill="#fff" />
      <rect className="nudge" x={112} y={40} width={60} height={44} rx={8} fill="#FFF7C2" style={d(0.4)} />
      <rect x={76} y={96} width={60} height={40} rx={8} fill="#fff" />
      <path d="M52 62h32M52 72h22M124 54h32M124 64h20M88 110h32M88 120h18" stroke={LINE} />
      <g className="popin" style={d(0.9, "186px 100px")}><circle cx={186} cy={100} r={22} fill={LIME} fillOpacity={0.55} /><path d="M202 116l18 18" strokeWidth={3} /></g>
    </Sv>
  );
}

/** A bank, coins arriving, a lock beside it. */
export function IlloBank({ size }: { size?: IlloSize }) {
  return (
    <Sv w={240} h={150} size={size}>
      <Ground />
      <rect x={62} y={118} width={116} height={14} rx={4} fill="#fff" />
      {[78, 102, 126, 150].map((x, n) => <rect key={x} className="risein" x={x} y={74} width={12} height={44} rx={3} fill="#fff" style={d(Math.round((0.5 + n * 0.15) * 100) / 100)} />)}
      <path d="M60 70l60-36 60 36z" fill={LIME} />
      <circle cx={120} cy={56} r={5} fill="#fff" />
      <path d="M62 70h116" />
      <ellipse className="drop" cx={204} cy={60} rx={13} ry={5} fill={YEL} transform="rotate(-18 204 60)" style={d(1.4)} />
      <ellipse className="coin" cx={204} cy={130} rx={14} ry={5} fill={YEL} style={d(1.2, "204px 130px")} />
      <ellipse className="coin" cx={204} cy={122} rx={14} ry={5} fill={YEL} style={d(1.5, "204px 122px")} />
      <g className="popin" style={d(1.9, "40px 104px")}>
        <rect x={26} y={96} width={28} height={22} rx={6} fill="#fff" />
        <path d="M32 96v-6a8 8 0 0 1 16 0v6" />
        <circle cx={40} cy={107} r={2.5} fill={INK} />
      </g>
      <path d="M40 52l0 8M36 56h8" stroke={LINE} />
    </Sv>
  );
}

/** An open hand, a heart resting on it, coins beside. */
export function IlloHand({ size }: { size?: IlloSize }) {
  return (
    <Sv w={240} h={150} size={size}>
      <Ground />
      <path d="M44 112c18-10 34-12 52-6l30 8c8 2 8 12-2 12H98" fill="#fff" />
      <path d="M124 124l48-18c10-4 16 8 6 14l-56 26H66l-22 6" fill="#fff" />
      <path d="M44 106v40" />
      <g className="beat" style={d(0, "132px 70px")}>
        <path className="popin" d="M132 92c-22-14-30-26-30-36a14 14 0 0 1 30-6 14 14 0 0 1 30 6c0 10-8 22-30 36z" fill={LIME} style={d(0.6, "132px 70px")} />
      </g>
      <ellipse className="coin" cx={200} cy={74} rx={13} ry={5} fill={YEL} style={d(1.2, "200px 74px")} />
      <ellipse className="coin" cx={200} cy={66} rx={13} ry={5} fill={YEL} style={d(1.45, "200px 66px")} />
      <path className="popin" d="M84 40l0 10M79 45h10" style={d(1.8, "84px 45px")} />
      <path d="M196 36l0 8M192 40h8" stroke={LINE} />
    </Sv>
  );
}

/** Client and budgeter, a lime bubble between them. */
export function IlloPair({ size }: { size?: IlloSize }) {
  return (
    <Sv w={240} h={150} size={size}>
      <Ground />
      <g className="popin" style={d(0.3, "70px 110px")}><circle cx={70} cy={78} r={14} fill={YEL} /><path d="M46 138v-16a24 24 0 0 1 48 0v16" fill="#fff" /></g>
      <g className="popin" style={d(0.7, "170px 110px")}><circle cx={170} cy={78} r={14} fill="#F3D9F7" /><path d="M146 138v-16a24 24 0 0 1 48 0v16" fill="#fff" /></g>
      <g className="popin" style={d(1.3, "120px 52px")}>
        <path d="M96 30h48a10 10 0 0 1 10 10v20a10 10 0 0 1-10 10h-18l-10 10v-10h-20a10 10 0 0 1-10-10V40a10 10 0 0 1 10-10z" fill={LIME} />
        <path className="day tick" d="M110 50l7 7 13-14" style={d(1.9)} />
      </g>
      <path className="wave" d="M208 44l0 10M203 49h10" style={d(2.2, "208px 49px")} />
      <path d="M32 56l0 8M28 60h8" stroke={LINE} />
    </Sv>
  );
}

const SET: Record<IlloName, (p: { size?: IlloSize }) => JSX.Element> = {
  session: IlloSession, jar: IlloJar, family: IlloFamily, path: IlloPath, done: IlloDone, search: IlloSearch, bank: IlloBank, hand: IlloHand, pair: IlloPair,
};
export function PlusIllo({ name, size }: { name: IlloName; size?: IlloSize }) {
  const C = SET[name];
  return <C size={size} />;
}
