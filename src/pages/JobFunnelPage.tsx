import { useMemo, useState, type CSSProperties } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import { syncedAgo } from "@/lib/time";
import { SkeletonCard } from "@/components/Skeleton";
import { pipelineProgress, stageShort, stageTone } from "@/lib/pipeline";
import type { JobFunnelClient } from "@/lib/types";
import { initialsOf } from "@/components/orchard/Orchard";
import { ToolHero, ToolTiles, ToolEmpty } from "@/components/orchard/tools/ToolsKit";
import { JF_STAGE_BG, JF_STAGE_CHIP } from "@/components/orchard/tools/jobFunnelLook";

type Filter = "all" | "active" | "idle";

function JfCard({ c, i, onOpen }: { c: JobFunnelClient; i: number; onOpen: () => void }) {
  const prog = pipelineProgress(c.stage, c.pipelineSteps);
  const idle = c.daysSinceLastNote != null && c.daysSinceLastNote > 14;
  const tone = stageTone(c.stage);
  const sub = [c.jpa ? `JPA · ${c.jpa}` : "No JPA", c.daysInStage != null ? `${c.daysInStage}d in stage` : null].filter(Boolean).join(" · ");
  return (
    <button type="button" className="oco-card" onClick={onOpen} style={{ "--i": Math.min(i, 8) } as CSSProperties}>
      <div className="oco-card-hd">
        <span className="oco-av" style={{ background: JF_STAGE_BG[tone].bg, color: JF_STAGE_BG[tone].ink }} aria-hidden="true">{initialsOf(c.name)}</span>
        <div className="oco-main">
          <div className="oco-name">{c.name}</div>
          <div className="oco-meta">{sub}</div>
        </div>
        <span className="oco-caret" aria-hidden="true">›</span>
      </div>
      <div className="oco-chips">
        <span className={`oco-chip ${JF_STAGE_CHIP[tone]}`}>{stageShort(c.stage)}</span>
        {idle && <span className="oco-chip oco-chip--peach">Idle · {c.daysSinceLastNote}d</span>}
      </div>
      <div className="oco-progress">
        <div className="oco-bar"><i style={{ width: `${prog.pct}%` }} /></div>
        <b>{prog.special ? stageShort(c.stage) : `${prog.completed}/${prog.total}`}</b>
      </div>
    </button>
  );
}

/**
 * Job Funnel, in ORCHARD (2026-11-05). Hero, three tiles that double as
 * the All / Active / Idle filters, then white cards: stage chip, idle chip
 * (peach = late), and the pipeline bar.
 */
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

  const counts = { all: jobFunnel.length, active: jobFunnel.filter(isActive).length, idle: jobFunnel.filter(isIdle).length };
  const pickTile = (k: Filter) => setFilter(filter === k && k !== "all" ? "all" : k);

  const refresh = (e: CustomEvent<RefresherEventDetail>) => setTimeout(() => e.detail.complete(), 700);

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div className="oc-root oco-page">
          <ToolHero title="Job Funnel." tone="Clients finding work." bg="var(--oc-butter)"
            sub={`${role.label} · ${syncedAgo(lastSync)}`} />

          {!jobFunnelLoading && (
            <ToolTiles tiles={[
              { key: "all", label: "All clients", value: counts.all, bg: "var(--oc-card)", onClick: () => pickTile("all") },
              { key: "active", label: "Active", value: counts.active, bg: "var(--oc-mint)", on: filter === "active", onClick: () => pickTile("active") },
              { key: "idle", label: "Idle 14+ days", value: counts.idle, bg: "var(--oc-peach)", on: filter === "idle", onClick: () => pickTile("idle") },
            ]} />
          )}

          <div className="oco-list" style={{ minHeight: "40vh" }}>
            {jobFunnelLoading ? (
              <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
            ) : list.length === 0 ? (
              <ToolEmpty action="Open families" onAction={() => router.push("/tabs/families")}>
                No Job Funnel clients assigned to you as {role.label}{filter !== "all" ? " match this filter" : " yet"}.
              </ToolEmpty>
            ) : (
              list.map((c, k) => <JfCard key={c.id} c={c} i={k} onOpen={() => router.push(`/job-funnel/${c.id}`)} />)
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
