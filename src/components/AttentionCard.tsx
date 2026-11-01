import { CaretRight, Phone, NotePencil } from "@phosphor-icons/react";
import type { AttentionItem } from "@/lib/attention";
import { ROLE_BY_KEY } from "@/lib/roles";
import { Av, Pill } from "./gv";

interface Props {
  item: AttentionItem;
  onOpen: () => void;
  onLog?: () => void;
}

/**
 * One "needs me" row: the family, why they need you (scored reason pills:
 * rose = blocker, yellow = to settle), and 1-tap Call / Log actions so the
 * field worker can act without leaving the home screen. Tapping the body
 * opens the record. White Grove card, no border; Call is the forest text link.
 */
export function AttentionCard({ item, onOpen, onLog }: Props) {
  const tel = (item.phone || "").replace(/[^0-9+]/g, "");
  return (
    <div className="gv-card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        onClick={onOpen}
        style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "none", border: 0, padding: 14, display: "flex", gap: 12, alignItems: "center", font: "inherit", color: "inherit" }}
      >
        <Av name={item.name} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gv-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.name}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {item.reasons.slice(0, 3).map((r) => (
              <Pill key={r.label} tint={r.tone === "rose" ? "rose" : "yellow"}>{r.label}</Pill>
            ))}
          </div>
          {item.sub && (
            <div className="gv-meta" style={{ marginTop: 6 }}>
              {item.sub} · {item.type === "kdh" ? ROLE_BY_KEY.debt_expert.short : ROLE_BY_KEY.case_manager.short}
            </div>
          )}
        </div>
        <CaretRight size={16} weight="bold" color="var(--gv-quiet)" style={{ flexShrink: 0 }} />
      </button>

      {(tel || onLog) && (
        <div style={{ display: "flex", borderTop: "1px solid var(--gv-hair)" }}>
          {tel && (
            <a
              href={`tel:${tel}`}
              onClick={(e) => e.stopPropagation()}
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", color: "var(--gv-go)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}
            >
              <Phone size={16} weight="bold" /> Call
            </a>
          )}
          {onLog && (
            <button
              onClick={(e) => { e.stopPropagation(); onLog(); }}
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", background: "none", border: 0, borderLeft: tel ? "1px solid var(--gv-hair)" : "none", color: "var(--gv-ink)", cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 700 }}
            >
              <NotePencil size={16} weight="regular" /> Log note
            </button>
          )}
        </div>
      )}
    </div>
  );
}
