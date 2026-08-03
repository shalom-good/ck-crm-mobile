// provider-job-funnel — the SHARED Job Funnel board: ALL CK families on
// active_job_help, mapped to the app's JobFunnelClient shape. Anyone with
// Job Funnel access sees every client (not just their own caseload).
// Service role (RLS deny-all for anon).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Role = "case_manager" | "debt_expert" | "budgeter" | "jpa" | "coordinator" | "director";

const COLS =
  "id,airtable_record_id,first_name,last_name,phone,email,city,state," +
  "active_job_help,assigned_jpa,case_manager_emails,case_manager_team_id,budgeter," +
  "jf_current_stage,jf_stage_entered_at,jf_funnel_entered_at," +
  "jf_target_income,jf_current_income,jf_pipeline_steps," +
  "job_status,job_progress,jpa_notes,jpa_notes_updated_at";

const num = (v: unknown) => (v == null || v === "" ? undefined : Number(v));
const daysSince = (iso?: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null;
const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) ?? undefined;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, role } = (await req.json().catch(() => ({}))) as { email?: string; role?: Role };
    if (!email) return json({ error: "email required" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const lc = email.toLowerCase();

    const { data: team } = await sb.from("team").select("id,full_name,email,roles");
    const byEmail = new Map<string, any>();
    (team ?? []).forEach((t) => { if (t.email) byEmail.set(String(t.email).toLowerCase(), t); });
    const me = byEmail.get(lc);
    const myName: string = me?.full_name ?? email;
    const myId = me?.id;
    const isDir = !role || role === "director" || (me?.roles ?? []).includes("director");

    // Scoped per role: a director sees ALL active-job-help clients; everyone
    // else sees only the job-funnel clients on THEIR caseload (case manager /
    // debt expert). (Desktop keeps the shared board; mobile is per-worker.)
    let q = sb.from("new_clients").select(COLS).eq("active_job_help", true);
    if (!isDir) {
      const ors = [`case_manager_emails.cs.{"${email}"}`];
      if (myId) ors.push(`case_manager_team_id.eq.${myId}`, `debt_expert_team_id.eq.${myId}`);
      q = q.or(ors.join(","));
    }
    q = q.limit(400);
    const rows = (await q).data ?? [];

    const clients = rows.map((r) => ({
      id: r.id,
      recId: r.airtable_record_id ?? r.id,
      name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Client",
      city: r.city, state: r.state, phone: r.phone ?? "", email: r.email ?? "",
      stage: r.jf_current_stage ?? null,
      jpa: one(r.assigned_jpa) ?? null,
      caseManager: byEmail.get(String(r.case_manager_emails?.[0] ?? "").toLowerCase())?.full_name ?? undefined,
      targetIncome: num(r.jf_target_income),
      currentIncome: num(r.jf_current_income),
      pipelineSteps: (r.jf_pipeline_steps && typeof r.jf_pipeline_steps === "object") ? r.jf_pipeline_steps : {},
      jobStatus: r.job_status ?? undefined,
      jobProgress: r.job_progress ?? undefined,
      jpaLatestNote: r.jpa_notes ?? undefined,
      daysInStage: daysSince(r.jf_stage_entered_at),
      daysInFunnel: daysSince(r.jf_funnel_entered_at),
      daysSinceLastNote: daysSince(r.jpa_notes_updated_at),
    }));

    return json({ provider: { name: myName, email, roles: me?.roles ?? [] }, count: clients.length, clients });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
