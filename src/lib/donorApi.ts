/**
 * donorApi.ts — the DONOR side of the app (Shalom 2026-11-10).
 *
 * The donor door asks three short questions, then the donor's name and
 * email: an assistant reaches out with their code (or they use Google).
 * The code opens an impact page shaped by the answers, on live CRM numbers:
 *
 *   POST /api/public/adopt/auth/request-code   { email } → code by email   (live)
 *   POST /api/public/adopt/auth/verify         { email, code } → { token } (live)
 *   GET  /api/public/donor/google/start?app=   Google, then back with #donor_token=
 *   POST /api/public/donor/request-code        { name, email, answers } → the team is told
 *   POST /api/public/donor/code                { email, code } → { token }
 *   GET  /api/public/donor-impact              live numbers, no names
 *   GET  /api/public/donor/me                  the donor's own giving over time
 *   POST /api/public/donor/interests           saves the answers on their CRM record
 *
 * The donor session is its own small thing (not the app's main session):
 * a donor is still free to open any other door.
 */
import { Capacitor } from "@capacitor/core";
import { loadPersona } from "./demoPersona";
import { ApiError, CRM_HOST, isNativeShell } from "./mobileApi";
import { ACADEMY_STATS_FALLBACK } from "./academyApi";

const env = (import.meta as any).env || {};
const DIRECT = isNativeShell || env.VITE_API_DIRECT === "1";
const BASE: string = env.VITE_DONOR_API || (DIRECT ? `${CRM_HOST}/api/public` : "/api/public");

export type Interest = "education" | "single_mothers" | "debt" | "general";
export type GiveStyle = "monthly" | "once" | "looking";
export interface DonorAnswers { interests: Interest[]; city: string | null; give: GiveStyle | null }
export interface DonorSession { token: string; email: string; name: string }

export interface DonorImpact {
  asOf: string;
  /** false while some numbers are the ones baked into the app. */
  live: boolean;
  general: { families: number | null; activeFamilies: number | null; graduated: number | null } | null;
  education: { students: number; last7: number; accountsOpened: number; monthlyAutomated: number; completed: number } | null;
  debt: { clients: number | null; moneySaved: number | null; avgAprBefore: number | null; avgAprAfter: number | null; avgDebtAtIntake: number | null } | null;
  singleMothers: { families: number | null; children: number | null } | null;
  cities: { city: string; state: string | null; families: number }[];
  /** How many people gave lately (counts only). */
  giving: { donors7: number; gifts7: number; donors30: number } | null;
}

export interface DonorGiving {
  total: number;
  count: number;
  firstDate: string | null;
  monthly: number | null;
  years: { year: number; total: number; count: number }[];
  recent: { date: string; amount: number; label: string; recurring: boolean }[];
}
export interface DonorMe {
  email: string; name: string; interests: Interest[]; city: string | null; view: string | null; giving: DonorGiving;
  /** "Tell me when a new raise opens": true/false once the CRM knows the
   *  choice, null while that part of the CRM is not switched on yet. */
  raiseAlerts: boolean | null;
}

/* ── what is kept on the phone ─────────────────────────────────────── */
const SESSION_KEY = "ck_donor";
const ANSWERS_KEY = "ck_donor_answers";
const DEMO_TOKEN = "donor-demo";
export const DONOR_DEMO_EMAIL = "reviewer@ckteam.app";
const DEMO_CODE = "072026";

export function loadDonor(): DonorSession | null {
  try { const raw = localStorage.getItem(SESSION_KEY); const d = raw ? JSON.parse(raw) : null; return d?.token ? d : null; } catch { return null; }
}
export function saveDonor(s: DonorSession | null) {
  try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
}
export function loadAnswers(): DonorAnswers | null {
  try { const raw = localStorage.getItem(ANSWERS_KEY); const a = raw ? JSON.parse(raw) : null; return a && Array.isArray(a.interests) ? a : null; } catch { return null; }
}
export function saveAnswers(a: DonorAnswers | null) {
  try { if (a) localStorage.setItem(ANSWERS_KEY, JSON.stringify(a)); else localStorage.removeItem(ANSWERS_KEY); } catch { /* noop */ }
}
export const isDonorDemo = (s: DonorSession | null) => s?.token === DEMO_TOKEN;

