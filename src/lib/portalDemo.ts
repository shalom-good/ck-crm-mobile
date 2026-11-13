/**
 * portalDemo.ts — the SAMPLE family behind the "All access" pass.
 *
 * When the family session holds FAMILY_DEMO_TOKEN, portalApi's `portal()`
 * answers from here instead of the network: a made-up family ("The Sample
 * Family") a few months into the program, with a signed plan, a team,
 * meetings, a budget and homework. Nobody here is a real person and nothing
 * is ever sent to the server.
 *
 * What the owner changes while walking the screens (homework ticks, plan
 * signatures, watched episodes) is kept on the device under `ck_family_demo`
 * so it survives a reload; a fresh sign-in from the chooser resets it.
 */
import { ApiError } from "./mobileApi";
import { LESSONS } from "./lessons";
import { loadPersona } from "./demoPersona";

export const FAMILY_DEMO_TOKEN = "family-demo";
export const FAMILY_DEMO_NAME = "The Sample Family";
const KEY = "ck_family_demo";

/** Every sample link goes to the public CK site: no real calendars or chats. */
const LINK = "https://collectivekindness.net/";

const CM = "Miriam Green";
const BUDGETER = "Daniel Gold";
const DEBT = "Ari Stone";
const COORD = "Tovi Cremisi";

interface Signer { n: number; name: string; signedAt: string }
interface DemoCka { joinedAt: string | null; trump: any | null; retirement: any | null }
interface DemoState { hw: Record<string, boolean>; signers: Signer[]; watched: number[]; cka?: DemoCka }

