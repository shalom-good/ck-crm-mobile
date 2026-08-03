// provider-families — returns a provider's scoped caseload, mapped to the
// app's Family shape. Runs with the service role (RLS is deny-all for anon),
// so all scoping happens here, server-side, by provider email + role.
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

const KDH_COLS =
  "id,full_name,first_name,last_name,phone,email,city,state,labels,payment_status,debt_expert,debt_expert_emails,case_manager_emails,coordinator_email,estimated_total_debt,cc_debt,amount_paid,current_status,mordy_view,net,updated_at,created_at";
const CK_COLS =
  "id,first_name,last_name,spouse_name,phone,email,city,state,label,status,director_flag,current_monthly_net,estimated_total_debt,current_debt_amount,case_manager_emails,case_manager_team_id,debt_expert_team_id,budgeter,assigned_jpa,active_job_help,last_cm_note_date,updated_at";

const num = (v: unknown) => (v == null || v === "" ? undefined : Number(v));
const daysSince = (iso?: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null;
const payStatus = (s?: string | null) =>
  s === "All Current" ? "current" : s === "Some Behind" ? "behind" : "unknown";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, role } = (await req.json().catch(() => ({}))) as { email?: string; role?: Role };
    if (!email) return json({ error: "email required" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const lc = email.toLowerCase();

    // team directory for email→name resolution + my team id
    const { data: team } = await sb.from("team").select("id,full_name,email,roles");
    const byEmail = new Map<string, any>();
    const byId = new Map<string, any>();
    (team ?? []).forEach((t) => {
      if (t.email) byEmail.set(String(t.email).toLowerCase(), t);
      byId.set(t.id, t);
    });
    const me = byEmail.get(lc);
    const myId: string | undefined = me?.id;
    const myName: string = me?.full_name ?? email;
    const nameOf = (e?: string | null) => (e ? byEmail.get(String(e).toLowerCase())?.full_name ?? e : undefined);

    const isDir = role === "director";
    const wantKdh = !role || isDir || ["debt_expert", "coordinator"].includes(role);
    const wantCk = !role || isDir || ["case_manager", "budgeter", "jpa", "debt_expert"].includes(role);

    // ---- KDH (kosher debt help) ----
    let kdh: any[] = [];
    if (wantKdh) {
      let q = sb.from("kdh_clients").select(KDH_COLS).limit(400);
      if (!isDir) {
        const ors = [`debt_expert_emails.cs.{"${email}"}`, `case_manager_emails.cs.{"${email}"}`, `coordinator_email.eq.${email}`];
        if (myId) ors.push(`debt_expert_team_id.eq.${myId}`, `case_manager_team_id.eq.${myId}`, `coordinator_team_id.eq.${myId}`);
        q = q.or(ors.join(","));
      }
      kdh = (await q).data ?? [];
    }

    // ---- CK families (new_clients) ----
    let ck: any[] = [];
    if (wantCk) {
      let q = sb.from("new_clients").select(CK_COLS).limit(400);
      if (!isDir) {
        const ors = [`case_manager_emails.cs.{"${email}"}`];
        if (myId) ors.push(`case_manager_team_id.eq.${myId}`, `debt_expert_team_id.eq.${myId}`);
        if (role === "budgeter" || !role) ors.push(`budgeter.eq.${myName}`);
        if (role === "jpa" || !role) ors.push(`assigned_jpa.cs.{"${myName}"}`);
        q = q.or(ors.join(","));
      }
      ck = (await q).data ?? [];
    }

    // ---- last-note dates for daysSinceLastNote ----
    const lastNote: Record<string, string> = {};
    const stamp = (id: string | null, d?: string | null) => {
      if (!id || !d) return;
      if (!lastNote[id] || d > lastNote[id]) lastNote[id] = d;
    };
    const kdhIds = kdh.map((r) => r.id);
    const ckIds = ck.map((r) => r.id);
    if (kdhIds.length) {
      const { data } = await sb.from("notes").select("kdh_client_id,date_added,budgeting_date").in("kdh_client_id", kdhIds);
      (data ?? []).forEach((n) => stamp(n.kdh_client_id, n.budgeting_date ?? n.date_added));
    }
    if (ckIds.length) {
      const { data } = await sb.from("notes").select("new_client_id,date_added,budgeting_date").in("new_client_id", ckIds);
      (data ?? []).forEach((n) => stamp(n.new_client_id, n.budgeting_date ?? n.date_added));
    }

    const families = [
      ...kdh.map((r) => ({
        id: r.id,
        kind: "kdh",
        name: r.full_name || `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Family",
        city: r.city, state: r.state, phone: r.phone ?? "", email: r.email ?? "",
        program: "Kosher Debt Help",
        labels: Array.isArray(r.labels) ? r.labels.slice(0, 3) : [],
        paymentStatus: payStatus(r.payment_status),
        assignments: {
          debt_expert: r.debt_expert || nameOf(r.debt_expert_emails?.[0]) || (role === "debt_expert" ? myName : undefined),
          case_manager: nameOf(r.case_manager_emails?.[0]),
          coordinator: nameOf(r.coordinator_email),
        },
        estimatedDebt: num(r.estimated_total_debt ?? r.cc_debt),
        amountPaid: num(r.amount_paid),
        active: (r.current_status ?? "") !== "Inactive",
        stage: r.mordy_view ?? undefined,
        directorFlag: null,
        currentMonthlyNet: num(r.net),
        daysSinceLastNote: daysSince(lastNote[r.id]),
        lastTouchedAt: lastNote[r.id] ?? r.updated_at ?? r.created_at,
      })),
      ...ck.map((r) => ({
        id: r.id,
        kind: "ck",
        name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Family",
        city: r.city, state: r.state, phone: r.phone ?? "", email: r.email ?? "",
        program: r.active_job_help ? "Job Funnel" : "CK Debt",
        labels: r.label ? [r.label] : [],
        paymentStatus: "unknown",
        assignments: {
          case_manager: nameOf(r.case_manager_emails?.[0]) || byId.get(r.case_manager_team_id)?.full_name || (role === "case_manager" ? myName : undefined),
          debt_expert: byId.get(r.debt_expert_team_id)?.full_name,
          budgeter: r.budgeter ?? undefined,
        },
        estimatedDebt: num(r.estimated_total_debt ?? r.current_debt_amount),
        active: (r.status ?? "") === "Active",
        lifecycleStatus: r.status ?? undefined,
        directorFlag: r.director_flag ?? null,
        currentMonthlyNet: num(r.current_monthly_net),
        daysSinceLastNote: daysSince(lastNote[r.id] ?? r.last_cm_note_date),
        lastTouchedAt: lastNote[r.id] ?? r.last_cm_note_date ?? r.updated_at,
      })),
    ];

    return json({ provider: { name: myName, email, roles: me?.roles ?? [] }, count: families.length, families });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
