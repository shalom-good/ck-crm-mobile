import { ArrowUpRight, ArrowDownRight } from "@phosphor-icons/react";
import { Sparkline } from "./Sparkline";

interface Stat {
  label: string;
  value: string;
  up: boolean;
}

interface Props {
  label: string;
  /** Whole-dollar amount; cents render as a Mercury superscript. */
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
 * Mercury hero metric + area chart. Borderless on the white page. Primary
 * number ~44px semibold with the trailing cents as a ~20px superscript; delta
 * line below with a tiny ↗/↘.
 */
export function HeroCard({ label, amount, deltaLabel, deltaUp, deltaSuffix, data, dateLabels, stats, color = "#3B7AF7" }: Props) {
  const m = splitMoney(amount);
  const Arrow = deltaUp ? ArrowUpRight : ArrowDownRight;
  const deltaColor = deltaUp ? "var(--ck-success)" : "var(--ck-danger)";

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ck-body)" }}>{label}</div>
      <div className="tnum" style={{ display: "flex", alignItems: "flex-start", color: "var(--ck-title)", marginTop: 4 }}>
        <span style={{ fontSize: 44, fontWeight: 600, lineHeight: "48px", letterSpacing: "-0.5px" }}>{m.main}</span>
        <span style={{ fontSize: 20, fontWeight: 600, lineHeight: "26px", marginLeft: 2 }}>.{m.cents}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
        <Arrow size={16} weight="bold" color={deltaColor} />
        <span className="tnum" style={{ fontSize: 14, fontWeight: 500, color: deltaColor }}>{deltaLabel}</span>
        {deltaSuffix && <span style={{ fontSize: 14, color: "var(--ck-muted)" }}>{deltaSuffix}</span>}
      </div>

      <div style={{ marginTop: 18 }}>
        <Sparkline data={data} labels={dateLabels} color={color} height={150} />
      </div>

      {stats && (
        <div style={{ display: "flex", gap: 40, marginTop: 22 }}>
          {stats.map((s) => {
            const A = s.up ? ArrowUpRight : ArrowDownRight;
            const c = s.up ? "var(--ck-success)" : "var(--ck-danger)";
            return (
              <div key={s.label}>
                <div style={{ fontSize: 13, color: "var(--ck-body)" }}>{s.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                  <A size={15} weight="bold" color={c} />
                  <span className="tnum" style={{ fontSize: 16, fontWeight: 600, color: "var(--ck-title)" }}>{s.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
