import type { ReactNode } from "react";

/**
 * Lightfield "signal" chip: white surface, hairline border, ink text, fully
 * rounded. Used for tags / labels / facts (the outlined pills in the reference
 * UI). Distinct from Pill.tsx, which is a soft-fill status pill. Optional
 * leading icon or colored dot.
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
        backgroundColor: "var(--ck-card)",
        border: "1px solid var(--ck-hairline)",
        color: "var(--ck-body)",
        padding: icon || dot ? "4px 11px 4px 9px" : "4px 11px",
        borderRadius: 999,
        fontSize: 12.5,
        lineHeight: "16px",
        fontWeight: 500,
        whiteSpace: "nowrap",
        letterSpacing: "-0.005em",
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: dot, flexShrink: 0 }} />}
      {icon}
      {label}
    </span>
  );
}
