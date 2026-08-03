import { CaretDown } from "@phosphor-icons/react";

interface Props {
  label: string;
  onPress?: () => void;
}

/** Outlined dropdown pill, like "24h ⌄" / "Top gainers ⌄". */
export function FilterPill({ label, onPress }: Props) {
  return (
    <button
      onClick={onPress}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px 0 14px",
        borderRadius: 999, cursor: "pointer", border: "1px solid var(--ck-hairline)",
        backgroundColor: "var(--ck-card)", color: "var(--ck-body)", fontSize: 13, fontWeight: 600,
      }}
    >
      {label}
      <CaretDown size={13} weight="bold" />
    </button>
  );
}
