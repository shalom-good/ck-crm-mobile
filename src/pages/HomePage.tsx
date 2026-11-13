import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, CreditCard, Briefcase, ArrowRight } from "@phosphor-icons/react";
import type { CSSProperties, ReactNode } from "react";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import type { Family } from "@/lib/types";
import { initialsOf } from "@/components/orchard/Orchard";
import { Chip, SquareAv } from "@/components/orchard/team/TeamKit";
import { SkeletonCard } from "@/components/Skeleton";

/**
 * Home, in ORCHARD (2026-11-05). Greeting hero (first name on lime, a
 * plain count sentence under it), one lime "next step" card for the
 * family at the top of the attention list, three colour tiles (families
 * in my care / on the calendar today / need attention), then "Needs me
 * first" (attention-scored, lib/attention sorts) and "On track" as white
 * cards, the next appointment as a butter row, and two link tiles to
 * Payments + Job Funnel (which left the tab bar).
 */

const todayLabel = () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
const greetingWord = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** Note-recency chip: peach "Nd quiet" at >= 4 quiet days, mint "Today"/"Nd" under, plain when no note. */
function TouchChip({ days }: { days: number | null }) {
  if (days == null) return <Chip>No notes yet</Chip>;
  if (days >= 4) return <Chip tone="peach">Quiet {days} days</Chip>;
  return <Chip tone="mint">{days <= 0 ? "Today" : `${days}d`}</Chip>;
}