async function call<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  let res: Response;
  try { res = await fetch(`${BASE}${path}`, { ...init, headers }); } catch { throw new ApiError(0, "network"); }
  let data: any = null;
  try { data = await res.json(); } catch { /* the app shell or a 404 page */ }
  if (!res.ok) throw new ApiError(res.status, data?.error || `request failed (${res.status})`);
  if (data == null) throw new ApiError(404, "not_available");
  return data as T;
}

/** True when the CRM has not picked up this route yet. */
export const donorNotLive = (e: unknown) => e instanceof ApiError && (e.status === 404 || e.status === 405);

/* ── sign-in ───────────────────────────────────────────────────────── */
export async function donorRequestCode(email: string): Promise<void> {
  if (email.trim().toLowerCase() === DONOR_DEMO_EMAIL) return;
  await call("/adopt/auth/request-code", { method: "POST", body: JSON.stringify({ email }) });
}

export async function donorVerify(email: string, code: string): Promise<DonorSession> {
  const clean = email.trim().toLowerCase();
  if (clean === DONOR_DEMO_EMAIL) {
    if (code !== DEMO_CODE) throw new ApiError(401, "invalid_code");
    return { token: DEMO_TOKEN, email: clean, name: loadPersona().donor || "Sample Donor" };
  }
  const d = await call<{ token?: string; email?: string; name?: string }>("/adopt/auth/verify", { method: "POST", body: JSON.stringify({ email: clean, code }) });
  if (!d?.token) throw new ApiError(401, "invalid_code");
  return { token: d.token, email: d.email || clean, name: d.name || "" };
}

/** Asks the team for a donor code: an assistant reaches out with it.
 *  → "team" when the request reached the team; "emailed" when the CRM
 *  route is not live yet and the automatic 6-digit code went out instead. */
export async function donorAskForCode(name: string, email: string, a: DonorAnswers): Promise<"team" | "emailed"> {
  const clean = email.trim().toLowerCase();
  if (clean === DONOR_DEMO_EMAIL) return "team";
  try {
    await call("/donor/request-code", { method: "POST", body: JSON.stringify({ name: name.trim(), email: clean, interests: a.interests, city: a.city, view: a.give }) });
    return "team";
  } catch (e) {
    if (!donorNotLive(e)) throw e;
    await donorRequestCode(clean);
    return "emailed";
  }
}

/** Opens the page with the code: the one an assistant gave (letters and
 *  numbers), or the emailed 6-digit one. */
export async function donorCodeLogin(email: string, code: string, name = ""): Promise<DonorSession> {
  const clean = email.trim().toLowerCase();
  const c = code.trim().toUpperCase();
  if (clean === DONOR_DEMO_EMAIL || /^\d{6}$/.test(c)) { const s = await donorVerify(clean, c); return { ...s, name: s.name || name }; }
  const d = await call<{ token?: string; email?: string; name?: string }>("/donor/code", { method: "POST", body: JSON.stringify({ email: clean, code: c }) });
  if (!d?.token) throw new ApiError(401, "invalid_code");
  return { token: d.token, email: d.email || clean, name: d.name || name };
}

/* the request the donor already sent, so the code screen is waiting for them */
const ASKED_KEY = "ck_donor_asked";
export function loadAsked(): { name: string; email: string; how: "team" | "emailed" } | null {
  try { const raw = localStorage.getItem(ASKED_KEY); const d = raw ? JSON.parse(raw) : null; return d?.email ? d : null; } catch { return null; }
}
export function saveAsked(d: { name: string; email: string; how: "team" | "emailed" } | null) {
  try { if (d) localStorage.setItem(ASKED_KEY, JSON.stringify(d)); else localStorage.removeItem(ASKED_KEY); } catch { /* noop */ }
}

