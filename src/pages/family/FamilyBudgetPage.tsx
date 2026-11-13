import "@/theme/orchard-fam-budget.css";
import { useMemo, useState } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, type RefresherEventDetail } from "@ionic/react";
import { TalkFoot } from "@/components/orchard/family/TalkFoot";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowCircleDown, ArrowSquareOut, Bank, CalendarBlank, CalendarCheck, CaretDown, Check, CreditCard, House, PiggyBank, Plant, ShoppingCartSimple, type Icon } from "@phosphor-icons/react";
import { fetchBudget, fetchPortalHome, setHomeworkDone, PORTAL_WEB_URL } from "@/lib/portalApi";
import { budgetPipeline } from "@/lib/budgetSessions";
import { money } from "@/lib/format";
import { CountUp, PlantArt } from "@/components/gv";
import { BudgetArt } from "@/components/orchard/family/BudgetArt";
import { FamHead, Loading, OBtn, Panel, SectionHead, SoftError, type Tone } from "@/components/orchard/family/FamKit";

/**
 * My budget — the family's view of the Budget Builder.
 *
 * Less up front (Shalom 2026-11-11: "collapse most stuff and make it easier
 * on the eyes"; "more encouraging and kind to families who are struggling"):
 *
 *   1. One card: what was left over this month, one kind line against the
 *      month before, and the last six months to tap through.
 *   2. The budgeting sessions: the first meeting, then six monthly ones.
 *   3. The plan as one row per category; a tap opens its lines.
 *   4. "More": homework, the bank, the full builder.
 *
 * Two reads, both the web portal's own: GET /api/portal/budget (the plan's
 * lines, this month at the bank, homework, banks) and GET /api/portal/me
 * (the month-by-month history the budgeter records at each session, and the
 * session count: the same numbers the Home tab shows). Months only appear
 * when the server sends them; nothing here is estimated.
 */

type Raw = Record<string, any>;
const usd = (cents: number) => `$${Math.round(Math.abs(cents) / 100).toLocaleString("en-US")}`;
const KINDS: { key: string; label: string; tone: Tone; icon: Icon }[] = [
  { key: "income", label: "Income", tone: "mint", icon: ArrowCircleDown },
  { key: "fixed", label: "Essentials", tone: "sky", icon: House },
  { key: "everyday", label: "Day to day", tone: "butter", icon: ShoppingCartSimple },
  { key: "set_aside", label: "Set aside", tone: "lilac", icon: PiggyBank },
  { key: "debt", label: "Debt payments", tone: "peach", icon: CreditCard },
  { key: "savings", label: "Savings", tone: "mint", icon: Plant },
];

interface Month { key: string; short: string; long: string; income: number | null; expenses: number | null; net: number }
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
function toMonth(h: Raw): Month | null {
  const s = String(h?.date || h?.month || "");
  const d = /^\d{4}-\d{2}/.test(s) ? new Date(`${s.slice(0, 7)}-15T12:00:00`) : new Date(s);
  const income = num(h?.income), expenses = num(h?.expenses);
  const net = num(h?.net) ?? (income != null && expenses != null ? income - expenses : null);
  if (!s || Number.isNaN(d.getTime()) || net == null) return null;
  return { key: `${d.getFullYear()}-${d.getMonth()}`, short: d.toLocaleDateString("en-US", { month: "short" }), long: d.toLocaleDateString("en-US", { month: "long" }), income, expenses, net };
}

/** One kind line about a month against the one before it. Progress first;
 *  a heavier month is information, never blame; no comparison is invented
 *  when there is no month before. */
function cheer(cur: Month, prev: Month | null, streak: number, budgeter: string): string {
  if (!prev) return cur.net >= 0 ? "Your first month on the page. A good place to start from." : "Your first month on the page. Seeing it clearly is the hard part, and you did it.";
  const diff = cur.net - prev.net;
  const amt = money(Math.abs(diff));
  if (diff > 0) {
    if (prev.net < 0 && cur.net >= 0) return `Up ${amt} from ${prev.long}. There is money left over now.`;
    if (cur.net < 0) return `The gap is ${amt} smaller than in ${prev.long}. It is closing.`;
    return streak >= 3 ? `Up ${amt} from ${prev.long}. That is ${streak} months of progress in a row.` : `Up ${amt} from ${prev.long}. That is real progress.`;
  }
  if (diff === 0) return `Holding steady with ${prev.long}. Steady counts.`;
  return cur.net >= 0
    ? `A heavier month than ${prev.long}, by ${amt}. That happens, and the plan has room for it.`
    : `A heavier month than ${prev.long}, by ${amt}. That happens. You and ${budgeter} will look at it together.`;
}

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

