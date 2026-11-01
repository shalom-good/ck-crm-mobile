import { Chips } from "./gv";

/** Horizontal scroll row of soft chips. Selected = soft green, the rest
 *  white with a hairline (the same gv-chip the rest of the app uses). */
export interface Tab { key: string; label: string; count?: number }

export function TabPills({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return <Chips items={tabs} active={active} onChange={onChange} />;
}
