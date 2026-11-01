import { MagnifyingGlass, FunnelSimple, CloudSlash } from "@phosphor-icons/react";
import { Pill } from "./gv";

interface Props {
  title: string;
  subtitle?: string;
  /** Number of mutations queued offline; shows the pill when > 0. */
  queued?: number;
  /** Each icon renders only when its handler exists: no dead buttons. */
  onSearch?: () => void;
  onFilter?: () => void;
  /** True while the page's inline search field is open (icon reads pressed). */
  searchActive?: boolean;
}

/** Screen header: gv-h1 title + gv-meta subtitle left; on the right, a
 *  44px white hairline icon button (gv-ib) per handler that was passed. */
export function Header({ title, subtitle, queued = 0, onSearch, onFilter, searchActive = false }: Props) {
  const hit = { width: 44, height: 44 } as const;
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
      {(onSearch || onFilter) && (
        <div style={{ display: "flex", gap: 8, flex: "none" }}>
          {onSearch && (
            <button
              className="gv-ib"
              aria-label={searchActive ? "Close search" : "Search"}
              aria-pressed={searchActive}
              onClick={onSearch}
              style={{ ...hit, ...(searchActive ? { background: "var(--gv-upBg)", color: "var(--gv-up)", boxShadow: "none" } : null) }}
            >
              <MagnifyingGlass size={18} weight={searchActive ? "bold" : "regular"} />
            </button>
          )}
          {onFilter && (
            <button className="gv-ib" aria-label="Filter" onClick={onFilter} style={hit}>
              <FunnelSimple size={18} weight="regular" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
