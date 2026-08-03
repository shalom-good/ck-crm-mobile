import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useQueryClient } from "@tanstack/react-query";
import { CaretRight, CalendarBlank, CreditCard, Briefcase } from "@phosphor-icons/react";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import type { Family } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { SkeletonCard } from "@/components/Skeleton";

/**
 * Home — the warm-Brisk day screen (approved mockup): greeting, three
 * stat cards, "Needs me first" (attention-scored, lib/attention sorts),
 * "On track", the next appointment as a dark ink card, and quick links
 * to Payments + Job Funnel (which left the tab bar).
 */

const todayLabel = () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
const greetingWord = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** "Nd quiet" pill: red tint at >= 4 quiet days, green "Today"/"Nd" under. */
function TouchPill({ days }: { days: number | null }) {
  const warn = days != null && days >= 4;
  const label = days == null ? "No note" : days <= 0 ? "Today" : warn ? `${days}d quiet` : `${days}d`;
  return (
    <span className="tnum" style={{
      flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999,
      background: warn || days == null ? "var(--ck-warn-bg)" : "var(--ck-ok-bg)",
      color: warn || days == null ? "var(--ck-warn-fg)" : "var(--ck-ok-fg)",
    }}>{label}</span>
  );
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
  // Genuinely on track only: touched inside 4 days (the red-pill line).
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

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div style={{ padding: "calc(env(safe-area-inset-top) + 16px) 18px 130px" }}>
          {/* Greeting */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 25, lineHeight: "30px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ck-title)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {greetingWord()}, {first}
              </h1>
              <div style={{ fontSize: 13, color: "var(--ck-body)", marginTop: 3 }}>{role.label} · {todayLabel()}</div>
            </div>
            <button aria-label="Settings" onClick={() => router.push("/tabs/settings")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
              <Avatar name={me.name} size={46} />
            </button>
          </div>

          {/* Today stat cards */}
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <StatCard n={String(myFamilies.length)} label="families in my care" onClick={() => router.push("/tabs/families")} />
            <StatCard n={String(todays.length)} label="on the calendar today" />
            <StatCard n={String(attention.length)} label="need attention" warn={attention.length > 0} onClick={() => router.push("/tabs/families")} />
          </div>

          {/* Needs me first */}
          <SectionHead title="NEEDS ME FIRST" link="All families" onLink={() => router.push("/tabs/families")} />
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonCard /><SkeletonCard /></div>
          ) : needsMe.length === 0 ? (
            <EmptyRow>No one needs chasing right now. Nice.</EmptyRow>
          ) : (
            <ListCard>
              {needsMe.map(({ item, family }, i) => (
                <FamilyRow
                  key={item.id}
                  first={i === 0}
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
              <SectionHead title="ON TRACK" />
              <ListCard>
                {onTrack.map((f, i) => (
                  <FamilyRow key={f.id} first={i === 0} name={f.name} sub={familySub(f)} days={f.daysSinceLastNote} onOpen={() => open(f.id)} />
                ))}
              </ListCard>
            </>
          )}

          {/* Next appointment — dark ink card (only with real data) */}
          {nextMeeting && (
            <div style={{ marginTop: 18, background: "var(--ck-ink)", borderRadius: 20, padding: "15px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CalendarBlank size={18} weight="regular" color="#fff" />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "var(--ck-ink-text)", fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {nextMeeting.clientName} · {fmtTime(nextMeeting.at)}
                </div>
                <div style={{ color: "var(--ck-ink-sub)", fontSize: 11.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {nextMeeting.location || "Call"} · {nextMeeting.durationMin} min with {nextMeeting.expertName}
                </div>
              </div>
            </div>
          )}

          {/* Payments + Job Funnel — off the tab bar, still one tap away */}
          <SectionHead title="MORE" />
          <div style={{ display: "flex", gap: 10 }}>
            <LinkCard label="Payments" sub="Billing and history" icon={<CreditCard size={20} weight="regular" color="var(--ck-tint)" />} onClick={() => router.push("/tabs/payments")} />
            <LinkCard label="Job Funnel" sub="The shared board" icon={<Briefcase size={20} weight="regular" color="var(--ck-tint)" />} onClick={() => router.push("/tabs/job-funnel")} />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

function StatCard({ n, label, warn, onClick }: { n: string; label: string; warn?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="shadow-card" style={{ flex: 1, minWidth: 0, textAlign: "left", background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 18, padding: "14px 14px 12px", cursor: onClick ? "pointer" : "default" }}>
      <div className="tnum" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: warn ? "var(--ck-danger)" : "var(--ck-title)" }}>{n}</div>
      <div style={{ fontSize: 11.5, color: "var(--ck-body)", marginTop: 2, lineHeight: 1.3 }}>{label}</div>
    </button>
  );
}

function SectionHead({ title, link, onLink }: { title: string; link?: string; onLink?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "22px 2px 10px" }}>
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.09em", color: "var(--ck-label)" }}>{title}</h2>
      {link && (
        <button onClick={onLink} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--ck-tint)" }}>{link}</button>
      )}
    </div>
  );
}

function ListCard({ children }: { children: React.ReactNode }) {
  return <div className="shadow-card" style={{ background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 20, overflow: "hidden" }}>{children}</div>;
}

function FamilyRow({ first, name, sub, days, onOpen }: { first: boolean; name: string; sub: string; days: number | null; onOpen: () => void }) {
  return (
    <button onClick={onOpen} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: "none", border: "none", borderTop: first ? "none" : "1px solid var(--ck-hairline)", cursor: "pointer", textAlign: "left" }}>
      <Avatar name={name} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ck-title)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        {sub && <div style={{ fontSize: 11.5, color: "var(--ck-body)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
      </div>
      <TouchPill days={days} />
    </button>
  );
}

function LinkCard({ label, sub, icon, onClick }: { label: string; sub: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="shadow-card" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 11, textAlign: "left", background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 18, padding: "13px 14px", cursor: "pointer" }}>
      <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--ck-tint-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--ck-title)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--ck-body)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>
      </span>
      <CaretRight size={15} weight="bold" color="var(--ck-muted)" style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.6 }} />
    </button>
  );
}

const EmptyRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: "16px 14px", color: "var(--ck-body)", fontSize: 13.5, background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 20 }}>{children}</div>
);