export const donorGoogleUrl = (returnTo: string) => `${CRM_HOST}/api/public/donor/google/start?app=${encodeURIComponent(returnTo)}`;

/* ── the numbers ───────────────────────────────────────────────────── */
const EDU_FALLBACK = { students: ACADEMY_STATS_FALLBACK.students, last7: ACADEMY_STATS_FALLBACK.last7, accountsOpened: ACADEMY_STATS_FALLBACK.accountsOpened, monthlyAutomated: ACADEMY_STATS_FALLBACK.monthlyAutomated, completed: ACADEMY_STATS_FALLBACK.completed };
/** Real numbers from the live CRM on 2026-11-10, shown only until the
 *  live route answers. Counts are every CK family on file, by area
 *  (New York, South Florida... not single towns). */
const BAKED = {
  giving: { donors7: 11, gifts7: 11, donors30: 75 },
  activeFamilies: 71,
  singleMothers: { families: 16, children: 38 },
  cities: [
    { city: "New York", state: "NY", families: 99 }, { city: "South Florida", state: "FL", families: 74 }, { city: "Chicago", state: "IL", families: 31 },
    { city: "New Jersey", state: "NJ", families: 25 }, { city: "Atlanta", state: "GA", families: 9 }, { city: "Los Angeles", state: "CA", families: 5 },
  ],
};
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** For the front door's chip before anything has loaded. */
export const DONOR_GIVING_FALLBACK = BAKED.giving;

export async function fetchDonorImpact(): Promise<DonorImpact> {
  try {
    const d = await call<any>("/donor-impact");
    return {
      asOf: d.asOf || new Date().toISOString(),
      live: true,
      general: d.general ? { families: num(d.general.families), activeFamilies: num(d.general.activeFamilies), graduated: num(d.general.graduated) } : null,
      education: d.education && typeof d.education.students === "number" ? d.education : EDU_FALLBACK,
      debt: d.debt ? { clients: num(d.debt.clients), moneySaved: num(d.debt.moneySaved), avgAprBefore: num(d.debt.avgAprBefore), avgAprAfter: num(d.debt.avgAprAfter), avgDebtAtIntake: num(d.debt.avgDebtAtIntake) } : null,
      singleMothers: d.singleMothers ? { families: num(d.singleMothers.families), children: num(d.singleMothers.children) } : null,
      cities: Array.isArray(d.cities) ? d.cities.filter((c: any) => c && typeof c.city === "string" && typeof c.families === "number") : [],
      giving: d.giving && typeof d.giving.donors7 === "number" ? { donors7: d.giving.donors7, gifts7: Number(d.giving.gifts7) || 0, donors30: Number(d.giving.donors30) || 0 } : null,
    };
  } catch (e) {
    if (!donorNotLive(e)) throw e;
    // Until the new route is live: the public numbers the CRM already
    // serves (families, debt help), plus the Academy count.
    const s = await call<any>("/impact-stats");
    return {
      asOf: s.asOf || new Date().toISOString(),
      live: false,
      general: { families: num(s.totalFamilies), activeFamilies: BAKED.activeFamilies, graduated: null },
      education: EDU_FALLBACK,
      debt: { clients: num(s.totalKdhClients), moneySaved: num(s.totalMoneySaved), avgAprBefore: num(s.avgAprOnboarding), avgAprAfter: num(s.avgAprOffboarding), avgDebtAtIntake: num(s.avgDebtAtIntake) },
      singleMothers: BAKED.singleMothers,
      cities: BAKED.cities,
      giving: BAKED.giving,
    };
  }
}

