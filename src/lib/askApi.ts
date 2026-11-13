/**
 * askApi.ts — "Ask" for CK families and Kosher Debt Help clients.
 *
 * The helper on the server answers ONLY from what the person already sees
 * on their own screens (CRM lib/portalAsk.js): it loads their own /me with
 * their own session, strips links and contact details, and answers from
 * that. It explains their plan; it does not give financial advice.
 *
 *   POST /api/portal/ask       CK family   { question, history? } → { answer, person }
 *   POST /api/portal/kdh/ask   KDH client  (same shape)
 *
 * Until the CRM has these routes they answer 404: the sheet then says Ask is
 * being switched on and offers the person on WhatsApp instead.
 *
 * The sample doors (all access) never reach the server: their answers are
 * put together on this phone from the same sample data the screens show.
 */
import { ApiError } from "./mobileApi";
import { PORTAL_API_BASE, fetchPortalHome } from "./portalApi";
import { FAMILY_DEMO_TOKEN } from "./portalDemo";
import { KDH_DEMO_TOKEN, fetchKdhHome } from "./kdhApi";
import { COORDINATOR_NAME } from "./contact";

export type AskDoor = "family" | "kdh";
export interface AskTurn { role: "user" | "assistant"; text: string }
export interface AskReply { answer: string; person: string | null; sample?: boolean }

export const ASK_STARTERS: Record<AskDoor, string[]> = {
  family: ["What is my next step?", "When is my next meeting?", "How is this month going?", "Who do I talk to about my debt?"],
  kdh: ["What should I do first this week?", "When can I book my next call?", "What does my debt look like?", "Who do I ask about my homework?"],
};

export const isAskSample = (token: string | null) => token === FAMILY_DEMO_TOKEN || token === KDH_DEMO_TOKEN;

