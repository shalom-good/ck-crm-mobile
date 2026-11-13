/**
 * academyApi.ts — the CK ACADEMY side of the app.
 *
 * The Academy's own server owns the student tables; the CRM reads them and
 * brokers the app's access (CRM branch `mobile-academy`):
 *
 *   POST /api/mobile/academy/signup        full sign-up from the app
 *   POST /api/mobile/academy/request-code  { email } → 6-digit code by email
 *   POST /api/mobile/academy/verify        { email, code } → { token, student }
 *   GET  /api/mobile/academy/google/start  Google, then back with #academy_token=
 *   GET  /api/mobile/academy/me            student + per-episode progress
 *   POST /api/mobile/academy/progress      heartbeat | quiz | pdf
 *   POST /api/mobile/academy/unlock        counselor code → next episode
 *   GET/POST /api/mobile/academy/steps     Lesson I "Now make it real" answers
 *   GET  /api/public/academy-stats         the live sign-up count
 *
 * A couple who signed up on the website signs in here with the same email
 * (no password: a code is emailed). A couple who signs up here gets the
 * same student record the website creates, so the CRM board shows them
 * the same way.
 *
 * Until that branch is live the routes answer 404; every caller treats
 * that as "not switched on yet" (ApiError.status 404) and offers the
 * website instead of failing silently.
 */
import { ApiError, CRM_HOST, isNativeShell, notifyUnauthorized } from "./mobileApi";
import { LESSONS } from "./lessons";

const env = (import.meta as any).env || {};
const DIRECT = isNativeShell || env.VITE_API_DIRECT === "1";

/** VITE_ACADEMY_API points a test build at another backend (a CRM preview). */
export const ACADEMY_API_BASE: string = env.VITE_ACADEMY_API || (DIRECT ? `${CRM_HOST}/api/mobile/academy` : "/api/mobile/academy");
export const ACADEMY_STATS_URL: string = env.VITE_ACADEMY_STATS || (DIRECT ? `${CRM_HOST}/api/public/academy-stats` : "/api/public/academy-stats");

let academyToken: string | null = null;
export function setAcademyToken(t: string | null) { academyToken = t; }

export interface AcademyStudent {
  id: string;
  name: string | null;
  email: string;
  status?: string | null;
  currentLesson?: number;
  /** Paid, or given access by a partner code or the team. */
  paid?: boolean;
  counselorName?: string | null;
  counselor?: { name: string; whatsapp?: string | null } | null;
  completedAt?: string | null;
}

export interface AcademyLessonProgress {
  n: number;
  watchSeconds: number;
  durationSeconds: number | null;
  quizScore: number | null;
  quizTotal: number | null;
  pdfConfirmed: boolean;
  codeIssued: boolean;
  completedAt: string | null;
}

/* Lesson I "Now make it real" (the same two answers the website saves) and
   the optional call with the course coach. Absent on a server that does
   not send them yet: the lesson page then leaves those parts out. */
export type RetirementAnswer = "opened" | "already_had" | "not_yet";
export type TrumpAnswer = "claimed" | "no_kids" | "not_yet";
export interface AcademySteps {
  retirement: { status: RetirementAnswer | null; monthly: number | null; opening: number | null; reportedAt: string | null; done: boolean };
  trump: { status: TrumpAnswer | null; kids: number | null; bonus: boolean; reportedAt: string | null; done: boolean; available?: boolean };
}
export interface AcademyCoach { lesson: number; name: string; firstName: string; bookingUrl: string; bookedFor: string | null; metAt: string | null; gates: boolean }
export type AcademyStepInput =
  | { step: "retirement"; status: RetirementAnswer; monthly?: number | null; opening?: number | null }
  | { step: "trump"; status: TrumpAnswer; kids?: number | null; bonus?: boolean };

export interface AcademyMe { student: AcademyStudent; lessons: AcademyLessonProgress[]; steps?: AcademySteps; coach?: AcademyCoach }

export interface AcademyStats {
  students: number;
  last7: number;
  accountsOpened: number;
  monthlyAutomated: number;
  completed: number;
  asOf: string;
  /** false while the number is the one baked into the app. */
  live: boolean;
}

