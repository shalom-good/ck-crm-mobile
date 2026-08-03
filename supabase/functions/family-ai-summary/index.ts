// family-ai-summary — thorough auto-run AI rundown for a CK family /
// Job Funnel client, mirroring the CRM's /api/families/[id]/ai-summary.
// Mobile calls this on opening a detail page. Service role (RLS deny-all).
//
// Requires the edge secret ANTHROPIC_API_KEY:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...  --project-ref lrrovaqiudcbacxrdzkp
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MODEL = "claude-sonnet-4-5";

const COLS =
  "id,airtable_record_id,first_name,last_name,spouse_name,city,state,status,ck_client_flow," +
  "active_job_help,jf_current_stage,jf_target_income,jf_current_income," +
  "current_monthly_net,current_debt_amount,total_cc_debt_at_assessment,monthly_debt_payments,cc_debt_in_default," +
  "num_kids,legally_married,airtable_created_time,last_cm_note_date,director_flag," +
  "income_at_pl,expenses_at_pl,net,monthly_deficit," +
  "cm_latest_note,cm_latest_note_at,budgeter_notes,budgeter_notes_updated_at," +
  "debt_notes,debt_expert_notes_updated_at,jpa_notes,jpa_notes_updated_at," +
  "therapy_notes,accountant_notes,business_coach_notes,initial_interview_notes,broad_goals_notes";

const SYSTEM_PROMPT = `You are an analyst for Collective Kindness, a Jewish nonprofit that helps families become cash-flow positive. Read a single family's record and produce a grounded, concrete rundown for the field team to get fully up to speed in 60 seconds.

Voice: short direct sentences. Plain prose. Honest, specific, no buzzwords, no hedging, no preamble, no greetings, no em dashes. Cite numbers when they appear in the record. Be THOROUGH — cover every workstream the record touches — but do not invent anything not in the record.

Output strict Markdown. No code fences. Use these EXACT sections, in order:

## Snapshot
2 to 3 sentences: who the family is (location, household), how long with CK and current stage, the one-line situation, current monthly net, and direction of travel.

## Where they're holding
A short bold-led bullet per workstream the record has data on (only include present ones): **Budgeting** (latest net + freshness), **Debt** (total, status, default risk), **Job / income** (JF stage, current vs target income), **Accountant / taxes**, **Other**.

## Blockers & risks
2 to 5 bullets. What is in the way or at risk: stalled stage, long silence, deepening deficit, unresolved debt, job obstacles, missed sessions. Each leads with the blocker then why it matters. Only name blockers the record evidences. If nothing material, output the single line: "No significant blockers in the file."

## Latest notes
Up to 6 bullets, newest first, from RECENT NOTES. Each leads with the role + date in bold (e.g. **Case management · Jun 12**) then a 1 to 2 sentence faithful gist. Prioritize Case Management, Budgeter, Debt Expert, JPA. If no notes, output "No notes on file yet."

## Recommended next steps
2 to 4 bullets, concrete actions grounded in the blockers and notes, each starting with an imperative verb.`;

const fmtMoney = (v: unknown) => {
  const n = Number(v);
  if (!isFinite(n) || v == null || v === "") return null;
  return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
};
const trunc = (s: unknown, n: number) => {
  const t = (s == null ? "" : String(s)).trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};

