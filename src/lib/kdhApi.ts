/**
 * kdhApi.ts — KDH clients' homework in the app (2026-11-05).
 *
 * A KDH client types the 7-letter code their debt expert gave them (same
 * door and alphabet as the CK family code). The CRM answers with its own
 * Bearer token (lib/kdhApp on the CRM, never a CK portal session):
 *
 *   POST /api/portal/kdh/login { code }            → { token, name }
 *   GET  /api/portal/kdh/me                        → sessions, expert, booking
 *   POST /api/portal/kdh/step { caseNoteId, i, done } → tick / untick a step
 */
import { loadPersona } from "./demoPersona";
import { ApiError, notifyUnauthorized } from "./mobileApi";
import { PORTAL_API_BASE } from "./portalApi";

let kdhToken: string | null = null;
export function setKdhToken(t: string | null) { if (t !== kdhToken) demoHome = null; kdhToken = t; }

export interface KdhStep {
  title: string;
  text: string;
  link: { label: string; href: string } | null;
  book: boolean;
  calendars: { name: string; href: string }[];
  done: boolean;
  doneAt: string | null;
}
export interface KdhSession {
  id: string;
  date: string;
  opener: string;
  booking: string;
  steps: KdhStep[];
  total: number;
  doneCount: number;
}
/** The client's own debt picture (optional: older CRM builds omit it).
 *  A figure that is not on file comes back null and is left off the card. */
export interface KdhDebt {
  total: number | null; card: number | null; aprPct: number | null;
  goalPct: number | null; goalFrom: "reached" | "typical" | null;
  monthly: number | null; goalMonthly: number | null;
  interestYear: number | null; goalInterestYear: number | null;
}
export interface KdhHome {
  client: { firstName: string | null };
  debt?: KdhDebt | null;
  expert: { name: string; firstName: string; email: string | null; whatsapp: string | null } | null;
  sessions: KdhSession[];
  booking: { open: boolean; href: string | null; days: number; until: string | null; slots?: string[] };
  /** "What would you like to do next?" (optional: older CRM builds omit it). */
  next?: { choice: KdhChoice | null; at: string | null; picked: KdhChoice[] };
  links?: { academy: string; therapy: string; apply: string };
  fit?: string[];
}
export type KdhChoice = "literacy" | "budgeting" | "therapy" | "apply";
export const KDH_LINKS = {
  academy: "https://collectivekindness.net/academy",
  therapy: "https://betteryousa.com/",
  apply: "https://crm.collectivekindness.net/apply",
};
export const KDH_FIT = [
  "You live in the United States",
  "Someone at home has a job and income",
  "You are short less than $5,000 a month",
  "You are ready to work a plan with a team",
];

/* ── Sample client (the "All access" pass) ────────────────────────────
   With KDH_DEMO_TOKEN the calls below are answered on this phone: a made-up
   client, no server, no real person. Ticks and the "next" choice live in
   memory until the app reloads. */
