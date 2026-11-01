import { useMemo, useState } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, type RefresherEventDetail } from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowSquareOut, Bank, CalendarBlank, Check } from "@phosphor-icons/react";
import { fetchBudget, setHomeworkDone, PORTAL_WEB_URL } from "@/lib/portalApi";
import { Btn, Card, CardTitle, CountUp, Evt, Eyebrow, Pill, Row, Strip, PlantArt, type Stat } from "@/components/gv";

/**
 * My budget — the family's view of the Budget Builder (GET /api/portal/
 * budget, the same payload the web portal's budget page reads). One line
 * per row, one number per line, the plan vs. what the bank shows so far.
 * Connecting a bank and answering the budgeter's questions still happen
 * in the web builder (Plaid Link), reached from the button at the end.
 */

type Raw = Record<string, any>;
const usd = (cents: number) => `$${Math.round(Math.abs(cents) / 100).toLocaleString("en-US")}`;
const KINDS: { key: string; label: string }[] = [
  { key: "income", label: "Income" },
  { key: "fixed", label: "Essentials" },
  { key: "everyday", label: "Day to day" },
  { key: "set_aside", label: "Set aside" },
  { key: "debt", label: "Debt payments" },
  { key: "savings", label: "Savings" },
];

export function FamilyBudgetPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["budget"], queryFn: fetchBudget, staleTime: 30_000, retry: 1 });
  const refresh = async (e: CustomEvent<RefresherEventDetail>) => { await qc.invalidateQueries({ queryKey: ["budget"] }); e.detail.complete(); };
  const d: Raw | null | undefined = q.data;

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
  const tasks: Raw[] = Array.isArray(d?.tasks) ? d!.tasks : [];
  const review: Raw[] = Array.isArray(d?.review) ? d!.review : [];
  const conns: Raw[] = Array.isArray(d?.connections) ? d!.connections.filter((c: Raw) => !c.removed_at) : [];
  const budgeterFirst: string = d?.budgeter?.first || "your budgeter";
  const started = !!d?.started && lines.length > 0;

  const [hw, setHw] = useState<Raw[] | null>(null);
  const homework = hw ?? tasks;
  const toggle = async (t: Raw) => {
    const next = homework.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x));
    setHw(next);
    try { await setHomeworkDone(String(t.id), !t.done); } catch { setHw(homework); }
  };

  const stats: Stat[] = started ? [
    { label: "Income", value: income, fmt: usd },
    { label: "Going out", value: out, fmt: usd },
    { label: net < 0 ? "Short" : "Left over", value: Math.abs(net), fmt: usd, warn: net < 0 },
  ] : [];

  let i = 1;
  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 14px) 16px 120px" }}>
          <h1 className="gv-h1 gv-rise">My budget</h1>
          <p className="gv-sub gv-rise" style={{ "--i": 1, marginTop: 6 } as React.CSSProperties}>
            {q.isLoading ? "Adding it up…" : !d ? `Opens after your first session with ${budgeterFirst}.` : started ? `Built with ${budgeterFirst}. One line per thing, nothing hidden.` : `${d.budgeter?.name || "Your budgeter"} starts it with you in your first session.`}
          </p>

          {q.isError && (
            <Card i={i++} style={{ marginTop: 18 }}>
              <p className="gv-sub">We couldn't load your budget just now.</p>
              <div style={{ marginTop: 12 }}><Btn sm ghost onClick={() => q.refetch()}>Try again</Btn></div>
            </Card>
          )}

          {!q.isLoading && !q.isError && !started && (
            <Card i={i++} style={{ marginTop: 18, textAlign: "center" }}>
              <PlantArt width={130} />
              <h2 className="gv-h2" style={{ fontSize: 19, marginTop: 4 }}>Your budget starts in a session</h2>
              <p className="gv-sub" style={{ marginTop: 6 }}>You and {budgeterFirst} connect the bank once, confirm each line together, and it stays live here.</p>
              {d?.plan?.bookUrl && <div style={{ marginTop: 14 }}><Btn href={d.plan.bookUrl}><CalendarBlank size={18} weight="bold" /> Book a session</Btn></div>}
            </Card>
          )}

          {started && (
            <>
              <div style={{ marginTop: 16 }}><Strip i={i++} stats={stats} /></div>

              {mtd && (typeof mtd.income_cents === "number" || typeof mtd.spend_cents === "number") && (
                <Card i={i++} style={{ marginTop: 12 }}>
                  <CardTitle right={mtd.pendingCount ? <Pill tint="yellow">{mtd.pendingCount} pending</Pill> : undefined}>This month so far</CardTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><small className="gv-meta">Came in</small><div className="tnum" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", color: "var(--gv-ink)" }}><CountUp to={Math.round((mtd.income_cents || 0) / 100)} fmt={(n) => `$${n.toLocaleString("en-US")}`} /></div></div>
                    <div><small className="gv-meta">Went out</small><div className="tnum" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", color: "var(--gv-ink)" }}><CountUp to={Math.round((mtd.spend_cents || 0) / 100)} fmt={(n) => `$${n.toLocaleString("en-US")}`} /></div></div>
                  </div>
                </Card>
              )}

              {review.length > 0 && (
                <div className="gv-rise" style={{ "--i": i++, marginTop: 12 } as React.CSSProperties}>
                  <Evt tint="yellow" title={`${review.length} question${review.length === 1 ? "" : "s"} from ${budgeterFirst}`} sub="Answer them in the budget builder" onClick={() => window.open(`${PORTAL_WEB_URL}/budget`, "_blank")} right={<ArrowSquareOut size={16} color="var(--gv-ink)" />} />
                </div>
              )}

              {KINDS.filter((k) => (byKind[k.key] || []).length > 0).map((k) => (
                <div key={k.key}>
                  <Eyebrow right={usd(sum(k.key))}>{k.label}</Eyebrow>
                  <Card i={i++}>
                    {(byKind[k.key] || []).map((l) => {
                      const confirmed = !!l.client_confirmed_at || l.state === "on";
                      const flag = l.state === "flag";
                      const who = k.key === "income" && l.details?.who ? String(l.details.who) : null;
                      return (
                        <Row key={l.id}>
                          <span className="t">
                            <b style={{ fontWeight: 600 }}>{l.label || l.category}</b>
                            {(who || flag || l.period === "annual") && <span>{[who, l.period === "annual" ? "yearly, spread monthly" : null, flag ? `${budgeterFirst} will go over this` : null].filter(Boolean).join(" · ")}</span>}
                          </span>
                          <span className="tnum" style={{ fontSize: 15, fontWeight: 800, color: "var(--gv-ink)", flex: "none" }}>{usd(Number(l.amount_cents) || 0)}</span>
                          {confirmed ? <Pill tint="mint" sm><Check size={11} weight="bold" /></Pill> : flag ? <Pill tint="yellow" sm>?</Pill> : null}
                        </Row>
                      );
                    })}
                  </Card>
                </div>
              ))}

              {homework.length > 0 && (
                <>
                  <Eyebrow right={`${homework.filter((t) => !t.done).length} open`}>Budget homework</Eyebrow>
                  <Card i={i++}>
                    {homework.map((t) => (
                      <Row key={t.id} onClick={() => void toggle(t)}>
                        <span style={{ width: 26, height: 26, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: t.done ? "var(--gv-mint)" : "var(--gv-yellow)", color: t.done ? "var(--gv-mintInk)" : "var(--gv-yellowInk)" }}>{t.done ? <Check size={14} weight="bold" /> : <span style={{ width: 8, height: 8, borderRadius: 2, background: "currentColor", opacity: .5 }} />}</span>
                        <span className="t"><b style={{ whiteSpace: "normal", fontWeight: 600, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--gv-quiet)" : "var(--gv-ink)" }}>{t.text}</b></span>
                      </Row>
                    ))}
                  </Card>
                </>
              )}

              {conns.length > 0 && (
                <>
                  <Eyebrow>Connected banks</Eyebrow>
                  <Card i={i++}>
                    {conns.map((c) => {
                      const bad = c.status === "login_required" || c.status === "error" || c.health === "stale";
                      return (
                        <Row key={c.id}>
                          <span className="gv-tile" style={{ background: bad ? "var(--gv-rose)" : "var(--gv-mint)" }}><Bank size={18} color={bad ? "var(--gv-roseInk)" : "var(--gv-mintInk)"} /></span>
                          <span className="t"><b>{c.institution_name || "Bank"}</b><span>{(Array.isArray(c.accounts) ? c.accounts.length : 0) || ""}{Array.isArray(c.accounts) && c.accounts.length ? ` account${c.accounts.length === 1 ? "" : "s"}` : ""}{c.last_synced_at ? ` · synced ${new Date(c.last_synced_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</span></span>
                          <Pill tint={bad ? "rose" : "mint"} sm>{bad ? "Reconnect" : "Connected"}</Pill>
                        </Row>
                      );
                    })}
                  </Card>
                </>
              )}
            </>
          )}

          {!q.isLoading && (
            <div style={{ marginTop: 18 }}>
              <Btn block ghost href={`${PORTAL_WEB_URL}/budget`}>Open the full budget builder <ArrowSquareOut size={16} /></Btn>
              <p className="gv-meta" style={{ textAlign: "center", marginTop: 8 }}>Connecting a bank and answering questions happen there.</p>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
