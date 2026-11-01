import { CaretDown } from "@phosphor-icons/react";

interface Props {
  label: string;
  onPress?: () => void;
}

/** Dropdown chip, like "24h ⌄" / "Top gainers ⌄": white, hairline, radius 12. */
export function FilterPill({ label, onPress }: Props) {
  return (
    <button onClick={onPress} className="gv-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 12px 0 14px" }}>
      {label}
      <CaretDown size={13} weight="bold" />
    </button>
  );
}
