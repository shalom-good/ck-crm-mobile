/**
 * budgetSessions.ts — the budgeting pipeline a family sees (Shalom
 * 2026-11-11: "show a 6 month pipeline and it'll count how you've been
 * doing, met first time and then 6 times after that").
 *
 * Seven stops: the first meeting, then six monthly sessions. The count comes
 * from the SAME place the Home strip reads (`sessions` on GET /api/portal/me:
 * one session per month of cash-flow history the budgeter recorded), so the
 * two can never disagree about how many are done.
 *
 * Whether the next one is booked comes from the same payload too: the plan's
 * budgeting row (`planBookings`, booked when an upcoming meeting's host is
 * the budgeter), else an upcoming meeting hosted by the budgeter.
 */
type Raw = Record<string, any>;

export const BUDGET_STOPS = 7;
const STOP_LABELS = ["First meeting", "Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"];
const STOP_SHORT = ["First", "1", "2", "3", "4", "5", "6"];

export interface BudgetStop { label: string; short: string; state: "done" | "next" | "ahead" }
export interface BudgetPipeline {
  stops: BudgetStop[];
  done: number;
  total: number;
  /** null when all seven are done. */
  nextLabel: string | null;
  budgeterName: string | null;
  bookUrl: string | null;
  /** ISO start of the next budgeting session already on the calendar. */
  bookedStart: string | null;
  joinUrl: string | null;
}

const firstWord = (s: unknown) => String(s || "").trim().split(/\s+/)[0]?.toLowerCase() || "";

/** null while the plan is not signed (the server locks sessions until then) or there is nothing to show. */
export function budgetPipeline(home: Raw | null | undefined, fallbackBookUrl?: string | null): BudgetPipeline | null {
  const s: Raw = home?.sessions || {};
  if (!home || s.locked || !(Number(s.total) > 0)) return null;
  const done = Math.max(0, Math.min(BUDGET_STOPS, Number(s.done) || 0));
  const stops: BudgetStop[] = STOP_LABELS.map((label, k) => ({ label, short: STOP_SHORT[k], state: k < done ? "done" : k === done ? "next" : "ahead" }));
  const budgeterName: string | null = s.budgeterName || null;

  const now = Date.now();
  const upcoming = (iso: unknown) => { const t = iso ? new Date(String(iso)).getTime() : NaN; return Number.isFinite(t) && t > now - 60 * 60 * 1000; };
  const rows: Raw[] = Array.isArray(home.planBookings) ? home.planBookings : [];
  const row = rows.find((r) => r?.area === "budgeting");
  let bookedStart: string | null = row?.booked?.start && upcoming(row.booked.start) ? String(row.booked.start) : null;
  let joinUrl: string | null = bookedStart ? row?.booked?.joinUrl || null : null;
  if (!bookedStart && budgeterName) {
    const meetings: Raw[] = Array.isArray(home.meetings) ? home.meetings : [];
    const hit = meetings
      .filter((m) => upcoming(m?.startTime) && firstWord(m?.host) === firstWord(budgeterName))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
    if (hit) { bookedStart = String(hit.startTime); joinUrl = hit.joinUrl || null; }
  }

  return {
    stops, done, total: BUDGET_STOPS,
    nextLabel: done < BUDGET_STOPS ? STOP_LABELS[done] : null,
    budgeterName,
    bookUrl: s.bookUrl || row?.bookingUrl || fallbackBookUrl || null,
    bookedStart, joinUrl,
  };
}
