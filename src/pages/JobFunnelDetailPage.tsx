import { useState } from "react";
import { useParams } from "react-router";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton } from "@ionic/react";
import { Phone, ChatText, CaretDown, CaretRight, Check, ArrowRight } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { money } from "@/lib/format";
import { ScoreBar } from "@/components/ScoreBar";
import { AiSummary } from "@/components/AiSummary";
import { pipelineProgress, stageShort, stageTone, type EnrichedStep } from "@/lib/pipeline";

const TONE: Record<string, { bg: string; text: string }> = {
  intake: { bg: "#EAF1FE", text: "#2E5E9E" },
  mushki: { bg: "#EFEAFB", text: "#5A4FA3" },
  jpa: { bg: "#F3EBD6", text: "#8A6A1E" },
  execution: { bg: "#E7F1EB", text: "#347A3C" },
  success: { bg: "#E7F1EB", text: "#347A3C" },
  hold: { bg: "#F3EBD6", text: "#8A6A1E" },
  default: { bg: "#F0F0F2", text: "#6B6B70" },
};

function StepCheck({ status }: { status: EnrichedStep["status"] }) {
  if (status === "completed")
    return <span style={{ width: 20, height: 20, borderRadius: 999, background: "#347A3C", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Check size={12} color="#fff" weight="bold" /></span>;
  if (status === "working")
    return <span style={{ width: 20, height: 20, borderRadius: 999, background: "#2E5E9E", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: "#fff" }} /></span>;
  return <span style={{ width: 20, height: 20, borderRadius: 999, border: "1.5px solid #D4D2CD", flexShrink: 0 }} />;
}

function StatusPill({ status }: { status: EnrichedStep["status"] }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: "#E7F1EB", text: "#347A3C", label: "Done" },
    working: { bg: "#EAF1FE", text: "#2E5E9E", label: "Working" },
    pending: { bg: "#F2F2F3", text: "#9A9AA0", label: "Pending" },
    "on-hold": { bg: "#F3EBD6", text: "#8A6A1E", label: "On hold" },
    closed: { bg: "#F8E8DF", text: "#A8431A", label: "Closed" },
  };
  const s = map[status] ?? map.pending;
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.text, whiteSpace: "nowrap" }}>{s.label}</span>;
}

export function JobFunnelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getJfClient } = useAppData();
  const [pipeOpen, setPipeOpen] = useState(false);
  const c = getJfClient(id);

  if (!c) return <IonPage><IonContent className="ion-padding">Client not found.</IonContent></IonPage>;

  const prog = pipelineProgress(c.stage, c.pipelineSteps);
  const tone = TONE[stageTone(c.stage)] ?? TONE.default;
  const gap = c.targetIncome != null && c.currentIncome != null ? c.targetIncome - c.currentIncome : null;
  const idle = c.daysSinceLastNote != null && c.daysSinceLastNote > 14;
  const noteBlocks = (c.jpaLatestNote ?? "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).slice(0, 8);

  const card: React.CSSProperties = { background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 16, padding: 16, boxShadow: "0 1px 2px rgba(17,17,26,0.04)" };
  const label: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ck-muted)" };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
          <IonButtons slot="start"><IonBackButton defaultHref="/tabs/job-funnel" text="" /></IonButtons>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ck-title)", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 8px" }}>{c.name}</div>
          <IonButtons slot="end"><span style={{ width: 40 }} /></IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <div style={{ padding: "8px 16px 120px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Snapshot */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, padding: "3px 11px", borderRadius: 999, background: tone.bg, color: tone.text }}>{stageShort(c.stage)}</span>
              {c.jpa && <span style={{ fontSize: 12.5, color: "var(--ck-body)" }}><span style={label}>JPA</span> {c.jpa}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
              <ScoreBar value={prog.pct} segments={13} width={11} showValue={false} />
              <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: "var(--ck-title)" }}>
                {prog.special ? stageShort(c.stage) : `${prog.completed} / ${prog.total}`}
              </span>
              {idle && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#8A6A1E", background: "#F3EBD6", borderRadius: 999, padding: "2px 9px" }}>Idle · {c.daysSinceLastNote}d</span>}
            </div>
            {/* income → target */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--ck-hairline)" }}>
              <div><div style={label}>Current</div><div className="tnum" style={{ fontSize: 18, fontWeight: 700, color: "var(--ck-title)" }}>{c.currentIncome != null ? money(c.currentIncome) : "—"}</div></div>
              <ArrowRight size={15} color="#B7B5B0" />
              <div><div style={label}>Target</div><div className="tnum" style={{ fontSize: 18, fontWeight: 700, color: "#347A3C" }}>{c.targetIncome != null ? money(c.targetIncome) : "—"}</div></div>
              {gap != null && <div style={{ marginLeft: "auto" }}><div style={label}>To target</div><div className="tnum" style={{ fontSize: 14, fontWeight: 700, color: "#C2531F" }}>{gap >= 0 ? "+" : "−"}{money(Math.abs(gap))}</div></div>}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <a href={`tel:${c.phone}`} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 0", borderRadius: 12, border: "1px solid var(--ck-hairline)", background: "var(--ck-card)", color: "var(--ck-title)", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}><Phone size={16} /> Call</a>
              <a href={`sms:${c.phone}`} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 0", borderRadius: 12, border: "1px solid var(--ck-hairline)", background: "var(--ck-card)", color: "var(--ck-title)", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}><ChatText size={16} /> Text</a>
            </div>
          </div>

          {/* AI summary — thorough auto-run rundown. */}
          <AiSummary id={c.id} />

          {/* Pipeline — collapsible */}
          <div style={card}>
            <button onClick={() => setPipeOpen((o) => !o)} style={{ width: "100%", background: "none", border: 0, padding: 0, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {pipeOpen ? <CaretDown size={13} color="var(--ck-muted)" /> : <CaretRight size={13} color="var(--ck-muted)" />}
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ck-title)" }}>Pipeline</span>
                <span style={{ fontSize: 12, color: "var(--ck-muted)" }}>· {prog.completed}/{prog.total}{c.stage ? ` · ${stageShort(c.stage)}` : ""}</span>
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#2E5E9E", background: "#EAF1FE", borderRadius: 999, padding: "3px 10px" }}>{pipeOpen ? "Hide" : "Show"}</span>
            </button>
            {pipeOpen && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column" }}>
                {prog.steps.map((s) => (
                  <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", paddingLeft: s.indent ? 18 : 0, borderTop: "0.5px solid var(--ck-hairline)" }}>
                    <StepCheck status={s.status} />
                    <span className="tnum" style={{ fontSize: 12, color: "var(--ck-muted)", width: 28, flexShrink: 0 }}>{s.num}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: s.indent ? 13.5 : 14, color: s.status === "pending" ? "var(--ck-muted)" : "var(--ck-title)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                    <StatusPill status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JPA running notes */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: noteBlocks.length ? 12 : 0 }}>
              <span style={{ ...label, fontSize: 11 }}>JPA running notes</span>
              {idle && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#8A6A1E", background: "#F3EBD6", borderRadius: 999, padding: "2px 8px" }}>Idle · {c.daysSinceLastNote}d</span>}
            </div>
            {noteBlocks.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ck-muted)", fontStyle: "italic" }}>No running notes yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {noteBlocks.map((b, i) => (
                  <div key={i} style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ck-body)", paddingBottom: 10, borderBottom: i < noteBlocks.length - 1 ? "0.5px solid var(--ck-hairline)" : "none" }}>{b}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
