// provider-payments — recent client payments scoped to a worker's
// caseload (all for director), mapped to the app's Payment shape. Reads
// the real client_payments mirror. Service role (RLS deny-all for anon).
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

const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));
const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) ?? undefined;

const ckName = (r: any) => {
  const parts = [r.first_name, r.spouse_name ? `& ${r.spouse_name}` : null, r.last_name].filter(Boolean);
  return parts.join(" ").trim() || "Unnamed";
};
const kdhName = (r: any) => [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || "Unnamed";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email, role } = (await req.json().catch(() => ({}))) as { email?: string; role?: Role };
    if (!email) return json({ error: "email required" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const lc = email.toLowerCase();

    const { data: team } = await sb.from("team").select("id,email,roles");
    const me = (team ?? []).find((t) => String(t.email || "").toLowerCase() === lc);
    const myId = me?.id;
    const isDir = !role || role === "director" || (me?.roles ?? []).includes("director");

    // Resolve in-scope families → uuid → name maps.
    const ckMap = new Map<string, string>();
    const kdhMap = new Map<string, string>();

    let ckQ = sb.from("new_clients").select("id,first_name,last_name,spouse_name");
    if (!isDir) {
      const ors = [`case_manager_emails.cs.{"${email}"}`];
      if (myId) ors.push(`case_manager_team_id.eq.${myId}`, `debt_expert_team_id.eq.${myId}`);
      ckQ = ckQ.or(ors.join(","));
    }
    const { data: ckRows } = await ckQ.limit(1500);
    (ckRows ?? []).forEach((r) => ckMap.set(r.id, ckName(r)));

    let kdhQ = sb.from("kdh_clients").select("id,first_name,last_name");
    if (!isDir) {
      const ors = [`debt_expert_emails.cs.{"${email}"}`, `case_manager_emails.cs.{"${email}"}`, `coordinator_email.eq.${email}`];
      if (myId) ors.push(`debt_expert_team_id.eq.${myId}`, `case_manager_team_id.eq.${myId}`, `coordinator_team_id.eq.${myId}`);
      kdhQ = kdhQ.or(ors.join(","));
    }
    const { data: kdhRows } = await kdhQ.limit(1500);
    (kdhRows ?? []).forEach((r) => kdhMap.set(r.id, kdhName(r)));

    const ckIds = [...ckMap.keys()];
    const kdhIds = [...kdhMap.keys()];

    const COLS = "id,payment_date,amount,paid,due_date,person_billing_name,payment_methods,new_client_id,kdh_client_id";
    let pays: any[] = [];
    if (isDir) {
      const { data } = await sb.from("client_payments").select(COLS).order("payment_date", { ascending: false }).limit(200);
      pays = data ?? [];
    } else {
      const parts: Promise<any>[] = [];
      if (ckIds.length) parts.push(sb.from("client_payments").select(COLS).in("new_client_id", ckIds).order("payment_date", { ascending: false }).limit(150));
      if (kdhIds.length) parts.push(sb.from("client_payments").select(COLS).in("kdh_client_id", kdhIds).order("payment_date", { ascending: false }).limit(150));
      const results = await Promise.all(parts);
      pays = results.flatMap((r) => r.data ?? []);
    }

    const today = new Date().toISOString().slice(0, 10);
    const out = pays
      .map((p) => {
        const famId = p.new_client_id || p.kdh_client_id || null;
        const famName =
          (p.new_client_id && ckMap.get(p.new_client_id)) ||
          (p.kdh_client_id && kdhMap.get(p.kdh_client_id)) ||
          "Unknown family";
        let status: "paid" | "due" | "overdue" = "paid";
        if (!p.paid) {
          const due = p.due_date ? String(p.due_date).slice(0, 10) : null;
          status = due && due < today ? "overdue" : "due";
        }
        return {
          id: p.id,
          familyId: famId,
          familyName: famName,
          amount: num(p.amount),
          date: p.payment_date || p.due_date || null,
          status,
          method: one(p.payment_methods),
          assignedTo: p.person_billing_name || undefined,
        };
      })
      .filter((p) => p.familyId && p.amount > 0)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    return json({ payments: out, count: out.length });
  } catch (e) {
    return json({ error: "internal", message: String((e as Error)?.message || e) }, 500);
  }
});
