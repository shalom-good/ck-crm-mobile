import { TONE, toneForLabel, type Tone } from "@/lib/format";

interface Props {
  label: string;
  tone?: Tone;
}

/** Pastel pill. Pass a tone, or let it derive one from the label text. */
export function Pill({ label, tone }: Props) {
  const t = TONE[tone ?? toneForLabel(label)];
  return (
    <span
      style={{
        backgroundColor: t.bg,
        color: t.text,
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        lineHeight: "16px",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