/** The real numbers on 2026-11-10 (live CRM). Shown until the live count
 *  answers, and if it cannot be reached. */
export const ACADEMY_STATS_FALLBACK: AcademyStats = {
  students: 613,
  last7: 49,
  accountsOpened: 208,
  monthlyAutomated: 36050,
  completed: 21,
  asOf: "2026-11-10T16:00:00Z",
  live: false,
};

/* ── Demo couple (the same reviewer pair the team door uses) ──────────
   reviewer@ckteam.app + 072026 opens a made-up course that lives only on
   this phone: no server, no real student. For App Review and for walking
   the screens before the CRM routes are live. */
export const ACADEMY_DEMO_EMAIL = "reviewer@ckteam.app";
const DEMO_CODE = "072026";
const DEMO_TOKEN = "academy-demo";
const DEMO_KEY = "ck_academy_demo";
/** The demo counselor code that opens the next episode (072026 works too). */
export const ACADEMY_DEMO_UNLOCK = "DEMO22";
const DEMO_STEPS: AcademySteps = {
  retirement: { status: null, monthly: null, opening: null, reportedAt: null, done: false },
  trump: { status: null, kids: null, bonus: false, reportedAt: null, done: false, available: true },
};
const DEMO_COACH: AcademyCoach = { lesson: 2, name: "Eli Marks", firstName: "Eli", bookingUrl: "https://collectivekindness.net/", bookedFor: null, metAt: null, gates: false };
const blank = (n: number): AcademyLessonProgress => ({ n, watchSeconds: 0, durationSeconds: null, quizScore: null, quizTotal: null, pdfConfirmed: false, codeIssued: false, completedAt: null });
function demoLoad(): AcademyMe {
  try { const raw = localStorage.getItem(DEMO_KEY); if (raw) { const m = JSON.parse(raw) as AcademyMe; return { ...m, steps: m.steps || DEMO_STEPS, coach: m.coach || DEMO_COACH }; } } catch { /* noop */ }
  return {
    // Episode I is already finished for the sample couple, so its two steps are answered.
    steps: { retirement: { status: "opened", monthly: 150, opening: 500, reportedAt: "2026-11-03T15:00:00Z", done: true }, trump: { status: "no_kids", kids: null, bonus: false, reportedAt: "2026-11-03T15:00:00Z", done: true, available: true } },
    coach: DEMO_COACH,
    student: { id: "demo", name: "Dovid and Chana Klein", email: ACADEMY_DEMO_EMAIL, status: "active", currentLesson: 2, paid: true, counselorName: "Yael Rosen", counselor: { name: "Yael Rosen", whatsapp: null }, completedAt: null },
    lessons: Array.from({ length: 8 }, (_, k) => (k === 0 ? { ...blank(1), watchSeconds: 507, durationSeconds: 507, quizScore: 3, quizTotal: 3, pdfConfirmed: true, codeIssued: true, completedAt: "2026-11-03T15:00:00Z" } : blank(k + 1))),
  };
}
function demoSave(me: AcademyMe) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(me)); } catch { /* noop */ } }
export const isAcademyDemo = () => academyToken === DEMO_TOKEN;
function demoCall(path: string, body: any): any {
  const me = demoLoad();
  if (path === "/me") return me;
  if (path === "/steps") {
    const st = me.steps || DEMO_STEPS;
    const now = new Date().toISOString();
    if (body?.step === "retirement") st.retirement = { status: body.status, monthly: body.status === "not_yet" ? null : body.monthly ?? null, opening: body.status === "opened" ? body.opening ?? null : null, reportedAt: now, done: body.status === "opened" || body.status === "already_had" };
    if (body?.step === "trump") st.trump = { status: body.status, kids: body.status === "claimed" ? Number(body.kids) || 1 : null, bonus: body.status === "claimed" && !!body.bonus, reportedAt: now, done: body.status === "claimed" || body.status === "no_kids", available: true };
    me.steps = st;
    demoSave(me);
    return { ok: true, steps: st, coach: me.coach || DEMO_COACH };
  }
  const p = me.lessons.find((l) => l.n === Number(body?.lesson));
  if (!p) throw new ApiError(400, "Bad lesson");
  if (path === "/progress") {
    if (body.action === "heartbeat") { p.watchSeconds = Math.max(p.watchSeconds, Number(body.watchSeconds) || 0); if (body.duration) p.durationSeconds = Number(body.duration); }
    if (body.action === "quiz" && p.quizScore == null) { const key = LESSONS.find((l) => l.id === p.n)?.quiz ?? []; p.quizTotal = key.length; p.quizScore = key.filter((q, i) => body.answers?.[i] === q.answer).length; }
    if (body.action === "pdf") p.pdfConfirmed = true;
    if (p.quizScore != null && p.pdfConfirmed) p.codeIssued = true;
    demoSave(me);
    return { watchSeconds: p.watchSeconds, videoDurationSeconds: p.durationSeconds, quizScore: p.quizScore, quizTotal: p.quizTotal, pdfConfirmed: p.pdfConfirmed, codeIssued: p.codeIssued };
  }
  if (path === "/unlock") {
    const typed = String(body.code).toUpperCase();
    if (p.n !== me.student.currentLesson || (typed !== ACADEMY_DEMO_UNLOCK && typed !== DEMO_CODE)) return { ok: false };
    p.completedAt = new Date().toISOString();
    me.student.currentLesson = p.n + 1;
    if (p.n >= 8) me.student.completedAt = p.completedAt;
    demoSave(me);
    return p.n >= 8 ? { ok: true, done: true } : { ok: true, next: p.n + 1 };
  }
  throw new ApiError(404, "not_available");
}

