import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { useParams } from "react-router";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons } from "@ionic/react";
import { Phone, ChatText, CaretDown, CaretRight, Check } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { money } from "@/lib/format";
import { AiSummary } from "@/components/AiSummary";
import { Av, Btn, Card, CardTitle, Pill, Strip, type Stat, type Tint } from "@/components/gv";
import { pipelineProgress, stageShort, stageTone, type EnrichedStep } from "@/lib/pipeline";

// sky = early stages, yellow = in progress, mint = placed, plain = not started / on hold / closed
const STAGE_TINT: Record<ReturnType<typeof stageTone>, Tint> = {
  intake: "sky", mushki: "sky", jpa: "yellow", execution: "yellow", success: "mint", hold: "none", default: "none",
};

const STEP_PILL: Record<EnrichedStep["status"], { tint: Tint; label: string }> = {
  completed: { tint: "mint", label: "Done" },
  working: { tint: "sky", label: "Working" },
  pending: { tint: "none", label: "Pending" },
  "on-hold": { tint: "yellow", label: "On hold" },
  closed: { tint: "none", label: "Closed" },
};

/** `money`, compacted above $10k so three cells fit a 320 strip. */
const fmt = (n: number) => {
  if (n < 10000) return money(n);
  const k = n / 1000;
  return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
};

function StepCheck({ status }: { status: EnrichedStep["status"] }) {
  const base: React.CSSProperties = { width: 20, height: 20, borderRadius: 999, display: "grid", placeItems: "center", flex: "none" };
  if (status === "completed") return <span style={{ ...base, background: "var(--gv-go)" }}><Check size={12} color="#fff" weight="bold" /></span>;
  if (status === "working") return <span style={{ ...base, boxShadow: "inset 0 0 0 2px var(--gv-go)" }}><span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--gv-go)" }} /></span>;
  return <span style={{ ...base, boxShadow: "inset 0 0 0 1.5px var(--gv-line)" }} />;
}

export function JobFunnelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getJfClient } = useAppData();
  const [pipeOpen, setPipeOpen] = useState(false);
  const c = getJfClient(id);

  if (!c) return <IonPage><IonContent className="ion-padding">Client not found.</IonContent></IonPage>;

  const prog = pipelineProgress(c.stage, c.pipelineSteps);
  const gap = c.targetIncome != null && c.currentIncome != null ? c.targetIncome - c.currentIncome : null;
  const idle = c.daysSinceLastNote != null && c.daysSinceLastNote > 14;
  const noteBlocks = (c.jpaLatestNote ?? "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
  const place = [c.city, c.state].filter(Boolean).join(", ");
  const meta = [place || null, c.jpa ? `JPA · ${c.jpa}` : "No JPA", c.daysInStage != null ? `${c.daysInStage}d in stage` : null].filter(Boolean).join(" · ");

  // income → target as the one stat strip; the gap is the emphasised (coral) number when short
  const stats: Stat[] = [];
  if (c.currentIncome != null) stats.push({ label: "Current", value: c.currentIncome, fmt });
  if (c.targetIncome != null) stats.push({ label: "Target", value: c.targetIncome, fmt });
  if (gap != null) stats.push({ label: gap >= 0 ? "To target" : "Over target", value: Math.abs(gap), fmt, warn: gap > 0 });

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><BackButton href="/tabs/job-funnel" /></IonButtons>
          <div className="gv-meta" style={{ textAlign: "center", fontWeight: 700, padding: "0 8px" }}>Job Funnel</div>
          <IonButtons slot="end"><span style={{ width: 40 }} /></IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: "4px 16px 120px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* header: who, where they are, what to do */}
          <div className="gv-rise" style={{ ["--i" as string]: 0 } as React.CSSProperties}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Av name={c.name} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 className="gv-h1" style={{ fontSize: 24, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</h1>
                <div className="gv-meta" style={{ marginTop: 3, lineHeight: 1.4 }}>{meta}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <Pill tint={STAGE_TINT[stageTone(c.stage)]} i={0}>{stageShort(c.stage)}</Pill>
              {idle && <Pill tint="yellow" i={1}>Idle · {c.daysSinceLastNote}d</Pill>}
              {c.daysInFunnel != null && <Pill i={2}>{c.daysInFunnel}d in funnel</Pill>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
              <div className="gv-track"><i style={{ right: `${100 - prog.pct}%` }} /></div>
              <span className="tnum" style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gv-ink)", flex: "none" }}>
                {prog.special ? stageShort(c.stage) : `${prog.completed} / ${prog.total}`}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Btn ghost sm href={`tel:${c.phone}`} style={{ flex: 1 }}><Phone size={16} /> Call</Btn>
              <Btn ghost sm href={`sms:${c.phone}`} style={{ flex: 1 }}><ChatText size={16} /> Text</Btn>
            </div>
          </div>

          {stats.length > 0 && <Strip i={1} stats={stats} />}

          {/* AI summary — thorough auto-run rundown. */}
          <AiSummary id={c.id} />

          {/* Pipeline — collapsible */}
          <Card i={2}>
            <button onClick={() => setPipeOpen((o) => !o)} style={{ width: "100%", background: "none", border: 0, padding: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer", font: "inherit", color: "inherit", textAlign: "left" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {pipeOpen ? <CaretDown size={14} weight="bold" color="var(--gv-quiet)" /> : <CaretRight size={14} weight="bold" color="var(--gv-quiet)" />}
                <span className="gv-h2" style={{ fontSize: 15.5 }}>Pipeline</span>
                <span className="gv-meta tnum" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prog.completed}/{prog.total}{c.stage ? ` · ${stageShort(c.stage)}` : ""}</span>
              </span>
              <span className="gv-link" style={{ flex: "none" }}>{pipeOpen ? "Hide" : "Show"}</span>
            </button>
            {pipeOpen && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
                {prog.steps.map((s) => {
                  const p = STEP_PILL[s.status] ?? STEP_PILL.pending;
                  return (
                    <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", paddingLeft: s.indent ? 18 : 0, borderTop: "1px solid var(--gv-hair)" }}>
                      <StepCheck status={s.status} />
                      <span className="tnum gv-meta" style={{ width: 26, flex: "none" }}>{s.num}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: s.indent ? 13.5 : 14, color: s.status === "pending" ? "var(--gv-mid)" : "var(--gv-ink)", fontWeight: s.status === "working" ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                      <Pill tint={p.tint} sm>{p.label}</Pill>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* JPA running notes */}
          <Card i={3}>
            <CardTitle right={idle ? <Pill tint="yellow" sm>Idle · {c.daysSinceLastNote}d</Pill> : undefined}>JPA running notes</CardTitle>
            {noteBlocks.length === 0 ? (
              <div className="gv-sub" style={{ fontSize: 13.5 }}>No running notes yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {noteBlocks.map((b, i) => (
                  <div key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--gv-text)", padding: "10px 0", borderTop: i === 0 ? 0 : "1px solid var(--gv-hair)", overflowWrap: "anywhere" }}>{b}</div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </IonContent>
    </IonPage>
  );
}
