import { CaretDown } from "@phosphor-icons/react";
import { useRole } from "@/lib/roles";

interface Props {
  onPress: () => void;
}

/** Shows the active role. Tap to switch (drives the whole app's lens). */
export function RoleChip({ onPress }: Props) {
  const { role } = useRole();
  return (
    <button
      onClick={onPress}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px 0 8px",
        borderRadius: 999, cursor: "pointer", border: `1.5px solid ${role.accent}`,
        backgroundColor: `${role.accent}1F`, color: role.accent, fontSize: 13, fontWeight: 600,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: role.accent }} />
      {role.label}
      <CaretDown size={13} weight="bold" />
    </button>
  );
}