export const KDH_DEMO_TOKEN = "kdh-demo";
export const KDH_DEMO_NAME = "Sample";
export const isKdhDemo = () => kdhToken === KDH_DEMO_TOKEN;
const demoDate = () => new Date(Date.now() - 3 * 86400000).toISOString();
const demoStep = (title: string, text: string, extra: Partial<KdhStep> = {}): KdhStep => ({ title, text, link: null, book: false, calendars: [], done: false, doneAt: null, ...extra });
let demoHome: KdhHome | null = null;
function kdhDemoHome(): KdhHome {
  if (!demoHome) {
    const at = demoDate();
    const steps: KdhStep[] = [
      demoStep("Explore a 0% APR balance transfer", "Check which cards offer a 0% transfer and what the fee is.", { done: true, doneAt: at }),
      demoStep("Look into a debt management plan", "Ask a nonprofit credit counselor what a plan would cost each month.", { done: true, doneAt: at }),
      demoStep("Open CK Academy", "Eight short episodes on money that lasts.", { link: { label: "Open CK Academy", href: KDH_LINKS.academy } }),
      demoStep("Book a 2nd meeting", "A short follow-up to go over where you are.", { book: true }),
    ];
    demoHome = {
      client: { firstName: loadPersona().kdh || KDH_DEMO_NAME },
      // Sample numbers, in the same shape the CRM sends.
      debt: { total: 26000, card: 18400, aprPct: 24, goalPct: 4, goalFrom: "typical", monthly: 690, goalMonthly: 520, interestYear: 4420, goalInterestYear: 740 },
      expert: { name: "Shlomo", firstName: "Shlomo", email: null, whatsapp: null },
      sessions: [{ id: "demo-session-1", date: at, opener: "Good talking with you. Here are your next steps.", booking: "", steps, total: steps.length, doneCount: 2 }],
      // Sample: the booking link is open, with the expert's next open times.
      booking: { open: true, href: KDH_LINKS.academy.replace(/\/[^/]*$/, "/"), days: 7, until: new Date(Date.now() + 4 * 86400000).toISOString(), slots: ["Thu, Nov 12 at 8:30 PM", "Sun, Nov 15 at 1:00 PM", "Mon, Nov 16 at 9:00 PM"] },
      next: { choice: null, at: null, picked: [] },
      links: KDH_LINKS,
      fit: KDH_FIT,
    };
  }
  return demoHome;
}
function kdhDemoCall(path: string, body: any): any {
  const home = kdhDemoHome();
  if (path === "/me") return home;
  if (path === "/step") {
    const sessions = home.sessions.map((s) => {
      if (s.id !== body?.caseNoteId) return s;
      const steps = s.steps.map((st, k) => (k === Number(body?.i) ? { ...st, done: !!body?.done, doneAt: body?.done ? new Date().toISOString() : null } : st));
      return { ...s, steps, doneCount: steps.filter((st) => st.done).length };
    });
    demoHome = { ...home, sessions };
    const s = sessions.find((x) => x.id === body?.caseNoteId);
    return { ok: true, allDone: !!s && s.doneCount === s.total };
  }
  if (path === "/next") {
    const choice = body?.choice as KdhChoice;
    const at = new Date().toISOString();
    demoHome = { ...home, next: { choice, at, picked: [choice, ...(home.next?.picked || []).filter((c) => c !== choice)] } };
    return { ok: true, choice, at, told: true };
  }
  return {};
}

async function kdh<T>(path: string, init?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  if (kdhToken === KDH_DEMO_TOKEN && !init?.skipAuth) {
    let body: any = null;
    try { body = init?.body ? JSON.parse(String(init.body)) : null; } catch { /* noop */ }
    return kdhDemoCall(path, body) as T;
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (kdhToken && !init?.skipAuth) headers.authorization = `Bearer ${kdhToken}`;
  const res = await fetch(`${PORTAL_API_BASE}/kdh${path}`, { ...init, headers });
  if (res.status === 401 && !init?.skipAuth) {
    if (kdhToken) notifyUnauthorized();
    throw new ApiError(401, "unauthorized");
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new ApiError(res.status, data?.error || `request failed (${res.status})`);
  return data as T;
}

export async function kdhLogin(code: string): Promise<{ token: string; name: string | null }> {
  const d = await kdh<{ token?: string; name?: string | null }>("/login", { method: "POST", body: JSON.stringify({ code }), skipAuth: true });
  if (!d?.token) throw new ApiError(401, "unauthorized");
  return { token: d.token, name: d.name ?? null };
}

export const fetchKdhHome = () => kdh<KdhHome>("/me");

export const setKdhStep = (caseNoteId: string, i: number, done: boolean) =>
  kdh<{ ok: boolean; allDone: boolean }>("/step", { method: "POST", body: JSON.stringify({ caseNoteId, i, done }) });

/** The client's answer to "What would you like to do next?". The expert
 *  sees it on the profile and hears once per choice. */
export const setKdhNext = (choice: KdhChoice) =>
  kdh<{ ok: boolean; choice: KdhChoice; at: string; told: boolean }>("/next", { method: "POST", body: JSON.stringify({ choice }) });

/** The same authed fetch, for the KDH Plus calls (lib/kdhPlusApi.ts). */
export const kdhCall = kdh;