function buildContext(r: any, notes: any[]): string {
  const L: string[] = [];
  const push = (k: string, v: unknown) => { if (v != null && v !== "") L.push(`${k}: ${v}`); };
  const name = [r.first_name, r.spouse_name ? `& ${r.spouse_name}` : null, r.last_name].filter(Boolean).join(" ");
  L.push("=== FAMILY ===");
  push("Name", name);
  push("Location", [r.city, r.state].filter(Boolean).join(", "));
  push("Intake date", r.airtable_created_time ? String(r.airtable_created_time).slice(0, 10) : null);
  push("Current stage", r.ck_client_flow);
  push("Lifecycle", r.status);
  push("Married", r.legally_married);
  push("Kids", r.num_kids);
  push("Director flag", r.director_flag);
  push("Last CM note date", r.last_cm_note_date ? String(r.last_cm_note_date).slice(0, 10) : null);

  L.push("\n=== CASH FLOW (latest) ===");
  push("Income", fmtMoney(r.income_at_pl));
  push("Expenses", fmtMoney(r.expenses_at_pl));
  push("Net (current monthly)", fmtMoney(r.current_monthly_net ?? r.net));
  push("Monthly deficit", fmtMoney(r.monthly_deficit));

  L.push("\n=== DEBT ===");
  push("Total at assessment", fmtMoney(r.total_cc_debt_at_assessment));
  push("Current debt", fmtMoney(r.current_debt_amount));
  push("Monthly debt payments", fmtMoney(r.monthly_debt_payments));
  push("In default", fmtMoney(r.cc_debt_in_default));

  if (r.active_job_help) {
    L.push("\n=== JOB FUNNEL ===");
    push("JF stage", r.jf_current_stage);
    push("Target income", fmtMoney(r.jf_target_income));
    push("Current income (JF)", fmtMoney(r.jf_current_income));
    push("Latest JPA note", trunc(r.jpa_notes, 400));
  }

  // Per-role aggregated notes on the record.
  const roleNotes: [string, unknown, unknown][] = [
    ["Case management", r.cm_latest_note, r.cm_latest_note_at],
    ["Budgeter", r.budgeter_notes, r.budgeter_notes_updated_at],
    ["Debt expert", r.debt_notes, r.debt_expert_notes_updated_at],
    ["Initial interview", r.initial_interview_notes, null],
    ["Broad goals", r.broad_goals_notes, null],
    ["Therapy", r.therapy_notes, null],
    ["Accountant", r.accountant_notes, null],
    ["Business coaching", r.business_coach_notes, null],
  ];
  const roleLines = roleNotes
    .filter(([, body]) => body && String(body).trim())
    .map(([role, body, date]) => `- [${role}${date ? ", " + String(date).slice(0, 10) : ""}] ${trunc(body, 500)}`);
  if (roleLines.length) { L.push("\n=== ROLE NOTES ==="); L.push(...roleLines); }

  // Recent meeting-note rows from the notes table.
  if (notes.length) {
    L.push("\n=== RECENT NOTES (most recent first) ===");
    for (const n of notes.slice(0, 12)) {
      const date = (n.budgeting_date || n.date_added || "").toString().slice(0, 10);
      L.push(`- [${n.type_of_session || "Note"}${n.by_name ? ", " + n.by_name : ""}${date ? ", " + date : ""}] ${trunc(n.latest_notes, 500)}`);
    }
  }
  return L.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { id } = (await req.json().catch(() => ({}))) as { id?: string };
    if (!id) return json({ error: "id required" }, 400);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "not_configured", message: "ANTHROPIC_API_KEY edge secret is not set." }, 200);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Look up by uuid OR airtable_record_id (mobile passes the rec id).
    const { data: rows } = await sb
      .from("new_clients")
      .select(COLS)
      .or(`id.eq.${id},airtable_record_id.eq.${id}`)
      .limit(1);
    const r = rows?.[0];
    if (!r) return json({ error: "not_found" }, 404);

    const { data: notes } = await sb
      .from("notes")
      .select("latest_notes,type_of_session,budgeting_date,date_added,by_name")
      .eq("new_client_id", r.id)
      .order("date_added", { ascending: false })
      .limit(12);

    const userMsg = buildContext(r, notes ?? []);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return json({ error: "anthropic_error", message: t.slice(0, 300) }, 502);
    }
    const data = await res.json();
    const markdown = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
    if (!markdown) return json({ error: "empty_response" }, 502);

    return json({ summaryMarkdown: markdown, generatedAt: new Date().toISOString(), model: MODEL });
  } catch (e) {
    return json({ error: "internal", message: String((e as Error)?.message || e) }, 500);
  }
});
