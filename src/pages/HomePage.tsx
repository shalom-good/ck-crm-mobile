import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, CreditCard, Briefcase } from "@phosphor-icons/react";
import type { CSSProperties, ReactNode } from "react";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import type { Family } from "@/lib/types";
import { Av, Card, Empty, Evt, Eyebrow, Pill, Row, Strip, type Stat } from "@/components/gv";
import { SkeletonCard } from "@/components/Skeleton";

/**
 * Home — the Grove day screen: greeting, ONE stat strip (families in my
 * care / on the calendar today / need attention), "Needs me first"
 * (attention-scored, lib/attention sorts), "On track", the next
 * appointment as a yellow schedule row, and two quiet link cards to
 * Payments + Job Funnel (which left the tab bar).
 */

const todayLabel = () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
const greetingWord = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

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

export function HomePage() {
  const router = useIonRouter();
  const qc = useQueryClient();
  const { role, me } = useRole();
  const { attentionForRole, familiesForRole, meetings, loading } = useAppData();

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

  const todays = [...meetings].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  const nextMeeting = todays[0];

  const refresh = async (e: CustomEvent<RefresherEventDetail>) => {
    await qc.invalidateQueries({ queryKey: ["families"] });
    e.detail.complete();
  };
  const open = (id: string) => router.push(`/family/${id}`);
  const goFamilies = () => router.push("/tabs/families");

  const stats: Stat[] = [
    { label: "families in my care", value: myFamilies.length, onClick: goFamilies },
    { label: "on the calendar today", value: todays.length },
    { label: "need attention", value: attention.length, warn: attention.length > 0, onClick: goFamilies },
  ];

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        {/* 130px at the bottom clears the tab bar + the raised Ask button. */}
        <div style={{ padding: "calc(env(safe-area-inset-top) + 16px) 16px 130px" }}>
          {/* Greeting */}
          <div className="gv-rise" style={{ "--i": 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 } as CSSProperties}>
            <div style={{ minWidth: 0 }}>
              <h1 className="gv-h1">{greetingWord()}, {first}</h1>
              <p className="gv-sub" style={{ marginTop: 4 }}>{role.label} · {todayLabel()}</p>
            </div>
            <button aria-label="Settings" onClick={() => router.push("/tabs/settings")} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", flex: "none" }}>
              <Av name={me.name} size={44} round />
            </button>
          </div>

          {/* Today — one strip, numbers count up, coral only when someone needs me */}
          <div style={{ marginTop: 18 }}>
            <Strip i={1} stats={stats} />
          </div>

          {/* Needs me first */}
          <Eyebrow right="All families" onRight={goFamilies}>Needs me first</Eyebrow>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonCard /><SkeletonCard /></div>
          ) : needsMe.length === 0 ? (
            <Empty>No one needs chasing right now. Nice.</Empty>
          ) : (
            <ListCard i={2}>
              {needsMe.map(({ item, family }) => (
                <FamilyRow
                  key={item.id}
                  name={family!.name}
                  sub={familySub(family!, item.reasons[0]?.label ?? null)}
                  days={family!.daysSinceLastNote}
                  onOpen={() => open(item.id)}
                />
              ))}
            </ListCard>
          )}

          {/* On track */}
          {onTrack.length > 0 && (
            <>
              <Eyebrow>On track</Eyebrow>
              <ListCard i={3}>
                {onTrack.map((f) => (
                  <FamilyRow key={f.id} name={f.name} sub={familySub(f)} days={f.daysSinceLastNote} onOpen={() => open(f.id)} />
                ))}
              </ListCard>
            </>
          )}

          {/* Coming up — yellow schedule row (only with real data) */}
          {nextMeeting && (
            <>
              <Eyebrow>Coming up</Eyebrow>
              <Evt
                i={4}
                tint="yellow"
                icon={<CalendarBlank size={16} weight="bold" color="var(--gv-ink)" />}
                title={`${nextMeeting.clientName} · ${fmtTime(nextMeeting.at)}`}
                sub={`${nextMeeting.location || "Call"} · ${nextMeeting.durationMin} min with ${nextMeeting.expertName}`}
              />
            </>
          )}

          {/* Payments + Job Funnel — off the tab bar, still one tap away */}
          <Eyebrow>More</Eyebrow>
          <div style={{ display: "flex", gap: 10 }}>
            <LinkCard i={5} label="Payments" sub="Billing and history" tint="sky" icon={<CreditCard size={18} weight="regular" color="var(--gv-skyInk)" />} onClick={() => router.push("/tabs/payments")} />
            <LinkCard i={6} label="Job Funnel" sub="The shared board" tint="apricot" icon={<Briefcase size={18} weight="regular" color="var(--gv-apricotInk)" />} onClick={() => router.push("/tabs/job-funnel")} />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** White card holding hairline-separated rows (no padding top/bottom: the rows carry it). */
function ListCard({ children, i }: { children: ReactNode; i?: number }) {
  return <Card i={i} style={{ padding: "2px 16px" }}>{children}</Card>;
}

function FamilyRow({ name, sub, days, onOpen }: { name: string; sub: string; days: number | null; onOpen: () => void }) {
  return (
    <Row onClick={onOpen}>
      <Av name={name} size={40} />
      <span className="t">
        <b>{name}</b>
        {sub && <span>{sub}</span>}
      </span>
      <TouchPill days={days} />
    </Row>
  );
}

function LinkCard({ label, sub, icon, tint, onClick, i }: { label: string; sub: string; icon: ReactNode; tint: "sky" | "apricot"; onClick: () => void; i?: number }) {
  return (
    <Card i={i} onClick={onClick} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 11, padding: "13px 14px" }}>
      <span className="gv-tile" style={{ background: `var(--gv-${tint})` }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--gv-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, lineHeight: 1.3, color: "var(--gv-mid)", marginTop: 1 }}>{sub}</span>
      </span>
    </Card>
  );
}
