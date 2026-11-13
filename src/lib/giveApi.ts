/**
 * giveApi.ts — a gift, inside the app. Talks to the live CRM's public
 * campaign API (the same one the web Give page uses):
 *
 *   GET  /api/public/campaigns/<slug>            → page copy, amounts, settings
 *   POST /api/public/campaigns/<slug>/checkout   → Stripe PaymentIntent client secret
 *   GET  /api/public/campaigns/<slug>/confirm?pi → records the gift, returns the amount
 *
 * Card details never touch the app or the CRM: Stripe's own elements
 * collect them. On the web the calls go through a same-origin proxy
 * (vite.config.ts / vercel.json); the native shell calls the CRM directly.
 */
import { ApiError, CRM_HOST, isNativeShell } from "./mobileApi";

export const GIVE_SLUG = "general-fund";

const PUBLIC_API_BASE = isNativeShell || (import.meta as any).env?.VITE_API_DIRECT === "1"
  ? `${CRM_HOST}/api/public`
  : "/api/public";

export type GiveFrequency = "once" | "monthly";

export interface GiveTier { amount: number; label: string }

export interface GiveCampaign {
  name: string;
  thankYou: string;
  /** The amounts to offer, each with its short line, per frequency
   *  (the same list the main CK giving page shows). */
  tiers: Record<GiveFrequency, GiveTier[]>;
  monthly: boolean;
  coverFees: boolean;
  /** The fee box starts ticked on the main page when this is on. */
  coverDefault: boolean;
  /** The frequency whose second amount starts selected (else the first). */
  promoted: GiveFrequency | null;
  hideOther: boolean;
  minimum: number;
}

export interface GiveIntent {
  clientSecret: string;
  publishableKey: string;
  total: number;
  feeCovered: number;
}

/** A campaign slug as the CRM writes them, or the general fund. */
export const giveSlug = (v: unknown): string => (typeof v === "string" && /^[a-z0-9][a-z0-9-]{0,80}$/.test(v) ? v : GIVE_SLUG);

async function call<T>(path: string, init?: RequestInit, slug: string = GIVE_SLUG): Promise<T> {
  const res = await fetch(`${PUBLIC_API_BASE}/campaigns/${giveSlug(slug)}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers as Record<string, string>) },
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new ApiError(res.status, data?.error || `request failed (${res.status})`);
  return data as T;
}

const FALLBACK_CHIPS = [54, 180, 360];

function tierList(raw: unknown): GiveTier[] {
  return (Array.isArray(raw) ? raw : [])
    .map((t: any) => ({ amount: Number(t?.amount), label: String(t?.label || "").trim() }))
    .filter((t) => Number.isFinite(t.amount) && t.amount > 0)
    .slice(0, 8);
}

export async function fetchGiveCampaign(slug: string = GIVE_SLUG): Promise<GiveCampaign> {
  const d = await call<any>("", undefined, slug);
  const c = d?.campaign;
  if (!c || c.status !== "live") throw new ApiError(404, "This page is not accepting gifts right now.");
  const s = c.settings || {};
  const p = s.presets || {};
  const byAmount = (p.chipLabels?.byAmount as Record<string, string>) || {};
  const chips: GiveTier[] = (Array.isArray(p.familyChips) ? p.familyChips : FALLBACK_CHIPS)
    .map((n: unknown) => Number(n))
    .filter((n: number) => Number.isFinite(n) && n > 0)
    .map((n: number) => ({ amount: n, label: byAmount[String(n)] || "" }));
  const once = tierList(p.amounts?.once);
  const monthly = tierList(p.amounts?.monthly);
  return {
    name: String(c.name || "Collective Kindness"),
    thankYou: String(s.content?.thankYou || "Thank you. Your gift goes straight to a family's plan."),
    tiers: { once: once.length ? once : chips, monthly: monthly.length ? monthly : (once.length ? once : chips) },
    monthly: !!p.frequencies?.monthly,
    coverFees: !!s.coverFees?.enabled,
    coverDefault: !!s.coverFees?.enabled && !!s.coverFees?.defaultOn,
    promoted: p.promoted === "once" || p.promoted === "monthly" ? p.promoted : null,
    hideOther: !!p.hideOther,
    minimum: Number(p.minimum) || 1,
  };
}

/** Same sum the server adds when the donor covers the card fee. */
export const feeFor = (amount: number) => Math.round((amount * 0.029 + 0.3) * 100) / 100;

export async function createGiveIntent(input: {
  amount: number;
  frequency: GiveFrequency;
  coverFee: boolean;
  donor: { name: string; email: string };
  /** Shown to the team on the gift (the CRM keeps extras.comment). */
  comment?: string;
  /** The campaign (raise) the gift is for; the general fund when left out. */
  slug?: string;
}): Promise<GiveIntent> {
  const j = await call<any>("/checkout", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      familyId: null,
      frequency: input.frequency,
      coverFee: input.coverFee,
      donor: { name: input.donor.name, email: input.donor.email, phone: "" },
      extras: input.comment ? { source: "app", comment: input.comment.slice(0, 400) } : { source: "app" },
    }),
  }, input.slug);
  if (!j?.clientSecret || !j?.publishableKey) {
    throw new ApiError(503, "Online giving is being switched on. Please try the website.");
  }
  return { clientSecret: j.clientSecret, publishableKey: j.publishableKey, total: Number(j.total) || input.amount, feeCovered: Number(j.feeCovered) || 0 };
}

/** Tells the CRM to record a confirmed intent. Safe to call twice. */
export async function confirmGift(paymentIntentId: string, slug: string = GIVE_SLUG): Promise<{ status?: string; amount?: number }> {
  return call(`/confirm?pi=${encodeURIComponent(paymentIntentId)}`, undefined, slug);
}

let stripeJs: Promise<any> | null = null;
/** Stripe.js, fetched only when the payment step opens. */
export function loadStripeJs(): Promise<any> {
  const w = window as any;
  if (w.Stripe) return Promise.resolve(w.Stripe);
  if (stripeJs) return stripeJs;
  stripeJs = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3";
    s.async = true;
    s.onload = () => (w.Stripe ? resolve(w.Stripe) : reject(new Error("Stripe did not load")));
    s.onerror = () => { stripeJs = null; reject(new Error("Could not reach the payment service. Check your connection.")); };
    document.head.appendChild(s);
  });
  return stripeJs;
}