export async function askHelper(door: AskDoor, token: string, question: string, history: AskTurn[]): Promise<AskReply> {
  if (isAskSample(token)) {
    // A short pause so the sample feels like the real thing.
    await new Promise((r) => setTimeout(r, 700));
    return { ...(door === "kdh" ? await sampleKdh(question) : await sampleFamily(question)), sample: true };
  }
  let res: Response;
  try {
    res = await fetch(`${PORTAL_API_BASE}${door === "kdh" ? "/kdh/ask" : "/ask"}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ question, history: history.slice(-12) }),
    });
  } catch {
    throw new ApiError(0, "network");
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* the app shell or a 404 page: no JSON */ }
  if (res.ok && data?.answer) return { answer: String(data.answer), person: data.person?.name || null };
  // No JSON on a 200 means the route is not there yet.
  if (!data) throw new ApiError(res.status === 200 ? 404 : res.status, "not_available");
  throw new ApiError(res.status, String(data.error || "failed"));
}

/* ── Sample answers (all access only) ─────────────────────────────── */
const usd = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const when = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};
const first = (n?: string | null) => String(n || "").trim().split(/\s+/)[0] || "";

async function sampleFamily(q: string): Promise<AskReply> {
  const d: any = await fetchPortalHome();
  const coord = first(d?.team?.coordinator?.name) || COORDINATOR_NAME;
  const t = q.toLowerCase();
  const done = d?.journey?.doneCount, total = d?.journey?.total;
  if (/meet|when|call|session|calendar|appointment/.test(t)) {
    const m = (d?.meetings || [])[0];
    return { person: coord, answer: m ? `Your next meeting is ${m.title}, ${when(m.startTime)}${m.host ? ` with ${m.host}` : ""}. You can join it or add it to your calendar from the Meetings tab.` : `Nothing is on the calendar right now. You can book a time from the Meetings tab whenever you are ready.` };
  }
  if (/debt|owe|card|rate|interest/.test(t) && d?.debtNumbers) {
    const n = d.debtNumbers;
    return { person: first(d.debtExpertName) || coord, answer: `You owe ${usd(n.total)} today. When you started it was ${usd(n.atAssessment)}, so that is ${usd(n.atAssessment - n.total)} already gone. ${d.debtExpertName || "Your debt expert"} is the one to ask about what comes next on the debt.` };
  }
  if (/budget|money|left|spend|month|afford|going/.test(t) && d?.cashFlow?.current) {
    const h = d.cashFlow.history || [];
    const c = d.cashFlow.current, p = h.length > 1 ? h[h.length - 2] : null;
    const line = c.net >= 0 ? `This month has ${usd(c.net)} left over after everything.` : `This month is ${usd(c.net)} short so far.`;
    const vs = p ? (c.net > p.net ? ` That is ${usd(c.net - p.net)} better than last month.` : ` Last month looked a little different, and that is normal.`) : "";
    return { person: first(d?.sessions?.budgeterName) || coord, answer: `${line}${vs} ${d?.sessions?.budgeterName ? `${first(d.sessions.budgeterName)} goes over the details with you at your next session.` : ""}`.trim() };
  }
  if (/who|talk|team|contact|person|reach|help/.test(t)) {
    const names = (d?.team?.members || []).map((m: any) => `${m.name} (${String(m.role || "").toLowerCase()})`).join(", ");
    return { person: coord, answer: `Your team is ${names}. For anything at all, ${coord} is one message away.` };
  }
  if (/homework|to.?do|task|list/.test(t)) {
    const open = (d?.homework || []).filter((h: any) => !h.done);
    return { person: coord, answer: open.length ? `There ${open.length === 1 ? "is one thing" : `are ${open.length} things`} on your list. A good one to start with: ${open[0].title || open[0].label}. One at a time is plenty.` : `Your list is clear right now. Nice work.` };
  }
  if (/next|first|step|do|start|today|week|now/.test(t) && d?.nextStep) {
    return { person: coord, answer: `${done != null && total ? `You have ${done} of ${total} steps behind you. ` : ""}The one thing right now: ${d.nextStep.title}. ${d.nextStep.body || ""}`.trim() };
  }
  return { person: coord, answer: `In this sample I can answer about your next step, your meetings, this month's budget, your debt and your team. On a real family's page I answer from everything on their own screens. For anything else, ${coord} is glad to help.` };
}

async function sampleKdh(q: string): Promise<AskReply> {
  const d = await fetchKdhHome();
  const expert = d.expert?.firstName || "your debt expert";
  const s = d.sessions[0];
  const t = q.toLowerCase();
  if (/book|call|meet|when|next call|session/.test(t)) {
    const slot = d.booking.slots?.[0];
    return { person: expert, answer: d.booking.open ? `Booking is open for your follow-up with ${expert}${slot ? `. The next open time is ${slot}` : ""}. The Book button is on your Homework tab.` : `The booking link has closed for now. Message ${expert} on WhatsApp and a new time gets set.` };
  }
  if (/debt|owe|rate|interest|picture|card/.test(t) && d.debt) {
    const n = d.debt;
    const parts = [n.total != null ? `You owe ${usd(n.total)} in all` : "", n.aprPct != null ? `at about ${n.aprPct}%` : "", n.goalPct != null ? `and the rate to aim for is ${n.goalPct}%` : ""].filter(Boolean).join(" ");
    return { person: expert, answer: `${parts || "Your debt picture is on your Homework tab"}. Looking straight at the number is the hardest part, and you have done that. ${expert} can walk you through each piece.` };
  }
  if (/who|ask|talk|contact|reach|help/.test(t)) {
    return { person: expert, answer: `${d.expert?.name || "Your debt expert"} is your person for homework and for the plan. The WhatsApp button below goes straight to ${expert}.` };
  }
  if (s) {
    const open = s.steps.filter((x) => !x.done);
    return { person: expert, answer: open.length ? `You have ${s.doneCount} of ${s.total} done from your last call. A good one to start with: ${open[0].title}. One step is enough for today.` : `Everything from your last call is done. The next move is booking your follow-up with ${expert}.` };
  }
  return { person: expert, answer: `Your homework shows up here after each call with ${expert}. Until then, ${expert} is glad to hear from you.` };
}
