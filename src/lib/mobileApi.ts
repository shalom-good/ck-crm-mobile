/**
 * mobileApi.ts — fetch wrapper + typed endpoints for the CK CRM mobile
 * backend (/api/mobile/* — see MOBILE_HOST below).
 *
 * Every call carries the Bearer token (set by lib/auth on sign-in /
 * session restore). A 401 anywhere clears the session and routes back
 * to the start screen via the onUnauthorized hook.
 *
 * The server payloads mirror the desktop CRM loaders (listChatsForActor,
 * chatThread, loadBriskProfile, the /m roster). Field names have drifted
 * between iterations (by vs author_name, name vs title, at vs
 * created_at), so every read goes through a normalizer that accepts
 * both and never throws on a missing field.
 */

/**
 * On the web (vite dev + the Vercel deploy) the API is reached through a
 * same-origin proxy — the CRM's API routes send no CORS headers, so a
 * direct cross-origin fetch dies in the browser. Vite proxies /api in
 * dev (vite.config.ts), Vercel rewrites it in prod (vercel.json).
 * Inside the native Capacitor shell there is no same-origin server, so
 * the app calls the CRM directly; CapacitorHttp (capacitor.config.ts)
 * routes those fetches through the native layer, which has no CORS.
 */
/** The live CRM — the portal API (/api/portal/*) is public there. */
export const CRM_HOST = "https://crm.collectivekindness.net";
/** The staff API host. The live CRM's middleware still gates /api/mobile
 *  behind a staff session (branch mobile-portal-token exempts it); until
 *  that lands, the Vercel deployment serves the team routes. Flip this to
 *  CRM_HOST once the branch is on main. */
export const MOBILE_HOST = "https://ck-crm.vercel.app";
/** The donor impact portal (sign-in at /donor/login with an email code).
 *  It lives on the web for now: the app's donor door opens it outside
 *  the app (lib/external) rather than calling it. */
