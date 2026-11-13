/**
 * kdhPlusApi.ts — KDH Plus in the app (2026-11-11).
 *
 * A KDH client adds a budget and a budgeter on top of the debt plan. One
 * endpoint on the CRM, same Bearer token as the homework screens:
 *
 *   GET  /api/portal/kdh/plus[?slots=1]   → the whole state
 *   POST /api/portal/kdh/plus { action }  → { ok, state, ... } or { error }
 *
 * The server decides the step; the screens never guess. With the sample
 * token (KDH_DEMO_TOKEN) nothing reaches the server: a made-up state lives
 * on this phone and every action moves it along.
 */
import { loadPersona } from "./demoPersona";
import { isKdhDemo, kdhCall } from "./kdhApi";

export type PlusStep = "questions" | "bank" | "test" | "sessions" | "budgeter" | "done";
export type PlusPref = "man" | "woman" | "any";
export type PlusPlan = "single" | "pack";
export type BudgetKey = "income" | "bills" | "daily" | "yearly" | "owed";

export interface PlusQuestion { key: string; q: string; sub?: string; options: [string, string][] }
export interface PlusBudgetLine { key: BudgetKey; label: string; amount: number | null; bank: number | null; edited: boolean }
export interface PlusSession { n: number; at: string | null; status: "pending" | "booked" | "done" | string; joinUrl: string | null }
export interface PlusBudgeter { firstName: string; initial: string; gender: string | null; bio: string; reason: string; page: string | null }

export interface KdhPlusState {
  client: { firstName: string | null; initials: string | null };
  steps: PlusStep[];
  step: PlusStep;
  started: boolean;
  questions: PlusQuestion[];
  answers: Record<string, string>;
  budget: {
    lines: PlusBudgetLine[]; have: boolean; in: number; out: number; gap: number;
    source: string | null; institution: string | null; days: number | null;
    extra: string; confirmedAt: string | null; skipped: boolean; stretched: boolean;
    pending: boolean; bankReady: boolean;
  };
  test: { questions: { key: string; q: string; options: [string, string][] }[]; answered: number; done: boolean } | null;
  pattern: { key: string; name: string; line: string; helps: string[]; second: string | null } | null;
  prices: { single: { sessions: number; amount: number }; pack: { sessions: number; amount: number; saves: number } };
  minutes: number;
  sessions: { bought: number; used: number; left: number; list: PlusSession[] };
  genderPref: PlusPref | null;
  needsMatch: boolean;
  budgeter: PlusBudgeter | null;
  /** Open times (ISO). null = not asked for, or the calendar could not be read. */
  slots: string[] | null;
  expert: { name?: string; firstName: string | null; whatsapp: string | null; followUp: string | null } | null;
}

export type PlusAction =
  | { action: "answers"; answers: Record<string, string> }
  | { action: "plaid_link" }
  | { action: "plaid_exchange"; public_token: string }
  | { action: "plaid_refresh" }
  | { action: "plaid_disconnect" }
  | { action: "budget"; edits?: Partial<Record<BudgetKey, number | null>>; extra?: string; confirm?: boolean; skip?: boolean }
  | { action: "test"; answers?: Record<string, number>; skip?: boolean }
  | { action: "checkout"; plan: PlusPlan }
  | { action: "confirm"; paymentIntent: string }
  | { action: "match"; pref: PlusPref; other?: boolean }
  | { action: "book"; at: string | null };

export interface PlusResult {
  ok?: boolean;
  state?: KdhPlusState;
  /** plaid_link */
  link_token?: string;
  /** checkout */
  clientSecret?: string; publishableKey?: string; amount?: number; sessions?: number; plan?: PlusPlan;
  /** book */
  url?: string | null;
  bankReady?: boolean; credited?: number; matched?: boolean;
  /** Sample client only: nothing real happened (no bank, no payment, no calendar). */
  sample?: boolean;
}

export const fetchKdhPlus = (withSlots = false): Promise<KdhPlusState> =>
  isKdhDemo() ? Promise.resolve(demoState(withSlots)) : kdhCall<KdhPlusState>(`/plus${withSlots ? "?slots=1" : ""}`);

export const kdhPlusAction = (body: PlusAction): Promise<PlusResult> =>
  isKdhDemo() ? Promise.resolve(demoAction(body)) : kdhCall<PlusResult>("/plus", { method: "POST", body: JSON.stringify(body) });

