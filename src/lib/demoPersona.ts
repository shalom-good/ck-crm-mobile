/**
 * demoPersona.ts — the name shown on a SAMPLE door.
 *
 * The example codes on the family code screen open the same sample doors as
 * "All access", but with a name on them so a walk-through reads like a real
 * person's. Only the NAME is set here. Every number, plan, gift and bank
 * figure behind it is still the made-up sample data, never a real record.
 */
export interface DemoPersona { family?: string; kdh?: string; donor?: string }
const KEY = "ck_demo_persona";

export function loadPersona(): DemoPersona {
  try { const raw = localStorage.getItem(KEY); const p = raw ? JSON.parse(raw) : null; return p && typeof p === "object" ? p : {}; } catch { return {}; }
}
export function setPersona(p: DemoPersona | null) {
  try { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); } catch { /* noop */ }
}
