import { springCSS } from "@/theme/tokens";

export interface Seg<T extends string> {
  key: T;
  label: string;
  count?: number;
  dot?: string;
}

interface Props<T extends string> {
  segs: Seg<T>[];
  active: T;
  onChange: (key: T) => void;
}

/**
 * Generic pill-tab scroller. Reused by Families (filter) and Payments (status).
 * Active pill fills with the tint; the rest are outlined. Spring on the fill.
 */
export function SegTabs<T extends string>({ segs, active, onChange }: Props<T>) {
  return (
    <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 16px 12px" }}>
      {segs.map((s) => {
        const on = s.key === active;
        const accent = s.dot ?? "#3B7AF7";
        return (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 14px",
              borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer",
              border: `1.5px solid ${on ? accent : "var(--ck-hairline)"}`,
              backgroundColor: on ? `${accent}1F` : "var(--ck-card)",
              color: on ? accent : "var(--ck-body)",
              fontSize: 14, fontWeight: on ? 600 : 500,
              transition: `background-color ${springCSS.duration}ms ${springCSS.easing}, border-color ${springCSS.duration}ms ${springCSS.easing}`,
            }}
          >
            {s.dot && <span style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: s.dot }} />}
            {s.label}
            {s.count != null && <span className="tnum" style={{ fontSize: 12, fontWeight: 600, opacity: on ? 1 : 0.7 }}>· {s.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
