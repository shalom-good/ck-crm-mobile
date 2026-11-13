import { HeroScene, Oil } from "@/components/orchard/Illos";
import { useMemo, useState, type ReactNode } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonActionSheet, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, ChatCircleText, Check, FileText, ArrowSquareOut, VideoCamera, Phone, WhatsappLogo, CalendarPlus } from "@phosphor-icons/react";
import { fetchPortalHome, setHomeworkDone, PORTAL_WEB_URL, type PortalHome } from "@/lib/portalApi";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { greetingWord } from "@/lib/quotes";
import { CountUp, CalendarArt, PlantArt } from "@/components/gv";
import { DateTile, FamBellO, FamBrand, Face, Hero, Loading, MiniBars, NextCard, OBtn, Panel, SectionHead, Stepper, toneFor } from "@/components/orchard/family/FamKit";
import FamSteps from "@/components/orchard/family/FamSteps";

/**
 * ORCHARD (2026-11-05): a mint hero with the name on a lime highlight,
 * ONE lime "up next" card, colour tiles, the journey stepper, light
 * money card (never coral), white panels below.
 *
 * The family's home: the client portal, in the app. Reads the SAME
 * payload the web portal renders (GET /api/portal/me, bearer token) and
 * keeps its rules: the interview gate first, focus mode until the plan
 * is signed, then the full picture (journey, sessions, meetings, team,
 * cash flow, debt, homework, documents). Every section hides itself when
 * its data is missing; nothing invents numbers.
 */

