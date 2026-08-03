import { MagnifyingGlass, FunnelSimple, CloudSlash } from "@phosphor-icons/react";

interface Props {
  title: string;
  subtitle?: string;
  /** Number of mutations queued offline; shows the chip when > 0. */
  queued?: number;
  onSearch?: () => void;
  onFilter?: () => void;
}

/** Compact orientation header. Title + sync state left, search + filter right. */
export function Header({ title, subtitle, queued = 0, onSearch, onFilter }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "8px 16px 4px",
        backgroundColor: "var(--ck-bg)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: "32px", fontWeight: 700, letterSpacing: "-0.035em", color: "var(--ck-title)" }}>
          {title}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
          {subtitle && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ck-muted)" }}>{subtitle}</span>}
          {queued > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: "#8A6A1E",
                backgroundColor: "#F3EBD6",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              <CloudSlash size={12} weight="bold" />
              offline · {queued} queued
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
        <IconButton label="Search" onClick={onSearch}>
          <MagnifyingGlass size={20} weight="regular" />
        </IconButton>
        <IconButton label="Filter" onClick={onFilter}>
          <FunnelSimple size={20} weight="regular" />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        borderRadius: 12,
        color: "var(--ck-body)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
