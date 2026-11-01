import { CaretDown } from "@phosphor-icons/react";
import { useRole } from "@/lib/roles";

interface Props {
  onPress: () => void;
}

/** Shows the active role as a pill tinted with the role accent (14%) and
 *  accent text, radius 8, never bordered. Tap to switch (drives the whole
 *  app's lens). */
export function RoleChip({ onPress }: Props) {
  const { role } = useRole();
  return (
    <button
      onClick={onPress}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, height: 28, padding: "0 8px 0 10px",
        borderRadius: "var(--gv-r-pill)", cursor: "pointer", border: 0, font: "inherit",
        background: `${role.accent}24`, color: role.accent, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
      }}
    >
      {role.label}
      <CaretDown size={12} weight="bold" />
    </button>
  );
}
