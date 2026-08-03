/**
 * Lightfield's signature score indicator: a row of short dashes that fill
 * left-to-right by value, colored by band (green = strong, amber = watch,
 * terracotta = behind). Empty dashes are a faint hairline. Optionally trailed
 * by the numeric score. This is the element that most says "Lightfield".
 */

export type Band = "strong" | "watch" | "behind";

export const BAND: Record<Band, { bar: string; pillBg: string; pillText: string; label: string }> = {
  strong: { bar: "#46A04E", pillBg: "#E7F3E9", pillText: "#347A3C", label: "On track" },
  watch: { bar: "#D99A2E", pillBg: "#F6ECD4", pillText: "#8A6A1E", label: "Watch" },
  behind: { bar: "#C2531F", pillBg: "#F8E8DF", pillText: "#A8431A", label: "Behind" },
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
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "inline-flex", gap: 3 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            style={{
              width,
              height: 4,
              borderRadius: 2,
              backgroundColor: i < filled ? BAND[band].bar : "#E6E6E8",
            }}
          />
        ))}
      </div>
      {showValue && (
        <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--ck-title)", letterSpacing: "-0.01em" }}>
          {Math.round(value)}
        </span>
      )}
    </div>
  );
}