async function call<T>(path: string, init?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  if (academyToken === DEMO_TOKEN && !init?.skipAuth) {
    return demoCall(path, init?.body ? JSON.parse(String(init.body)) : null) as T;
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (academyToken && !init?.skipAuth) headers.authorization = `Bearer ${academyToken}`;
  let res: Response;
  try {
    res = await fetch(`${ACADEMY_API_BASE}${path}`, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string>) } });
  } catch {
    throw new ApiError(0, "network");
  }
  if (res.status === 401 && !init?.skipAuth) {
    if (academyToken) notifyUnauthorized();
    throw new ApiError(401, "unauthorized");
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON (a 404 page, the SPA shell) */ }
  if (!res.ok) throw new ApiError(res.status, data?.error || data?.message || `request failed (${res.status})`);
  // The static host answers unknown /api paths with the app shell (200,
  // HTML). No JSON on a 200 means the route is not there.
  if (data == null) throw new ApiError(404, "not_available");
  return data as T;
}

/** True when the backend has not picked up the Academy routes yet. */
export const academyNotLive = (e: unknown) => e instanceof ApiError && (e.status === 404 || e.status === 405);

export async function fetchAcademyStats(): Promise<AcademyStats> {
  const res = await fetch(ACADEMY_STATS_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new ApiError(res.status, "stats");
  const d = await res.json();
  if (!d || typeof d.students !== "number") throw new ApiError(404, "stats");
  return {
    students: d.students,
    last7: Number(d.last7) || 0,
    accountsOpened: Number(d.accountsOpened) || 0,
    monthlyAutomated: Number(d.monthlyAutomated) || 0,
    completed: Number(d.completed) || 0,
    asOf: d.asOf || new Date().toISOString(),
    live: true,
  };
}

export interface AcademySignupInput {
  name: string;
  email: string;
  phone: string;
  age: string;
  relationshipStatus: string;
  answers: Record<string, string>;
  kdhApply: boolean;
  debtAmount: string | null;
}

/** `token` comes back for a brand-new couple (they go straight in).
 *  `existing` means the email already has an account: a sign-in code was
 *  emailed instead, so nobody can claim someone else's course. */
export async function academySignup(input: AcademySignupInput): Promise<{ ok: boolean; token?: string; student?: AcademyStudent; existing?: boolean }> {
  return call("/signup", { method: "POST", body: JSON.stringify({ ...input, source: "app" }), skipAuth: true });
}

export async function academyRequestCode(email: string): Promise<void> {
  if (email.trim().toLowerCase() === ACADEMY_DEMO_EMAIL) return;
  await call("/request-code", { method: "POST", body: JSON.stringify({ email }), skipAuth: true });
}

export async function academyVerify(email: string, code: string): Promise<{ token: string; student: AcademyStudent }> {
  if (email.trim().toLowerCase() === ACADEMY_DEMO_EMAIL) {
    if (code !== DEMO_CODE) throw new ApiError(401, "invalid_code");
    try { localStorage.removeItem(DEMO_KEY); } catch { /* noop */ }
    return { token: DEMO_TOKEN, student: demoLoad().student };
  }
  const d = await call<{ token?: string; student?: AcademyStudent }>("/verify", { method: "POST", body: JSON.stringify({ email, code }), skipAuth: true });
  if (!d?.token || !d.student) throw new ApiError(401, "invalid_code");
  return { token: d.token, student: d.student };
}

/* ── Continue with Google ─────────────────────────────────────────────
   The CRM runs the Google sign-in (the same one the family and donor doors
   use) and sends the browser back to `returnTo` with
     #academy_token=…&id=…&email=…&name=…     signed in
     #ag=nomatch&email=…                      that Gmail never signed up
     #ag=cancel | failed | off
   The trip has to start on the CRM's own address, not through this app's
   proxy: the CRM sets a cookie there that its Google callback reads. */
const ACADEMY_GOOGLE_BASE = /^https?:\/\//.test(ACADEMY_API_BASE) ? ACADEMY_API_BASE : `${CRM_HOST}/api/mobile/academy`;
export const academyGoogleUrl = (returnTo: string) => `${ACADEMY_GOOGLE_BASE}/google/start?app=${encodeURIComponent(returnTo)}`;

/** Asked before leaving the app, so nobody lands on a missing page. Throws
 *  a 404 ApiError (see academyNotLive) while the server has no such route;
 *  false when the route is there but Google is not set up on it. */
export async function academyGoogleReady(): Promise<boolean> {
  const d = await call<{ ok?: boolean; on?: boolean }>("/google/start?probe=1", { skipAuth: true });
  return !!d?.on;
}

/** Reads the hand-back. `null` when the address carries none. */
export function readAcademyGoogleReturn(hash: string): { token: string; student: AcademyStudent } | { reason: string; email: string | null } | null {
  const q = new URLSearchParams(String(hash || "").replace(/^[^#]*#/, ""));
  const token = q.get("academy_token");
  const email = (q.get("email") || "").trim().toLowerCase();
  if (token && q.get("id") && email) return { token, student: { id: q.get("id") as string, name: q.get("name") || null, email } };
  if (token) return { reason: "failed", email: null };
  const reason = q.get("ag");
  return reason ? { reason, email: email || null } : null;
}

export const fetchAcademyMe = () => call<AcademyMe>("/me");

export type ProgressAction =
  | { action: "heartbeat"; lesson: number; watchSeconds: number; duration: number }
  | { action: "quiz"; lesson: number; answers: number[] }
  | { action: "pdf"; lesson: number };

export interface ProgressSnapshot { watchSeconds: number; videoDurationSeconds: number | null; quizScore: number | null; quizTotal: number | null; pdfConfirmed: boolean; codeIssued: boolean }

export const postAcademyProgress = (body: ProgressAction) => call<ProgressSnapshot>("/progress", { method: "POST", body: JSON.stringify(body) });

export const academyUnlock = (lesson: number, code: string) =>
  call<{ ok: boolean; next?: number; done?: boolean }>("/unlock", { method: "POST", body: JSON.stringify({ lesson, code }) });

/** Saves one Lesson I answer. `pending` means this server cannot store that
 *  answer yet (the column is not there): nothing is lost, it just is not kept. */
export const saveAcademyStep = (body: AcademyStepInput) =>
  call<{ ok: boolean; pending?: boolean; steps: AcademySteps; coach?: AcademyCoach }>("/steps", { method: "POST", body: JSON.stringify(body) });
