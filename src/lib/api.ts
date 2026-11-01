import type { Family, JobFunnelClient, Resource } from "./types";
import type { RoleKey } from "./roles";

/*
 * The Supabase client is imported lazily inside each function so
 * supabase-js stays out of the start-up chunk (nothing here runs before a
 * teammate is signed in and on a screen that needs it).
 */

export interface ProviderFamilies {
  provider: { name: string; email: string; roles: string[] };
  count: number;
  families: Family[];
}

/** Fetch a provider's scoped caseload via the edge function. */
export async function fetchProviderFamilies(email: string, role: RoleKey): Promise<Family[]> {
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase.functions.invoke<ProviderFamilies>("provider-families", {
    body: { email, role },
  });
  if (error) throw error;
  return data?.families ?? [];
}

export interface ProviderJobFunnel {
  provider: { name: string; email: string; roles: string[] };
  count: number;
  clients: JobFunnelClient[];
}

/** Fetch a worker's scoped Job Funnel caseload via the edge function. */
export async function fetchProviderJobFunnel(email: string, role: RoleKey): Promise<JobFunnelClient[]> {
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase.functions.invoke<ProviderJobFunnel>("provider-job-funnel", {
    body: { email, role },
  });
  if (error) throw error;
  return data?.clients ?? [];
}

/** Fetch real client payments scoped to the worker's caseload (edge fn). */
export async function fetchProviderPayments(email: string, role: RoleKey): Promise<import("./types").Payment[]> {
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase.functions.invoke<{ payments: import("./types").Payment[] }>("provider-payments", {
    body: { email, role },
  });
  if (error) throw error;
  return data?.payments ?? [];
}

/** Fetch the full resources directory via the edge function. */
export async function fetchResources(): Promise<Resource[]> {
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase.functions.invoke<{ resources: Resource[] }>("resources-list", { body: {} });
  if (error) throw error;
  return data?.resources ?? [];
}

export interface FamilyAiSummary {
  summaryMarkdown?: string;
  generatedAt?: string;
  error?: string;
  message?: string;
}

/** Thorough auto-run AI rundown for a family / JF client (edge function). */
export async function fetchFamilyAiSummary(id: string): Promise<FamilyAiSummary> {
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase.functions.invoke<FamilyAiSummary>("family-ai-summary", {
    body: { id },
  });
  if (error) return { error: error.message };
  return data ?? {};
}

export interface FamilyDetail {
  core: {
    lifecycleStatus: string | null;
    stage: string | null;
    married: boolean | string | null;
    kids: number | null;
    kidsAges: string | null;
    intakeDate: string | null;
    directorFlag: string | null;
    daysSinceLastNote: number | null;
    currentMonthlyNet: number | null;
  };
  cashflow: { income: number | null; expenses: number | null; net: number | null; deficit: number | null };
  cashFlowHistory: { month: string; monthLabel: string; income: number; expenses: number; net: number }[];
  debt: {
    current: number | null;
    atAssessment: number | null;
    apr: number | null;
    monthlyPayments: number | null;
    totalInterestAnnual: number | null;
    ccInDefault: number | null;
    savedInterest: number | null;
    savedSettlement: number | null;
    pathSelected: string | null;
    otherDebts: string | null;
    kdhRecId: string | null;
  };
  notesByCategory: {
    counts: { all: number; idle: number; stale: number };
    categories: {
      key: string;
      label: string;
      color: string;
      staleness: "idle" | "stale" | null;
      days: number | null;
      latest: { date: string | null; by: string | null; text: string };
      notes: { date: string | null; by: string | null; text: string }[];
    }[];
  };
  big5: { id: string; name: string; status: string | null; flagLevel: string | null; amount: number | null }[];
}

/** Full family profile detail (status, cash flow, debt, notes) — edge fn. */
export async function fetchFamilyDetail(id: string): Promise<FamilyDetail | null> {
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase.functions.invoke<FamilyDetail>("family-detail", {
    body: { id },
  });
  if (error) return null;
  return data ?? null;
}
