import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Family, JobFunnelClient, Payment, Resource, Track, Meeting } from "./types";
import { useRole, type RoleKey } from "./roles";
import { useAuth } from "./auth";
import { computeAttention, type AttentionItem } from "./attention";
import { fetchProviderFamilies, fetchProviderJobFunnel, fetchResources, fetchProviderPayments } from "./api";
import { fetchFamiliesRoster, fetchMobilePayments } from "./mobileApi";

/**
 * App data. Families + payments now come from the ck-crm.vercel.app
 * mobile API (bearer-authed, scoped server-side to the signed-in user;
 * admins can pass ?as=). The older Supabase edge functions remain as a
 * FALLBACK path so the app keeps working if the new API is unreachable.
 * Resources + Job Funnel still ride the edge functions.
 */

type Raw = Record<string, any>;

/** Map a /api/mobile/families roster row (the /m shape) into Family. */
function mapRosterRow(r: Raw): Family | null {
  const id = r?.id ?? r?.recId ?? r?.airtable_record_id;
  if (!id) return null;
  const days = typeof r?.daysSinceLastNote === "number" ? r.daysSinceLastNote : null;
  const kind: "ck" | "kdh" = r?.kind === "kdh" ? "kdh" : "ck";
  // "Brooklyn, NY" style single string → split for city/state when possible.
  const loc = typeof r?.location === "string" ? r.location : "";
  const [locCity, locState] = loc.includes(",") ? loc.split(",").map((s: string) => s.trim()) : [loc, ""];
  const assignments: Partial<Record<RoleKey, string>> = { ...(r?.assignments ?? {}) };
  if (r?.caseManager && !assignments.case_manager) assignments.case_manager = String(r.caseManager);
  if (r?.debtExpert && !assignments.debt_expert) assignments.debt_expert = String(r.debtExpert);
  return {
    id: String(id),
    kind,
    name: String(r?.name ?? "Unnamed"),
    city: r?.city ?? (locCity || undefined),
    state: r?.state ?? (locState || undefined),
    phone: String(r?.phone ?? ""),
    email: String(r?.email ?? ""),
    photo: r?.photo ?? undefined,
    program: kind === "kdh" ? "Kosher Debt Help" : "CK Debt",
    labels: Array.isArray(r?.labels) ? r.labels.map(String) : [],
    paymentStatus: r?.paymentStatus === "behind" || r?.paymentStatus === "current" ? r.paymentStatus : "unknown",
    assignments,
    estimatedDebt: typeof r?.estimatedDebt === "number" ? r.estimatedDebt : (typeof r?.debt === "number" ? r.debt : undefined),
    amountPaid: typeof r?.amountPaid === "number" ? r.amountPaid : (typeof r?.paid === "number" ? r.paid : undefined),
    // Only a REAL server timestamp — no Date.now() fallback (it made every
    // card show the identical render-time clock, e.g. "Today, 3:45 PM").
    lastTouchedAt: r?.lastTouchedAt ?? null,
    lifecycleStatus: r?.lifecycleStatus ?? undefined,
    active: typeof r?.active === "boolean" ? r.active : (r?.lifecycleStatus ? r.lifecycleStatus === "Active" : true),
    stage: r?.stage ?? undefined,
    directorFlag: r?.directorFlag ?? null,
    daysSinceLastNote: days,
    currentMonthlyNet: typeof r?.currentMonthlyNet === "number" ? r.currentMonthlyNet : null,
  };
}

/** Map a /api/mobile/payments row into the app's Payment. */
function mapPaymentRow(r: Raw, i: number): Payment {
  const status = r?.status === "paid" ? "paid"
    : r?.status === "overdue" ? "overdue"
    : r?.status === "owed" || r?.status === "due" ? "due"
    : r?.paid === true ? "paid" : "due";
  return {
    id: String(r?.id ?? `pay-${i}`),
    familyId: String(r?.familyId ?? r?.familyRecId ?? r?.clientRecId ?? ""),
    familyName: String(r?.client ?? r?.familyName ?? r?.clientName ?? ""),
    amount: Number(r?.amount ?? 0) || 0,
    date: String(r?.date ?? new Date().toISOString().slice(0, 10)),
    status,
    method: r?.method ?? undefined,
    initiative: r?.initiative ?? r?.type ?? undefined,
    assignedTo: r?.billedBy ?? r?.assignedTo ?? undefined,
  };
}

