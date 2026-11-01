import type { CSSProperties } from "react";
import { Phone, User, CaretRight, BookOpenText, LinkSimple } from "@phosphor-icons/react";
import type { Resource } from "@/lib/types";
import { Card } from "./gv";

interface Props {
  resource: Resource;
  onOpen?: () => void;
  /** Stagger index for the rise-in (optional). */
  i?: number;
}

const ellipsis: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/** Directory row: white card, sky icon tile, name + one-line description + quiet contact. */
export function ResourceRow({ resource, onOpen, i }: Props) {
  return (
    <Card i={i} onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
      <span className="gv-tile" style={{ width: 40, height: 40, background: "var(--gv-sky)", color: "var(--gv-skyInk)" }}>
        {resource.link ? <LinkSimple size={18} weight="bold" /> : <BookOpenText size={18} weight="bold" />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--gv-ink)", ...ellipsis }}>{resource.name}</div>
        {resource.description && (
          <div style={{ fontSize: 13, color: "var(--gv-mid)", marginTop: 2, ...ellipsis }}>{resource.description}</div>
        )}
        {(resource.contact || resource.phone) && (
          <div className="gv-meta" style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 4 }}>
            {resource.contact && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }}><User size={12} /><span style={ellipsis}>{resource.contact}</span></span>}
            {resource.phone && <span className="tnum" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={12} />{resource.phone}</span>}
          </div>
        )}
      </div>
      <CaretRight size={16} weight="bold" color="var(--gv-quiet)" style={{ flex: "none" }} aria-hidden />
    </Card>
  );
}