export const DONOR_HOST = "https://crm.collectivekindness.net";
export const DONOR_PORTAL_URL = `${DONOR_HOST}/donor`;
/** Public web addresses the start screen opens outside the app. */
// The Academy course site (NEXT_PUBLIC_SITE_URL of the ck-academy repo). Swap for the public domain once it points at Vercel.
// C-06: the live course (the old ck-academy-template.vercel.app root is a 404).
export const ACADEMY_URL = "https://collectivekindness.net/academy/newlyweds-course";
export const GIVE_URL = "https://collectivekindness.net/give";
export const isNativeShell = typeof window !== "undefined" && window.location.protocol === "capacitor:";
export const API_BASE = isNativeShell || (import.meta as any).env?.VITE_API_DIRECT === "1"
  ? `${MOBILE_HOST}/api/mobile`
  : "/api/mobile";

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}
export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn;
}
/** Shared with portalApi: any 401 means "this session is over". */
export function notifyUnauthorized() {
  onUnauthorized?.();
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function api<T>(path: string, init?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (authToken && !init?.skipAuth) headers.authorization = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string>) } });
  // Only a TEAM session can be ended by a mobile 401 — a family session
  // never holds a mobile token, so a stray staff call must not sign it out.
  if (res.status === 401 && !init?.skipAuth) {
    if (authToken) onUnauthorized?.();
    throw new ApiError(401, "unauthorized");
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok) {
    const msg = (data as { error?: string; message?: string })?.error
      || (data as { message?: string })?.message
      || `request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

// ── auth ─────────────────────────────────────────────────────────────

export interface ApiUser {
  email: string;
  name: string;
  roles: string[];
  admin?: boolean;
  demo?: boolean;
}

export async function requestCode(email: string): Promise<{ ok: boolean }> {
  return api("/auth/request-code", { method: "POST", body: JSON.stringify({ email }), skipAuth: true });
}

/** Native push registration: hand the device token to the server. */
export async function registerPushToken(token: string, platform: string): Promise<{ ok: boolean }> {
  return api("/push-token", { method: "POST", body: JSON.stringify({ token, platform }) });
}

export async function verifyCode(email: string, code: string): Promise<{ token: string; user: ApiUser }> {
  return api("/auth/verify", { method: "POST", body: JSON.stringify({ email, code }), skipAuth: true });
}

export async function fetchMe(): Promise<{ user: ApiUser }> {
  return api("/me");
}

// ── chats ────────────────────────────────────────────────────────────

export interface ChatListItem {
  chatId: string | null;
  familyRecId: string;
  title: string;
  lastMessage: { author: string; body: string; at: string | null } | null;
  unread: number;
  alert: boolean;
  sortKey: string;
}

export interface StartableChat {
  familyRecId: string;
  name: string;
}

type Raw = Record<string, any>;

function normChatItem(c: Raw): ChatListItem | null {
  const familyRecId = c?.familyRecId ?? c?.recId ?? c?.family_rec_id ?? null;
  if (!familyRecId) return null;
  const lm = c?.lastMessage ?? c?.last_message ?? null;
  const lastMessage = lm
    ? {
        author: String(lm.authorName ?? lm.by ?? lm.author_name ?? lm.author ?? ""),
        body: String(lm.body ?? lm.text ?? ""),
        at: (lm.at ?? lm.created_at ?? null) as string | null,
      }
    : null;
  return {
    chatId: (c?.chatId ?? c?.id ?? null) as string | null,
    familyRecId: String(familyRecId),
    title: String(c?.title ?? c?.name ?? "Family chat"),
    lastMessage,
    unread: Number(c?.unread ?? 0) || 0,
    alert: !!(c?.alert ?? c?.isAlert ?? c?.hasAlert ?? lm?.isAlert ?? lm?.is_alert),
    sortKey: String(c?.sortKey ?? lastMessage?.at ?? ""),
  };
}

export async function fetchChats(): Promise<{ chats: ChatListItem[]; startable: StartableChat[] }> {
  const raw = await api<Raw>("/chats");
  const chats = (Array.isArray(raw?.chats) ? raw.chats : [])
    .map(normChatItem)
    .filter((c): c is ChatListItem => c != null)
    // Alert threads pin on top (desktop behavior), then most recent first.
    .sort((a, b) => (Number(b.alert) - Number(a.alert)) || b.sortKey.localeCompare(a.sortKey));
  const startable = (Array.isArray(raw?.startable) ? raw.startable : [])
    .map((s: Raw) => ({ familyRecId: String(s?.familyRecId ?? s?.recId ?? ""), name: String(s?.name ?? "Family") }))
    .filter((s: StartableChat) => s.familyRecId);
  return { chats, startable };
}

export interface ChatMessage {
  id: string;
  author: string;
  email: string;
  role: string | null;
  mine: boolean;
  body: string;
  mentions: string[];
  noteId: string | null;
  noteCategory: string | null;
  attachments: { name?: string; url?: string }[];
  isAlert: boolean;
  at: string;
}

export interface ChatParticipant {
  name: string;
  email: string | null;
  role: string | null;
}

export interface ChatThread {
  chat: { id: string | null; title: string | null };
  family: { recId: string; name: string; summary: string | null; totalPaid: number | null; onboarded: string | null };
  participants: ChatParticipant[];
  me: { email: string; name: string | null };
  messages: ChatMessage[];
}

function normMessage(m: Raw, myEmail: string): ChatMessage {
  const email = String(m?.author_email ?? m?.email ?? "").toLowerCase();
  return {
    id: String(m?.id ?? ""),
    author: String(m?.author_name ?? m?.by ?? email ?? "Team"),
    email,
    role: (m?.author_role ?? m?.role ?? null) as string | null,
    mine: typeof m?.mine === "boolean" ? m.mine : !!(email && email === myEmail),
    body: String(m?.body ?? ""),
    mentions: Array.isArray(m?.mentions) ? m.mentions.map(String) : [],
    noteId: (m?.note_id ?? m?.noteId ?? null) as string | null,
    noteCategory: (m?.note_category ?? m?.noteCategory ?? null) as string | null,
    attachments: Array.isArray(m?.attachments) ? m.attachments : [],
    isAlert: !!(m?.is_alert ?? m?.isAlert),
    at: String(m?.created_at ?? m?.at ?? new Date().toISOString()),
  };
}

export async function fetchChatThread(familyRecId: string, myEmail: string): Promise<ChatThread> {
  const raw = await api<Raw>(`/chats/${encodeURIComponent(familyRecId)}`);
  const me = raw?.me ?? {};
  const email = String(me?.email ?? myEmail ?? "").toLowerCase();
  const fam = raw?.family ?? {};
  return {
    chat: { id: raw?.chat?.id ?? null, title: raw?.chat?.title ?? null },
    family: {
      recId: String(fam?.recId ?? familyRecId),
      name: String(fam?.name ?? "Family"),
      summary: (fam?.summary ?? null) as string | null,
      totalPaid: typeof fam?.totalPaid === "number" ? fam.totalPaid : null,
      onboarded: (fam?.onboarded ?? null) as string | null,
    },
    participants: (Array.isArray(raw?.participants) ? raw.participants : []).map((p: Raw) => ({
      name: String(p?.name ?? "Team"),
      email: p?.email ? String(p.email).toLowerCase() : null,
      role: (p?.role ?? null) as string | null,
    })),
    me: { email, name: (me?.name ?? null) as string | null },
    messages: (Array.isArray(raw?.messages) ? raw.messages : []).map((m: Raw) => normMessage(m, email)),
  };
}

export async function sendChatMessage(
  familyRecId: string,
  body: string,
  opts?: { mentions?: string[]; isAlert?: boolean },
): Promise<Raw> {
  return api(`/chats/${encodeURIComponent(familyRecId)}`, {
    method: "POST",
    body: JSON.stringify({ body, mentions: opts?.mentions ?? [], isAlert: !!opts?.isAlert }),
  });
}

export type NoteCategory = "General" | "Case" | "Budgeting" | "Debt";

export async function saveMessageAsNote(
  familyRecId: string,
  messageId: string,
  category: NoteCategory,
  text?: string,
): Promise<Raw> {
  return api(`/chats/${encodeURIComponent(familyRecId)}`, {
    method: "POST",
    body: JSON.stringify({ toNote: { messageId, category, ...(text ? { text } : {}) } }),
  });
}

// ── families roster (GET /families, /m shape) ───────────────────────

export async function fetchFamiliesRoster(asEmail?: string | null): Promise<Raw[]> {
  // all=1 — the server defaults to lifecycleStatus === "Active" only; the
  // app's Families tab must show the whole roster (scope still enforced
  // server-side by the bearer token).
  const params = new URLSearchParams({ all: "1" });
  if (asEmail) params.set("as", asEmail);
  const raw = await api<Raw>(`/families?${params.toString()}`);
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.families)) return raw.families;
  if (Array.isArray(raw?.roster)) return raw.roster;
  return [];
}

// ── family brisk profile (GET /families/:recId) ─────────────────────

export async function fetchBriskProfile(recId: string): Promise<Raw> {
  const raw = await api<Raw>(`/families/${encodeURIComponent(recId)}`);
  return (raw?.profile ?? raw) as Raw;
}

// ── payments ─────────────────────────────────────────────────────────

export async function fetchMobilePayments(): Promise<Raw[]> {
  const raw = await api<Raw>("/payments");
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.payments)) return raw.payments;
  return [];
}
