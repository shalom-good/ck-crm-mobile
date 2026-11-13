import { useState, type CSSProperties } from "react";
import { BackButton } from "@/components/BackButton";
import { useParams } from "react-router";
import { IonPage, IonContent } from "@ionic/react";
import { Phone, ChatText, Check } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { money } from "@/lib/format";
import { AiSummary } from "@/components/AiSummary";
import { pipelineProgress, stageShort, stageTone, type EnrichedStep } from "@/lib/pipeline";
import { initialsOf } from "@/components/orchard/Orchard";
import { ToolTiles, type ToolTile } from "@/components/orchard/tools/ToolsKit";
import { JF_STAGE_CHIP } from "@/components/orchard/tools/jobFunnelLook";

const STEP_CHIP: Record<EnrichedStep["status"], { cls: string; label: string }> = {
  completed: { cls: "oco-chip--mint", label: "Done" },
  working: { cls: "oco-chip--sky", label: "Working" },
  pending: { cls: "", label: "Pending" },
  "on-hold": { cls: "oco-chip--butter", label: "On hold" },
  closed: { cls: "", label: "Closed" },
};

/** `money`, compacted above $10k so three tiles fit at 320. */
const fmt = (n: number) => {
  if (n < 10000) return money(n);
  const k = n / 1000;
  return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
};

function StepCheck({ status }: { status: EnrichedStep["status"] }) {
  if (status === "completed") return <span className="oco-check is-done"><Check size={12} weight="bold" /></span>;
  if (status === "working") return <span className="oco-check is-working" />;
  return <span className="oco-check" />;
}

/**
 * Job Funnel client, in ORCHARD (2026-11-05): a mint profile hero (who,
 * stage, pipeline bar, Call / Text), income tiles, the AI rundown, the
 * collapsible pipeline checklist and the JPA running notes.
 */
export function JobFunnelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getJfClient } = useAppData();
  const [pipeOpen, setPipeOpen] = useState(false);
  const c = getJfClient(id);

  if (!c) {
    return (
      <IonPage>
        <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
          <div className="oc-root oco-page">
            <div className="oco-hero-top" style={{ margin: 0 }}><BackButton href="/tabs/job-funnel" /></div>
            <div className="oco-empty">Client not found.</div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const prog = pipelineProgress(c.stage, c.pipelineSteps);
  const gap = c.targetIncome != null && c.currentIncome != null ? c.targetIncome - c.currentIncome : null;
  const idle = c.daysSinceLastNote != null && c.daysSinceLastNote > 14;
  const noteBlocks = (c.jpaLatestNote ?? "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
  const place = [c.city, c.state].filter(Boolean).join(", ");
  const meta = [place || null, c.jpa ? `JPA · ${c.jpa}` : "No JPA", c.daysInStage != null ? `${c.daysInStage}d in stage` : null].filter(Boolean).join(" · ");
  const tel = (c.phone || "").trim();
  const stageCls = JF_STAGE_CHIP[stageTone(c.stage)];
  const off = (on: boolean) => (on ? undefined : ("true" as const));

  // income → target as tiles; the gap is peach when short, mint when over
  const tiles: ToolTile[] = [];
  if (c.currentIncome != null) tiles.push({ key: "cur", label: "Current", value: fmt(c.currentIncome), bg: "var(--oc-card)" });
  if (c.targetIncome != null) tiles.push({ key: "tgt", label: "Target", value: fmt(c.targetIncome), bg: "var(--oc-sky)" });
  if (gap != null) tiles.push({ key: "gap", label: gap >= 0 ? "To target" : "Over target", value: fmt(Math.abs(gap)), bg: gap > 0 ? "var(--oc-peach)" : "var(--oc-mint)" });

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
        <div className="oc-root">
          {/* Mint hero */}
          <div className="oc-hero">
            <div className="oc-hero-top">
              <BackButton href="/tabs/job-funnel" />
              <span>Job Funnel</span>
              <span style={{ width: 44 }} aria-hidden="true" />
            </div>
            <div className="oco-id">
              <span className="oco-id-av" aria-hidden="true">{initialsOf(c.name)}</span>
              <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <h1 className="oco-id-name">{c.name}</h1>
                <span className="oco-id-meta">{meta}</span>
                <div className="oco-chips">
                  <span className={`oco-chip ${stageCls}`} style={stageCls ? undefined : { background: "var(--oc-card)" }}>{stageShort(c.stage)}</span>
                  {idle && <span className="oco-chip oco-chip--peach">Idle · {c.daysSinceLastNote}d</span>}
                  {c.daysInFunnel != null && <span className="oco-chip" style={{ background: "var(--oc-card)" }}>{c.daysInFunnel}d in funnel</span>}
                </div>
              </div>
            </div>
            <div className="oco-progress">
              <div className="oco-bar" style={{ background: "rgba(255,255,255,.7)" }}><i style={{ width: `${prog.pct}%` }} /></div>
              <b>{prog.special ? stageShort(c.stage) : `${prog.completed} / ${prog.total}`}</b>
            </div>
            <div className="oco-quick">
              <a className="is-primary" href={tel ? `tel:${tel}` : undefined} aria-disabled={off(!!tel)}><Phone size={18} weight="bold" /> Call</a>
              <a href={tel ? `sms:${tel}` : undefined} aria-disabled={off(!!tel)}><ChatText size={18} weight="bold" /> Text</a>
            </div>
          </div>

          <div style={{ padding: "14px 16px 130px", display: "flex", flexDirection: "column", gap: 12 }}>
            {tiles.length > 0 && <ToolTiles tiles={tiles} />}

            {/* AI summary: thorough auto-run rundown. */}
            <AiSummary id={c.id} className="oco-panel oco-ai" />

            {/* Pipeline: collapsible */}
            <div className="oco-panel">
              <button type="button" className="oco-toggle" aria-expanded={pipeOpen} onClick={() => setPipeOpen((o) => !o)}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 800 }}>Pipeline</span>
                  <small style={{ fontSize: 12.5, fontWeight: 700, color: "var(--oc-mid)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {prog.completed}/{prog.total}{c.stage ? ` · ${stageShort(c.stage)}` : ""}
                  </small>
                </span>
                <span className="oco-link">{pipeOpen ? "Hide" : "Show"}</span>
              </button>
              {pipeOpen && (
                <div className="oco-steps">
                  {prog.steps.map((s) => {
                    const p = STEP_CHIP[s.status] ?? STEP_CHIP.pending;
                    return (
                      <div key={s.num} className="oco-step" style={{ paddingLeft: s.indent ? 18 : 0 }}>
                        <StepCheck status={s.status} />
                        <span className="oco-step-num">{s.num}</span>
                        <span className="oco-step-title" style={{ fontSize: s.indent ? 13 : 13.5, color: s.status === "pending" ? "var(--oc-mid)" : "var(--oc-ink)", fontWeight: s.status === "working" ? 800 : 600 }}>{s.title}</span>
                        <span className={`oco-chip ${p.cls}`}>{p.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* JPA running notes */}
            <div className="oco-panel">
              <div className="oco-panel-hd">
                <span>JPA running notes</span>
                {idle && <span className="oco-chip oco-chip--peach">Idle · {c.daysSinceLastNote}d</span>}
              </div>
              {noteBlocks.length === 0 ? (
                <div style={{ fontSize: 13.5, color: "var(--oc-mid)", fontWeight: 600 }}>No running notes yet.</div>
              ) : (
                <div>
                  {noteBlocks.map((b, i) => <div key={i} className="oco-note">{b}</div>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