interface AppDataValue {
  loading: boolean;
  error: boolean;
  lastSync: string;
  families: Family[];
  familiesForRole: (role: RoleKey, myName: string) => Family[];
  attentionForRole: (role: RoleKey, myName: string) => AttentionItem[];
  tracks: Track[];
  completeTrack: (id: string) => void;
  meetings: Meeting[];
  payments: Payment[];
  resources: Resource[];
  resourcesLoading: boolean;
  getFamily: (id: string) => Family | undefined;
  addPayment: (p: Omit<Payment, "id">) => Payment;
  jobFunnel: JobFunnelClient[];
  jobFunnelLoading: boolean;
  getJfClient: (id: string) => JobFunnelClient | undefined;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { provider, viewAsEmail } = useRole();
  const { status, kind } = useAuth();
  // Staff data only loads for a TEAM session; a family session reads the
  // portal API instead (see pages/FamilyHomePage + lib/portalApi).
  const signedIn = status === "signedIn" && kind === "team";
  const [localPayments, setLocalPayments] = useState<Payment[]>([]); // optimistic adds
  const [tracks, setTracks] = useState<Track[]>([]);
  const [meetings] = useState<Meeting[]>([]);
  const seq = useRef(0);

  // Live caseload — the mobile API first (scoped by the bearer token,
  // ?as= for admin view-as), the provider-families edge fn as fallback.
  const q = useQuery({
    queryKey: ["families", provider.email, provider.role, viewAsEmail],
    enabled: signedIn,
    queryFn: async (): Promise<Family[]> => {
      try {
        const rows = await fetchFamiliesRoster(viewAsEmail);
        return rows.map(mapRosterRow).filter((f): f is Family => f != null);
      } catch {
        return fetchProviderFamilies(provider.email, provider.role);
      }
    },
    staleTime: 60_000,
  });
  const families = q.data ?? [];

  // Resources directory — live, not provider-scoped.
  const rq = useQuery({ queryKey: ["resources"], queryFn: fetchResources, staleTime: 0, refetchOnMount: "always", enabled: signedIn });
  const resources = rq.data ?? [];

  // Job Funnel caseload — still edge-fn native (shared team board).
  const jq = useQuery({
    queryKey: ["provider-job-funnel", provider.email, provider.role],
    queryFn: () => fetchProviderJobFunnel(provider.email, provider.role),
    staleTime: 60_000,
    enabled: signedIn,
  });
  const jobFunnel = jq.data ?? [];
  const getJfClient = useCallback((id: string) => jobFunnel.find((c) => c.id === id), [jobFunnel]);

  // Payments — the mobile API first, the edge fn as fallback.
  const pq = useQuery({
    queryKey: ["payments", provider.email, provider.role],
    enabled: signedIn,
    queryFn: async (): Promise<Payment[]> => {
      try {
        const rows = await fetchMobilePayments();
        return rows.map(mapPaymentRow);
      } catch {
        return fetchProviderPayments(provider.email, provider.role);
      }
    },
    staleTime: 60_000,
  });
  const payments = useMemo(() => [...localPayments, ...(pq.data ?? [])], [localPayments, pq.data]);

  const familiesForRole = useCallback(() => families, [families]);
  const attentionForRole = useCallback(() => computeAttention(families), [families]);
  const getFamily = useCallback((id: string) => families.find((f) => f.id === id), [families]);

  const completeTrack = useCallback((id: string) => setTracks((p) => p.filter((t) => t.id !== id)), []);
  const addPayment = useCallback((p: Omit<Payment, "id">) => {
    const payment: Payment = { ...p, id: `p-new-${++seq.current}` };
    setLocalPayments((prev) => [payment, ...prev]);
    return payment;
  }, []);

  const value = useMemo<AppDataValue>(
    () => ({
      loading: q.isLoading,
      error: q.isError,
      lastSync: q.dataUpdatedAt ? new Date(q.dataUpdatedAt).toISOString() : new Date().toISOString(),
      families,
      familiesForRole,
      attentionForRole,
      tracks,
      completeTrack,
      meetings,
      payments,
      resources,
      resourcesLoading: rq.isLoading,
      getFamily,
      addPayment,
      jobFunnel,
      jobFunnelLoading: jq.isLoading,
      getJfClient,
    }),
    [q.isLoading, q.isError, q.dataUpdatedAt, families, familiesForRole, attentionForRole, tracks, completeTrack, meetings, payments, resources, rq.isLoading, getFamily, addPayment, jobFunnel, jq.isLoading, getJfClient],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
