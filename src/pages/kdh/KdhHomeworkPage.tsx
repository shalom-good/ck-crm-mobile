import { Oil } from "@/components/orchard/Illos";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CalendarPlus, CaretRight, Check, WhatsappLogo } from "@phosphor-icons/react";
import { setKdhStep, type KdhDebt, type KdhHome, type KdhSession } from "@/lib/kdhApi";
import { CountUp } from "@/components/gv";
import { openExternal } from "@/lib/external";
import { BackButton } from "@/components/BackButton";
import { Face, Loading, OBtn, Panel, SectionHead, SoftError } from "@/components/orchard/family/FamKit";
import { PlusIllo } from "@/components/kdh/PlusIllos";
import { KDH_KEY, KDH_PLUS_KEY, KdhBrand, fmtDay, useKdhHome, useKdhPlus } from "./kdhShared";

/**
 * ORCHARD (2026-11-05): a KDH client's homework from one call. Latest
 * call at /kdh/homework, an older one at /kdh/session/:id. Steps tick off
 * here (the expert sees them and hears when all are done); each link goes
 * through the CRM's tracked redirect; the follow-up books on the same
 * page the homework email uses, inside its 7-day window, else WhatsApp.
 */
export function KdhHomeworkPage() {
  const { id } = useParams<{ id?: string }>();
  const router = useIonRouter();
  const qc = useQueryClient();
  const q = useKdhHome();
  const d = q.data;
  const plus = useKdhPlus().data;
  const s: KdhSession | undefined = id ? d?.sessions.find((x) => x.id === id) : d?.sessions[0];
  const isLatest = !!s && d?.sessions[0]?.id === s.id;
  const expert = d?.expert || null;
  const first = expert?.firstName || "your expert";

  const refresh = async (e: CustomEvent<RefresherEventDetail>) => { await Promise.all([qc.invalidateQueries({ queryKey: KDH_KEY }), qc.invalidateQueries({ queryKey: KDH_PLUS_KEY })]); e.detail.complete(); };

  const tick = async (i: number) => {
    if (!s) return;
    const done = !s.steps[i].done;
    const patch = (home: KdhHome | undefined, val: boolean): KdhHome | undefined => home && ({
      ...home,
      sessions: home.sessions.map((x) => x.id !== s.id ? x : (() => {
        const steps = x.steps.map((st, k) => (k === i ? { ...st, done: val, doneAt: val ? new Date().toISOString() : null } : st));
        return { ...x, steps, doneCount: steps.filter((st) => st.done).length };
      })()),
    });
    qc.setQueryData<KdhHome>(KDH_KEY, (h) => patch(h, done));
    try { await setKdhStep(s.id, i, done); }
    catch { qc.setQueryData<KdhHome>(KDH_KEY, (h) => patch(h, !done)); }
  };

  const whatsapp = expert?.whatsapp || null;
  const open = (url: string) => { void openExternal(url); };

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div className="ocf2 ocf2-page">
          <div className="ocf2-top">
            {id ? <BackButton href="/kdh/sessions" /> : <KdhBrand sub={s ? `From your call on ${fmtDay(s.date)}` : "Your homework"} />}
            {whatsapp && (
              <button type="button" className="ocf2-round" aria-label={`WhatsApp ${first}`} onClick={() => open(whatsapp)}>
                <WhatsappLogo size={22} weight="bold" color="#2F7556" />
              </button>
            )}
          </div>

          {q.isLoading ? <Loading /> : q.isError ? (
            <SoftError onRetry={() => void q.refetch()}>We could not load your homework. Check your connection and try again.</SoftError>
          ) : !s ? (
            <Panel tone="mint" className="oil-stack">
              <Oil name="cup" w={132} />
              <h1 className="ocf2-title" style={{ fontSize: 24 }}>No homework yet</h1>
              <p className="ocf2-p">Take a breath. After your next call, your steps show up here.</p>
            </Panel>
          ) : (<>
            <div>
              <h1 className="ocf2-title">{id && !isLatest ? fmtDay(s.date) : "Your homework"}</h1>
              <p className="ocf2-sub">{id && !isLatest ? "Homework from this call" : s.total > 0 && s.doneCount === s.total ? `Every step is done. ${expert ? `${first} can see it,` : "We can see it,"} and your next call starts from here.` : `These are the steps you and ${first} agreed on. Take them one at a time and tick each one off when it is done.`}</p>
            </div>

            {isLatest && d?.debt && (d.debt.total != null || d.debt.aprPct != null) && <DebtPicture debt={d.debt} first={first} />}

            <Panel tone="mint" className="okh-progress gv-rise">
              <div className="okh-progress-top">
                <span>Done so far</span>
                {s.doneCount === s.total && s.total > 0 ? <span>All done</span> : null}
              </div>
              <div className="okh-count"><b key={s.doneCount} className="okn-pop">{s.doneCount}</b><span>of {s.total} step{s.total === 1 ? "" : "s"}</span></div>
              <div className="okh-track" aria-hidden>
                {s.steps.map((st, k) => <i key={k} className={st.done ? "done" : ""} style={{ "--k": k } as React.CSSProperties} />)}
              </div>
            </Panel>

            {(s.opener || expert) && (
              <Panel className="okh-note gv-rise" style={{ "--i": 1 } as React.CSSProperties}>
                <Face name={expert?.name || "KDH"} tone="butter" />
                <div className="okh-note-body">
                  <b>{expert ? `${first}, your debt expert` : "Your debt expert"}</b>
                  <p className="ocf2-p">{s.opener || "Here are your next steps."}</p>
                </div>
              </Panel>
            )}

            <SectionHead>Steps</SectionHead>
            {s.steps.map((st, i) => (
              <Panel key={i} className={`okh-step gv-rise${st.done ? " is-done" : ""}`} style={{ "--i": i + 2 } as React.CSSProperties}>
                <button
                  type="button"
                  className={`okh-tick${st.done ? " is-on" : ""}`}
                  aria-pressed={st.done}
                  aria-label={st.done ? `Mark "${st.title}" not done` : `Mark "${st.title}" done`}
                  onClick={() => void tick(i)}
                >
                  {st.done ? <Check size={17} weight="bold" className="okn-pop" /> : null}
                </button>
                <div className="okh-step-body">
                  <b>{st.title}</b>
                  {st.text ? <p className="ocf2-p">{st.text}</p> : null}
                  {st.done && st.doneAt ? <span className="okh-donepill">Done {fmtDay(st.doneAt)}</span> : null}
                  {!st.done && (st.link || st.calendars.length > 0 || (st.book && d?.booking.open && isLatest)) && (
                    <div className="okh-links">
                      {st.link && <OBtn kind="lime" sm onClick={() => open(st.link!.href)}>{st.link.label}<ArrowUpRight size={15} weight="bold" /></OBtn>}
                      {st.calendars.map((c, j) => <OBtn key={j} kind="lime" sm onClick={() => open(c.href)}>Book with {c.name}</OBtn>)}
                      {st.book && d?.booking.open && isLatest && d.booking.href && <OBtn kind="lime" sm onClick={() => open(d.booking.href!)}>Pick a time with {first}</OBtn>}
                    </div>
                  )}
                </div>
              </Panel>
            ))}

            <p className="ocf2-p okh-after">I know this is a lot, but we're here with you. Please reach out with any questions.</p>

            {isLatest && (
              <Panel tone="forest" className="okh-book oil-host">
                <Oil name="call" w={84} corner />
                <span className="okh-book-eb">Next call</span>
                <b className="okh-book-h">{d?.booking.open ? `Pick a time with ${first}` : `Talk to ${first}`}</b>
                <p className="ocf2-p">{s.booking || (d?.booking.open ? "Book a 20-minute follow-up to go over where you are." : "Message on WhatsApp and we'll find a time.")}</p>
                {d?.booking.open && (d.booking.slots?.length ?? 0) > 0 && (
                  <div className="okh-slots">
                    <span>{first}'s next open times</span>
                    <ul>{d.booking.slots!.map((t) => <li key={t}>{t}</li>)}</ul>
                  </div>
                )}
                {d?.booking.open && d.booking.until && (
                  <p className="okh-until">This booking link is open until {new Date(d.booking.until).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}.</p>
                )}
                <div className="okh-links">
                  {d?.booking.open && d.booking.href && (
                    <OBtn kind="lime" onClick={() => open(d.booking.href!)}><CalendarPlus size={18} weight="bold" />Book my next call</OBtn>
                  )}
                  {whatsapp && (
                    <OBtn kind={d?.booking.open ? "light" : "lime"} onClick={() => open(whatsapp)}><WhatsappLogo size={18} weight="bold" />WhatsApp {first}</OBtn>
                  )}
                </div>
              </Panel>
            )}

            {isLatest && plus && (() => {
              const at = plus.steps.indexOf(plus.step as (typeof plus.steps)[number]);
              const line = plus.step === "done" ? "Your first budget call is booked."
                : plus.started && at >= 0 ? `Pick up where you left off: step ${at + 1} of ${plus.steps.length}`
                : "Add a budget and a budgeter to your debt plan.";
              return (
                <button type="button" className="ocf2-panel ocf2-t-mint okp-card gv-rise" onClick={() => router.push("/kdh/plus")}>
                  <PlusIllo name="path" size="xs" />
                  <span className="okp-card-t"><span className="okp-chip">KDH Plus</span><b>Your debt plan, now your budget</b><small>{line}</small></span>
                  <CaretRight size={18} weight="bold" className="okn-chev" />
                </button>
              );
            })()}

            {isLatest && (
              <button type="button" className="ocf2-panel ocf2-t-butter okn-go gv-rise" onClick={() => router.push("/kdh/next")}>
                <Oil name="signpost" w={72} />
                <span><b>What would you like to do next?</b><small>Three ways to keep going</small></span>
                <CaretRight size={18} weight="bold" className="okn-chev" />
              </button>
            )}

            {!isLatest && (
              <OBtn kind="light" block onClick={() => router.push("/kdh/homework", "back")}>See this week's homework</OBtn>
            )}
            <button type="button" className="ocf2-quiet" style={{ alignSelf: "center" }} onClick={() => router.push("/app-settings")}>Settings and feedback</button>
          </>)}
        </div>
      </IonContent>
    </IonPage>
  );
}

