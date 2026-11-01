/**
 * familyAlerts.ts — "what needs you" for a family, derived on the device
 * from the portal payloads (there is no server-side alert feed for
 * clients yet). Ordered by urgency; the bell badge counts the ones that
 * ask for an action. Each alert knows where in the app it is handled.
 */
import { useQuery } from "@tanstack/react-query";
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
}

const HOURS = 3600_000;
const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const day = sameDay ? "Today" : d.toDateString() === tomorrow.toDateString() ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${day} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

export function deriveAlerts(me: PortalHome | undefined, budget: PortalHome | null | undefined, academy: { watched: number[]; allDone: boolean } | undefined): FamilyAlert[] {
  const out: FamilyAlert[] = [];
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

/** Shared hook: the three portal reads, cached under the same keys the tabs use. */
export function useFamilyAlerts() {
  const me = useQuery({ queryKey: ["portalHome"], queryFn: fetchPortalHome, staleTime: 60_000, retry: 1 });
  const budget = useQuery({ queryKey: ["budget"], queryFn: fetchBudget, staleTime: 60_000, retry: 1 });
  const academy = useQuery({ queryKey: ["academy"], queryFn: fetchAcademyProgress, staleTime: 60_000, retry: 1 });
  const alerts = deriveAlerts(me.data, budget.data, academy.data);
  const count = alerts.filter((a) => a.level !== "fyi").length;
  return { alerts, count, loading: me.isLoading, error: me.isError && !me.data, refetch: () => { void me.refetch(); void budget.refetch(); void academy.refetch(); } };
}
