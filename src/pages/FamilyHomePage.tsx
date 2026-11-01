import { useMemo, useState } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonActionSheet, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, ChatCircleText, Check, FileText, ArrowSquareOut, VideoCamera, Phone } from "@phosphor-icons/react";
import { fetchPortalHome, setHomeworkDone, PORTAL_WEB_URL, type PortalHome } from "@/lib/portalApi";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { greetingWord } from "@/lib/quotes";
import { Av, Bars, Btn, Card, CardTitle, CountUp, Empty, Eyebrow, Evt, Pill, Row, Strip, Track, CalendarArt, PlantArt, type Stat } from "@/components/gv";

/**
 * The family's home — the client portal, in the app. Reads the SAME
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
  const greeting = `${greetingWord()}, ${name}`;

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
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 14px) 16px calc(40px + env(safe-area-inset-bottom))" }}>
          {/* top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <img src="/ck-logo.png" alt="Collective Kindness" style={{ width: 128, height: "auto" }} />
            <button aria-label="Menu" onClick={menu} style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>
              <Av name={d?.name || family?.name || "F"} size={38} round tint="mint" />
            </button>
          </div>

          <h1 className="gv-h1 gv-rise" style={{ marginTop: 18 }}>{greeting}</h1>
          <p className="gv-sub gv-rise" style={{ "--i": 1, marginTop: 6 } as React.CSSProperties}>
            {q.isLoading ? "Getting your page ready…" : d?.preview ? "Staff preview of this family's page." : "Here's where things stand."}
          </p>

          {q.isLoading && <Loading />}
          {q.isError && !d && (
            <Card i={2} style={{ marginTop: 18 }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--gv-mid)", lineHeight: 1.5 }}>We couldn't load your page just now. This may be on us.</p>
              <div style={{ marginTop: 12 }}><Btn sm ghost onClick={() => q.refetch()}>Try again</Btn></div>
            </Card>
          )}
          {d && <Body d={d} />}

          <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 26 }}>
            <a href={`${PORTAL_WEB_URL}/login`} target="_blank" rel="noreferrer" className="gv-link" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--gv-quiet)" }}>
              Open the web portal <ArrowSquareOut size={14} />
            </a>
            <button className="gv-link" style={{ color: "var(--gv-quiet)" }} onClick={() => void signOut().then(() => router.push("/start", "root", "replace"))}>Sign out</button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
      {[0, 1, 2].map((k) => (
        <div key={k} className="gv-card gv-rise" style={{ "--i": k + 2, height: k === 0 ? 150 : 96, background: "linear-gradient(90deg, #fff 25%, #F4F6F2 50%, #fff 75%)", backgroundSize: "200% 100%", animation: "ck-shimmer 1.3s ease-in-out infinite" } as React.CSSProperties} />
      ))}
    </div>
  );
}

function Body({ d }: { d: PortalHome }) {
  const qc = useQueryClient();
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
  const cf: Raw = d.cashFlow || {};
  const history: Raw[] = Array.isArray(cf.history) ? cf.history : [];
  const cur: Raw | null = cf.current || (history.length ? history[history.length - 1] : null);
  const debt: Raw | null = d.debtNumbers && typeof d.debtNumbers.total === "number" ? d.debtNumbers : null;
  const docs: Raw[] = Array.isArray(d.documents) ? d.documents : [];
  const focus = !!d.focusMode;

  // homework with optimistic ticks
  const [hw, setHw] = useState<Raw[] | null>(null);
  const homework: Raw[] = hw ?? (Array.isArray(d.homework) ? d.homework : []);
  const openHw = homework.filter((h) => !h.done).length;
  const toggle = async (h: Raw) => {
    const nextList = homework.map((x) => (x.id === h.id ? { ...x, done: !x.done } : x));
    setHw(nextList);
    try { await setHomeworkDone(String(h.id), !h.done); qc.invalidateQueries({ queryKey: ["portalHome"] }); }
    catch { setHw(homework); }
  };

  const stats = useMemo(() => {
    const s: Stat[] = [];
    if (total) s.push({ label: "Journey", value: doneCount, unit: `of ${total}` });
    if (!sessions.locked && sessions.total) s.push({ label: "Budget sessions", value: Number(sessions.done || 0), unit: `of ${sessions.total}` });
    if (homework.length) s.push({ label: "Homework", value: openHw, unit: "open", warn: openHw > 0 });
    return s;
  }, [total, doneCount, sessions.locked, sessions.total, sessions.done, homework.length, openHw]);

  let i = 2;
  const barsData = history.slice(-6).map((h, k, arr) => ({
    label: monthShort(String(h.date || h.month || h.monthLabel || "")),
    value: Math.abs(Number(h.net ?? 0)),
    on: k === arr.length - 1 && Number(h.net ?? 0) < 0,
    go: k === arr.length - 1 && Number(h.net ?? 0) >= 0,
  }));

  return (
    <>
      {/* ── the interview gate comes first, like the portal ── */}
      {gate && !gate.booked && (
        <Card i={i++} style={{ marginTop: 18 }}>
          <Pill tint="lime">First step</Pill>
          <h2 className="gv-h2" style={{ fontSize: 20, marginTop: 10 }}>Book your intake interview</h2>
          <p className="gv-sub" style={{ marginTop: 6 }}>{gate.interviewerName || "Our interviewer"} meets every family first. {gate.mode === "yossi" ? "Send a WhatsApp and pick a time together." : "Pick a time that works for you."}</p>
          <div style={{ display: "flex", justifyContent: "center", margin: "6px 0 2px" }}><CalendarArt width={170} /></div>
          {gate.calendly && <Btn block href={gate.calendly}><CalendarBlank size={18} weight="bold" /> Pick a time</Btn>}
          {!gate.calendly && gate.whatsapp && <Btn block href={gate.whatsapp}><ChatCircleText size={18} weight="bold" /> WhatsApp {firstWord(gate.interviewerName)}</Btn>}
          {gate.bookingExpired && <div className="gv-gentle" style={{ marginTop: 10 }}>Your booking window passed. Pick a new time and we will take it from there.</div>}
        </Card>
      )}
      {gate && gate.booked && (
        <div className="gv-rise" style={{ "--i": i++, marginTop: 18 } as React.CSSProperties}>
          <Evt tint="mint" icon={<Check size={16} weight="bold" color="var(--gv-mintInk)" />} title="Interview booked" sub={gate.booked.start ? `${fmtDay(gate.booked.start)} · ${fmtTime(gate.booked.start)}` : "We will see you soon."} />
        </div>
      )}

      {/* ── up next ── */}
      {next && (
        <Card i={i++} style={{ marginTop: gate ? 12 : 18 }}>
          <Pill tint={next.kind === "done" || next.kind === "ok" ? "mint" : "lime"}>{next.kind === "done" ? "Milestone" : "Up next"}</Pill>
          <h2 className="gv-h2" style={{ fontSize: 20, marginTop: 10 }}>{next.title}</h2>
          {next.body && <p className="gv-sub" style={{ marginTop: 6 }}>{next.body}</p>}
          {next.hint && <p className="gv-meta" style={{ marginTop: 8, lineHeight: 1.5 }}>{next.hint}</p>}
          {next.kind === "ok" && <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}><PlantArt width={120} /></div>}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {next.whatsapp && <Btn href={next.whatsapp} style={{ flex: 1 }}><ChatCircleText size={18} weight="bold" /> WhatsApp {next.cmFirst || ""}</Btn>}
            {next.calendly && <Btn href={next.calendly} ghost={!!next.whatsapp} style={{ flex: 1 }}><CalendarBlank size={18} weight="bold" /> Book a time</Btn>}
            {next.kind === "book" && sessions.bookUrl && <Btn href={sessions.bookUrl} style={{ flex: 1 }}><CalendarBlank size={18} weight="bold" /> Book a session</Btn>}
            {(next.kind === "review_plan" || next.kind === "sign") && (
              <>
                {d.plan?.docUrl && <Btn href={d.plan.docUrl} ghost style={{ flex: 1 }}><FileText size={18} weight="bold" /> Read the plan</Btn>}
                <Btn href={`${PORTAL_WEB_URL}/login`} style={{ flex: 1 }}>{next.kind === "sign" ? "Sign in the portal" : "Open the portal"}</Btn>
              </>
            )}
          </div>
        </Card>
      )}

      {stats.length > 0 && !focus && <div style={{ marginTop: 12 }}><Strip i={i++} stats={stats} /></div>}

      {/* ── journey ── */}
      {steps.length > 0 && (
        <>
          <Eyebrow>Your journey</Eyebrow>
          <Card i={i++}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gv-ink)" }}><CountUp to={doneCount} /> of {total} done</span>
              {currentIdx >= 0 && <Pill tint="lime">{steps[currentIdx]?.label}</Pill>}
            </div>
            <Track total={total} done={doneCount} current={currentIdx >= 0 ? currentIdx : undefined} />
            <div style={{ marginTop: 10 }}>
              {steps.map((s, k) => {
                const done = s.status === "done" || s.done;
                const curr = k === currentIdx;
                return (
                  <Row key={s.key || k}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center", background: done ? "var(--gv-mint)" : curr ? "var(--gv-lime)" : "transparent", boxShadow: done || curr ? "none" : "inset 0 0 0 2px var(--gv-line)", color: "var(--gv-go)" }}>
                      {done && <Check size={13} weight="bold" />}
                    </span>
                    <span className="t">
                      <b style={{ fontWeight: curr ? 800 : done ? 700 : 600, color: done || curr ? "var(--gv-ink)" : "var(--gv-mid)" }}>{s.label}</b>
                      {(s.date || s.target) && <span>{s.date ? `Done ${fmtDay(s.date)}` : s.target ? `Aim: ${s.target}` : ""}</span>}
                    </span>
                  </Row>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {!focus && (
        <>
          {/* ── budgeting sessions ── */}
          {!sessions.locked && sessions.total > 0 && (
            <>
              <Eyebrow>Budgeting sessions</Eyebrow>
              <Card i={i++}>
                <CardTitle right={<Pill tint="mint">{sessions.done || 0} of {sessions.total}</Pill>}>{sessions.budgeterName ? `With ${sessions.budgeterName}` : "Your sessions"}</CardTitle>
                <Track total={Number(sessions.total)} done={Number(sessions.done || 0)} current={Number(sessions.done || 0) < Number(sessions.total) ? Number(sessions.done || 0) : undefined} />
                {Array.isArray(sessions.labels) && sessions.labels[Number(sessions.done || 0)] && (
                  <p className="gv-meta" style={{ marginTop: 10 }}>Next: {sessions.labels[Number(sessions.done || 0)]}</p>
                )}
                {sessions.bookUrl && <div style={{ marginTop: 12 }}><Btn sm ghost href={sessions.bookUrl}><CalendarBlank size={16} weight="bold" /> Book the next one</Btn></div>}
              </Card>
            </>
          )}

          {/* ── coming up ── */}
          {meetings.length > 0 && (
            <>
              <Eyebrow>Coming up</Eyebrow>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {meetings.slice(0, 4).map((m, k) => (
                  <Evt
                    key={k}
                    i={i++}
                    tint={k === 0 ? "yellow" : "lavender"}
                    icon={<span style={{ textAlign: "center", lineHeight: 1 }}><b style={{ display: "block", fontSize: 12, color: "var(--gv-ink)" }}>{m.startTime ? new Date(m.startTime).getDate() : ""}</b><span style={{ fontSize: 8.5, fontWeight: 700, color: "var(--gv-mid)", textTransform: "uppercase" }}>{m.startTime ? new Date(m.startTime).toLocaleDateString("en-US", { month: "short" }) : ""}</span></span>}
                    title={m.title || "Meeting"}
                    sub={[m.startTime ? `${fmtDay(m.startTime)} · ${fmtTime(m.startTime)}` : null, m.host ? `with ${m.host}` : null].filter(Boolean).join(" · ")}
                    right={m.joinUrl ? <a href={m.joinUrl} target="_blank" rel="noreferrer" className="gv-pill" style={{ background: "rgba(255,255,255,.8)", color: "var(--gv-ink)", textDecoration: "none" }}><VideoCamera size={13} weight="bold" /> Join</a> : undefined}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── cash flow ── */}
          {(cur || history.length > 0) && (
            <>
              <Eyebrow>Your month</Eyebrow>
              <Card i={i++}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <small style={{ fontSize: 12, fontWeight: 600, color: "var(--gv-mid)" }}>Left over each month</small>
                    <div className="tnum" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.05, marginTop: 4, color: Number(cur?.net ?? 0) < 0 ? "var(--gv-coral)" : "var(--gv-ink)" }}>
                      {typeof cur?.net === "number" ? <>{cur.net < 0 ? "−" : ""}<CountUp to={Math.abs(cur.net)} fmt={money} /></> : "Building"}
                    </div>
                  </div>
                  {typeof cur?.income === "number" && typeof cur?.expenses === "number" && (
                    <div style={{ textAlign: "right", fontSize: 12.5, color: "var(--gv-mid)", lineHeight: 1.6 }}>
                      <div>In <b style={{ color: "var(--gv-ink)" }}>{money(cur.income)}</b></div>
                      <div>Out <b style={{ color: "var(--gv-ink)" }}>{money(cur.expenses)}</b></div>
                    </div>
                  )}
                </div>
                {barsData.length > 1 && <div style={{ marginTop: 14 }}><Bars bars={barsData} height={64} /></div>}
              </Card>
            </>
          )}

          {/* ── debt ── */}
          {debt && (
            <>
              <Eyebrow>Debt</Eyebrow>
              <Card i={i++}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <small style={{ fontSize: 12, fontWeight: 600, color: "var(--gv-mid)" }}>On file today</small>
                    <div className="tnum" style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.05, marginTop: 4, color: "var(--gv-ink)" }}><CountUp to={Number(debt.total)} fmt={money} /></div>
                  </div>
                  {typeof debt.atAssessment === "number" && debt.atAssessment > debt.total && (
                    <Pill tint="up" i={0}>↓ {money(debt.atAssessment - debt.total)}</Pill>
                  )}
                </div>
                <p className="gv-meta" style={{ marginTop: 10 }}>
                  {[
                    typeof debt.atAssessment === "number" && debt.atAssessment > debt.total ? `down from ${money(debt.atAssessment)} at assessment` : null,
                    debt.aprPct != null ? `${debt.aprPct}% APR` : null,
                    debt.monthlyPayments != null ? `${money(debt.monthlyPayments)} a month` : null,
                    d.debtExpertName ? `with ${d.debtExpertName}` : null,
                  ].filter(Boolean).join(" · ")}
                </p>
                {debt.inDefault && <div className="gv-gentle" style={{ marginTop: 10 }}>Some accounts are in default. Your debt expert is working through them with you.</div>}
              </Card>
            </>
          )}

          {/* ── homework ── */}
          {homework.length > 0 && (
            <>
              <Eyebrow right={openHw ? `${openHw} open` : "All done"}>Homework</Eyebrow>
              <Card i={i++}>
                {homework.map((h) => (
                  <Row key={h.id} onClick={() => void toggle(h)}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: h.done ? "var(--gv-mint)" : "var(--gv-yellow)", color: h.done ? "var(--gv-mintInk)" : "var(--gv-yellowInk)" }}>
                      {h.done ? <Check size={14} weight="bold" /> : <span style={{ width: 8, height: 8, borderRadius: 2, background: "currentColor", opacity: .5 }} />}
                    </span>
                    <span className="t"><b style={{ whiteSpace: "normal", fontWeight: 600, textDecoration: h.done ? "line-through" : "none", color: h.done ? "var(--gv-quiet)" : "var(--gv-ink)" }}>{h.text}</b></span>
                  </Row>
                ))}
              </Card>
            </>
          )}

          {/* ── documents ── */}
          {docs.length > 0 && (
            <>
              <Eyebrow>Your documents</Eyebrow>
              <Card i={i++}>
                {docs.map((doc, k) => (
                  <Row key={k} onClick={() => window.open(doc.url, "_blank")}>
                    <span className="gv-tile" style={{ background: doc.kind === "plan" ? "var(--gv-mint)" : "var(--gv-sky)" }}><FileText size={18} weight="regular" color={doc.kind === "plan" ? "var(--gv-mintInk)" : "var(--gv-skyInk)"} /></span>
                    <span className="t"><b>{doc.label}</b><span>Opens in a new tab</span></span>
                    <ArrowSquareOut size={16} color="var(--gv-quiet)" />
                  </Row>
                ))}
              </Card>
            </>
          )}
        </>
      )}

      {/* ── team ── */}
      {(members.length > 0 || coordinator) && (
        <>
          <Eyebrow>Your team</Eyebrow>
          <Card i={i++}>
            {members.map((m, k) => (
              <Row key={k}>
                <Av name={String(m.name || "Team")} size={40} round />
                <span className="t"><b>{m.name}</b><span>{m.role}</span></span>
                {m.whatsapp && <a href={m.whatsapp} target="_blank" rel="noreferrer" className="gv-pill mint" style={{ textDecoration: "none" }}><ChatCircleText size={13} weight="bold" /> WhatsApp</a>}
              </Row>
            ))}
            {coordinator && (
              <Row>
                <Av name={String(coordinator.name || "CK")} size={40} round tint="apricot" />
                <span className="t"><b>{coordinator.name}</b><span style={{ whiteSpace: "normal" }}>{coordinator.role}</span></span>
                {coordinator.whatsapp && <a href={coordinator.whatsapp} target="_blank" rel="noreferrer" className="gv-pill mint" style={{ textDecoration: "none" }}><Phone size={13} weight="bold" /> Reach out</a>}
              </Row>
            )}
          </Card>
        </>
      )}

      {members.length === 0 && !coordinator && steps.length === 0 && !next && !gate && (
        <div style={{ marginTop: 18 }}><Empty>Your page is being set up. Your case manager will let you know when it is ready.</Empty></div>
      )}

      {/* ── weekly quote ── */}
      {d.quote?.text && (
        <figure className="gv-rise" style={{ "--i": i++, margin: "26px 4px 0" } as React.CSSProperties}>
          <blockquote style={{ margin: 0, fontSize: 15.5, fontWeight: 700, lineHeight: 1.4, color: "var(--gv-ink)", textWrap: "balance" } as React.CSSProperties}>&ldquo;{d.quote.text}&rdquo;</blockquote>
          {d.quote.by && <figcaption style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--gv-go)", opacity: .85 }}>{d.quote.by}</figcaption>}
        </figure>
      )}
    </>
  );
}
