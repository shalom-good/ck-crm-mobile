/**
 * kdhApplyApi.ts — applying to Kosher Debt Help from the app's front door,
 * and booking a call with a person.
 *
 * The application is the same one the website asks (kosherdebthelp.com/apply
 * embeds the CRM's /apply?program=kdh): the same fields, posted to the same
 * public endpoint, so it lands in the CRM's Applications queue exactly like
 * one from the website and the KDH team gets the same alert.
 *
 *   POST /api/public/application
 *     { program: "kosher_debt_help", first_names, last_name, phone, email,
 *       city, contact_preference, referral_source, answers: {}, acks: [] }
 *     → { ok: true, id }
 *
 * On the web the call goes through the same-origin proxy (vite.config.ts /
 * vercel.json); the native shell calls the CRM directly.
 */
import { ApiError, CRM_HOST, isNativeShell } from "./mobileApi";

const PUBLIC_API_BASE = isNativeShell || (import.meta as any).env?.VITE_API_DIRECT === "1"
  ? `${CRM_HOST}/api/public`
  : "/api/public";

/** The two ways the KDH team reaches a new applicant (the website's own list). */
export const KDH_CONTACT_OPTIONS = ["WhatsApp", "Email"] as const;
export type KdhContactPreference = (typeof KDH_CONTACT_OPTIONS)[number];

/** Julie's booking calendar: the free 10-minute call offered on
 *  kosherdebthelp.com/free-consultation ("Schedule with Julie"). It is a
 *  Google Calendar booking page; ?gv=true is the form made for embedding. */
export const KDH_TALK_URL = "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1iASB-OH_s-MRuVMjYbBjq9k8_CeIPaRPZSky6gEt1JATiE5XX3VpS0_MAOmcuTNJA-dmtaLiQ?gv=true";

/** The same application on the website, for when the app cannot reach the CRM. */
export const KDH_SITE_APPLY_URL = "https://www.kosherdebthelp.com/apply/";

export interface KdhApplication {
  firstNames: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  contactPreference: KdhContactPreference;
  referralSource: string;
}

export async function submitKdhApplication(a: KdhApplication): Promise<{ id: string | null }> {
  const res = await fetch(`${PUBLIC_API_BASE}/application`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      program: "kosher_debt_help",
      first_names: a.firstNames.trim(),
      last_name: a.lastName.trim(),
      phone: a.phone.trim(),
      email: a.email.trim().toLowerCase(),
      city: a.city.trim(),
      contact_preference: a.contactPreference,
      referral_source: a.referralSource.trim(),
      answers: {},
      acks: [],
      // Kept with the application's details, so the team can tell where it came from.
      source: "ck-app",
    }),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok || !data?.ok) throw new ApiError(res.status, data?.message || "Could not submit right now.");
  return { id: data.id ?? null };
}
