/**
 * familyAlerts.ts — "what needs you" for a family, derived on the device
 * from the portal payloads (there is no server-side alert feed for
 * clients yet). Ordered by urgency; the bell badge counts the ones that
 * ask for an action AND have not been opened on the Alerts screen yet.
 * Each alert knows where in the app it is handled.
 *
 * "Seen" lives on the device: the alert keys a person has already looked
 * at (Capacitor Preferences, localStorage as the fallback, last 200 keys).
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Preferences } from "@capacitor/preferences";
import { fetchAcademyProgress, fetchBudget, fetchPortalHome, type PortalHome } from "./portalApi";
import { LESSONS } from "./lessons";
import type { Tint } from "@/components/gv";

export interface FamilyAlert {
  key: string;
  level: "now" | "soon" | "fyi";
  tint: Tint;
  title: string;
  sub?: string;
  to: string;           // in-app route
  href?: string;        // external link (booking etc.)
  when?: string;        // ISO for time-based alerts
  /** Already opened on the Alerts screen (persisted on the device). */
  seen: boolean;
}
/** What deriveAlerts produces before the device's seen set is applied. */
export type DerivedAlert = Omit<FamilyAlert, "seen">;

const HOURS = 3600_000;
const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const day = sameDay ? "Today" : d.toDateString() === tomorrow.toDateString() ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${day} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