/** Links the sample client "opens": the screens show a notice instead. */
export const isSampleLink = (url: string | null | undefined) => !!url && url.startsWith("sample:");

/* ── Sample client ────────────────────────────────────────────────────
   A row like the CRM keeps, saved on this phone so a sample walk can stop
   and pick up again. Never a real person, never the network. */
const DEMO_KEY = "ck.kdhplus.sample.v1";
/** A fresh walk for the example code: back to the first screen. */
export function resetKdhPlusSample() { try { localStorage.removeItem(DEMO_KEY); } catch { /* noop */ } }
interface DemoRow {
  answers: Record<string, string>;
  budget: { bank?: Partial<Record<BudgetKey, number>>; edits?: Partial<Record<BudgetKey, number>>; source?: string | null; institution?: string | null; extra?: string; confirmedAt?: string | null; skipped?: boolean };
  test: Record<string, number>;
  bought: number;
  plan: PlusPlan | null;
  pref: PlusPref | null;
  budgeter: number | null;
  sessions: PlusSession[];
}
let demoRow: DemoRow | null | undefined;
function loadDemo(): DemoRow | null {
  if (demoRow !== undefined) return demoRow;
  try { const raw = localStorage.getItem(DEMO_KEY); demoRow = raw ? (JSON.parse(raw) as DemoRow) : null; } catch { demoRow = null; }
  return demoRow;
}
function saveDemo(row: DemoRow) {
  demoRow = row;
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(row)); } catch { /* memory only */ }
}
/** Start the sample walk over (the sample door's "start again"). */
export function resetKdhPlusDemo() {
  demoRow = null;
  try { localStorage.removeItem(DEMO_KEY); } catch { /* noop */ }
}
const blankRow = (): DemoRow => ({ answers: {}, budget: {}, test: {}, bought: 0, plan: null, pref: null, budgeter: null, sessions: [] });

const DEMO_QUESTIONS: PlusQuestion[] = [
  { key: "household", q: "Who are we budgeting for?", sub: "It sets the size of the budget.", options: [["me", "Just me"], ["couple", "Me and my spouse"], ["family", "Us and children"]] },
  { key: "handler", q: "Who handles the money at home?", sub: "So the right person is on the call.", options: [["me", "I do"], ["spouse", "My spouse does"], ["both", "We share it"], ["nobody", "Nobody really"]] },
  { key: "income", q: "How does your income arrive?", sub: "It changes the kind of budget we build.", options: [["steady", "A steady paycheck"], ["irregular", "It changes month to month"], ["self", "I am self-employed"], ["mixed", "More than one of these"]] },
  { key: "history", q: "Have you had a budget before?", sub: "So we know where to start.", options: [["never", "Never"], ["tried", "Tried, it did not last"], ["have", "I have one now"]] },
  { key: "goal", q: "What would make this worth it?", sub: "Your budgeter opens with this.", options: [["panic", "Stop the month-end panic"], ["know", "Know where it goes"], ["debt", "Pay the debt faster"], ["peace", "Stop fighting about money"], ["save", "Start saving"]] },
];
const DEMO_TEST: [string, string[]][] = [
  ["A bank alert pops up on your phone. What happens next?", ["I swipe it away for later", "My stomach drops and I look for something to feel better", "I look. I already know it is tight", "I think of who is counting on me this month"]],
  ["Think of the last thing you paid for and wished you had not. It was", ["For someone else", "So we would not look different", "To get through a hard day", "Nothing extra. The basics sink us"]],
  ["Where did most of the debt come from?", ["One big thing: a simcha, a medical bill, a lost job", "Slowly. I am not sure where it went", "Living the way people around us live", "Helping family or others"]],
  ["Someone you care about needs money and the month is already tight. You", ["Give anyway and work it out later", "Give what others would give", "Put it on the card and do not think about it", "Give a little and feel awful"]],
  ["After you spend on yourself you feel", ["Guilty. I almost never do", "Better, for about an hour", "Nothing. I do not keep track", "Fine, if it is what everyone has"]],
  ["Growing up, money at home was", ["Never talked about", "Tense. I felt it even as a child", "There for whoever needed it", "About how things looked"]],
  ["When you stuck with something hard, what made it work?", ["Someone checking in on me", "One clear rule", "Seeing my progress", "Doing it with my spouse"]],
  ["Which is hardest for you?", ["Looking at the numbers", "Saying no to others", "Saying no to myself", "Keeping going after week two"]],
  ["How should your budgeter talk to you?", ["Straight, tell me the truth", "Gentle, I am already hard on myself", "Numbers and detail", "Big picture first"]],
  ["A year from now, what is different?", ["The cards are paid down", "There is a cushion", "We stopped arguing about money", "I sleep at night"]],
];
const DEMO_GROUPS: [BudgetKey, string][] = [["income", "Income"], ["bills", "Bills"], ["daily", "Day to day"], ["yearly", "Once a year"], ["owed", "What you owe"]];
const DEMO_BANK: Record<BudgetKey, number> = { income: 7420, bills: 4180, daily: 2650, yearly: 610, owed: 890 };
const DEMO_PRICES = { single: { sessions: 1, amount: 75 }, pack: { sessions: 5, amount: 300, saves: 75 } };
const DEMO_BUDGETERS: Omit<PlusBudgeter, "page">[] = [
  { firstName: "Rivka", initial: "R", gender: "woman", bio: "Budgeter with KDH for 3 years", reason: "Rivka works with many families who have income that changes month to month, and she is gentle about it." },
  { firstName: "Miriam", initial: "M", gender: "woman", bio: "Budgeter with KDH for 5 years", reason: "Miriam has room for a new family this week." },
  { firstName: "Dovid", initial: "D", gender: "man", bio: "Budgeter with KDH for 4 years", reason: "Dovid works with many families who have income that changes month to month, and he tells it straight." },
  { firstName: "Avi", initial: "A", gender: "man", bio: "Budgeter with KDH for 2 years", reason: "Avi has room for a new family this week." },
];
/** Six open times over the coming days (never Friday or Shabbos), at fixed
 *  hours on this phone's clock. */
