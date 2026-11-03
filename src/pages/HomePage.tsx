import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type CSSProperties, type ReactNode } from "react";
import { monogram } from "@/lib/colorHash";
import { TopBar } from "@/components/TopBar";
import { IcBriefcase, IcCard, IcCheck } from "@/components/ckIcons";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import type { Family } from "@/lib/types";
import { Av, Card, Evt, Eyebrow, Pill, Row, Strip, type Stat } from "@/components/gv";
import { SkeletonCard } from "@/components/Skeleton";

/**
 * Home — the team's day (CK look, modelled on the App Store "For the
 * team" screen): the top bar, the date over "Good morning, Dina" with the
 * lime avatar, ONE stat strip (families / meetings today / need a look),
 * "Your tasks" (the attention engine's list, one line per family, a
 * checkbox to set it aside for today), "This week" (day chips, today in
 * lime, the week's meetings as pastel rows), "On track", and two link
 * cards to Payments + Job Funnel (which are not in the tab bar).
 */

const todayLabel = () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
const greetingWord = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Mon..Fri of this week (Sat/Sun show next week's Mon..Fri). */
function workWeek(now = new Date()) {
  const d = new Date(now); d.setHours(12, 0, 0, 0);
  const dow = d.getDay();
  const toMon = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow;
  d.setDate(d.getDate() + toMon);
  return Array.from({ length: 5 }, (_, k) => { const x = new Date(d); x.setDate(d.getDate() + k); return x; });
}

/** Note-recency pill: rose "Nd quiet" at >= 4 quiet days, mint "Today"/"Nd" under, plain when no note. */
function TouchPill({ days }: { days: number | null }) {
  const tnum: CSSProperties = { flex: "none", fontVariantNumeric: "tabular-nums" };
  if (days == null) return <Pill style={tnum}>No note</Pill>;
  if (days >= 4) return <Pill tint="rose" style={tnum}>{days}d quiet</Pill>;
  return <Pill tint="mint" style={tnum}>{days <= 0 ? "Today" : `${days}d`}</Pill>;
}

function familySub(f: Family, extra?: string | null): string {
  const stage = f.stage || (f.kind === "kdh" ? "Debt help" : f.lifecycleStatus === "Active" ? "Active care" : f.lifecycleStatus) || "";
  return [stage, extra].filter(Boolean).join(" · ");
}

/** "Andrew & Rivka Peterson" → "the Peterson family". */
const theFamily = (name: string) => {
  const last = name.trim().split(/\s+/).pop() || name;
  return /family$/i.test(name) ? name : `the ${last} family`;
};

/** One plain line per attention reason: what to do, not what is wrong. */
function taskLine(kind: string | undefined, label: string | undefined, name: string): string {
  const fam = theFamily(name);
  if (kind === "flag") return `Look at the director flag on ${fam}`;
  if (kind === "new") return `Make first contact with ${fam}`;
  if (kind === "net") return `Go over this month's numbers with ${fam}`;
  if (label && /payment/i.test(label)) return `Check in with ${fam} about their payment`;
  return `Check in with ${fam}`;
}

const DONE_KEY = "ck-home-set-aside";
const dayKey = () => new Date().toISOString().slice(0, 10);
function readSetAside(): string[] {
  try { const v = JSON.parse(localStorage.getItem(DONE_KEY) || "{}"); return v.day === dayKey() && Array.isArray(v.ids) ? v.ids : []; } catch { return []; }
}

export function HomePage() {
  const router = useIonRouter();
  const qc = useQueryClient();
  const { role, me } = useRole();
  const { attentionForRole, familiesForRole, meetings, loading } = useAppData();
  const [setAside, setSetAside] = useState<string[]>(readSetAside);
  const toggleAside = (id: string) => setSetAside((prev) => {
    const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    try { localStorage.setItem(DONE_KEY, JSON.stringify({ day: dayKey(), ids: next })); } catch { /* noop */ }
    return next;
  });

  const attention = attentionForRole(role.key, me.name);
  const myFamilies = familiesForRole(role.key, me.name);
  const first = me.name.split(" ")[0];

  const byId = new Map(myFamilies.map((f) => [f.id, f]));
  const needsMe = attention
    .map((a) => ({ item: a, family: byId.get(a.id) }))
    .filter((x) => x.family)
    .slice(0, 5);
  const needIds = new Set(needsMe.map((x) => x.item.id));
  // Genuinely on track only: touched inside 4 days (the rose-pill line).
  const onTrack = myFamilies
    .filter((f) => !needIds.has(f.id) && f.active && f.daysSinceLastNote != null && f.daysSinceLastNote < 4)
    .sort((a, b) => (a.daysSinceLastNote ?? 99) - (b.daysSinceLastNote ?? 99))
    .slice(0, 5);

  const now = new Date();
  const week = workWeek(now);
  const sorted = [...meetings].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  const todays = sorted.filter((m) => sameDay(new Date(m.at), now));
  const [day, setDay] = useState<number>(() => Math.max(0, week.findIndex((d) => sameDay(d, now))));
  const dayMeetings = sorted.filter((m) => sameDay(new Date(m.at), week[day]));
  const openTasks = needsMe.filter((x) => !setAside.includes(x.item.id)).length;

  const refresh = async (e: CustomEvent<RefresherEventDetail>) => {
    await qc.invalidateQueries({ queryKey: ["families"] });
    e.detail.complete();
  };
  const open = (id: string) => router.push(`/family/${id}`);
  const goFamilies = () => router.push("/tabs/families");

  const stats: Stat[] = [
    { label: "Families", value: myFamilies.length, onClick: goFamilies },
    { label: "Meetings today", value: todays.length },
    { label: "Need a look", value: attention.length, warn: attention.length > 0, onClick: goFamilies },
  ];

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div style={{ padding: "calc(env(safe-area-inset-top) + 10px) 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <TopBar space="Team" />

          {/* Greeting: the date over "Good morning, Dina", the lime avatar */}
          <div className="gv-rise" style={{ "--i": 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 } as CSSProperties}>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="ck-kicker">{todayLabel()}</span>
              <h1 className="gv-h1">{greetingWord()}, {first}</h1>
            </div>
            <button className="ck-me" aria-label={`Settings for ${me.name}`} onClick={() => router.push("/tabs/settings")}>
              {monogram(me.name)}
            </button>
          </div>

          {/* Today — one strip, numbers count up, the attention count warm */}
          <Strip i={0} stats={stats} />

          {/* Your tasks — who needs me first, one plain line each */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonCard /><SkeletonCard /></div>
          ) : needsMe.length === 0 ? (
            <Card i={1}>
              <h2 className="gv-h2">Your tasks</h2>
              <p className="gv-sub" style={{ marginTop: 6, fontSize: 13.5 }}>No one needs chasing right now.</p>
            </Card>
          ) : (
            <Card i={1} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <h2 className="gv-h2">Your tasks</h2>
                <span className="gv-meta tnum">{openTasks} open</span>
              </div>
              {needsMe.map(({ item, family }) => {
                const done = setAside.includes(item.id);
                const reason = item.reasons[0];
                return (
                  <div key={item.id} style={{ display: "flex", gap: 2, alignItems: "flex-start", opacity: done ? 0.55 : 1 }}>
                    <button
                      aria-label={done ? `Bring back ${family!.name}` : `Set aside ${family!.name} for today`}
                      aria-pressed={done}
                      onClick={() => toggleAside(item.id)}
                      style={{ width: 44, height: 44, margin: "-11px 0 -11px -11px", display: "grid", placeItems: "center", background: "none", border: 0, padding: 0, cursor: "pointer", flex: "none" }}
                    >
                      <span style={{ width: 22, height: 22, borderRadius: 7, border: "2px solid var(--gv-go)", boxSizing: "border-box", background: done ? "var(--gv-go)" : "transparent", color: "var(--gv-lime)", display: "grid", placeItems: "center" }}>
                        {done && <IcCheck size={14} strokeWidth={3} />}
                      </span>
                    </button>
                    <button className="ck-task" style={{ minHeight: 0 }} onClick={() => open(item.id)}>
                      <span className="tx">
                        <b style={{ textDecoration: done ? "line-through" : "none" }}>{taskLine(reason?.kind, reason?.label, family!.name)}</b>
                        <span>{[reason?.label, family!.name].filter(Boolean).join(" · ")}</span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </Card>
          )}

          {/* This week — day chips (today lime), the day's meetings as pastel rows */}
          <Card i={2} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 className="gv-h2">This week</h2>
              <span className="gv-meta">{week[0].toLocaleDateString("en-US", { month: "long" })}</span>
            </div>
            <div className="ck-days" role="tablist" aria-label="This week">
              {week.map((d, k) => (
                <button key={k} role="tab" aria-selected={k === day} className={`ck-day${k === day ? " on" : ""}`} onClick={() => setDay(k)}>
                  <small>{d.toLocaleDateString("en-US", { weekday: "short" })}</small>
                  <b className="tnum">{d.getDate()}</b>
                </button>
              ))}
            </div>
            {dayMeetings.length === 0 ? (
              <p className="gv-meta" style={{ margin: 0, fontSize: 13 }}>Nothing on the calendar {sameDay(week[day], now) ? "today" : "this day"}.</p>
            ) : dayMeetings.map((m, k) => (
              <Evt
                key={m.id}
                tint={k % 2 ? "lavender" : "yellow"}
                title={m.clientName}
                sub={`${fmtTime(m.at)} · ${m.durationMin} min with ${m.expertName}${m.location ? ` · ${m.location}` : ""}`}
              />
            ))}
          </Card>

          {/* On track */}
          {onTrack.length > 0 && (
            <>
              <Eyebrow style={{ margin: "8px 2px -2px" }}>On track</Eyebrow>
              <ListCard i={3}>
                {onTrack.map((f) => (
                  <FamilyRow key={f.id} f={f} onOpen={() => open(f.id)} />
                ))}
              </ListCard>
            </>
          )}

          {/* Payments + Job Funnel — off the tab bar, still one tap away */}
          <div style={{ display: "flex", gap: 12 }}>
            <LinkCard i={4} label="Payments" sub="Billing and history" tint="sky" icon={<IcCard size={18} color="var(--gv-skyInk)" />} onClick={() => router.push("/tabs/payments")} />
            <LinkCard i={5} label="Job Funnel" sub="The shared board" tint="yellow" icon={<IcBriefcase size={18} color="var(--gv-yellowInk)" />} onClick={() => router.push("/tabs/job-funnel")} />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** White card holding hairline-separated rows (no padding top/bottom: the rows carry it). */
function ListCard({ children, i }: { children: ReactNode; i?: number }) {
  return <Card i={i} style={{ padding: "8px 16px" }}>{children}</Card>;
}

function FamilyRow({ f, onOpen }: { f: Family; onOpen: () => void }) {
  const sub = familySub(f);
  return (
    <Row onClick={onOpen}>
      <Av name={f.name} size={40} round tint={f.kind === "kdh" ? "apricot" : "mint"} className="keep" />
      <span className="t">
        <b>{f.name}</b>
        {sub && <span>{sub}</span>}
      </span>
      <TouchPill days={f.daysSinceLastNote} />
    </Row>
  );
}

function LinkCard({ label, sub, icon, tint, onClick, i }: { label: string; sub: string; icon: ReactNode; tint: "sky" | "yellow"; onClick: () => void; i?: number }) {
  return (
    <Card i={i} onClick={onClick} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 11, padding: "14px" }}>
      <span className="gv-tile" style={{ background: `var(--gv-${tint})`, borderRadius: 12 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--gv-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, lineHeight: 1.3, color: "var(--gv-mid)", marginTop: 1 }}>{sub}</span>
      </span>
    </Card>
  );
}
