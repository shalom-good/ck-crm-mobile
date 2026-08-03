/** Horizontal scroll row of filter pills. Active = ink fill / white text;
 *  inactive = transparent with a medium hairline border. */
export interface Tab { key: string; label: string }

export function TabPills({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="no-scrollbar" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              flexShrink: 0, height: 38, padding: "0 18px", borderRadius: 999, cursor: "pointer",
              fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
              background: on ? "var(--ck-ink)" : "transparent",
              color: on ? "var(--ck-ink-text)" : "var(--ck-title)",
              border: on ? "1px solid var(--ck-ink)" : "1px solid var(--ck-line-medium)",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