const DAY = 86400000;
const iso = (offsetDays: number, hour = 12, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const ymd = (offsetDays: number) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ym = (monthsBack: number) => {
  const d = new Date();
  d.setDate(15);
  d.setMonth(d.getMonth() - monthsBack);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const fresh = (): DemoState => ({
  hw: { "hw-2": true, "bt-1": true },
  signers: [
    { n: 1, name: "David Sample", signedAt: iso(-62) },
    { n: 2, name: "Sarah Sample", signedAt: iso(-62) },
  ],
  watched: [1, 2],
});

let mem: DemoState | null = null;
function load(): DemoState {
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : null;
    if (s && typeof s.hw === "object" && Array.isArray(s.signers) && Array.isArray(s.watched)) { mem = s as DemoState; return mem; }
  } catch { /* noop */ }
  mem = fresh();
  return mem;
}
function save(s: DemoState) {
  mem = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}
/** Back to the starting picture (called on a fresh demo sign-in). */
export function resetFamilyDemo() {
  mem = null;
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

const HOMEWORK = [
  { id: "hw-1", text: "Gather your last two pay stubs", by: BUDGETER },
  { id: "hw-2", text: "List every subscription you pay for", by: BUDGETER },
  { id: "hw-3", text: "Call the card company and ask for a lower rate", by: DEBT },
  { id: "hw-4", text: "Pick one night a week for a money check-in", by: CM },
];
const BUDGET_TASKS = [
  { id: "bt-1", text: "Connect your checking account" },
  { id: "bt-2", text: "Confirm the grocery line together" },
];

function meetings() {
  return [
    { title: "Budget session 3", startTime: iso(1, 19, 30), endTime: iso(1, 20, 15), host: BUDGETER, joinUrl: LINK },
    { title: "Debt check-in", startTime: iso(4, 13, 0), endTime: iso(4, 13, 30), host: DEBT, joinUrl: LINK },
    { title: "Monthly check-in", startTime: iso(9, 20, 0), endTime: iso(9, 20, 45), host: CM, joinUrl: null },
  ];
}

const allSigned = (s: DemoState) => s.signers.length >= 2;

function me(s: DemoState) {
  const signed = allSigned(s);
  // One heavier month in the middle (the third), so the kind wording for a
  // month that went the other way can be read on the Budget tab too.
  const nets = [-640, -520, -570, -300, -180, 120];
  const history = nets.map((net, k) => {
    const income = 7200 + k * 60;
    return { date: ym(nets.length - 1 - k), income, expenses: income - net, net };
  });
  const st = (done: boolean, current = false) => (done ? "done" : current ? "current" : "upcoming");
  const steps = [
    { key: "interview", label: "Intake interview", status: "done", date: ymd(-90) },
    { key: "meet_cm", label: "Meet your case manager", status: "done", date: ymd(-70) },
    { key: "sign", label: "Sign your plan", status: st(signed, true), date: signed ? ymd(-62) : null },
    { key: "appointments", label: "Book your appointments", status: st(signed), date: signed ? ymd(-58) : null },
    { key: "budgeter", label: "Start budgeting", status: st(signed), date: signed ? ymd(-50) : null },
    { key: "debt", label: "Work on your debt", status: st(false, signed), date: null },
    { key: "graduation", label: "Graduation", status: "upcoming", date: null, target: ymd(240) },
  ];
  return {
    name: loadPersona().family ? `${loadPersona().family}'s family` : FAMILY_DEMO_NAME,
    firstNames: loadPersona().family || "Sample Family",
    preview: false,
    focusMode: !signed,
    interviewGate: null,
    nextStep: signed
      ? { kind: "book", title: "Book your next budgeting session", body: `Session 3 of 6 with ${BUDGETER}.`, cmName: CM, cmFirst: "Miriam", calendly: LINK }
      : { kind: "sign", title: "Your plan is ready to sign", body: "Read it together, then each of you signs.", cmName: CM, cmFirst: "Miriam" },
    journey: { steps, doneCount: steps.filter((x) => x.status === "done").length, total: steps.length },
    plan: { hasStructured: true, signedEffective: signed, signature: signed ? { signedAt: s.signers[1]?.signedAt } : null, popupReview: false, docUrl: null },
    planBookings: [
      { area: "budgeting", title: "Budgeting", expertName: BUDGETER, bookingUrl: LINK, booked: { start: iso(1, 19, 30), joinUrl: LINK } },
      { area: "debt", title: "Debt", expertName: DEBT, bookingUrl: LINK, booked: { start: iso(4, 13, 0), joinUrl: LINK } },
    ],
    sessions: { locked: !signed, total: 6, done: 2, budgeterName: BUDGETER, labels: ["Initial", "Month 1", "Month 2", "Month 3", "Month 4", "Month 5"], bookUrl: LINK },
    meetings: meetings(),
    team: {
      members: [
        { name: CM, role: "Case manager", hero: true, whatsapp: LINK, calendly: LINK },
        { name: BUDGETER, role: "Budgeter", whatsapp: LINK, calendly: LINK },
        { name: DEBT, role: "Debt expert", whatsapp: LINK, calendly: LINK },
      ],
      coordinator: { name: COORD, role: "Family coordinator", whatsapp: LINK, calendly: LINK },
    },
    cashFlow: { history, current: history[history.length - 1] },
    debtNumbers: { total: 18400, atAssessment: 24900, aprPct: 19, aprAtAssessment: 24, monthlyPayments: 520, monthlyAtAssessment: 690, inDefault: false },
    debtExpertName: DEBT,
    homework: HOMEWORK.map((h) => ({ ...h, done: !!s.hw[h.id] })),
    documents: [{ label: "Your success plan", kind: "plan", url: LINK }],
    quote: { text: "A little each month becomes a lot.", by: "Sample quote" },
  };
}

function successPlan(s: DemoState) {
  const signed = allSigned(s);
  return {
    plan: {
      status: signed ? "signed" : "draft",
      signedAt: signed ? s.signers[s.signers.length - 1].signedAt : null,
      signingAllowed: true,
      required: 2,
      signers: s.signers,
      targetDate: ymd(240),
      content: {
        targetDate: ymd(240),
        phases: [{
          items: [
            { area: "case_manager", title: "Stay on track with your case manager", expertName: CM, purpose: "One person who knows the whole picture and keeps every piece moving.", meet: { firstCallBy: ymd(-68) }, tasks: ["Monthly check-in call", "Send a note when something changes"] },
            { area: "budgeting", title: "Build a budget that holds", expertName: BUDGETER, purpose: "Know where every dollar goes and close the monthly gap.", expertIntro: "Six sessions, about a month apart.", meet: { firstCallBy: ymd(-55), firstSessionBy: ymd(-48) }, sessions: [ymd(-50), ymd(-20), ymd(1)], tasks: ["Connect your bank", "Confirm each line together"], bookingUrl: LINK },
            { area: "debt", title: "Bring the debt down", expertName: DEBT, purpose: "Lower the rates first, then pay down the highest balance.", startDate: ymd(4), tasks: ["Call each card for a lower rate", "Pick one card to pay down first"], notes: "Sample numbers only.", bookingUrl: LINK },
            { area: "job_funnel", title: "Grow the income", purpose: "A resume refresh and three applications a week.", startDate: ymd(30), tasks: ["Update the resume", "Apply to three roles a week"] },
          ],
        }],
      },
    },
    meetings: meetings(),
  };
}

function budget(s: DemoState) {
  const on = { state: "on", client_confirmed_at: iso(-20) };
  const line = (id: string, kind: string, label: string, dollars: number, extra: Record<string, unknown> = {}) => ({ id, kind, label, category: label, amount_cents: dollars * 100, period: "monthly", state: "draft", client_confirmed_at: null, ...extra });
  return {
    started: true,
    status: "draft",
    budgeter: { first: "Daniel", name: BUDGETER },
    plan: { bookUrl: LINK },
    lines: [
      line("l1", "income", "Paycheck", 5200, { ...on, details: { who: "David" } }),
      line("l2", "income", "Part-time teaching", 2300, { ...on, details: { who: "Sarah" } }),
      line("l3", "fixed", "Rent", 2600, on),
      line("l4", "fixed", "Utilities", 310, on),
      line("l5", "fixed", "Car insurance", 180, { period: "annual" }),
      line("l6", "fixed", "Tuition", 1450, on),
      line("l7", "everyday", "Groceries", 1250, { state: "flag" }),
      line("l8", "everyday", "Gas and transit", 280, on),
      line("l9", "everyday", "Household", 220),
      line("l10", "set_aside", "Holidays", 250),
      line("l11", "debt", "Credit cards", 520, on),
      line("l12", "savings", "Emergency fund", 150, on),
    ],
    now: { monthToDate: { income_cents: 412000, spend_cents: 356500, pendingCount: 3 } },
    tasks: BUDGET_TASKS.map((t) => ({ ...t, done: !!s.hw[t.id] })),
    review: [],
    connections: [{ id: "c1", institution_name: "Sample Bank", status: "ok", health: "ok", accounts: [{ id: "a1" }, { id: "a2" }], last_synced_at: iso(0, 7, 0), removed_at: null }],
  };
}

/* CK Academy for the sample family: not joined at first, so the join step
   shows; the counselor and the Lesson I check-offs follow. All on the phone. */
const COUNSELOR = "Yael Rosen";
function ckaJoin(s: DemoState) {
  const c = s.cka || { joinedAt: null, trump: null, retirement: null };
  const first = loadPersona().family || "David";
  return {
    joined: !!c.joinedAt,
    joinedAt: c.joinedAt,
    family: { firstName: first, spouseName: "Sarah", coupleName: `${first} and Sarah`, hasEmail: true },
    student: c.joinedAt ? { linked: true, created: true } : null,
    checkoffs: { trump: c.trump, retirement: c.retirement },
    counselor: { name: COUNSELOR, firstName: "Yael", whatsapp: null, bookingUrl: LINK, assigned: true, bookedFor: null, metAt: null },
  };
}

const progress = (s: DemoState) => ({ watched: s.watched, allDone: LESSONS.every((l) => s.watched.includes(l.id)) });

/** Answers one family API call from the sample data. */
export function portalDemoCall(path: string, init?: RequestInit): any {
  const method = String(init?.method || "GET").toUpperCase();
  let body: any = null;
  try { body = init?.body ? JSON.parse(String(init.body)) : null; } catch { /* noop */ }
  const p = path.split("?")[0];
  const s = load();

  if (p === "/me") return me(s);
  if (p === "/success-plan" && method === "GET") return successPlan(s);
  if (p === "/success-plan/sign") {
    if (!body?.agreed) throw new ApiError(400, "consent_required");
    const name = String(body?.name || "").trim();
    if (!name) throw new ApiError(400, "name_required");
    if (!allSigned(s)) save({ ...s, signers: [...s.signers, { n: s.signers.length + 1, name, signedAt: new Date().toISOString() }] });
    return successPlan(load());
  }
  if (p === "/budget") return budget(s);
  if (p === "/academy/join") {
    if (method === "POST") {
      const c: DemoCka = { ...(s.cka || { joinedAt: null, trump: null, retirement: null }) };
      const at = new Date().toISOString();
      if (body?.action === "join") {
        if (body?.agreed !== true) throw new ApiError(400, "consent_required");
        if (!c.joinedAt) c.joinedAt = at;
      } else if (body?.action === "checkoff") {
        if (!c.joinedAt) throw new ApiError(409, "not_joined");
        if (body.step === "trump") c.trump = { status: body.status, kids: body.status === "claimed" ? Math.max(1, Number(body.kids) || 1) : null, bonus: body.status === "claimed" && body.bonus === true, at };
        else if (body.step === "retirement") c.retirement = { status: body.status, openAmount: body.status === "opened" ? (body.openAmount ?? null) : null, monthly: body.status === "not_yet" ? null : (body.monthly ?? null), at };
        else throw new ApiError(400, "bad_input");
      } else throw new ApiError(400, "bad_action");
      save({ ...s, cka: c });
    }
    return ckaJoin(load());
  }
  if (p === "/academy-progress") {
    if (method === "POST") {
      const id = Number(body?.lessonId);
      if (Number.isFinite(id) && !s.watched.includes(id)) save({ ...s, watched: [...s.watched, id] });
    }
    return progress(load());
  }
  const hw = p.match(/^\/homework\/(.+)$/);
  if (hw) {
    const id = decodeURIComponent(hw[1]);
    const item = [...HOMEWORK, ...BUDGET_TASKS].find((h) => h.id === id);
    if (!item) throw new ApiError(404, "not_found");
    const done = !!body?.done;
    save({ ...s, hw: { ...s.hw, [id]: done } });
    return { id, text: item.text, done };
  }
  return {};
}
