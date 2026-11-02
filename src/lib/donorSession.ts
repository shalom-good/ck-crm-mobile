/**
 * The app's donor session (one sign-in, CRM lib/identity, 180 days, renewed
 * on use). Kept apart from the team/family session in lib/auth: a donor is
 * not a "world" with tabs; the donor door shows who is signed in, opens the
 * giving page on the web with a one-tap link, and hands the token to the
 * embedded Adopt a family page.
 */
import { Preferences } from "@capacitor/preferences";
import { renewSession } from "./identityApi";

const KEY = "ck_donor";
export interface DonorSession { token: string; name: string | null }

async function get(): Promise<string | null> {
  try { return (await Preferences.get({ key: KEY })).value ?? null; } catch { try { return localStorage.getItem(KEY); } catch { return null; } }
}
async function set(v: string | null) {
  try { if (v == null) await Preferences.remove({ key: KEY }); else await Preferences.set({ key: KEY, value: v }); }
  catch { try { if (v == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch { /* noop */ } }
}

export async function loadDonorSession(): Promise<DonorSession | null> {
  const raw = await get();
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as DonorSession;
    if (!s?.token) return null;
    // Renew on use: a fresh expiry at most twice a day.
    const fresh = await renewSession("donor", s.token);
    if (fresh === false) { await set(null); return null; }
    if (fresh) { s.token = fresh; await set(JSON.stringify(s)); }
    return s;
  } catch { return null; }
}
export async function saveDonorSession(s: DonorSession) { await set(JSON.stringify(s)); }
export async function clearDonorSession() { await set(null); }