const DEMO_ME: DonorMe = {
  email: DONOR_DEMO_EMAIL, name: "Sample Donor", interests: [], city: null, view: null, raiseAlerts: false,
  giving: {
    total: 4860, count: 31, firstDate: "2024-03-12", monthly: 180,
    years: [{ year: 2024, total: 1260, count: 8 }, { year: 2025, total: 1800, count: 11 }, { year: 2026, total: 1800, count: 12 }],
    recent: [
      { date: "2026-11-01", amount: 180, label: "General fund", recurring: true },
      { date: "2026-10-01", amount: 180, label: "General fund", recurring: true },
      { date: "2026-09-01", amount: 180, label: "General fund", recurring: true },
      { date: "2026-08-14", amount: 360, label: "Summer campaign", recurring: false },
    ],
  },
};

export async function fetchDonorMe(s: DonorSession): Promise<DonorMe> {
  if (isDonorDemo(s)) return { ...DEMO_ME, name: loadPersona().donor || DEMO_ME.name, raiseAlerts: demoAlerts() };
  const d = await call<any>("/donor/me", { token: s.token });
  const g = d?.giving || {};
  return {
    email: d.email || s.email, name: d.name || s.name || "",
    interests: Array.isArray(d.interests) ? d.interests : [], city: d.city ?? null, view: d.view ?? null,
    raiseAlerts: typeof d.raiseAlerts === "boolean" ? d.raiseAlerts : null,
    giving: {
      total: Number(g.total) || 0, count: Number(g.count) || 0, firstDate: g.firstDate || null, monthly: num(g.monthly),
      years: Array.isArray(g.years) ? g.years : [], recent: Array.isArray(g.recent) ? g.recent : [],
    },
  };
}

/** Best effort: the answers also live on the phone, so a miss is quiet. */
export async function saveDonorInterests(s: DonorSession, a: DonorAnswers): Promise<void> {
  if (isDonorDemo(s)) return;
  try { await call("/donor/interests", { method: "POST", token: s.token, body: JSON.stringify({ interests: a.interests, city: a.city, view: a.give }) }); } catch { /* noop */ }
}

/* ── the donor's own area, preselected (Shalom 2026-11-11) ─────────────
   Before sign-in we do not know who the donor is, so there is no zip on
   file to read yet. This asks our own host roughly where the connection is
   and maps the state to one of the areas CK serves. A miss is quiet. */
const STATE_AREA: Record<string, string> = { NY: "New York", FL: "South Florida", IL: "Chicago", NJ: "New Jersey", GA: "Atlanta", CA: "Los Angeles" };
export async function guessDonorArea(areas: string[]): Promise<{ area: string | null; city: string | null }> {
  try {
    const host = Capacitor.isNativePlatform() ? "https://ck-crm-mobile.vercel.app" : "";
    const res = await fetch(`${host}/api/where`, { headers: { accept: "application/json" } });
    if (!res.ok) return { area: null, city: null };
    const d = await res.json();
    if (d?.country && d.country !== "US") return { area: null, city: null };
    const area = STATE_AREA[String(d?.state || "").toUpperCase()] || null;
    return { area: area && areas.includes(area) ? area : null, city: typeof d?.city === "string" && d.city ? d.city : null };
  } catch { return { area: null, city: null }; }
}

/* ── raises: CK's live campaigns, and the alert for new ones (2026-11-11) ──
   GET /api/public/raises is the CRM's list of live public campaigns (only
   what each campaign's own page already shows). Until that route is live
   the list comes back empty and the section does not render. The sample
   donor gets a small made-up list so the walk-through shows it. */
export interface Raise { slug: string; name: string; line: string | null; goal: number | null; raised: number; gifts: number; isDefault: boolean }

