import { ArrowUpRight, ArrowDownRight } from "@phosphor-icons/react";
import { Sparkline } from "./Sparkline";

interface Stat {
  label: string;
  value: string;
  up: boolean;
}

interface Props {
  label: string;
  /** Whole-dollar amount; cents render as a small superscript. */
  amount: number;
  deltaLabel: string;
  deltaUp: boolean;
  deltaSuffix?: string;
  data: number[];
  dateLabels?: string[];
  stats?: Stat[];
  color?: string;
}

function splitMoney(n: number) {
  const whole = Math.floor(Math.abs(n));
  const cents = Math.round((Math.abs(n) - whole) * 100).toString().padStart(2, "0");
  return { main: `$${whole.toLocaleString("en-US")}`, cents };
}

/**
 * Hero metric + area chart, borderless on the card. Primary number ~40px
 * 800 ink with the trailing cents as a small superscript; delta line below
 * in up / down green-red with a tiny ↗/↘; forest sparkline.
 */
export function HeroCard({ label, amount, deltaLabel, deltaUp, deltaSuffix, data, dateLabels, stats, color = "var(--gv-go)" }: Props) {
  const m = splitMoney(amount);
  const Arrow = deltaUp ? ArrowUpRight : ArrowDownRight;
  const deltaColor = deltaUp ? "var(--gv-up)" : "var(--gv-down)";

  return (
    <div>
      <div className="gv-meta" style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</div>
      <div className="tnum" style={{ display: "flex", alignItems: "flex-start", color: "var(--gv-ink)", marginTop: 4, minWidth: 0 }}>
        <span style={{ fontSize: 40, fontWeight: 800, lineHeight: "44px", letterSpacing: "-0.025em" }}>{m.main}</span>
        <span style={{ fontSize: 18, fontWeight: 700, lineHeight: "24px", marginLeft: 2 }}>.{m.cents}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
        <Arrow size={16} weight="bold" color={deltaColor} />
        <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: deltaColor }}>{deltaLabel}</span>
        {deltaSuffix && <span style={{ fontSize: 13.5, color: "var(--gv-quiet)" }}>{deltaSuffix}</span>}
      </div>

      <div style={{ marginTop: 18 }}>
        <Sparkline data={data} labels={dateLabels} color={color} height={150} />
      </div>

      {stats && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 32px", marginTop: 22 }}>
          {stats.map((s) => {
            const A = s.up ? ArrowUpRight : ArrowDownRight;
            const c = s.up ? "var(--gv-up)" : "var(--gv-down)";
            return (
              <div key={s.label} style={{ minWidth: 0 }}>
                <div className="gv-meta" style={{ fontSize: 13 }}>{s.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                  <A size={15} weight="bold" color={c} />
                  <span className="tnum" style={{ fontSize: 16, fontWeight: 800, color: "var(--gv-ink)" }}>{s.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
