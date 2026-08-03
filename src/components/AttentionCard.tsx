import { CaretRight, Phone, NotePencil } from "@phosphor-icons/react";
import type { AttentionItem } from "@/lib/attention";
import { ROLE_BY_KEY } from "@/lib/roles";
import { Avatar } from "./Avatar";
import { Pill } from "./Pill";

interface Props {
  item: AttentionItem;
  onOpen: () => void;
  onLog?: () => void;
}

/**
 * One "needs me" row: the family, why they need you (scored reason pills),
 * and 1-tap Call / Log actions so the field worker can act without leaving
 * the home screen. Tapping the body opens the record.
 */
export function AttentionCard({ item, onOpen, onLog }: Props) {
  const tel = (item.phone || "").replace(/[^0-9+]/g, "");
  return (
    <div className="shadow-card" style={{ backgroundColor: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 18, overflow: "hidden" }}>
      <button
        onClick={onOpen}
        style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "none", border: 0, padding: 14, display: "flex", gap: 12, alignItems: "center" }}
      >
        <Avatar name={item.name} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ck-title)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.name}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {item.reasons.slice(0, 3).map((r) => (
              <Pill key={r.label} label={r.label} tone={r.tone === "rose" ? "red" : "amber"} />
            ))}
          </div>
          {item.sub && (
            <div style={{ fontSize: 12, color: "var(--ck-muted)", marginTop: 6 }}>
              {item.sub} · {item.type === "kdh" ? ROLE_BY_KEY.debt_expert.short : ROLE_BY_KEY.case_manager.short}
            </div>
          )}
        </div>
        <CaretRight size={18} weight="bold" color="var(--ck-muted)" style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>

      {(tel || onLog) && (
        <div style={{ display: "flex", borderTop: "1px solid var(--ck-hairline)" }}>
          {tel && (
            <a
              href={`tel:${tel}`}
              onClick={(e) => e.stopPropagation()}
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 0", color: "var(--ck-tint)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
            >
              <Phone size={16} weight="bold" /> Call
            </a>
          )}
          {onLog && (
            <button
              onClick={(e) => { e.stopPropagation(); onLog(); }}
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 0", background: "none", border: 0, borderLeft: tel ? "1px solid var(--ck-hairline)" : "none", color: "var(--ck-title)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              <NotePencil size={16} weight="regular" /> Log note
            </button>
          )}
        </div>
      )}
    </div>
  );
}