type Raw = Record<string, any>;

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const monthShort = (s: string) => {
  const d = /^\d{4}-\d{2}/.test(s) ? new Date(`${s.slice(0, 7)}-15T12:00:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? s.slice(0, 3) : d.toLocaleDateString("en-US", { month: "short" });
};
const firstWord = (s?: string | null) => (s || "").trim().split(/\s+/)[0] || "";

export function FamilyHomePage() {
  const router = useIonRouter();
  const qc = useQueryClient();
  const { family, signOut } = useAuth();
  const [presentSheet] = useIonActionSheet();

  const q = useQuery({ queryKey: ["portalHome"], queryFn: fetchPortalHome, staleTime: 60_000, retry: 1 });
  const d: PortalHome | undefined = q.data;

  const refresh = async (e: CustomEvent<RefresherEventDetail>) => {
    await qc.invalidateQueries({ queryKey: ["portalHome"] });
    e.detail.complete();
  };

  const name = d?.firstNames || firstWord(d?.name) || firstWord(family?.name) || "there";
  const fullName = d?.name || family?.name || "Your family";

  // Where the family is on their plan, for the hero scene and its line.
  const pathSteps: Raw[] = Array.isArray(d?.journey?.steps) ? d!.journey.steps : [];
  const pathDone: number = typeof d?.journey?.doneCount === "number" ? d!.journey.doneCount : pathSteps.filter((s) => s.status === "done" || s.done).length;
  const pathTotal: number = typeof d?.journey?.total === "number" ? d!.journey.total : pathSteps.length;

  const menu = () => presentSheet({
    header: d?.name || family?.name || "Your family",
    buttons: [
      { text: "Open the web portal", handler: () => { window.open(`${PORTAL_WEB_URL}/login`, "_blank"); } },
      { text: "Sign out", role: "destructive", handler: () => { void signOut().then(() => router.push("/start", "root", "replace")); } },
      { text: "Cancel", role: "cancel" },
    ],
  });

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div className="ocf2 ocf2-page">
          {/* top bar */}
          <div className="ocf2-top">
            <FamBrand />
            <div className="ocf2-top-r">
              <FamBellO />
              <button type="button" className="ocf2-round is-lilac" aria-label="Menu" onClick={menu}>{initials(fullName)}</button>
            </div>
          </div>

          {/* The hero: the greeting over a moving scene of the family's own
              path (Shalom 2026-11-11). One marker per plan step, the sky by
              the clock. The second line leads with what is already done. */}
          <Hero
            lead={`${greetingWord()}, `}
            mark={name}
            line2={q.isLoading ? "Getting your page ready." : d?.preview ? "Staff preview of this page."
              : pathTotal > 0 && pathDone >= pathTotal ? "Every step done. That took real work."
              : pathDone > 0 ? `${pathDone} of ${pathTotal} steps done. One at a time.`
              : "Glad you are here. One step at a time."}
          >
            <HeroScene done={pathDone} total={pathTotal} />
          </Hero>

          {q.isLoading && <Loading />}
          {q.isError && !d && (
            <Panel>
              <p className="ocf2-p">We couldn't load your page just now. This may be on us.</p>
              <div><OBtn kind="light" sm onClick={() => q.refetch()}>Try again</OBtn></div>
            </Panel>
          )}
          {d && <Body d={d} />}

          <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            <a href={`${PORTAL_WEB_URL}/login`} target="_blank" rel="noreferrer" className="ocf2-quiet">
              Open the web portal <ArrowSquareOut size={14} />
            </a>
            <button type="button" className="ocf2-quiet" onClick={() => router.push("/app-settings")}>Settings and feedback</button>
            <button type="button" className="ocf2-quiet" onClick={() => void signOut().then(() => router.push("/start", "root", "replace"))}>Sign out</button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

const initials = (n: string) => String(n || "?").replace(/[^A-Za-z\s]/g, " ").trim().split(/\s+/).filter((w) => !/^(and)$/i.test(w)).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "F";

function Body({ d }: { d: PortalHome }) {
  const qc = useQueryClient();
  const router = useIonRouter();
  const gate: Raw | null = d.interviewGate || null;
  const next: Raw | null = d.nextStep || null;
  const journey: Raw = d.journey || {};
  const steps: Raw[] = Array.isArray(journey.steps) ? journey.steps : [];
  const doneCount: number = typeof journey.doneCount === "number" ? journey.doneCount : steps.filter((s) => s.status === "done" || s.done).length;
  const total: number = typeof journey.total === "number" ? journey.total : steps.length;
  const currentIdx = steps.findIndex((s) => s.status === "current") >= 0 ? steps.findIndex((s) => s.status === "current") : steps.findIndex((s) => !(s.status === "done" || s.done));
  const sessions: Raw = d.sessions || {};
  const meetings: Raw[] = Array.isArray(d.meetings) ? d.meetings : [];
  const members: Raw[] = Array.isArray(d.team?.members) ? d.team.members : Array.isArray(d.team) ? d.team : [];
  const coordinator: Raw | null = d.team?.coordinator || null;
  // Everyone the family can reach, the coordinators last. Tovi is on every
  // family's team; her WhatsApp and booking link show once the CRM sends them.
  const coords: Raw[] = Array.isArray(d.team?.coordinators) ? d.team.coordinators : coordinator ? [coordinator] : [];
  const people: Raw[] = [...members, ...coords.map((c) => ({ ...c, coord: true }))];
  if (people.length > 0 && !people.some((p) => /^tovi\b/i.test(String(p.name || "")))) people.push({ name: "Tovi Cremisi", role: "Family coordinator", coord: true });
  const cf: Raw = d.cashFlow || {};
  const history: Raw[] = Array.isArray(cf.history) ? cf.history : [];
  const cur: Raw | null = cf.current || (history.length ? history[history.length - 1] : null);
  const debt: Raw | null = d.debtNumbers && typeof d.debtNumbers.total === "number" ? d.debtNumbers : null;
  const pct = (v: unknown) => (typeof v === "number" ? `${v}%` : null);
  const usd = (v: unknown) => (typeof v === "number" ? money(v) : null);
  const baRows = debt ? [
    { k: "You owe", was: usd(debt.atAssessment), now: usd(debt.total) },
    { k: "Each month", was: usd(debt.monthlyAtAssessment), now: usd(debt.monthlyPayments) },
    { k: "Card rate", was: pct(debt.aprAtAssessment), now: pct(debt.aprPct) },
  ].filter((r) => r.was || r.now) : [];
  const focus = !!d.focusMode;
  const gateOpen = !!gate && !gate.booked;

  // homework with optimistic ticks (the steps list shows and ticks them)
  const [hw, setHw] = useState<Raw[] | null>(null);
  const [hwBusy, setHwBusy] = useState<string | null>(null);
  const [stepsSlot, setStepsSlot] = useState<HTMLElement | null>(null);
  const [pickMonth, setPickMonth] = useState<number | null>(null);
  const homework: Raw[] = hw ?? (Array.isArray(d.homework) ? d.homework : []);
  const toggle = async (h: Raw) => {
    if (hwBusy) return;
    setHwBusy(String(h.id));
    const nextList = homework.map((x) => (x.id === h.id ? { ...x, done: !x.done } : x));
    setHw(nextList);
    try { await setHomeworkDone(String(h.id), !h.done); qc.invalidateQueries({ queryKey: ["portalHome"] }); }
    catch { setHw(homework); }
    finally { setHwBusy(null); }
  };

  // Bars: the size of each month's gap or surplus, mint, the latest forest. Never coral.
  // A tap on a month opens that month in the card (Leivi 2026-11-11).
  const last6 = history.slice(-6);
  const pickK = pickMonth != null && pickMonth < last6.length ? pickMonth : last6.length - 1;
  const shown: Raw | null = pickMonth != null && last6[pickK] ? last6[pickK] : cur;
  const shownLatest = pickMonth == null || pickK === last6.length - 1;
  const signed$ = (n: number) => `${n < 0 ? "-" : ""}${money(Math.abs(n))}`;
  const barsData = last6.map((h, k) => {
    const label = monthShort(String(h.date || h.month || h.monthLabel || ""));
    const parts = [typeof h.income === "number" ? `in ${money(h.income)}` : null, typeof h.expenses === "number" ? `out ${money(h.expenses)}` : null].filter(Boolean).join(", ");
    return { label, n: Math.abs(Number(h.net ?? 0)), hi: k === pickK, tip: `${label}: ${signed$(Number(h.net ?? 0))} left over${parts ? ` (${parts})` : ""}` };
  });

  return (
    <>
      {/* ── the interview gate comes first, like the portal ── */}
      {gateOpen && (
        <NextCard kicker="First step" title="Book your intake interview"
          body={<>{gate!.interviewerName || "Our interviewer"} meets every family first. {gate!.mode === "yossi" ? "Send a WhatsApp and pick a time together." : "Pick a time that works for you."}</>}
          art={<CalendarArt width={130} />}>
          {gate!.calendly && <OBtn href={gate!.calendly}><CalendarBlank size={18} weight="bold" /> Pick a time</OBtn>}
          {!gate!.calendly && gate!.whatsapp && <OBtn href={gate!.whatsapp}><ChatCircleText size={18} weight="bold" /> WhatsApp {firstWord(gate!.interviewerName)}</OBtn>}
          {gate!.bookingExpired && <div className="ocf2-note" style={{ flexBasis: "100%" }}>Your booking window passed. Pick a new time and we will take it from there.</div>}
        </NextCard>
      )}

      {gate && gate.booked && (
        <Panel tone="mint" style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: "12px 14px" }}>
          <span className="ocf2-tick is-done"><Check size={15} weight="bold" /></span>
          <span className="ocf2-row-t"><b>Interview booked</b><small style={{ color: "#46594F" }}>{gate.booked.start ? `${fmtDay(gate.booked.start)} · ${fmtTime(gate.booked.start)}` : "We will see you soon."}</small></span>
        </Panel>
      )}

      {/* ── steps 1, 2, 3 with the real tasks (same rules as the web portal,
          Minsky 2026-11-08). The interview card above holds "right now"
          while the interview is still to book. ── */}
      {steps.length > 0 && (
        <FamSteps
          d={{ ...d, homework }}
          onOpenPlan={() => router.push("/fam/plan")}
          onToggleHomework={(h: Raw) => void toggle(h)}
          hwBusy={hwBusy}
          hideNow={gateOpen}
          stepsSlot={stepsSlot}
          stepsCollapsible
        />
      )}

      {!focus && (
        <>
          {/* ── budgeting sessions ── */}
          {!sessions.locked && sessions.total > 0 && (
            <Panel tone="butter">
              <div className="ocf2-panel-h"><h3>{sessions.budgeterName ? `Budgeting with ${sessions.budgeterName}` : "Your budgeting sessions"}</h3><span style={{ color: "#574A0E" }}>{sessions.done || 0} of {sessions.total}</span></div>
              <Stepper total={Number(sessions.total)} done={Number(sessions.done || 0)} current={Number(sessions.done || 0) < Number(sessions.total) ? Number(sessions.done || 0) : undefined}
                label={Array.isArray(sessions.labels) && sessions.labels[Number(sessions.done || 0)] ? <span style={{ color: "#574A0E" }}>Next: {sessions.labels[Number(sessions.done || 0)]}</span> : undefined} />
              {sessions.bookUrl && <div><OBtn kind="light" sm href={sessions.bookUrl}><CalendarBlank size={16} weight="bold" /> Book the next one</OBtn></div>}
            </Panel>
          )}

          {/* ── coming up ── */}
          {meetings.length > 0 && (
            <>
              <SectionHead aux="All meetings" onAux={() => router.push("/fam/meetings")}>Coming up</SectionHead>
              <Panel tone="lilac" style={{ gap: 8, padding: 10 }}>
                {meetings.slice(0, 4).map((m, k) => (
                  <div key={k} className="ocf2-meet ocf2-t-white" style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: "10px 10px 10px 10px" }}>
                    <DateTile iso={m.startTime} tone={k === 0 ? "lime" : "lilac"} />
                    <span className="ocf2-row-t">
                      <b style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title || "Meeting"}</b>
                      <small>{[m.startTime ? fmtTime(m.startTime) : null, m.host ? `with ${firstWord(m.host)}` : null].filter(Boolean).join(" · ")}</small>
                    </span>
                    {m.joinUrl && <OBtn kind="ghost" sm href={m.joinUrl} ariaLabel={`Join ${m.title || "meeting"}`} style={{ flex: "none", padding: "0 12px" }}><VideoCamera size={15} weight="bold" /> Join</OBtn>}
                  </div>
                ))}
              </Panel>
            </>
          )}

          {/* ── cash flow: light card, ink numbers, never coral ── */}
          {(cur || history.length > 0) && (
            <section className="ocf2-money">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <span className="ocf2-big-l">{shownLatest ? "Left over each month" : `Left over in ${barsData[pickK]?.label || "that month"}`}</span>
                  <div className="ocf2-big" style={{ marginTop: 6 }}>
                    {typeof shown?.net === "number" ? <>{shown.net < 0 ? "-" : ""}<CountUp key={pickK} to={Math.abs(shown.net)} fmt={money} /></> : "Building"}
                  </div>
                </div>
                {shownLatest
                  ? <span className="ocf2-chip" style={{ background: "rgba(255,255,255,.75)" }}>Your month</span>
                  : <button type="button" className="ocf2-chip" style={{ background: "rgba(255,255,255,.75)", border: 0, font: "inherit", fontWeight: 800, cursor: "pointer", minHeight: 32 }} onClick={() => setPickMonth(null)}>Back to this month</button>}
              </div>
              {typeof shown?.income === "number" && typeof shown?.expenses === "number" && (
                <div className="ocf2-kv"><span>In <b>{money(shown.income)}</b></span><span>Out <b>{money(shown.expenses)}</b></span></div>
              )}
              {barsData.length > 1 && <MiniBars bars={barsData} height={72} onPick={(k) => setPickMonth(k === last6.length - 1 ? null : k)} />}
              {barsData.length > 1 && <p className="ocf2-money-hint">Tap a month to see it.</p>}
            </section>
          )}

          {/* ── debt ── */}
          {debt && (
            <Panel>
              <div className="ocf2-debt-top">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "-.015em" }}>Debt</h3>
                  {typeof debt.atAssessment === "number" && debt.atAssessment > debt.total && <span className="ocf2-chip ocf2-t-mint">Down {money(debt.atAssessment - debt.total)}</span>}
                </div>
                <Oil name="stack" w={104} />
              </div>
              <div className="ocf2-ba" role="table" aria-label="Your debt, before and now">
                <div role="row" className="ocf2-ba-h"><span role="columnheader" /><span role="columnheader">Before</span><span role="columnheader">Now</span></div>
                {baRows.map((r) => (
                  <div role="row" key={r.k} className="ocf2-ba-r">
                    <span role="rowheader">{r.k}</span>
                    <span role="cell" className="was">{r.was ?? "Not on file"}</span>
                    <b role="cell">{r.now ?? "Not on file"}</b>
                  </div>
                ))}
              </div>
              {d.debtExpertName && <p className="ocf2-meta">With {d.debtExpertName}. "Before" is where things stood at your assessment.</p>}
              {debt.inDefault && <div className="ocf2-note ocf2-t-butter">Some accounts are in default. Your debt expert is working through them with you.</div>}
            </Panel>
          )}

        </>
      )}

      {members.length === 0 && !coordinator && steps.length === 0 && !next && !gate && (
        <Panel className="oil-stack">
          <Oil name="build" w={132} />
          <p className="ocf2-p">Your page is being set up. Nothing is needed from you right now. Your case manager will let you know the moment it is ready.</p>
        </Panel>
      )}

      {/* the steps list lands here: at the foot, folded shut (Leivi 2026-11-11) */}
      <div ref={setStepsSlot} />

      {/* ── team: at the foot, one tap to WhatsApp or book (Shalom 2026-11-11) ── */}
      {people.length > 0 && (
        <Panel>
          <div className="ocf2-panel-h"><h3>Your team</h3></div>
          <div className="ocf2-rows">
            {people.map((m, k) => (
              <div key={k} className="ocf2-row ocf2-teamrow">
                <Face name={String(m.name || "Team")} tone={m.coord ? "peach" : toneFor(String(m.name || "Team"))} />
                <span className="ocf2-row-t"><b>{m.name}</b><small>{m.role}</small></span>
                <span className="ocf2-teamacts">
                  {m.whatsapp && <a className="ocf2-teambtn is-wa" href={m.whatsapp} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${m.name}`}><WhatsappLogo size={18} weight="fill" /></a>}
                  {m.calendly && <a className="ocf2-teambtn" href={m.calendly} target="_blank" rel="noreferrer" aria-label={`Book a time with ${m.name}`}><CalendarPlus size={17} weight="bold" /><span>Book</span></a>}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── weekly quote ── */}
      {d.quote?.text && (
        <div className="oil-row is-quote" style={{ marginTop: 6 }}>
          <figure className="ocf2-quote">
            <blockquote>&ldquo;{d.quote.text}&rdquo;</blockquote>
            {d.quote.by && <figcaption>{d.quote.by}</figcaption>}
          </figure>
          <Oil name="grow" w={74} className="oil-drop" />
        </div>
      )}
    </>
  );
}
