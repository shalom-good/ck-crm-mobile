import { Phone, User, CaretRight } from "@phosphor-icons/react";
import type { Resource } from "@/lib/types";

interface Props {
  resource: Resource;
  onOpen?: () => void;
}

export function ResourceRow({ resource, onOpen }: Props) {
  return (
    <button
      onClick={onOpen}
      className="shadow-card"
      style={{
        width: "100%", textAlign: "left", cursor: "pointer",
        backgroundColor: "var(--ck-card)", border: "1px solid var(--ck-hairline)",
        borderRadius: 18, padding: 16, display: "flex", alignItems: "center", gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ck-title)" }}>{resource.name}</div>
        {resource.description && (
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--ck-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {resource.description}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: "var(--ck-muted)" }}>
          {resource.contact && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><User size={13} />{resource.contact}</span>}
          {resource.phone && <span className="tnum" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={13} />{resource.phone}</span>}
        </div>
      </div>
      <CaretRight size={18} weight="bold" color="var(--ck-muted)" />
    </button>
  );
}
