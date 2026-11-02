/**
 * portalApi.ts — the FAMILY side of the app. Talks to the same client
 * portal API the web portal uses (/api/portal/*) on the live CRM, but
 * with a Bearer token instead of the portal cookie:
 *
 *   POST /api/portal/login { code, client: "mobile" } → { token, name }
 *   GET  /api/portal/me   (Authorization: Bearer <token>) → portal home
 *
 * On the web (vite dev + the Vercel deploy) the calls go through a
 * same-origin proxy (vite.config.ts / vercel.json); inside the native
 * shell CapacitorHttp handles the cross-origin fetch.
 */
import { ApiError, CRM_HOST, isNativeShell, notifyUnauthorized } from "./mobileApi";

export const PORTAL_API_BASE = isNativeShell || (import.meta as any).env?.VITE_API_DIRECT === "1"
  ? `${CRM_HOST}/api/portal`
  : "/api/portal";

/** Where the full web portal lives (escape hatch + documents). */
export const PORTAL_WEB_URL = `${CRM_HOST}/portal`;

let portalToken: string | null = null;
export function setPortalToken(t: string | null) { portalToken = t; }

export type PortalHome = Record<string, any>;

async function portal<T>(path: string, init?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (portalToken && !init?.skipAuth) headers.authorization = `Bearer ${portalToken}`;
  const res = await fetch(`${PORTAL_API_BASE}${path}`, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string>) } });
  if (res.status === 401 && !init?.skipAuth) {
    if (portalToken) notifyUnauthorized();
    throw new ApiError(401, "unauthorized");
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new ApiError(res.status, data?.error || data?.message || `request failed (${res.status})`);
  return data as T;
}

/** 7-letter code → token. Throws ApiError("no_token") when the live API
 *  has not picked up the mobile login yet (then the app points at the
 *  web portal instead of failing silently). */
export async function familyLogin(code: string): Promise<{ token: string; name: string | null }> {
  const data = await portal<{ ok?: boolean; loggedIn?: boolean; token?: string; name?: string | null }>(
    "/login",
    { method: "POST", body: JSON.stringify({ code, client: "mobile" }), skipAuth: true },
  );
  if (!data?.token) throw new ApiError(503, "no_token");
  return { token: data.token, name: data.name ?? null };
}

/** "Lost your code?" (A-02): the email sign-in the API already has.
 *  POST /login { email } always answers ok (no probing); the 6-digit code
 *  arrives by email. A `phone` key joins here with the login overhaul. */
export async function requestFamilyEmailCode(email: string): Promise<void> {
  await portal("/login", { method: "POST", body: JSON.stringify({ email }), skipAuth: true });
}

/** Email + 6-digit code → token. `token` is null while the backend only
 *  sets the web cookie (then the app opens the web portal, A-01 interim). */
export async function verifyFamilyEmailCode(email: string, code: string): Promise<{ token: string | null; name: string | null }> {
  const data = await portal<{ ok?: boolean; token?: string; name?: string | null }>(
    "/verify",
    { method: "POST", body: JSON.stringify({ email, code, client: "mobile" }), skipAuth: true },
  );
  return { token: data?.token || null, name: data?.name ?? null };
}

export async function fetchPortalHome(): Promise<PortalHome> {
  return portal<PortalHome>("/me");
}

/** Tick / untick a homework item (PATCH /api/portal/homework/:id). */
export async function setHomeworkDone(id: string, done: boolean): Promise<{ id: string; text: string; done: boolean }> {
  return portal(`/homework/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ done }) });
}

// ── success plan (GET /success-plan, POST /success-plan/sign) ────────

export async function fetchSuccessPlan(): Promise<PortalHome> {
  return portal<PortalHome>("/success-plan");
}

/** One signer signs: typed full name + the consent checkbox (agreed). */
export async function signSuccessPlan(name: string): Promise<PortalHome> {
  return portal<PortalHome>("/success-plan/sign", { method: "POST", body: JSON.stringify({ name, agreed: true }) });
}

// ── budget (GET /budget; 404 when the builder is off or not started) ──

export async function fetchBudget(): Promise<PortalHome | null> {
  try {
    return await portal<PortalHome>("/budget");
  } catch (e) {
    if ((e as ApiError)?.status === 404) return null;
    throw e;
  }
}

// ── CK Academy progress ──────────────────────────────────────────────

export interface AcademyProgress { watched: number[]; allDone: boolean }

export async function fetchAcademyProgress(): Promise<AcademyProgress> {
  const d = await portal<Partial<AcademyProgress>>("/academy-progress");
  return { watched: Array.isArray(d?.watched) ? d.watched.map(Number) : [], allDone: !!d?.allDone };
}

export async function markLessonWatched(lessonId: number): Promise<AcademyProgress> {
  const d = await portal<Partial<AcademyProgress>>("/academy-progress", { method: "POST", body: JSON.stringify({ lessonId, pct: 1, ended: true }) });
  return { watched: Array.isArray(d?.watched) ? d.watched.map(Number) : [], allDone: !!d?.allDone };
}
