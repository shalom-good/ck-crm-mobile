export interface Seg<T extends string> {
  key: T;
  label: string;
  count?: number;
  /** Accepted for back-compat; the Grove chip carries no coloured dot. */
  dot?: string;
}

interface Props<T extends string> {
  segs: Seg<T>[];
  active: T;
  onChange: (key: T) => void;
}

/**
 * Generic chip-tab scroller. Reused by Families (filter) and Payments (status).
 * Selected = soft green fill, the rest white with a hairline (gv-chip).
 */
export function SegTabs<T extends string>({ segs, active, onChange }: Props<T>) {
  return (
    <div className="gv-chips no-scrollbar" style={{ padding: "2px 16px 12px" }}>
      {segs.map((s) => {
        const on = s.key === active;
        return (
          <button key={s.key} className={`gv-chip${on ? " on" : ""}`} onClick={() => onChange(s.key)}>
            {s.label}
            {s.count != null && <span className="tnum" style={{ marginLeft: 6, opacity: 0.75 }}>{s.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
