import type { ReactNode } from "react";
import { CaretRight } from "@phosphor-icons/react";

/**
 * BizLink-style cards: big rounded tiles with a pill on top, a large tight
 * number, a label, and a chevron. Soft sage / rose tints for stats, plus an
 * obsidian "hero" card. The defining shapes of the reference UI.
 */

type Tone = "sage" | "rose" | "plain";

const TONE: Record<Tone, { bg: string; border: string; pillBg: string; pillText: string; value: string; label: string }> = {
  // sage = pale cream-sage (neutral stat), rose = soft coral (alert)
  sage: { bg: "#ECEFE3", border: "transparent", pillBg: "#FAF7F1", pillText: "#5C6450", value: "#111111", label: "#5C6450" },
  rose: { bg: "#F6E6E2", border: "transparent", pillBg: "#EDD0CA", pillText: "#B5483A", value: "#B5483A", label: "#9C6A5C" },
  plain: { bg: "#FFFFFF", border: "var(--ck-hairline)", pillBg: "#F1ECE2", pillText: "#6B6B6B", value: "#111111", label: "#6B6B6B" },
};

export function StatCard({ tone = "plain", pill, value, label, onClick }: {
  tone?: Tone; pill?: string; value: string; label: string; onClick?: () => void;
}) {
  const t = TONE[tone];
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, textAlign: "left", cursor: onClick ? "pointer" : "default",
        background: t.bg, border: `1px solid ${t.border}`, borderRadius: 22, padding: 16,
        minHeight: 140, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16,
      }}
    >
      {pill ? (
        <span style={{ alignSelf: "flex-start", maxWidth: "100%", background: t.pillBg, color: t.pillText, fontSize: 11.5, fontWeight: 600, padding: "5px 11px", borderRadius: 999, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pill}</span>
      ) : <span />}
      <div>
        <div className="tnum" style={{ fontSize: 40, fontWeight: 700, lineHeight: "42px", letterSpacing: "-0.03em", color: t.value }}>{value}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: t.label }}>{label}</span>
          {onClick && <CaretRight size={16} weight="bold" color={t.label} />}
        </div>
      </div>
    </button>
  );
}

export function DarkHero({ value, unit, pill, label, onClick }: {
  value: ReactNode; unit?: string; pill?: string; label: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left", cursor: onClick ? "pointer" : "default",
        background: "var(--ck-ink)", border: "none", borderRadius: 24, padding: "20px 20px 18px",
        display: "flex", flexDirection: "column", gap: 26,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div className="tnum" style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ck-ink-text)", lineHeight: "40px" }}>
          {value}{unit && <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginLeft: 2 }}>{unit}</span>}
        </div>
        {pill && <span style={{ flexShrink: 0, background: "var(--ck-ink-pill)", color: "var(--ck-ink-pill-text)", fontSize: 11.5, fontWeight: 600, padding: "6px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>{pill}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: "rgba(255,255,255,0.62)" }}>{label}</span>
        {onClick && <CaretRight size={18} weight="bold" color="rgba(255,255,255,0.6)" />}
      </div>
    </button>
  );
}
