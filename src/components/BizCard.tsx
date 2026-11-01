import type { ReactNode } from "react";
import { CaretRight } from "@phosphor-icons/react";

/**
 * Big stat tiles: a pill on top, a large tight number, a label, and a
 * chevron. Tones are the Grove pastels (mint for a neutral stat, rose for an
 * alert, white for plain) plus the one forest focal card with a lime pill.
 */

type Tone = "sage" | "rose" | "plain";

const TONE: Record<Tone, { bg: string; shadow: string; pillBg: string; pillText: string; value: string; label: string }> = {
  sage: { bg: "var(--gv-mint)", shadow: "none", pillBg: "rgba(255,255,255,.85)", pillText: "var(--gv-mintInk)", value: "var(--gv-ink)", label: "var(--gv-mintInk)" },
  rose: { bg: "var(--gv-rose)", shadow: "none", pillBg: "rgba(255,255,255,.85)", pillText: "var(--gv-roseInk)", value: "var(--gv-roseInk)", label: "var(--gv-roseInk)" },
  plain: { bg: "var(--gv-card)", shadow: "var(--gv-shadow)", pillBg: "var(--gv-inset)", pillText: "var(--gv-mid)", value: "var(--gv-ink)", label: "var(--gv-mid)" },
};

export function StatCard({ tone = "plain", pill, value, label, onClick }: {
  tone?: Tone; pill?: string; value: string; label: string; onClick?: () => void;
}) {
  const t = TONE[tone];
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, textAlign: "left", cursor: onClick ? "pointer" : "default", font: "inherit",
        background: t.bg, border: 0, boxShadow: t.shadow, borderRadius: "var(--gv-r-card)", padding: 16,
        minHeight: 140, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16,
      }}
    >
      {pill ? (
        <span style={{ alignSelf: "flex-start", maxWidth: "100%", height: 24, display: "inline-flex", alignItems: "center", background: t.pillBg, color: t.pillText, fontSize: 12, fontWeight: 700, padding: "0 9px", borderRadius: "var(--gv-r-pill)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pill}</span>
      ) : <span />}
      <div style={{ minWidth: 0 }}>
        <div className="tnum" style={{ fontSize: 36, fontWeight: 800, lineHeight: "40px", letterSpacing: "-0.025em", color: t.value }}>{value}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.label }}>{label}</span>
          {onClick && <CaretRight size={16} weight="bold" color={t.label} style={{ flexShrink: 0 }} />}
        </div>
      </div>
    </button>
  );
}

/** The one focal card per screen: forest with a lime pill (never a dark slab). */
export function DarkHero({ value, unit, pill, label, onClick }: {
  value: ReactNode; unit?: string; pill?: string; label: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left", cursor: onClick ? "pointer" : "default", font: "inherit",
        background: "var(--gv-go)", border: 0, borderRadius: "var(--gv-r-card)", padding: "20px 20px 18px",
        boxShadow: "0 10px 24px -10px rgba(46,81,70,.55)",
        display: "flex", flexDirection: "column", gap: 26,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div className="tnum" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.025em", color: "#fff", lineHeight: "40px", minWidth: 0 }}>
          {value}{unit && <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginLeft: 2 }}>{unit}</span>}
        </div>
        {pill && <span style={{ flexShrink: 0, height: 24, display: "inline-flex", alignItems: "center", background: "var(--gv-lime)", color: "var(--gv-ink)", fontSize: 12, fontWeight: 700, padding: "0 9px", borderRadius: "var(--gv-r-pill)", whiteSpace: "nowrap" }}>{pill}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.72)" }}>{label}</span>
        {onClick && <CaretRight size={18} weight="bold" color="rgba(255,255,255,0.6)" style={{ flexShrink: 0 }} />}
      </div>
    </button>
  );
}
