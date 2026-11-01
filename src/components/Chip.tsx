import type { ReactNode } from "react";

/**
 * Quiet fact chip: inset fill (#F4F6F2), mid ink, radius 8 — never
 * bordered (bordered chips are forbidden in the Grove look). Used for tags /
 * labels / facts. Distinct from Pill.tsx, which carries a pastel status tone.
 * Optional leading icon or coloured dot.
 */
interface Props {
  label: string;
  icon?: ReactNode;
  dot?: string;
}

export function Chip({ label, icon, dot }: Props) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 24,
        background: "var(--gv-inset)",
        color: "var(--gv-mid)",
        padding: icon || dot ? "0 9px 0 8px" : "0 9px",
        borderRadius: "var(--gv-r-pill)",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: dot, flexShrink: 0 }} />}
      {icon}
      {label}
    </span>
  );
}
