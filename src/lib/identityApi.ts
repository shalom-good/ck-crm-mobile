/**
 * identityApi.ts — the one sign-in (CRM lib/identity) from the app.
 *
 *   POST /api/identity/start   { identifier, area, client:"mobile" } → { channel, sentTo }
 *   POST /api/identity/verify  { identifier, code, area, client:"mobile" } → { token, name, … }
 *   POST /api/identity/renew   (Bearer) → { token } when the session was renewed
 *   POST /api/identity/contacts (Bearer) { identifier } → adds a phone to the household
 *   POST /api/identity/handoff (Bearer) { area, path } → { url } a one-tap web link
 *
 * A phone or an email in ONE field; the code goes by WhatsApp first, email
 * second. Families get a 90-day session, donors 180, renewed on use.
 */
import { ApiError, CRM_HOST, isNativeShell } from "./mobileApi";

export const IDENTITY_API_BASE = isNativeShell || (import.meta as any).env?.VITE_API_DIRECT === "1"
  ? `${CRM_HOST}/api/identity`
  : "/api/identity";

export type Area = "family" | "donor";

async function call<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${IDENTITY_API_BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    const e = new ApiError(res.status, data?.message || data?.error || `request failed (${res.status})`);
    (e as any).data = data;
    throw e;
  }
  return data as T;
}

/** Pure: is this a phone or an email? (Server normalises to E.164; this only gates the button.) */
export function identifierKind(raw: string): "phone" | "email" | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? "email" : null;
  const d = s.replace(/\D/g, "");
  return /^[\d\s()+.\-]+$/.test(s) && d.length >= 10 && d.length <= 15 ? "phone" : null;
}

export function startSignIn(identifier: string, area: Area) {
  return call<{ ok: boolean; channel: "whatsapp" | "email"; sentTo: string }>("/start", { identifier: identifier.trim(), area, client: "mobile" });
}

export function verifySignIn(identifier: string, code: string, area: Area, phoneProof?: string | null) {
  return call<{ ok: boolean; token: string; name?: string | null; welcome?: boolean; person?: any }>("/verify", { identifier: identifier.trim(), code, area, client: "mobile", phoneProof: phoneProof || null });
}

/** A fresh token (renewed), null (nothing to do, or offline), or false (the
 *  session is over: revoked or expired; forget it). */
export async function renewSession(area: Area, token: string): Promise<string | null | false> {
  try { const r = await call<{ token?: string }>("/renew", { area }, token); return r?.token || null; }
  catch (e) { return (e as ApiError)?.status === 401 ? false : null; }
}

export function addHouseholdPhone(identifier: string, token: string) {
  return call<{ ok: boolean }>("/contacts", { identifier: identifier.trim() }, token);
}

export async function webHandoff(area: Area, path: string, token: string): Promise<string | null> {
  try { const r = await call<{ url?: string }>("/handoff", { area, path }, token); return r?.url || null; } catch { return null; }
}
