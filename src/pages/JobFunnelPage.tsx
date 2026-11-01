import { useMemo, useState } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import { syncedAgo } from "@/lib/time";
import { Av, Card, Chips, Empty, Pill, type Tint } from "@/components/gv";
import { SkeletonCard } from "@/components/Skeleton";
import { pipelineProgress, stageShort, stageTone } from "@/lib/pipeline";
import type { JobFunnelClient } from "@/lib/types";

type Filter = "all" | "active" | "idle";

// sky = early stages, yellow = in progress, mint = placed, plain = not started / on hold / closed
const STAGE_TINT: Record<ReturnType<typeof stageTone>, Tint> = {
  intake: "sky", mushki: "sky", jpa: "yellow", execution: "yellow", success: "mint", hold: "none", default: "none",
};

function JfCard({ c, i, onOpen }: { c: JobFunnelClient; i: number; onOpen: () => void }) {
  const prog = pipelineProgress(c.stage, c.pipelineSteps);
  const idle = c.daysSinceLastNote != null && c.daysSinceLastNote > 14;
  const sub = [c.jpa ? `JPA · ${c.jpa}` : "No JPA", c.daysInStage != null ? `${c.daysInStage}d in stage` : null].filter(Boolean).join(" · ");
  return (
    <Card i={i} onClick={onOpen} style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Av name={c.name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--gv-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
          <div className="gv-meta" style={{ marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
        </div>
        <Pill tint={STAGE_TINT[stageTone(c.stage)]} sm>{stageShort(c.stage)}</Pill>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <div className="gv-track"><i style={{ right: `${100 - prog.pct}%`, ["--i" as string]: i } as React.CSSProperties} /></div>
        <span className="tnum" style={{ fontSize: 12, fontWeight: 800, color: "var(--gv-ink)", flex: "none" }}>
          {prog.special ? stageShort(c.stage) : `${prog.completed}/${prog.total}`}
        </span>
        {idle && <Pill tint="yellow" sm>Idle · {c.daysSinceLastNote}d</Pill>}
      </div>
    </Card>
  );
}

export function JobFunnelPage() {
  const router = useIonRouter();
  const { role } = useRole();
  const { jobFunnel, jobFunnelLoading, lastSync } = useAppData();
  const [filter, setFilter] = useState<Filter>("all");

  const isIdle = (c: JobFunnelClient) => c.daysSinceLastNote != null && c.daysSinceLastNote > 14;
  const isActive = (c: JobFunnelClient) => !!c.stage && c.stage !== "Success" && !String(c.stage).startsWith("Close-out") && c.stage !== "On Hold";

  const list = useMemo(() => {
    const sorted = jobFunnel.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (filter === "idle") return sorted.filter(isIdle);
    if (filter === "active") return sorted.filter(isActive);
    return sorted;
  }, [jobFunnel, filter]);

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: jobFunnel.length },
    { key: "active", label: "Active", count: jobFunnel.filter(isActive).length },
    { key: "idle", label: "Idle", count: jobFunnel.filter(isIdle).length },
  ];

  const refresh = (e: CustomEvent<RefresherEventDetail>) => setTimeout(() => e.detail.complete(), 700);

  return (
    <IonPage>
      <IonContent>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 18px) 16px 0" }}>
          <h1 className="gv-h1">Job Funnel</h1>
          <div className="gv-meta" style={{ marginTop: 4 }}>{role.label} · {syncedAgo(lastSync)}</div>
          <div style={{ marginTop: 14 }}><Chips items={chips} active={filter} onChange={setFilter} /></div>
        </div>

        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div style={{ padding: "12px 16px 120px", display: "flex", flexDirection: "column", gap: 10, minHeight: "50vh" }}>
          {jobFunnelLoading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : list.length === 0 ? (
            <Empty action="Open families" onAction={() => router.push("/tabs/families")}>
              No Job Funnel clients assigned to you as {role.label}{filter !== "all" ? " match this filter" : " yet"}.
            </Empty>
          ) : (
            list.map((c, k) => <JfCard key={c.id} c={c} i={k} onOpen={() => router.push(`/job-funnel/${c.id}`)} />)
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
