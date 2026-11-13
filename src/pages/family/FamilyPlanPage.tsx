import "@/theme/orchard-fam-plan.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, type RefresherEventDetail } from "@ionic/react";
import { TalkFoot } from "@/components/orchard/family/TalkFoot";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, CaretDown, Check, VideoCamera } from "@phosphor-icons/react";
import { fetchPortalHome, fetchSuccessPlan, signSuccessPlan } from "@/lib/portalApi";
import { ApiError } from "@/lib/mobileApi";
import { money } from "@/lib/format";
import { useUI } from "@/lib/ui";
import { PlantArt } from "@/components/gv";
import { DateTile, Face, FamHead, OBtn, Panel, SectionHead, SoftError, Loading, type Tone } from "@/components/orchard/family/FamKit";
import { PlanPath } from "@/components/orchard/family/PlanPath";

/**
 * The family's success plan, built for a tired mind (Shalom 2026-11-11:
 * "i see this and get daunted and shut off. understand how adhd people
 * think and cater to it"). So the page shows ONE thing at a time:
 *
 *   1. a picture: a path up a hill, one stop per step, a pin on the step
 *      they are on (components/orchard/family/PlanPath.tsx);
 *   2. the "Now" card: that one step, who it is with, and one small thing
 *      to do next, with the rest of its check-offs under it;
 *   3. every other step as a single row that opens on tap;
 *   4. meetings and signatures behind "More about your plan" (the sign
 *      card stays out in the open while a signature is still needed).
 *
 * The words name progress first and never blame: no "overdue", no dates
 * that already passed shown as deadlines. Content is the same the web
 * portal's PlanJourney renders (GET /api/portal/success-plan); nothing is
 * invented. The debt step also shows the family's own debt numbers, from
 * the same place the Home debt card reads them (GET /api/portal/home).
 *
 * Check-offs (Leivi 2026-11-11) are kept on this phone for now; the team
 * does not see them until the CRM stores them. A step is "behind you"
 * once every item in it is ticked; a step with no list gets one tick of
 * its own. Styles: theme/orchard-fam-plan.css (.opl-*).
 */

type Raw = Record<string, any>;

