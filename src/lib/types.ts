import type { RoleKey } from "./roles";

/**
 * A CK family / household. Field names mirror the CK-CRM /m roster so the
 * Supabase swap is a straight mapping:
 *   kind 'ck'  → new_clients   (lifecycleStatus = column `status`)
 *   kind 'kdh' → kdh_clients   (stage = column `mordy_view`)
 * daysSinceLastNote and currentMonthlyNet are computed in JS, not columns.
 */
export interface Family {
  id: string; // = airtable_record_id (public id), not the uuid
  kind: "ck" | "kdh";
  name: string;
  city?: string;
  state?: string;
  phone: string;
  email: string;
  photo?: string;
  program: "CK Debt" | "Kosher Debt Help" | "Job Funnel";
  /** The roster's own program text when it sends one (e.g. "Collective
   *  Kindness", "Kosher Debt Help", "Shluchim Thrive"). Display only. */
  programLabel?: string;
  /** Free-form status labels → the pastel pills. From kdh_clients.labels[]. */
  labels: string[];
  paymentStatus: "current" | "behind" | "unknown";
  /** Which team member fills each role for this family (display name). */
  assignments: Partial<Record<RoleKey, string>>;
  estimatedDebt?: number;
  amountPaid?: number;
  /** Real last-touch timestamp when the API provides one; NEVER synthesized
   *  client-side (a render-time fallback here once made every card read
   *  "Today, 3:45 PM"). Cards derive recency from daysSinceLastNote. */
  lastTouchedAt: string | null;

  // —— attention inputs (drive lib/attention.ts) ——
  /** CK lifecycle (column `status`). KDH derives `active` instead. */
  lifecycleStatus?: "Active" | "Inactive" | "Support From CM But Inactive";
  active: boolean;
  /** KDH pipeline stage (column `mordy_view`), e.g. "Assigned". */
  stage?: string;
  directorFlag?: string | null;
  daysSinceLastNote: number | null;
  currentMonthlyNet?: number | null;
}

/**
 * A Job Funnel client — a CK family on active_job_help. Sourced from
 * new_clients via the provider-job-funnel edge function. pipelineSteps are
 * the manual per-step overrides (new_clients.jf_pipeline_steps) that win over
 * the stage-derived status.
 */
export interface JobFunnelClient {
  id: string;
  recId: string;
  name: string;
  city?: string;
  state?: string;
  phone: string;
  email: string;
  stage: string | null;
  jpa: string | null;
  caseManager?: string;
  targetIncome?: number;
  currentIncome?: number;
  pipelineSteps: Record<string, "completed" | "working" | "pending">;
  jobStatus?: string;
  jobProgress?: string;
  jpaLatestNote?: string;
  daysInStage: number | null;
  daysInFunnel: number | null;
  daysSinceLastNote: number | null;
}

/** Next step — maps to client_tracks (next_step / next_step_due / next_step_type). */
export interface Track {
  id: string;
  familyId: string;
  familyName: string;
  familyKind: "ck" | "kdh";
  step: string;
  type?: string;
  dueAt: string; // ISO
  ownerEmail: string;
  done: boolean;
}

/** A meeting from Calendly/Google for today. Mocked until Calendly is wired. */
export interface Meeting {
  id: string;
  at: string;
  durationMin: number;
  clientName: string;
  expertName: string;
  location?: string;
}

export type NoticeKind = "flag" | "payment" | "untouched" | "task" | "mention";

export interface Notice {
  id: string;
  kind: NoticeKind;
  title: string;
  body?: string;
  familyId?: string;
  familyName?: string;
  at: string;
  severity: "high" | "normal";
  /** Roles this notice is relevant to. Empty = everyone. */
  roles?: RoleKey[];
}

export interface Payment {
  id: string;
  familyId: string;
  familyName: string;
  amount: number;
  date: string;
  status: "paid" | "due" | "overdue";
  method?: string;
  initiative?: string;
  assignedTo?: string;
}

export interface Resource {
  id: string;
  name: string;
  category: string;
  contact?: string;
  phone?: string;
  email?: string;
  description?: string;
  link?: string;
}

export type ActivityKind = "call" | "text" | "email" | "note" | "payment" | "status";

export interface Activity {
  id: string;
  familyId: string;
  kind: ActivityKind;
  summary: string;
  body?: string;
  at: string;
  by?: string;
}