const DEMO_RAISES: Raise[] = [
  { slug: "helping-a-single-mother-with-rent-and-leaks", name: "Helping a Single Mother with rent and leaks", line: "Rent and a leaking roof, for one mother and her children.", goal: 7500, raised: 6755, gifts: 35, isDefault: false },
  { slug: "bar-mitzvah-partner", name: "Bar Mitzvah Partner 2026", line: "Bar mitzvah boys give a share of their gifts to carry another family.", goal: 3600, raised: 280, gifts: 2, isDefault: false },
  { slug: "kosher-debt-help", name: "Kosher Debt Help", line: "One call with a debt expert, for anyone who needs the way out.", goal: null, raised: 0, gifts: 0, isDefault: false },
];

/** Live raises, the general fund left out (it is the page's main give button). */
export async function fetchRaises(s: DonorSession | null): Promise<{ raises: Raise[]; sample: boolean }> {
  if (isDonorDemo(s)) return { raises: DEMO_RAISES, sample: true };
  try {
    const d = await call<any>("/raises");
    const list: Raise[] = (Array.isArray(d?.raises) ? d.raises : [])
      .filter((r: any) => r && typeof r.slug === "string" && /^[a-z0-9][a-z0-9-]{0,80}$/.test(r.slug) && typeof r.name === "string" && r.name.trim())
      .map((r: any) => ({ slug: r.slug, name: String(r.name).trim(), line: typeof r.line === "string" && r.line.trim() ? r.line.trim() : null, goal: num(r.goal) && Number(r.goal) > 0 ? Number(r.goal) : null, raised: Number(r.raised) || 0, gifts: Number(r.gifts) || 0, isDefault: !!r.isDefault }));
    return { raises: list.filter((r) => !r.isDefault), sample: false };
  } catch { return { raises: [], sample: false }; }
}

/** Which interest a raise speaks to, from its name and line. Honest and simple: no match means none. */
const RAISE_WORDS: Partial<Record<Interest, RegExp>> = {
  single_mothers: /single (mother|mom|parent)|widow/i,
  debt: /\bdebt\b|kosher debt help|\bkdh\b/i,
  education: /academy|financial (literacy|education)|newlywed|\bcourse\b/i,
};
export const raiseMatches = (r: Raise, interests: Interest[]) => interests.some((i) => RAISE_WORDS[i]?.test(`${r.name} ${r.line || ""}`));
/** Raises that match what the donor picked come first; the rest keep the CRM's order. */
export function orderRaises(raises: Raise[], interests: Interest[]): Raise[] {
  return [...raises.filter((r) => raiseMatches(r, interests)), ...raises.filter((r) => !raiseMatches(r, interests))];
}

const ALERTS_DEMO_KEY = "ck_donor_raise_alerts_demo";
const ALERTS_ASK_KEY = "ck_donor_raise_ask";
const DAY_MS = 86400_000;
function demoAlerts(): boolean { try { return localStorage.getItem(ALERTS_DEMO_KEY) === "on"; } catch { return false; } }

/** Saves the choice. → true when it is stored (the sample donor's stays on this phone). */
export async function setRaiseAlerts(s: DonorSession, on: boolean): Promise<boolean> {
  if (isDonorDemo(s)) { try { localStorage.setItem(ALERTS_DEMO_KEY, on ? "on" : "off"); } catch { /* private mode */ } return true; }
  try {
    const d = await call<any>("/donor/alerts", { method: "POST", token: s.token, body: JSON.stringify({ on }) });
    return !!d?.saved;
  } catch { return false; }
}
/** "No thanks" keeps the question away for 90 days. */
export function raiseAskHidden(): boolean {
  try { const at = Number(localStorage.getItem(ALERTS_ASK_KEY)); return Number.isFinite(at) && at > 0 && Date.now() - at < 90 * DAY_MS; } catch { return false; }
}
export function hideRaiseAsk(hide = true) {
  try { if (hide) localStorage.setItem(ALERTS_ASK_KEY, String(Date.now())); else localStorage.removeItem(ALERTS_ASK_KEY); } catch { /* private mode */ }
}
