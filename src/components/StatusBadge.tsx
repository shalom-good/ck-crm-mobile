/** Status pill in the Grove pastels — coral (rose), butter (yellow),
 *  lavender, mist (inset). Same shape as every other pill: radius 8, 24
 *  tall, 12/700, never bordered. No dot by default. */
export type BadgeTone = "coral" | "butter" | "lavender" | "mist";

const B: Record<BadgeTone, { bg: string; fg: string }> = {
  coral: { bg: "var(--gv-rose)", fg: "var(--gv-roseInk)" },
  butter: { bg: "var(--gv-yellow)", fg: "var(--gv-yellowInk)" },
  lavender: { bg: "var(--gv-lavender)", fg: "var(--gv-lavenderInk)" },
  mist: { bg: "var(--gv-inset)", fg: "var(--gv-mid)" },
};

export function StatusBadge({ label, tone = "mist", dot = false }: { label: string; tone?: BadgeTone; dot?: boolean }) {
  const t = B[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 24, padding: "0 9px", borderRadius: "var(--gv-r-pill)", background: t.bg, color: t.fg, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.fg, flexShrink: 0 }} />}
      {label}
    </span>
  );
}
