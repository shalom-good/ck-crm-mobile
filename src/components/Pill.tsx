import { TONE, toneForLabel, type Tone } from "@/lib/format";

interface Props {
  label: string;
  tone?: Tone;
}

/** Pastel pill: tinted fill + matching ink from lib/format TONE, radius 8,
 *  24 tall, 12/700. Pass a tone, or let it derive one from the label text. */
export function Pill({ label, tone }: Props) {
  const t = TONE[tone ?? toneForLabel(label)];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 24,
        padding: "0 9px",
        borderRadius: "var(--gv-r-pill)",
        background: t.bg,
        color: t.text,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
