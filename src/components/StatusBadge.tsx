/** Soft washed status pill with a leading dot — coral / butter / lavender /
 *  mist. The only way status is colored in this design (no bright UI colors). */
export type BadgeTone = "coral" | "butter" | "lavender" | "mist";

const B: Record<BadgeTone, { bg: string; fg: string }> = {
  coral: { bg: "var(--badge-coral-bg)", fg: "var(--badge-coral-fg)" },
  butter: { bg: "var(--badge-butter-bg)", fg: "var(--badge-butter-fg)" },
  lavender: { bg: "var(--badge-lavender-bg)", fg: "var(--badge-lavender-fg)" },
  mist: { bg: "var(--badge-mist-bg)", fg: "var(--badge-mist-fg)" },
};

export function StatusBadge({ label, tone = "mist", dot = true }: { label: string; tone?: BadgeTone; dot?: boolean }) {
  const t = B[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 10px", borderRadius: 999, background: t.bg, color: t.fg, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.fg, flexShrink: 0 }} />}
      {label}
    </span>
  );
}
