// pipeline.ts — Job Funnel pipeline logic, ported from the desktop CRM
// (components/job-funnel/pipelineSteps.js). 13 steps, status derived from the
// canonical stage with manual per-step overrides winning.

export type StepStatus = "completed" | "working" | "pending" | "on-hold" | "closed";

export const STAGE_ORDER = [
  "Pre-funnel",
  "Step 4: Intake",
  "Step 5: Homework",
  "Step 6: Mushki Session",
  "Step 7: Lead Generation",
  "Step 8: JPA Assignment",
  "Step 9: JPA Execution",
  "Success",
];

export interface PipelineStep {
  num: string;
  title: string;
  parent: string;
  indent: 0 | 1;
}

export const STEPS: PipelineStep[] = [
  { num: "3", title: "CM + budgeter notes", parent: "Pre-funnel", indent: 0 },
  { num: "4", title: "Intake Meeting", parent: "Step 4: Intake", indent: 0 },
  { num: "4.2", title: "Resume edited", parent: "Step 4: Intake", indent: 1 },
  { num: "4.3", title: "LinkedIn", parent: "Step 4: Intake", indent: 1 },
  { num: "4.4", title: "Called References", parent: "Step 4: Intake", indent: 1 },
  { num: "4.5", title: "Write up notes and send to Mushky", parent: "Step 4: Intake", indent: 1 },
  { num: "5", title: "Homework Cycle", parent: "Step 5: Homework", indent: 0 },
  { num: "5.4", title: "Signed Document", parent: "Step 5: Homework", indent: 1 },
  { num: "6", title: "Strategy Sessions with Internal Recruiting", parent: "Step 6: Mushki Session", indent: 0 },
  { num: "6.2", title: "Get Information From Mushky", parent: "Step 6: Mushki Session", indent: 1 },
  { num: "7", title: "Lead Generation (AI Assisted)", parent: "Step 7: Lead Generation", indent: 0 },
  { num: "8", title: "JPA Assignment", parent: "Step 8: JPA Assignment", indent: 0 },
  { num: "9", title: "JPA Execution", parent: "Step 9: JPA Execution", indent: 0 },
];

function stageIndex(stage: string | null | undefined): number {
  if (!stage) return 0;
  if (stage === "On Hold" || stage === "Close-out (3 strikes)") return -1;
  const i = STAGE_ORDER.indexOf(stage);
  return i >= 0 ? i : 0;
}

export function statusFor(step: PipelineStep, stage: string | null | undefined): StepStatus {
  if (stage === "Success") return "completed";
  if (stage === "On Hold") return "on-hold";
  if (stage === "Close-out (3 strikes)") return "closed";
  const cur = stageIndex(stage);
  const stp = stageIndex(step.parent);
  if (stp < cur) return "completed";
  if (stp === cur) return "working";
  return "pending";
}

export interface EnrichedStep extends PipelineStep {
  status: StepStatus;
}

export function pipelineProgress(
  stage: string | null | undefined,
  overrides: Record<string, StepStatus> = {},
): { steps: EnrichedStep[]; completed: number; working: number; total: number; special: boolean; pct: number } {
  const steps = STEPS.map((s) => {
    const base = statusFor(s, stage);
    const status = overrides && overrides[s.num] ? overrides[s.num] : base;
    return { ...s, status };
  });
  const completed = steps.filter((s) => s.status === "completed").length;
  const working = steps.filter((s) => s.status === "working").length;
  const special = stage === "Success" || stage === "On Hold" || stage === "Close-out (3 strikes)";
  return { steps, completed, working, total: STEPS.length, special, pct: Math.round((completed / STEPS.length) * 100) };
}

/** Compact stage label for chips. */
export function stageShort(stage: string | null | undefined): string {
  if (!stage) return "Not started";
  return stage.replace(/^Step \d+: /, "").replace("Close-out (3 strikes)", "Closed out");
}

/** Tone key for stage chips (matches the desktop tones). */
export function stageTone(stage: string | null | undefined): "intake" | "mushki" | "jpa" | "execution" | "success" | "hold" | "default" {
  if (!stage) return "default";
  if (stage === "Success") return "success";
  if (stage === "On Hold" || stage.startsWith("Close-out")) return "hold";
  if (stage.includes("Intake") || stage.includes("Homework")) return "intake";
  if (stage.includes("Mushki")) return "mushki";
  if (stage.includes("JPA Assignment") || stage.includes("Lead Generation")) return "jpa";
  if (stage.includes("Execution")) return "execution";
  return "default";
}