/* ── Where you stand: what you owe, the rate, and the rate to aim for
   (Shalom 2026-11-11: "you have xx debt. xx apr. the goal is to get to XX").
   Every figure is the client's own, from their file; one that is not on
   file is left off instead of guessed. ── */
const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const rate = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
function DebtPicture({ debt, first }: { debt: KdhDebt; first: string }) {
  const { total, card, aprPct, goalPct, goalFrom, monthly, goalMonthly, interestYear, goalInterestYear } = debt;
  return (
    <section className="okh-debt gv-rise" aria-label="Where you stand">
      <span className="okh-debt-eb">Where you stand</span>
      <div className="okh-debt-grid">
        {total != null && (
          <div className="okh-debt-cell">
            <small>You owe</small>
            <b className="tnum"><CountUp to={total} fmt={usd0} /></b>
            {card != null && <em>{usd0(card)} of it on cards</em>}
          </div>
        )}
        {aprPct != null && (
          <div className="okh-debt-cell">
            <small>Your rate</small>
            <b className="tnum">{rate(aprPct)}</b>
            <em>APR, on average</em>
          </div>
        )}
        {goalPct != null && (
          <div className="okh-debt-cell is-goal">
            <small>{goalFrom === "reached" ? "Now" : "The goal"}</small>
            <b className="tnum">{rate(goalPct)}</b>
            <em>{goalFrom === "reached" ? "You got there" : "What clients reach"}</em>
          </div>
        )}
      </div>
      {aprPct != null && goalPct != null && (
        <div className="okh-debt-bar" role="img" aria-label={`From ${rate(aprPct)} to ${rate(goalPct)}`}>
          <i style={{ width: "100%" }} /><i className="goal" style={{ width: `${Math.max(6, Math.min(100, (goalPct / aprPct) * 100))}%` }} />
        </div>
      )}
      {interestYear != null && (
        <p className="okh-debt-line">
          At {rate(aprPct!)}, your cards cost about <b>{usd0(interestYear)}</b> a year in interest.
          {goalInterestYear != null && goalPct != null ? <> At {rate(goalPct)}, about <b>{usd0(goalInterestYear)}</b>.</> : null}
        </p>
      )}
      {monthly != null && (
        <p className="okh-debt-line">
          You pay about <b>{usd0(monthly)}</b> a month toward debt.{goalMonthly != null ? <> The plan is <b>{usd0(goalMonthly)}</b>.</> : null}
        </p>
      )}
      <p className="okh-debt-fine">{goalFrom === "typical" ? `The goal is the average rate our clients reach. ${first} sets yours with you.` : "From your file. Tell us if a number looks wrong."}</p>
    </section>
  );
}