export function FamilyBudgetPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["budget"], queryFn: fetchBudget, staleTime: 30_000, retry: 1 });
  // The same read the Home tab makes (shared cache): monthly history + sessions.
  const hq = useQuery({ queryKey: ["portalHome"], queryFn: fetchPortalHome, staleTime: 60_000, retry: 1 });
  const refresh = async (e: CustomEvent<RefresherEventDetail>) => {
    await Promise.all([qc.invalidateQueries({ queryKey: ["budget"] }), qc.invalidateQueries({ queryKey: ["portalHome"] })]);
    e.detail.complete();
  };
  const d: Raw | null | undefined = q.data;
  const home: Raw | null = (hq.data as Raw) || null;

  const lines: Raw[] = Array.isArray(d?.lines) ? d!.lines : [];
  const byKind = useMemo(() => {
    const m: Record<string, Raw[]> = {};
    for (const l of lines) (m[String(l.kind)] ||= []).push(l);
    return m;
  }, [lines]);
  const sum = (k: string, f = "amount_cents") => (byKind[k] || []).reduce((s, l) => s + (Number(l[f]) || 0), 0);
  const income = sum("income");
  const out = sum("fixed") + sum("everyday") + sum("set_aside") + sum("debt") + sum("savings");
  const net = income - out;
  const mtd: Raw | null = d?.now?.monthToDate || null;
  const hasMtd = !!mtd && (typeof mtd.income_cents === "number" || typeof mtd.spend_cents === "number") && ((mtd.income_cents || 0) > 0 || (mtd.spend_cents || 0) > 0);
  const tasks: Raw[] = Array.isArray(d?.tasks) ? d!.tasks : [];
  const review: Raw[] = Array.isArray(d?.review) ? d!.review : [];
  const conns: Raw[] = Array.isArray(d?.connections) ? d!.connections.filter((c: Raw) => !c.removed_at) : [];
  const budgeterFirst: string = d?.budgeter?.first || String(home?.sessions?.budgeterName || "").trim().split(/\s+/)[0] || "your budgeter";
  const started = !!d?.started && lines.length > 0;
  const isConfirmed = (l: Raw) => !!l.client_confirmed_at || l.state === "on";
  const confirmedCount = lines.filter(isConfirmed).length;

  // ── months: only what the server sends (the budgeter's month-by-month record) ──
  const months: Month[] = useMemo(() => {
    const hist: Raw[] = Array.isArray(home?.cashFlow?.history) ? home!.cashFlow.history : [];
    return hist.map(toMonth).filter((m): m is Month => !!m).slice(-6);
  }, [home]);
  const [pick, setPick] = useState<number | null>(null);
  const k = pick != null && pick < months.length ? pick : months.length - 1;
  const cur: Month | null = months[k] || null;
  const prev: Month | null = k > 0 ? months[k - 1] : null;
  const isLatest = k === months.length - 1;
  let streak = 0;
  for (let i = k; i > 0 && months[i].net > months[i - 1].net; i--) streak++;
  const nets = months.map((m) => m.net);
  const lo = nets.length ? Math.min(...nets) : 0, hi = nets.length ? Math.max(...nets) : 0;
  const share = (n: number) => (hi === lo ? 0.5 : (n - lo) / (hi - lo));
  // The jar holds more coins the better the month went (3 when there is nothing to compare).
  const level = cur && months.length > 1 ? 1 + Math.round(share(cur.net) * 5) : 3;

  // ── the sessions: first meeting, then six monthly ones (same source as Home) ──
  const pipe = budgetPipeline(home, d?.plan?.bookUrl);
  const pipeLine = !pipe ? "" : pipe.done === 0
    ? "It starts with one first meeting. Six short monthly sessions follow."
    : pipe.done >= pipe.total
      ? "All 7 done. You saw the whole plan through."
      : `You have met ${pipe.done} ${pipe.done === 1 ? "time" : "times"}. Next up: ${pipe.nextLabel}.`;

  // Months and sessions come from the home read; a started plan from the budget read.
  const loading = q.isLoading || (hq.isLoading && !home);
  const showHero = started || !!cur;

  const [hw, setHw] = useState<Raw[] | null>(null);
  const homework = hw ?? tasks;
  const toggle = async (t: Raw) => {
    const next = homework.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x));
    setHw(next);
    try { await setHomeworkDone(String(t.id), !t.done); } catch { setHw(homework); }
  };
  const hwLeft = homework.filter((t) => !t.done).length;

  const [open, setOpen] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const cats = KINDS.filter((c) => (byKind[c.key] || []).length > 0);
  const moreSub = [
    homework.length ? (hwLeft ? `${hwLeft} small ${hwLeft === 1 ? "step" : "steps"}` : "Homework done") : null,
    conns.length ? "your bank" : null,
    "the full builder",
  ].filter(Boolean).join(", ");

  const bankLine = hasMtd
    ? `At your bank so far this month: ${usd(mtd!.income_cents || 0)} in, ${usd(mtd!.spend_cents || 0)} out.${mtd!.pendingCount ? ` ${mtd!.pendingCount} still clearing.` : ""}`
    : null;

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div className="ocf2 ocf2-page obg">
          <FamHead title="My budget"
            sub={loading ? "Adding it up." : started ? `Built with ${budgeterFirst}, one line at a time.` : months.length > 0 ? `Month by month, with ${budgeterFirst}.` : !d ? `Opens after your first session with ${budgeterFirst}.` : `${d.budgeter?.name || "Your budgeter"} starts it with you in your first session.`} />

          {loading && <Loading />}
          {!loading && q.isError && <SoftError onRetry={() => q.refetch()}>Your budget did not load just now. Nothing is lost.</SoftError>}

          {!loading && !q.isError && !started && !showHero && !pipe && (
            <Panel tone="mint" style={{ alignItems: "center", textAlign: "center" }}>
              <PlantArt width={120} />
              <h2 className="ocf2-next-t" style={{ fontSize: 19, margin: 0 }}>Your budget starts in a session</h2>
              <p className="ocf2-p" style={{ color: "#276449" }}>You and {budgeterFirst} connect the bank once, go through each line together, and it stays live here. Nothing to prepare.</p>
              {d?.plan?.bookUrl && <OBtn href={d.plan.bookUrl}><CalendarBlank size={18} weight="bold" /> Book a session</OBtn>}
            </Panel>
          )}

          {!loading && (
            <>
              {/* ── 1. the month: one number, one kind line, six months to tap ── */}
              {showHero && (
              <section className="ocf2-money obg-hero">
                <div className="obg-hero-top">
                  <div className="obg-hero-t">
                    {cur ? (
                      <>
                        <span className="ocf2-big-l">{cur.net >= 0 ? `Left over in ${cur.long}` : `The gap in ${cur.long}`}</span>
                        <div className="ocf2-big obg-big"><CountUp key={cur.key} to={Math.abs(cur.net)} fmt={money} /></div>
                      </>
                    ) : (
                      <>
                        <span className="ocf2-big-l">{net >= 0 ? "Your plan leaves, each month" : `The gap you and ${budgeterFirst} are closing`}</span>
                        <div className="ocf2-big obg-big"><CountUp to={Math.round(Math.abs(net) / 100)} fmt={money} /></div>
                      </>
                    )}
                  </div>
                  <BudgetArt level={level} />
                </div>
                {cur
                  ? <p className="obg-cheer" key={`c-${cur.key}`} aria-live="polite">{cheer(cur, prev, streak, budgeterFirst)}</p>
                  : <p className="obg-cheer">{net >= 0 ? "Every line you go through together makes it steadier." : "Seeing the number is the first step. You are not doing this alone."}</p>}

                {cur && cur.income != null && cur.expenses != null && (
                  <div className="ocf2-kv"><span>Came in <b>{money(cur.income)}</b></span><span>Went out <b>{money(cur.expenses)}</b></span></div>
                )}

                {months.length > 1 && (
                  <>
                    <div className="obg-months" role="group" aria-label="The last months. Tap one to see it.">
                      {months.map((m, i) => (
                        <button type="button" key={m.key} className={`obg-month${i === k ? " is-on" : ""}`} aria-pressed={i === k}
                          aria-label={`${m.long}: ${m.net >= 0 ? `${money(m.net)} left over` : `a gap of ${money(-m.net)}`}`}
                          onClick={() => setPick(i === months.length - 1 ? null : i)}>
                          <span className="obg-month-bar"><i style={{ height: `${Math.round(24 + share(m.net) * 76)}%`, animationDelay: `${i * 50}ms` }} /></span>
                          <small>{m.short}</small>
                        </button>
                      ))}
                    </div>
                    <p className="ocf2-money-hint">{isLatest ? "Tap a month to look back. Taller means more left over." : <button type="button" className="obg-back" onClick={() => setPick(null)}>Back to {months[months.length - 1].long}</button>}</p>
                  </>
                )}

                {bankLine && isLatest && <p className="obg-bank"><Bank size={15} weight="bold" aria-hidden /> <span>{bankLine}</span></p>}
              </section>
              )}

              {/* ── 2. the sessions: first meeting, then six monthly ones ── */}
              {pipe && (
                <Panel className="obg-pipe">
                  <div className="ocf2-panel-h">
                    <h3>{pipe.budgeterName ? `Your sessions with ${String(pipe.budgeterName).split(/\s+/)[0]}` : "Your budgeting sessions"}</h3>
                    <span className="obg-count">{pipe.done} of {pipe.total}</span>
                  </div>
                  <ol className="obg-stops" aria-label={`${pipe.done} of ${pipe.total} sessions done: the first meeting, then six monthly sessions`}>
                    {pipe.stops.map((s, i) => (
                      <li key={i} className={`is-${s.state}`} style={{ "--k": i } as React.CSSProperties}>
                        <span className="obg-dot">{s.state === "done" ? <Check size={13} weight="bold" /> : null}</span>
                        <small>{s.short}</small>
                      </li>
                    ))}
                  </ol>
                  <p className="obg-pipe-line">{pipeLine}</p>
                  {pipe.nextLabel && (pipe.bookedStart ? (
                    <div className="obg-booked">
                      <CalendarCheck size={18} weight="bold" aria-hidden />
                      <span>{pipe.nextLabel} is booked for {fmtWhen(pipe.bookedStart)}.</span>
                    </div>
                  ) : pipe.bookUrl ? (
                    <div><OBtn sm href={pipe.bookUrl}><CalendarBlank size={16} weight="bold" /> {pipe.done === 0 ? "Book your first meeting" : `Book ${pipe.nextLabel}`}</OBtn></div>
                  ) : null)}
                </Panel>
              )}

              {review.length > 0 && (
                <button type="button" className="ocf2-alert" style={{ background: "var(--oc-butter)", color: "#574A0E" }} onClick={() => window.open(`${PORTAL_WEB_URL}/budget`, "_blank")}>
                  <span className="ocf2-ico" style={{ background: "rgba(255,255,255,.7)", fontWeight: 800, fontSize: 16 }}>{review.length}</span>
                  <span className="ocf2-row-t"><b>{`${budgeterFirst} has ${review.length === 1 ? "a quick question" : `${review.length} quick questions`} for you`}</b><small style={{ color: "#6F6020" }}>Answer in the budget builder when you have a minute</small></span>
                  <ArrowSquareOut size={16} />
                </button>
              )}

              {!started && !q.isError && (showHero || pipe) && (
                <Panel tone="mint">
                  <p className="ocf2-p" style={{ color: "#276449", fontWeight: 600 }}>Your line by line plan shows up here once you and {budgeterFirst} build it in a session. Nothing to prepare.</p>
                </Panel>
              )}

              {/* ── 3. the plan: one row per category, a tap opens its lines ── */}
              {started && (<>
              <SectionHead aux={net >= 0 ? `Leaves ${usd(net)} a month` : `${usd(net)} a month to close, together`}>Your plan</SectionHead>
              <Panel className="obg-cats">
                {cats.map((c) => {
                  const ls = byKind[c.key] || [];
                  const conf = ls.filter(isConfirmed).length;
                  const flags = ls.filter((l) => l.state === "flag").length;
                  const isOpen = open === c.key;
                  const sub = conf === ls.length ? (ls.length === 1 ? "Confirmed" : `All ${ls.length} confirmed`)
                    : conf === 0 ? (flags ? `To talk through with ${budgeterFirst}` : `To go over with ${budgeterFirst}`)
                    : `${conf} of ${ls.length} confirmed`;
                  const Ico = c.icon;
                  return (
                    <div key={c.key} className={`obg-cat${isOpen ? " is-open" : ""}`}>
                      <button type="button" className="obg-cat-h" aria-expanded={isOpen} aria-controls={`obg-cat-${c.key}`} onClick={() => setOpen(isOpen ? null : c.key)}>
                        <span className={`ocf2-ico ocf2-t-${c.tone}`}><Ico size={19} weight="bold" /></span>
                        <span className="ocf2-row-t"><b>{c.label}</b><small>{sub}</small></span>
                        <span className="ocf2-row-amt">{usd(sum(c.key))}</span>
                        <CaretDown className="obg-caret" size={15} weight="bold" aria-hidden />
                      </button>
                      {isOpen && (
                        <div className="obg-lines" id={`obg-cat-${c.key}`}>
                          {ls.map((l) => {
                            const confirmed = isConfirmed(l);
                            const flag = l.state === "flag";
                            const who = c.key === "income" && l.details?.who ? String(l.details.who) : null;
                            const note = [who, l.period === "annual" ? "yearly, spread monthly" : null, flag ? `${budgeterFirst} will walk through this with you` : null].filter(Boolean).join(" · ");
                            return (
                              <div key={l.id} className="obg-line">
                                <span className="ocf2-row-t"><b>{l.label || l.category}</b>{note && <small>{note}</small>}</span>
                                <span className="ocf2-row-amt">{usd(Number(l.amount_cents) || 0)}</span>
                                <span role="img" aria-label={confirmed ? "Confirmed" : flag ? `To talk through with ${budgeterFirst}` : "To go over together"} className={`obg-mark${confirmed ? " is-done" : flag ? " is-flag" : ""}`}>
                                  {confirmed ? <Check size={12} weight="bold" /> : flag ? <b>?</b> : null}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <p className="ocf2-meta obg-cats-foot">
                  {confirmedCount >= lines.length
                    ? `Every line is confirmed with ${budgeterFirst}.`
                    : confirmedCount > 0
                      ? `${confirmedCount} of ${lines.length} lines confirmed with ${budgeterFirst}. The rest you go over together, no rush.`
                      : `You and ${budgeterFirst} go over each line together, no rush.`}
                </p>
              </Panel>
              </>)}
            </>
          )}

          {/* ── 4. more: homework, the bank, the full builder ── */}
          {!loading && started && (
            <>
              <button type="button" className={`obg-more${more ? " is-open" : ""}`} aria-expanded={more} aria-controls="obg-more" onClick={() => setMore(!more)}>
                <span className="ocf2-row-t"><b>More</b><small>{moreSub.charAt(0).toUpperCase() + moreSub.slice(1)}</small></span>
                <CaretDown className="obg-caret" size={15} weight="bold" aria-hidden />
              </button>
              {more && (
                <div id="obg-more" className="obg-more-body">
                  {homework.length > 0 && (
                    <Panel>
                      <div className="ocf2-panel-h"><h3>Small steps from {budgeterFirst}</h3><span>{hwLeft ? `${hwLeft} to go` : "All done"}</span></div>
                      <div className="ocf2-rows">
                        {homework.map((t) => (
                          <button type="button" key={t.id} className={`ocf2-row${t.done ? " is-done" : ""}`} onClick={() => void toggle(t)} aria-pressed={!!t.done}>
                            <span className={`ocf2-tick${t.done ? " is-done" : ""}`}>{t.done ? <Check size={14} weight="bold" /> : null}</span>
                            <span className="ocf2-row-t"><b>{t.text}</b></span>
                          </button>
                        ))}
                      </div>
                    </Panel>
                  )}

                  {conns.length > 0 && (
                    <Panel>
                      <div className="ocf2-panel-h"><h3>Your bank</h3></div>
                      <div className="ocf2-rows">
                        {conns.map((c) => {
                          const bad = c.status === "login_required" || c.status === "error" || c.health === "stale";
                          const n = Array.isArray(c.accounts) ? c.accounts.length : 0;
                          return (
                            <div key={c.id} className="ocf2-row">
                              <span className={`ocf2-ico ocf2-t-${bad ? "butter" : "mint"}`}><Bank size={19} weight="bold" /></span>
                              <span className="ocf2-row-t"><b>{c.institution_name || "Bank"}</b><small>{[n ? `${n} account${n === 1 ? "" : "s"}` : null, c.last_synced_at ? `updated ${new Date(c.last_synced_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : null].filter(Boolean).join(" · ")}</small></span>
                              <span className={`ocf2-chip ocf2-t-${bad ? "butter" : "mint"}`}>{bad ? "Needs a quick sign-in" : "Connected"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </Panel>
                  )}

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <OBtn block kind="light" href={`${PORTAL_WEB_URL}/budget`}>Open the full budget builder <ArrowSquareOut size={16} /></OBtn>
                    <p className="ocf2-meta" style={{ textAlign: "center", marginTop: 8 }}>Connecting a bank and answering questions happen there.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !started && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
              <OBtn block kind="light" href={`${PORTAL_WEB_URL}/budget`}>Open the full budget builder <ArrowSquareOut size={16} /></OBtn>
              <p className="ocf2-meta" style={{ textAlign: "center", marginTop: 8 }}>Connecting a bank and answering questions happen there.</p>
            </div>
          )}
          <TalkFoot />
        </div>
      </IonContent>
    </IonPage>
  );
}