function familySub(f: Family, extra?: string | null): string {
  const stage = f.stage || (f.kind === "kdh" ? "Debt help" : f.lifecycleStatus === "Active" ? "Active care" : f.lifecycleStatus) || "";
  return [stage, extra].filter(Boolean).join(" · ");
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
  // Genuinely on track only: touched inside 4 days (the peach-chip line).
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

  // The one thing: the top of the attention list.
  const top = needsMe[0];
  const topDays = top?.family?.daysSinceLastNote ?? null;
  const topBody = top
    ? [top.item.reasons.map((r) => r.label).slice(0, 2).join(", ") || null,
       topDays == null ? "No notes yet" : topDays <= 0 ? "Last note today" : `Last note ${topDays} days ago`]
        .filter(Boolean).join(". ") + "."
    : "";

  const line2 = loading
    ? "Loading your families."
    : attention.length > 0
      ? `${plural(attention.length, "family needs", "families need")} you today.`
      : myFamilies.length > 0
        ? `${plural(myFamilies.length, "family", "families")}, nobody waiting.`
        : "No families in your care yet.";

  const tiles: { key: string; label: string; n: number; tone: string; onClick?: () => void }[] = [
    { key: "care", label: "In my care", n: myFamilies.length, tone: "mint", onClick: goFamilies },
    { key: "today", label: "On the calendar", n: todays.length, tone: "sky" },
    { key: "attention", label: "Need attention", n: attention.length, tone: attention.length > 0 ? "peach" : "lilac", onClick: goFamilies },
  ];

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        {/* 130px at the bottom clears the tab bar + the raised Ask button. */}
        <div className="oc-root oct" style={{ padding: "calc(var(--ion-safe-area-top, 0px) + 14px) 16px 130px" }}>
          <div className="oct-top gv-rise" style={{ "--i": 0 } as CSSProperties}>
            <span className="oct-date">{todayLabel()}</span>
            <button type="button" className="oct-me" aria-label="Settings" onClick={() => router.push("/tabs/settings")}>
              {initialsOf(me.name)}
            </button>
          </div>

          {/* Greeting */}
          <header className="oct-hero gv-rise" style={{ "--i": 1 } as CSSProperties}>
            <h1 className="oct-h1">
              <span>{greetingWord()}, <mark>{first}</mark>.</span>
              <span className="oct-h1-2">{line2}</span>
            </h1>
            <span className="oct-hero-sub">{role.label}</span>
          </header>

          {/* Next step: the single most important family */}
          {!loading && top && (
            <section className="oct-next gv-rise" aria-label="Next step" style={{ "--i": 2 } as CSSProperties}>
              <span className="oct-kicker">Next step</span>
              <h2 className="oct-next-t">Check in with {top.family!.name}</h2>
              <p className="oct-next-b">{topBody}</p>
              <div className="oct-next-a">
                <button type="button" className="oct-btn" onClick={() => open(top.item.id)}>
                  Open family <ArrowRight size={15} weight="bold" />
                </button>
                {attention.length > 1 && (
                  <button type="button" className="oct-btn oct-btn--soft" onClick={goFamilies}>
                    {attention.length - 1} more
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Today: three colour tiles */}
          <div className="oct-tiles gv-rise" style={{ "--i": 3 } as CSSProperties}>
            {tiles.map((t) => (
              <button key={t.key} type="button" className={`oct-tile oct-t-${t.tone}`} onClick={t.onClick} disabled={!t.onClick}>
                <span>{t.label}</span>
                <b>{loading ? "·" : t.n}</b>
              </button>
            ))}
          </div>

          {/* Needs me first */}
          <SectionHead title="Needs me first" action="All families" onAction={goFamilies} />
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonCard /><SkeletonCard /></div>
          ) : needsMe.length === 0 ? (
            <div className="oct-empty">No one needs chasing right now. Nice.</div>
          ) : (
            <ListCard i={4}>
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
              <SectionHead title="On track" />
              <ListCard i={5}>
                {onTrack.map((f) => (
                  <FamilyRow key={f.id} name={f.name} sub={familySub(f)} days={f.daysSinceLastNote} onOpen={() => open(f.id)} />
                ))}
              </ListCard>
            </>
          )}

          {/* Coming up: butter row (only with real data) */}
          {nextMeeting && (
            <>
              <SectionHead title="Coming up" />
              <div className="oct-soon gv-rise" style={{ "--i": 6 } as CSSProperties}>
                <span className="oct-soon-ic"><CalendarBlank size={18} weight="bold" /></span>
                <span className="oct-soon-t" style={{ minWidth: 0 }}>
                  <b>{nextMeeting.clientName} · {fmtTime(nextMeeting.at)}</b>
                  <span>{nextMeeting.location || "Call"} · {nextMeeting.durationMin} min with {nextMeeting.expertName}</span>
                </span>
              </div>
            </>
          )}

          {/* Payments + Job Funnel: off the tab bar, still one tap away */}
          <SectionHead title="More" />
          <div className="oct-links gv-rise" style={{ "--i": 7 } as CSSProperties}>
            <LinkTile label="Payments" sub="Billing and history" bg="var(--oc-sky)" fg="#23415F" icon={<CreditCard size={18} weight="bold" />} onClick={() => router.push("/tabs/payments")} />
            <LinkTile label="Job Funnel" sub="The shared board" bg="var(--oc-peach)" fg="#6B3A1C" icon={<Briefcase size={18} weight="bold" />} onClick={() => router.push("/tabs/job-funnel")} />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="oct-head">
      <h2>{title}</h2>
      {action && onAction && <button type="button" onClick={onAction}>{action}</button>}
    </div>
  );
}

/** White card holding hairline-separated rows. */
function ListCard({ children, i }: { children: ReactNode; i?: number }) {
  return <div className="oct-card gv-rise" style={{ "--i": i } as CSSProperties}>{children}</div>;
}

function FamilyRow({ name, sub, days, onOpen }: { name: string; sub: string; days: number | null; onOpen: () => void }) {
  return (
    <button type="button" className="oct-row" onClick={onOpen}>
      <SquareAv name={name} />
      <span className="oct-row-t">
        <b>{name}</b>
        {sub && <span>{sub}</span>}
      </span>
      <TouchChip days={days} />
    </button>
  );
}

function LinkTile({ label, sub, icon, bg, fg, onClick }: { label: string; sub: string; icon: ReactNode; bg: string; fg: string; onClick: () => void }) {
  return (
    <button type="button" className="oct-link" onClick={onClick}>
      <span className="oct-link-ic" style={{ background: bg, color: fg }}>{icon}</span>
      <span className="oct-link-t" style={{ minWidth: 0 }}>
        <b>{label}</b>
        <span>{sub}</span>
      </span>
    </button>
  );
}