function demoSlots(): string[] {
  const hours: [number, number][] = [[20, 30], [10, 0], [20, 0], [21, 15], [12, 30], [20, 30]];
  const out: string[] = [];
  for (let d = 1; out.length < hours.length && d < 21; d++) {
    const t = new Date(); t.setDate(t.getDate() + d);
    if (t.getDay() === 5 || t.getDay() === 6) continue;
    const [h, m] = hours[out.length];
    t.setHours(h, m, 0, 0);
    out.push(t.toISOString());
  }
  return out;
}

function demoState(withSlots: boolean): KdhPlusState {
  const row = loadDemo();
  const r = row || blankRow();
  const b = r.budget;
  const lines: PlusBudgetLine[] = DEMO_GROUPS.map(([key, label]) => {
    const bank = b.bank?.[key] ?? null;
    const mine = b.edits?.[key] ?? null;
    return { key, label, amount: mine != null ? mine : bank, bank, edited: mine != null };
  });
  const val = (k: BudgetKey) => Number(lines.find((l) => l.key === k)?.amount || 0);
  const have = lines.some((l) => l.amount != null);
  const moneyIn = val("income");
  const moneyOut = val("bills") + val("daily") + val("yearly") + val("owed");
  const testDone = DEMO_TEST.every((_, i) => r.test[`t${i + 1}`] != null);
  const booked = r.sessions.filter((s) => s.status === "booked" || s.status === "done").length;
  const budgeter = r.budgeter != null ? { ...DEMO_BUDGETERS[r.budgeter], page: "sample:calendar" } : null;
  let step: PlusStep = "done";
  if (!DEMO_QUESTIONS.every((q) => r.answers[q.key])) step = "questions";
  else if (!(b.confirmedAt || b.skipped)) step = "bank";
  else if (!testDone && !(r.test as Record<string, unknown>)._skipped) step = "test";
  else if (!(r.bought > 0)) step = "sessions";
  else if (!budgeter || !booked) step = "budgeter";
  return {
    client: { firstName: loadPersona().kdh || "Sample", initials: (loadPersona().kdh || "S").slice(0, 1) },
    steps: ["questions", "bank", "test", "sessions", "budgeter"],
    step,
    started: !!row,
    questions: DEMO_QUESTIONS,
    answers: r.answers,
    budget: {
      lines, have, in: moneyIn, out: moneyOut, gap: moneyIn - moneyOut,
      source: b.source || null, institution: b.institution || null, days: b.bank ? 90 : null,
      extra: b.extra || "", confirmedAt: b.confirmedAt || null, skipped: !!b.skipped,
      stretched: have && moneyIn > 0 && val("bills") + val("owed") > moneyIn,
      pending: false, bankReady: true,
    },
    test: { questions: DEMO_TEST.map(([q, opts], i) => ({ key: `t${i + 1}`, q, options: opts.map((o, k) => [String(k), o] as [string, string]) })), answered: Object.keys(r.test).length, done: testDone },
    pattern: testDone ? {
      key: "O", name: "Open hand", line: "You give first and count later. The giving is a strength. It needs a number.",
      helps: ["A giving line in your budget, a number you are proud of", "One set answer: \"Let me check and get back to you\"", "Ways to give that are not money"],
      second: "Keeping pace",
    } : null,
    prices: DEMO_PRICES,
    minutes: 45,
    sessions: { bought: r.bought, used: 0, left: Math.max(0, r.bought - r.sessions.filter((s) => s.status !== "pending").length), list: r.sessions },
    genderPref: r.pref,
    needsMatch: false,
    budgeter,
    slots: withSlots && budgeter ? demoSlots() : null,
    expert: { name: "Shlomo", firstName: "Shlomo", whatsapp: "sample:whatsapp", followUp: "sample:followup" },
  };
}

