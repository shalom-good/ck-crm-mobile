import { MagnifyingGlass, FunnelSimple, CloudSlash } from "@phosphor-icons/react";
import { Pill } from "./gv";

interface Props {
  title: string;
  subtitle?: string;
  /** Number of mutations queued offline; shows the pill when > 0. */
  queued?: number;
  onSearch?: () => void;
  onFilter?: () => void;
}

/** Screen header: gv-h1 title + gv-meta subtitle left, two 36px white
 *  hairline icon buttons (gv-ib) right. */
export function Header({ title, subtitle, queued = 0, onSearch, onFilter }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "8px 16px 4px" }}>
      <div style={{ minWidth: 0 }}>
        <h1 className="gv-h1">{title}</h1>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 4, minWidth: 0 }}>
          {subtitle && <span className="gv-meta">{subtitle}</span>}
          {queued > 0 && (
            <Pill tint="yellow" sm>
              <CloudSlash size={12} weight="bold" />
              offline · {queued} queued
            </Pill>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 2, flex: "none" }}>
        <button className="gv-ib" aria-label="Search" onClick={onSearch}>
          <MagnifyingGlass size={18} weight="regular" />
        </button>
        <button className="gv-ib" aria-label="Filter" onClick={onFilter}>
          <FunnelSimple size={18} weight="regular" />
        </button>
      </div>
    </div>
  );
}
