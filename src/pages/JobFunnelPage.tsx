import { useMemo, useState } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter, type RefresherEventDetail } from "@ionic/react";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import { syncedAgo } from "@/lib/time";
import { Header } from "@/components/Header";
import { TabPills } from "@/components/TabPills";
import { ScoreBar } from "@/components/ScoreBar";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Skeleton";
import { pipelineProgress, stageShort, stageTone } from "@/lib/pipeline";
import type { JobFunnelClient } from "@/lib/types";

type Filter = "all" | "active" | "idle";

const TONE: Record<string, { bg: string; text: string }> = {
  intake: { bg: "#EAF1FE", text: "#2E5E9E" },
  mushki: { bg: "#EFEAFB", text: "#5A4FA3" },
  jpa: { bg: "#F3EBD6", text: "#8A6A1E" },
  execution: { bg: "#E7F1EB", text: "#347A3C" },
  success: { bg: "#E7F1EB", text: "#347A3C" },
  hold: { bg: "#F3EBD6", text: "#8A6A1E" },
  default: { bg: "#F0F0F2", text: "#6B6B70" },
};

function StagePill({ stage }: { stage: string | null }) {
  const tone = TONE[stageTone(stage)] ?? TONE.default;
  return (
    <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999, backgroundColor: tone.bg, color: tone.text, whiteSpace: "nowrap" }}>
      {stageShort(stage)}
    </span>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "·";
}

function JfCard({ c, onOpen }: { c: JobFunnelClient; onOpen: () => void }) {
  const prog = pipelineProgress(c.stage, c.pipelineSteps);
  const idle = c.daysSinceLastNote != null && c.daysSinceLastNote > 14;
  return (
    <button
      onClick={onOpen}
      style={{
        textAlign: "left", width: "100%", background: "var(--ck-card)", border: "1px solid var(--ck-hairline)",
        borderRadius: "var(--ck-radius-card, 18px)", padding: 14, display: "flex", flexDirection: "column", gap: 10,
        boxShadow: "0 1px 2px rgba(17,17,26,0.04)", cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: "#F1ECE2", color: "#7A5E2A", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {initials(c.name)}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 650, color: "var(--ck-title)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
          <div style={{ fontSize: 12, color: "var(--ck-muted)", marginTop: 1 }}>
            {c.jpa ? `JPA · ${c.jpa}` : "No JPA"}{c.daysInStage != null ? ` · ${c.daysInStage}d in stage` : ""}
          </div>
        </div>
        <StagePill stage={c.stage} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <ScoreBar value={prog.pct} segments={13} width={9} showValue={false} />
        <span className="tnum" style={{ fontSize: 12, fontWeight: 600, color: "var(--ck-body)" }}>
          {prog.special ? stageShort(c.stage) : `${prog.completed}/${prog.total}`}
        </span>
        {idle && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#8A6A1E", background: "#F3EBD6", borderRadius: 999, padding: "2px 8px" }}>
            Idle · {c.daysSinceLastNote}d
          </span>
        )}
      </div>
    </button>
  );
}

export function JobFunnelPage() {
  const router = useIonRouter();
  const { role } = useRole();
  const { jobFunnel, jobFunnelLoading, lastSync } = useAppData();
  const [filter, setFilter] = useState<Filter>("all");

  const list = useMemo(() => {
    const sorted = jobFunnel.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (filter === "idle") return sorted.filter((c) => c.daysSinceLastNote != null && c.daysSinceLastNote > 14);
    if (filter === "active") return sorted.filter((c) => c.stage && c.stage !== "Success" && !String(c.stage).startsWith("Close-out") && c.stage !== "On Hold");
    return sorted;
  }, [jobFunnel, filter]);

  const tabs = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "idle", label: "Idle" },
  ];

  const refresh = (e: CustomEvent<RefresherEventDetail>) => setTimeout(() => e.detail.complete(), 700);

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <div style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
          <Header title="Job Funnel" subtitle={`${role.label} · ${syncedAgo(lastSync)}`} />
          <div style={{ padding: "2px 16px 10px" }}><TabPills tabs={tabs} active={filter} onChange={(k) => setFilter(k as Filter)} /></div>
        </div>

        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div style={{ padding: "4px 16px 120px", display: "flex", flexDirection: "column", gap: 12, minHeight: "50vh" }}>
          {jobFunnelLoading ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : list.length === 0 ? (
            <EmptyState
              stageColor={role.accent}
              message={`No Job Funnel clients assigned to you as ${role.label}${filter !== "all" ? " match this filter" : " yet"}.`}
              buttonLabel="Open families"
              onAdd={() => router.push("/tabs/families")}
            />
          ) : (
            list.map((c) => <JfCard key={c.id} c={c} onOpen={() => router.push(`/job-funnel/${c.id}`)} />)
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