const AREA_TINT: Record<string, Tone> = {
  cpa: "sky", accountant: "sky", financial_advisor: "sky", budgeting: "butter", debt: "peach",
  therapy: "lilac", exec_coaching: "lilac", business_coaching: "lilac", fundraising_coaching: "lilac",
  job_funnel: "butter", resume_writing: "butter", medical_insurance: "rose", case_manager: "mint",
};
const AREA_ROLE: Record<string, string> = {
  case_manager: "case manager", cpa: "CPA", accountant: "accountant", financial_advisor: "financial advisor",
  budgeting: "budgeter", debt: "debt expert", therapy: "coaching", exec_coaching: "executive coach",
  business_coaching: "business coach", fundraising_coaching: "fundraising coach", job_funnel: "career",
  resume_writing: "résumé", medical_insurance: "insurance",
};
const dd = (s: unknown) => String(s || "").replace(/\s*—\s*/g, ", ");
const firstName = (n?: string | null) => String(n || "").trim().split(/\s+/)[0] || "";
const fmtShort = (d?: string | null) => {
  if (!d) return "";
  const t = new Date(`${String(d).slice(0, 10)}T12:00:00`);
  return Number.isNaN(t.getTime()) ? String(d) : t.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const fmtLong = (d?: string | null) => {
  if (!d) return "";
  // Date-only strings are calendar dates, not UTC midnight (else "June 1" reads May 31).
  const t = /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? new Date(`${d}T12:00:00`) : new Date(d);
  return Number.isNaN(t.getTime()) ? String(d) : t.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
/** Only dates still ahead are shown as "by": a date that already passed is
 *  never held up to the family as a deadline they missed. */
const ahead = (d?: string | null) => {
  if (!d) return false;
  const t = new Date(`${String(d).slice(0, 10)}T23:59:59`);
  return !Number.isNaN(t.getTime()) && t.getTime() >= Date.now();
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

interface Tick { id: string; text: string; whole?: boolean }
/** What can be ticked in a step: its own items, or (a step with no list)
 *  the step itself. Ids are the ones the first version saved (`n:text`). */
function ticksOf(it: Raw, n: number): Tick[] {
  const tasks: unknown[] = Array.isArray(it.tasks) ? it.tasks : [];
  const list = tasks.map((t) => (typeof t === "string" ? t : String((t as Raw)?.text ?? (t as Raw)?.label ?? ""))).filter(Boolean).map((text) => ({ id: `${n}:${text}`, text }));
  return list.length ? list : [{ id: `${n}:__step`, text: "", whole: true }];
}

export function FamilyPlanPage() {
  const qc = useQueryClient();
  const { showToast } = useUI();
  const q = useQuery({ queryKey: ["successPlan"], queryFn: fetchSuccessPlan, staleTime: 30_000, retry: 1 });
  // The debt step shows the family's own numbers: the same query the Home tab keeps.
  const homeQ = useQuery({ queryKey: ["portalHome"], queryFn: fetchPortalHome, staleTime: 60_000, retry: 1 });
  const refresh = async (e: CustomEvent<RefresherEventDetail>) => { await Promise.all([qc.invalidateQueries({ queryKey: ["successPlan"] }), qc.invalidateQueries({ queryKey: ["portalHome"] })]); e.detail.complete(); };

  // Check-offs (Leivi 2026-11-11): each item in a step can be ticked. Kept on
  // this phone for now; the team does not see them until the CRM stores them.
  const [ticks, setTicks] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem("ck_plan_ticks") || "{}") || {}; } catch { return {}; } });
  const tick = (id: string) => setTicks((cur) => {
    const next = { ...cur }; if (next[id]) delete next[id]; else next[id] = true;
    try { localStorage.setItem("ck_plan_ticks", JSON.stringify(next)); } catch { /* private mode */ }
    return next;
  });

  const plan: Raw | null = q.data?.plan ?? null;
  const meetings: Raw[] = Array.isArray(q.data?.meetings) ? q.data!.meetings : [];
  const items: Raw[] = ((plan?.content?.phases as Raw[] | undefined) || []).flatMap((p) => (p.items as Raw[]) || []);
  const target = plan?.targetDate || plan?.content?.targetDate || null;
  const months = target ? Math.max(0, Math.round((new Date(`${String(target).slice(0, 10)}T12:00:00`).getTime() - Date.now()) / (30.4 * 86400000))) : null;
  const signed = plan?.status === "signed";
  const signers: Raw[] = Array.isArray(plan?.signers) ? plan!.signers : [];
  const required = Number(plan?.required || 2);
  const signOpen = !!plan && !signed && !!plan.signingAllowed && signers.filter((x) => x.signedAt || x.name).length < required;
  const canBook = signed || !!plan?.signingAllowed;

  // Where the family is: the first step that still has something unticked.
  const lists = items.map((it, n) => ticksOf(it, n));
  const doneOf = (n: number) => lists[n].filter((t) => ticks[t.id]).length;
  const stepDone = items.map((_, n) => doneOf(n) === lists[n].length);
  const firstOpen = stepDone.indexOf(false);
  const current = firstOpen === -1 ? null : firstOpen;
  const behind = stepDone.filter(Boolean).length;

  const hn: Raw = (homeQ.data as Raw) || {};
  const debt: Raw | null = hn.debtNumbers && typeof hn.debtNumbers.total === "number" ? hn.debtNumbers : null;

  const [open, setOpen] = useState<number | null>(null);   // the one other step that is open
  const [nowMore, setNowMore] = useState(false);            // "More on this step" in the Now card
  const [more, setMore] = useState(false);                  // "More about your plan"
  // A step just got finished: say so kindly, and fold what was open.
  const was = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (!items.length) return;
    const prev = was.current;
    was.current = current;
    if (prev === undefined || prev === null || prev === current) return;
    if (current === null || current > prev) { showToast(`Step ${prev + 1} is behind you.`); setNowMore(false); setOpen(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, items.length]);

  const status = plan ? (signed ? { t: "Signed", tone: "mint" } : plan.signingAllowed ? { t: "Ready to sign", tone: "lime" } : { t: "In review", tone: "butter" }) : null;

  /* the pieces a step is made of */
  const roleOf = (it: Raw) => AREA_ROLE[String(it.area)] || String(it.area || "").replace(/_/g, " ");
  const toneOf = (it: Raw): Tone => AREA_TINT[String(it.area)] || "sky";
  const titleOf = (it: Raw) => String(it.title || roleOf(it).replace(/^./, (c) => c.toUpperCase()) || "This step");
  const who = (it: Raw) => [it.expertName, it.expertName ? roleOf(it) : null].filter(Boolean).join(" · ");

  const taskRow = (t: Tick, k: number) => {
    const on = !!ticks[t.id];
    return (
      <button type="button" key={`${t.id}#${k}`} className={`ocf2-row ocf2-plantask${on ? " is-done" : ""}`} role="checkbox" aria-checked={on} onClick={() => tick(t.id)}>
        <span className="ocf2-plantick" aria-hidden>{on && <Check size={16} weight="bold" />}</span>
        <span className="ocf2-row-t"><b>{t.whole ? "This step is done" : t.text}</b></span>
      </button>
    );
  };

  const debtBlock = (it: Raw): ReactNode => {
    if (String(it.area) !== "debt" || !debt) return null;
    const num = (v: unknown) => (typeof v === "number" ? v : null);
    const start = num(debt.atAssessment), now = num(debt.total) as number;
    const down = start != null && start > now ? start - now : 0;
    const cells = [
      { k: "Each month", now: num(debt.monthlyPayments), was: num(debt.monthlyAtAssessment), f: (v: number) => money(v) },
      { k: "Card rate", now: num(debt.aprPct), was: num(debt.aprAtAssessment), f: (v: number) => `${v}%` },
    ].filter((c) => c.now != null);
    return (
      <div className="opl-debt" role="group" aria-label="Your debt numbers">
        <div className="opl-debt-top">
          <div>
            <span className="opl-k">You owe now</span>
            <span className="opl-debt-big">{money(now)}</span>
            {start != null && start !== now && <span className="opl-was">Started at {money(start)}</span>}
          </div>
          {down > 0 && <span className="opl-down">Down {money(down)}</span>}
        </div>
        {cells.length > 0 && (
          <div className="opl-debt-grid" style={cells.length === 1 ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined}>
            {cells.map((c) => (
              <div key={c.k}>
                <span className="opl-k">{c.k}</span>
                <b>{c.f(c.now as number)}</b>
                {c.was != null && c.was !== c.now && <span className="opl-was">Started at {c.f(c.was)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /** The quieter facts of a step: why, when, sessions. */
  const details = (it: Raw): ReactNode[] => {
    const sessions: unknown[] = Array.isArray(it.sessions) ? it.sessions : [];
    const chips = [
      ahead(it.meet?.firstCallBy) ? <span key="c" className="ocf2-chip ocf2-t-sky">First call by {fmtShort(it.meet.firstCallBy)}</span> : null,
      ahead(it.meet?.firstSessionBy) ? <span key="s" className="ocf2-chip">Working session by {fmtShort(it.meet.firstSessionBy)}</span> : null,
      !it.meet && ahead(it.startDate) ? <span key="p" className="ocf2-chip ocf2-t-sky">Starts around {fmtShort(it.startDate)}</span> : null,
    ].filter(Boolean);
    return [
      it.purpose ? <p key="why" className="opl-why">{dd(it.purpose)}</p> : null,
      it.expertIntro ? <p key="intro" className="opl-why">{dd(it.expertIntro)}</p> : null,
      chips.length ? <div key="chips" className="ocf2-chips">{chips}</div> : null,
      sessions.length ? (
        <div key="sess" className="ocf2-chips" aria-label="Sessions">
          {sessions.map((x, k) => <span key={k} className="ocf2-chip"><b style={{ marginRight: 2, color: "var(--oc-forest-2, #276449)" }}>{k + 1}</b>{fmtShort(String(x))}</span>)}
        </div>
      ) : null,
    ].filter(Boolean) as ReactNode[];
  };
  const note = (it: Raw) => (it.notes ? <p className="opl-note">{dd(it.notes)}</p> : null);
  const bookBtn = (it: Raw) => (it.bookingUrl && canBook
    ? <OBtn kind="ghost" sm href={String(it.bookingUrl)} style={{ minHeight: 44 }}><CalendarBlank size={16} weight="bold" /> Book with {firstName(it.expertName) || "them"}</OBtn>
    : null);

  const nowIt = current != null ? items[current] : null;
  const nowList = current != null ? lists[current] : [];
  const nowNext = nowList.find((t) => !ticks[t.id]) || null;
  const nowRest = nowList.filter((t) => t !== nowNext);
  const nowDone = current != null ? doneOf(current) : 0;
  const nowDetails = nowIt ? [...details(nowIt), ...(nowIt.notes ? [<p key="note" className="opl-note">{dd(nowIt.notes)}</p>] : [])] : [];
  const rest = items.map((_, n) => n).filter((n) => n !== current);

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div className="ocf2 ocf2-page opl">
          <FamHead title="Your plan"
            sub={q.isLoading ? "Opening your plan." : !plan ? "Being written with your team." : signed ? `Signed ${fmtLong(plan.signedAt)}.` : target ? `Working toward ${fmtLong(String(target).slice(0, 10))}.` : "Read it through, then sign it together."} />

          {status && <div style={{ marginTop: -6 }}><span className={`ocf2-chip ocf2-t-${status.tone}`}>{status.t}</span></div>}

          {q.isLoading && <Loading />}
          {q.isError && !q.data && <SoftError onRetry={() => q.refetch()}>We couldn't open your plan just now.</SoftError>}

          {q.data && !plan && (
            <Panel tone="mint" style={{ alignItems: "center", textAlign: "center" }}>
              <PlantArt width={120} />
              <h2 className="ocf2-next-t" style={{ fontSize: 19, margin: 0 }}>Your plan is being written</h2>
              <p className="ocf2-p" style={{ color: "#276449" }}>Your case manager builds it with your team after the intake call, then goes over it with you.</p>
            </Panel>
          )}

          {plan && items.length === 0 && (
            <div className="opl-calm is-quiet">
              <h2>Your steps are on the way.</h2>
              <p>Your team adds them here as soon as they are written. Nothing for you to do yet.</p>
            </div>
          )}

          {/* ── the path: where you are, at a glance ── */}
          {items.length > 0 && (
            <section className="opl-path" role="img" aria-label={current == null ? `All ${items.length} steps are checked off.` : `You are on step ${current + 1} of ${items.length}. ${plural(behind, "step", "steps")} behind you.`}>
              {months != null && current != null && <span className="opl-path-chip">{months > 0 ? `About ${plural(months, "month", "months")} to go` : "Almost there"}</span>}
              <PlanPath done={stepDone} current={current} />
              <div className="opl-path-row">
                <div>
                  <h2 className="opl-path-h">{current == null ? "You walked the whole path." : behind > 0 ? `${plural(behind, "step", "steps")} behind you.` : "Your path starts here."}</h2>
                  <p className="opl-path-s">{current == null ? "That took real work." : behind > 0 ? `Now on step ${current + 1} of ${items.length}.` : `Step 1 of ${items.length}. One small thing at a time.`}</p>
                </div>
              </div>
            </section>
          )}

          {/* ── the one step in focus ── */}
          {nowIt && current != null && (
            <section className="opl-now" key={current} aria-label={`Now: step ${current + 1}`}>
              <span className="opl-now-k">Now · step {current + 1} of {items.length}</span>
              <h2 className="opl-now-t">{titleOf(nowIt)}</h2>
              {nowIt.expertName && <div className="opl-who"><Face name={String(nowIt.expertName)} size={34} tone={toneOf(nowIt)} /><span>{who(nowIt)}</span></div>}
              {debtBlock(nowIt)}
              {nowNext && (
                <button type="button" key={nowNext.id} className="opl-next" role="checkbox" aria-checked={false} onClick={() => tick(nowNext.id)}>
                  <span className="opl-next-box" aria-hidden />
                  <span className="opl-next-t">
                    <small>{nowNext.whole ? "When you are ready" : "One small thing next"}</small>
                    <b>{nowNext.whole ? "Tap here when this step is done" : nowNext.text}</b>
                  </span>
                </button>
              )}
              {nowRest.length > 0 && (
                <div className="opl-also">
                  <span className="opl-k">Also in this step</span>
                  <div className="ocf2-rows">{nowRest.map(taskRow)}</div>
                </div>
              )}
              {nowList.length > 1 && (
                <div className="opl-prog">
                  <i aria-hidden><i style={{ width: `${Math.round((nowDone / nowList.length) * 100)}%` }} /></i>
                  <span>{nowDone > 0 ? `${nowDone} of ${nowList.length} checked off` : `${nowList.length} small things, one at a time`}</span>
                </div>
              )}
              {(bookBtn(nowIt) || nowDetails.length > 0) && (
                <div className="opl-foot">
                  {bookBtn(nowIt)}
                  {nowDetails.length > 0 && (
                    <button type="button" className="opl-morebtn" aria-expanded={nowMore} aria-controls="opl-now-more" onClick={() => setNowMore((v) => !v)}>
                      {nowMore ? "Less" : "More on this step"} <CaretDown size={15} weight="bold" aria-hidden />
                    </button>
                  )}
                </div>
              )}
              {nowDetails.length > 0 && (
                <div id="opl-now-more" className={`opl-fold${nowMore ? " is-open" : ""}`}><div><div className="opl-body">{nowDetails}</div></div></div>
              )}
            </section>
          )}

          {items.length > 0 && current == null && (
            <div className="opl-calm">
              <h2>Every step is checked off.</h2>
              <p>Your team is still here whenever you need them.</p>
            </div>
          )}

          {/* ── every other step: one calm row each ── */}
          {rest.length > 0 && <SectionHead>{current == null ? "Your steps" : "The rest of your plan"}</SectionHead>}
          {rest.length > 0 && (
            <div className="opl-list">
              {rest.map((n) => {
                const it = items[n];
                const list = lists[n];
                const isOpen = open === n;
                const count = stepDone[n] ? "Checked off" : list[0]?.whole ? null : doneOf(n) > 0 ? `${doneOf(n)} of ${list.length} done` : plural(list.length, "small thing", "small things");
                const sub = [it.expertName, count].filter(Boolean).join(" · ");
                const body = details(it);
                return (
                  <div key={n} className={`opl-item${stepDone[n] ? " is-done" : ""}`}>
                    <button type="button" className="opl-rowbtn" aria-expanded={isOpen} aria-controls={`opl-step-${n}`} onClick={() => setOpen(isOpen ? null : n)}>
                      <span className={`opl-num ${stepDone[n] ? "is-done" : `ocf2-t-${toneOf(it)}`}`} aria-hidden>{stepDone[n] ? <Check size={18} weight="bold" /> : n + 1}</span>
                      <span className="opl-row-t">
                        <b>{titleOf(it)}</b>
                        {sub && <small>{sub}</small>}
                      </span>
                      <CaretDown size={18} weight="bold" aria-hidden />
                    </button>
                    <div id={`opl-step-${n}`} className={`opl-fold${isOpen ? " is-open" : ""}`}>
                      <div>
                        <div className="opl-body">
                          {body}
                          {debtBlock(it)}
                          <div className="ocf2-rows">{list.map(taskRow)}</div>
                          {note(it)}
                          {bookBtn(it) && <div>{bookBtn(it)}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* A signature that is still needed stays out in the open. */}
          {plan && signOpen && <SignCard plan={plan} signers={signers} required={required} />}

          {/* ── meetings and signatures, tucked away ── */}
          {plan && (meetings.length > 0 || !signOpen) && (
            <div>
              <button type="button" className="opl-morerow" aria-expanded={more} aria-controls="opl-more" onClick={() => setMore((v) => !v)}>
                <span>
                  <b>More about your plan</b>
                  <small>{[meetings.length > 0 ? "meetings" : null, !signOpen ? "signatures" : null].filter(Boolean).join(" and ").replace(/^./, (c) => c.toUpperCase())}</small>
                </span>
                <CaretDown size={18} weight="bold" aria-hidden />
              </button>
              <div id="opl-more" className={`opl-fold${more ? " is-open" : ""}`}>
                <div>
                  <div className="opl-more-in">
                    {meetings.length > 0 && (
                      <>
                        <SectionHead>Your meetings</SectionHead>
                        <Panel tone="lilac" style={{ gap: 8, padding: 10 }}>
                          {meetings.slice(0, 5).map((m, k) => (
                            <div key={k} className="ocf2-meet ocf2-t-white" style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 10 }}>
                              <DateTile iso={m.startTime} tone={k === 0 ? "lime" : "lilac"} />
                              <span className="ocf2-row-t">
                                <b style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title || "Meeting"}</b>
                                <small>{[m.startTime ? `${fmtDay(m.startTime)} · ${fmtTime(m.startTime)}` : null, m.host ? `with ${m.host}` : null].filter(Boolean).join(" · ")}</small>
                              </span>
                              {m.joinUrl && <OBtn kind="ghost" sm href={m.joinUrl} ariaLabel={`Join ${m.title || "meeting"}`} style={{ flex: "none", padding: "0 12px", minHeight: 44 }}><VideoCamera size={15} weight="bold" /> Join</OBtn>}
                            </div>
                          ))}
                        </Panel>
                      </>
                    )}
                    {!signOpen && <SignCard plan={plan} signers={signers} required={required} />}
                  </div>
                </div>
              </div>
            </div>
          )}
          <TalkFoot />
        </div>
      </IonContent>
    </IonPage>
  );
}

function SignCard({ plan, signers, required }: { plan: Raw; signers: Raw[]; required: number }) {
  const qc = useQueryClient();
  const { showToast } = useUI();
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const signed = plan.status === "signed";
  const doneCount = signers.filter((s) => s.signedAt || s.name).length;

  const sign = async () => {
    if (!name.trim() || !agreed || busy) return;
    setBusy(true); setErr(null);
    try {
      await signSuccessPlan(name.trim());
      showToast("Signed. Thank you.");
      setName(""); setAgreed(false);
      await qc.invalidateQueries({ queryKey: ["successPlan"] });
      await qc.invalidateQueries({ queryKey: ["portalHome"] });
    } catch (e) {
      const ae = e as ApiError;
      setErr(ae?.message === "consent_required" ? "Tick the box to confirm you read the plan." : ae?.status === 403 ? "Signing is not open yet. Your case manager opens it after your meeting." : "Could not save the signature. Try again in a moment.");
    } finally { setBusy(false); }
  };

  const open = !signed && plan.signingAllowed && doneCount < required;
  return (
    <>
      <SectionHead aux={!signed && plan.signingAllowed ? `${doneCount} of ${required} signed` : undefined}>{signed ? "Signed" : "Sign the plan"}</SectionHead>
      <Panel tone={open ? "lime" : signed ? "mint" : "white"}>
        {signers.length > 0 && (
          <div className="ocf2-rows">
            {signers.map((x, k) => {
              const did = !!(x.signedAt || x.name);
              return (
                <div key={k} className="ocf2-row" style={{ borderColor: "rgba(22,33,28,.08)" }}>
                  <span className={`ocf2-tick${did ? " is-done" : ""}`} style={did ? undefined : { background: "rgba(255,255,255,.7)", boxShadow: "inset 0 0 0 1.5px rgba(22,33,28,.15)" }}>{did && <Check size={14} weight="bold" />}</span>
                  <span className="ocf2-row-t"><b>{x.name || `Signer ${x.n ?? k + 1}`}</b>{x.signedAt && <small>Signed {fmtLong(x.signedAt)}</small>}</span>
                </div>
              );
            })}
          </div>
        )}
        {open && (
          <>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-.02em", color: "#1D2B12" }}>{doneCount === 0 ? "First signature" : "Second signature"}</h3>
            <input className="ocf2-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full name" autoComplete="name" aria-label="Your full name" />
            {/* The whole 48px row is the control: a tap anywhere on the label toggles the box. */}
            <label style={{ display: "flex", gap: 12, alignItems: "center", minHeight: 48, padding: "2px 2px", fontSize: 13.5, lineHeight: 1.5, color: "#1D2B12", fontWeight: 600, cursor: "pointer", userSelect: "none", WebkitTapHighlightColor: "transparent" }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 24, height: 24, margin: 0, flex: "none", accentColor: "#2F7556", cursor: "pointer" }} />
              <span style={{ minWidth: 0 }}>I read the plan, and I agree to show up for the steps my family chose.</span>
            </label>
            {err && <div className="ocf2-gentle">{err}</div>}
            <OBtn block disabled={!name.trim() || !agreed || busy} onClick={() => void sign()} style={{ minHeight: 54 }}>{busy ? "Signing…" : "Sign the plan"}</OBtn>
          </>
        )}
        {!signed && !plan.signingAllowed && (
          <div className="ocf2-note ocf2-t-butter"><div><b>Signing opens after your meeting.</b> Go over the plan with your case manager first. The sign button appears here right after.</div></div>
        )}
        {signed && signers.length === 0 && <p className="ocf2-p">Signed {fmtLong(plan.signedAt)}.</p>}
      </Panel>
    </>
  );
}