function demoAction(body: PlusAction): PlusResult {
  const row: DemoRow = { ...(loadDemo() || blankRow()) };
  const done = (extra: Partial<PlusResult> = {}, withSlots = false): PlusResult => { saveDemo(row); return { ok: true, sample: true, ...extra, state: demoState(withSlots) }; };
  switch (body.action) {
    case "answers": row.answers = { ...row.answers, ...body.answers }; return done();
    case "plaid_link": return { ok: true, sample: true };
    case "plaid_exchange":
    case "plaid_refresh": row.budget = { ...row.budget, bank: DEMO_BANK, source: "plaid", institution: "Sample Bank" }; return done({ bankReady: true });
    case "plaid_disconnect": row.budget = { ...row.budget, institution: null, source: row.budget.bank ? "bank, disconnected" : null }; return done();
    case "budget": {
      const b = { ...row.budget };
      if (body.edits) {
        const edits = { ...(b.edits || {}) };
        for (const [k] of DEMO_GROUPS) {
          const v = body.edits[k];
          if (v === undefined) continue;
          if (v === null || !Number.isFinite(Number(v))) delete edits[k]; else edits[k] = Math.max(0, Math.round(Number(v)));
        }
        b.edits = edits;
        if (!b.source) b.source = "typed";
      }
      if (typeof body.extra === "string") b.extra = body.extra.slice(0, 600);
      if (body.skip) b.skipped = true;
      if (body.confirm) { b.confirmedAt = new Date().toISOString(); b.skipped = false; }
      row.budget = b;
      return done();
    }
    case "test": row.test = body.skip ? { ...row.test, _skipped: 1 } : { ...row.test, ...(body.answers || {}) }; return done();
    case "checkout": {
      const p = DEMO_PRICES[body.plan];
      row.plan = body.plan;
      saveDemo(row);
      return { ok: true, sample: true, amount: p.amount, sessions: p.sessions, plan: body.plan };
    }
    case "confirm": {
      const n = DEMO_PRICES[row.plan || "pack"].sessions;
      row.bought += n; row.plan = null;
      return done({ credited: n });
    }
    case "match": {
      const pool = DEMO_BUDGETERS.map((b, i) => ({ b, i })).filter(({ b }) => body.pref === "any" || b.gender === body.pref);
      const next = pool.find(({ i }) => !body.other || i !== row.budgeter) || pool[0];
      row.pref = body.pref; row.budgeter = next.i;
      return done({ matched: true }, true);
    }
    case "book": {
      const at = body.at || demoSlots()[0];
      const n = row.sessions.length + 1;
      row.sessions = [...row.sessions, { n, at, status: "booked", joinUrl: null }];
      return done({ url: null });
    }
  }
}

let plaidJs: Promise<any> | null = null;
/** Plaid Link, fetched only when someone taps "Connect my bank". */
export function loadPlaidJs(): Promise<any> {
  const w = window as any;
  if (w.Plaid) return Promise.resolve(w.Plaid);
  if (plaidJs) return plaidJs;
  plaidJs = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    s.async = true;
    s.onload = () => (w.Plaid ? resolve(w.Plaid) : reject(new Error("The bank connection did not load.")));
    s.onerror = () => { plaidJs = null; reject(new Error("Could not reach the bank connection. Check your connection, or type your numbers in.")); };
    document.head.appendChild(s);
  });
  return plaidJs;
}
