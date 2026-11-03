import { MagnifyingGlass, FunnelSimple, CloudSlash } from "@phosphor-icons/react";
import { Pill } from "./gv";
import { TopBar } from "./TopBar";

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
  /** The space label on the top bar ("Team"). */
  space?: string;
}

/** Screen header (CK look): the top bar (lime tile, "Collective Kindness",
 *  the space label), then the 26/800 title with a 12px meta line under it;
 *  on the right, a 44px white circle icon button (gv-ib) per handler. */
export function Header({ title, subtitle, queued = 0, onSearch, onFilter, searchActive = false, space = "Team" }: Props) {
  const hit = { width: 44, height: 44 } as const;
  return (
    <div style={{ padding: "0 20px 4px" }}>
    <TopBar space={space} />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
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
              style={{ ...hit, ...(searchActive ? { background: "var(--gv-go)", color: "#fff", boxShadow: "none" } : null) }}
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
    </div>
  );
}
