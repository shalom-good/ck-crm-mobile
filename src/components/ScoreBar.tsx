/**
 * Score indicator: a row of short dashes that fill left-to-right by value,
 * coloured by band — forest = strong, coral = watch (the one emphasised
 * colour), red = behind (a blocker). Empty dashes are the resting bar grey.
 * Optionally trailed by the numeric score.
 */

export type Band = "strong" | "watch" | "behind";

export const BAND: Record<Band, { bar: string; pillBg: string; pillText: string; label: string }> = {
  strong: { bar: "var(--gv-go)", pillBg: "var(--gv-upBg)", pillText: "var(--gv-up)", label: "On track" },
  watch: { bar: "var(--gv-coral)", pillBg: "var(--gv-apricot)", pillText: "var(--gv-apricotInk)", label: "Watch" },
  behind: { bar: "var(--gv-down)", pillBg: "var(--gv-downBg)", pillText: "var(--gv-down)", label: "Behind" },
};

export function bandFor(score: number): Band {
  return score >= 70 ? "strong" : score >= 45 ? "watch" : "behind";
}

interface Props {
  value: number; // 0–100
  segments?: number;
  showValue?: boolean;
  width?: number; // px per dash
}

export function ScoreBar({ value, segments = 6, showValue = true, width = 13 }: Props) {
  const band = bandFor(value);
  const filled = Math.max(1, Math.round((Math.min(100, Math.max(0, value)) / 100) * segments));
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <div style={{ display: "inline-flex", gap: 3, minWidth: 0 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            style={{
              width,
              height: 4,
              borderRadius: 2,
              background: i < filled ? BAND[band].bar : "var(--gv-bar)",
            }}
          />
        ))}
      </div>
      {showValue && (
        <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: "var(--gv-ink)", letterSpacing: "-0.01em" }}>
          {Math.round(value)}
        </span>
      )}
    </div>
  );
}