export function deriveAlerts(me: PortalHome | undefined, budget: PortalHome | null | undefined, academy: { watched: number[]; allDone: boolean } | undefined): DerivedAlert[] {
  const out: DerivedAlert[] = [];
  if (!me) return out;
  const gate = me.interviewGate;
  const next = me.nextStep;
  const meetings: Record<string, any>[] = Array.isArray(me.meetings) ? me.meetings : [];
  const homework: Record<string, any>[] = Array.isArray(me.homework) ? me.homework : [];
  const openHw = homework.filter((h) => !h.done);

  // 1. The intake interview comes before everything.
  if (gate && !gate.booked) {
    const exp = gate.bookingExpiresAt ? new Date(gate.bookingExpiresAt) : null;
    out.push({
      key: "gate", level: "now", tint: "rose",
      title: "Book your intake interview",
      sub: gate.bookingExpired ? "Your booking window passed. Pick a new time." : exp ? `Pick a time by ${exp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : `${gate.interviewerName || "Our interviewer"} meets every family first.`,
      to: "/fam/home", href: gate.calendly || gate.whatsapp || undefined,
    });
  }

  // 2. Meetings inside the next 48 hours.
  const now = Date.now();
  for (const m of meetings) {
    if (!m.startTime) continue;
    const t = new Date(m.startTime).getTime();
    if (t < now - HOURS || t > now + 48 * HOURS) continue;
    out.push({ key: `meet-${m.startTime}`, level: t - now < 24 * HOURS ? "now" : "soon", tint: "sky", title: m.title || "Meeting", sub: `${fmtWhen(m.startTime)}${m.host ? ` · with ${m.host}` : ""}`, to: "/fam/meetings", href: m.joinUrl || undefined, when: m.startTime });
  }

  // 3. The plan waits for a signature.
  if (next?.kind === "sign" || (me.plan && !me.plan.signedEffective && me.plan.hasStructured && !me.plan.popupReview && next?.kind === "review_plan")) {
    out.push({ key: "sign", level: "now", tint: "lime", title: next?.kind === "sign" ? "Your plan is ready to sign" : "Read your success plan", sub: next?.body || undefined, to: "/fam/plan" });
  } else if (next?.kind === "meet_cm_wa") {
    out.push({ key: "meetcm", level: "now", tint: "lime", title: next.title || "Set a time with your case manager", sub: next.cmName ? `WhatsApp ${next.cmName}` : undefined, to: "/fam/home", href: next.whatsapp || next.calendly || undefined });
  }

  // 4. A budgeting session to book.
  if (next?.kind === "book" && me.sessions?.bookUrl) {
    out.push({ key: "book", level: "soon", tint: "mint", title: "Book your next budgeting session", sub: me.sessions?.budgeterName ? `With ${me.sessions.budgeterName}` : undefined, to: "/fam/meetings", href: me.sessions.bookUrl });
  }

  // 5. Homework and the budgeter's questions.
  if (openHw.length) {
    out.push({ key: "hw", level: "soon", tint: "yellow", title: `${openHw.length} homework item${openHw.length === 1 ? "" : "s"} open`, sub: openHw[0]?.text ? String(openHw[0].text) : undefined, to: "/fam/home" });
  }
  const review: unknown[] = Array.isArray(budget?.review) ? budget!.review : [];
  if (review.length) {
    out.push({ key: "review", level: "soon", tint: "yellow", title: `${review.length} question${review.length === 1 ? "" : "s"} from ${budget?.budgeter?.first || "your budgeter"}`, sub: "Answer in the budget builder", to: "/fam/budget" });
  }
  const conns: Record<string, any>[] = Array.isArray(budget?.connections) ? budget!.connections : [];
  const bad = conns.filter((c) => !c.removed_at && (c.status === "login_required" || c.status === "error"));
  if (bad.length) out.push({ key: "bank", level: "soon", tint: "rose", title: `${bad[0].institution_name || "A bank"} needs reconnecting`, sub: "Your budget stops updating until it is fixed", to: "/fam/budget" });

  // 6. Debt in default is worth a quiet line.
  if (me.debtNumbers?.inDefault) out.push({ key: "default", level: "fyi", tint: "rose", title: "Some accounts are in default", sub: me.debtExpertName ? `${me.debtExpertName} is working through them with you` : undefined, to: "/fam/home" });

  // 7. The course, gently.
  if (academy && !academy.allDone) {
    const nextLesson = LESSONS.find((l) => !academy.watched.includes(l.id));
    if (nextLesson) out.push({ key: "learn", level: "fyi", tint: "lavender", title: `Next episode: ${nextLesson.title}`, sub: `${academy.watched.length} of ${LESSONS.length} watched · ${nextLesson.duration}`, to: `/fam/learn/${nextLesson.id}` });
  }

  const rank = { now: 0, soon: 1, fyi: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

// ── seen state (device-local) ────────────────────────────────────────

const SEEN_KEY = "ck_alerts_seen";
const SEEN_MAX = 200;

interface SeenSnapshot { loaded: boolean; keys: ReadonlySet<string> }
let seenOrder: string[] = [];                     // oldest → newest
let seenSnap: SeenSnapshot = { loaded: false, keys: new Set() };
let seenLoading: Promise<void> | null = null;
const seenSubs = new Set<() => void>();

function subscribeSeen(fn: () => void) {
  seenSubs.add(fn);
  return () => { seenSubs.delete(fn); };
}
const getSeen = () => seenSnap;

function publishSeen(order: string[]) {
  seenOrder = order.slice(-SEEN_MAX);
  seenSnap = { loaded: true, keys: new Set(seenOrder) };
  seenSubs.forEach((fn) => fn());
}

async function readSeen(): Promise<string[]> {
  let raw: string | null = null;
  try {
    raw = (await Preferences.get({ key: SEEN_KEY })).value ?? null;
  } catch {
    try { raw = localStorage.getItem(SEEN_KEY); } catch { raw = null; }
  }
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

async function writeSeen(order: string[]) {
  const value = JSON.stringify(order);
  try {
    await Preferences.set({ key: SEEN_KEY, value });
  } catch {
    try { localStorage.setItem(SEEN_KEY, value); } catch { /* noop */ }
  }
}

function loadSeen(): Promise<void> {
  if (!seenLoading) seenLoading = readSeen().then(publishSeen);
  return seenLoading;
}

/** Remember these alert keys as seen. Keys already seen move to the newest
 *  end so a long-lived alert is not evicted by the 200-key cap. */
export async function markAlertsSeen(keys: string[]): Promise<void> {
  await loadSeen();
  const uniq = Array.from(new Set(keys));
  if (!uniq.length) return;
  const moving = new Set(uniq);
  const next = [...seenOrder.filter((k) => !moving.has(k)), ...uniq].slice(-SEEN_MAX);
  if (next.length === seenOrder.length && next.every((k, i) => k === seenOrder[i])) return;
  publishSeen(next);
  await writeSeen(next);
}

/** Shared hook: the three portal reads, cached under the same keys the tabs
 *  use, with the device's seen set applied. `count` = unseen alerts that ask
 *  for an action (the bell badge); `markAllSeen()` clears it. */
export function useFamilyAlerts() {
  const me = useQuery({ queryKey: ["portalHome"], queryFn: fetchPortalHome, staleTime: 60_000, retry: 1 });
  const budget = useQuery({ queryKey: ["budget"], queryFn: fetchBudget, staleTime: 60_000, retry: 1 });
  const academy = useQuery({ queryKey: ["academy"], queryFn: fetchAcademyProgress, staleTime: 60_000, retry: 1 });

  useEffect(() => { void loadSeen(); }, []);
  const seen = useSyncExternalStore(subscribeSeen, getSeen, getSeen);

  const alerts: FamilyAlert[] = deriveAlerts(me.data, budget.data, academy.data).map((a) => ({ ...a, seen: seen.keys.has(a.key) }));
  // Until the seen set is read, show no badge rather than a flash of the full count.
  const count = seen.loaded ? alerts.filter((a) => a.level !== "fyi" && !a.seen).length : 0;

  const keysRef = useRef<string[]>([]);
  keysRef.current = alerts.map((a) => a.key);
  const markAllSeen = useCallback(() => markAlertsSeen(keysRef.current), []);

  return {
    alerts,
    count,
    seenLoaded: seen.loaded,
    loading: me.isLoading,
    error: me.isError && !me.data,
    refetch: () => { void me.refetch(); void budget.refetch(); void academy.refetch(); },
    markAllSeen,
  };
}
