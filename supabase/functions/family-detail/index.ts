// family-detail — the FULL CK family profile bundle for the mobile detail
// page, mirroring the CRM desktop popup drawer: status, cash flow (+ monthly
// history), debt (incl. the linked KDH "DC Profile" in-default figure),
// notes grouped by CATEGORY with Idle/Stale freshness (the desktop
// "notes by category" view), and the Big 5 tracker. Read-only, service role.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => (v == null || v === "" ? null : String(v));
const dateOnly = (v: unknown): string | null => (v ? String(v).slice(0, 10) : null);
const pick = (linked: number | null, own: number | null) => (linked != null ? linked : own);
const asPathList = (v: unknown): string | null =>
  Array.isArray(v) ? (v.map((x) => String(x).trim()).filter(Boolean).join(", ") || null) : str(v);

// ── Notes-by-category config (mirrors components/inbox machinery) ──────
const CAT_META: Record<string, { label: string; color: string }> = {
  weekly: { label: "Weekly check-ins", color: "#7B3FAA" },
  cm: { label: "Case management", color: "#7B3FAA" },
  "initial-interview": { label: "Initial interview", color: "#5C5950" },
  budget: { label: "Budgeting", color: "#3F7355" },
  debt: { label: "Debt", color: "#A8431A" },
  jpa: { label: "JPA", color: "#356048" },
  therapy: { label: "Therapy", color: "#D45BAC" },
  accountant: { label: "Accountant", color: "#185FA5" },
  business: { label: "Business coaching", color: "#C68A2E" },
  shliach: { label: "Shliach", color: "#9080C2" },
  default: { label: "Other", color: "#8E8B82" },
};
const CAT_ORDER = ["weekly", "cm", "budget", "debt", "jpa", "therapy", "accountant", "business", "shliach", "initial-interview", "default"];
const TYPE_TO_CAT: [string, string][] = [
  ["weekly", "weekly"], ["cm ", "cm"], ["case manager", "cm"], ["cm general", "cm"],
  ["budget", "budget"], ["p&l", "budget"], ["p & l", "budget"],
  ["debt", "debt"], ["negotiat", "debt"], ["jpa", "jpa"],
  ["therapy", "therapy"], ["therapist", "therapy"],
  ["accountant", "accountant"], ["tax", "accountant"], ["business", "business"],
  ["initial interview", "initial-interview"], ["initial assessment", "initial-interview"], ["intake", "initial-interview"],
  ["broad goal", "cm"], ["shliach", "cm"], ["mentor", "cm"],
];
const catOf = (type: unknown): string => {
  if (!type) return "cm";
  const lc = String(type).toLowerCase();
  for (const [needle, cat] of TYPE_TO_CAT) if (lc.includes(needle)) return cat;
  return "cm";
};
const STALE_D = 14, IDLE_D = 30;
const ONE_AND_DONE = new Set(["initial-interview"]);
const daysSince = (iso: unknown): number | null => {
  if (!iso) return null;
  const t = new Date(String(iso)).getTime();
  return isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : null;
};
const staleLevel = (iso: unknown, cat: string): "idle" | "stale" | null => {
  if (ONE_AND_DONE.has(cat)) return null;
  const d = daysSince(iso);
  if (d == null) return null;
  if (d >= IDLE_D) return "idle";
  if (d >= STALE_D) return "stale";
  return null;
};

const COLS =
  "id,airtable_record_id,first_name,spouse_name,last_name,city,state," +
  "status,ck_client_flow,legally_married,num_kids,kids_ages,airtable_created_time," +
  "last_cm_note_date,notes_last_updated_at,director_flag,current_monthly_net,dc_client_id," +
  "income_at_pl,expenses_at_pl,net,monthly_deficit," +
  "current_debt_amount,total_cc_debt_at_assessment,approx_apr,apr,monthly_debt_payments," +
  "total_interest_cc_annual,cc_debt_in_default,money_saved_cc_interest,money_saved_settlement," +
  "path_selected,other_debts_eidl," +
  "cm_latest_note,cm_latest_note_at,budgeter_notes,budgeter_notes_updated_at," +
  "debt_notes,debt_expert_notes_updated_at,jpa_notes,jpa_notes_updated_at," +
  "therapy_notes,accountant_notes,business_coach_notes,initial_interview_notes," +
  "broad_goals_notes,broad_goals_notes_updated_at";

const KDH_DEBT_COLS =
  "current_debt_amount,total_cc_debt_at_assessment,apr,approx_apr,monthly_debt_payments," +
  "total_interest_payments,total_interest_cc_annual,cc_debt_in_default,money_saved_cc_interest," +
  "money_saved_settlement,path_selected,other_debts_eidl,airtable_record_id";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { id } = (await req.json().catch(() => ({}))) as { id?: string };
    if (!id) return json({ error: "id required" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows } = await sb.from("new_clients").select(COLS)
      .or(`id.eq.${id},airtable_record_id.eq.${id}`).limit(1);
    const r: any = rows?.[0];
    if (!r) return json({ error: "not_found" }, 404);

    // Parallel: linked KDH debt record, notes table, Big 5 anchor.
    const [kdhRes, noteRes, clientRes] = await Promise.all([
      r.dc_client_id
        ? sb.from("kdh_clients").select(KDH_DEBT_COLS).eq("id", r.dc_client_id).limit(1)
        : Promise.resolve({ data: null }),
      sb.from("notes")
        .select("latest_notes,type_of_session,budgeting_date,date_added,by_name,income,expenses")
        .eq("new_client_id", r.id).order("date_added", { ascending: false }).limit(200),
      r.airtable_record_id
        ? sb.from("clients").select("id").eq("airtable_id", r.airtable_record_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const kdh: any = (kdhRes as any).data?.[0] || null;
    const noteRows: any[] = (noteRes as any).data || [];

    // ── Big 5 (read-only; only if the client has been materialized) ──
    let big5: any[] = [];
    const clientId = (clientRes as any).data?.id;
    if (clientId) {
      const { data: items } = await sb.from("client_big5_items")
        .select("id,category_name,status,flag_level,dollar_impact_estimate,dollar_impact_realized")
        .eq("client_id", clientId);
      big5 = (items || []).map((it: any) => ({
        id: it.id,
        name: str(it.category_name) || "Item",
        status: str(it.status),
        flagLevel: str(it.flag_level),
        amount: num(it.dollar_impact_realized) || num(it.dollar_impact_estimate) || null,
      }));
    }

    // ── Debt (KDH-authoritative merge) ──
    const debt = {
      current: pick(num(kdh?.current_debt_amount), num(r.current_debt_amount)),
      atAssessment: pick(num(kdh?.total_cc_debt_at_assessment), num(r.total_cc_debt_at_assessment)),
      apr: pick(num(kdh?.approx_apr) ?? num(kdh?.apr), num(r.approx_apr) ?? num(r.apr)),
      monthlyPayments: pick(num(kdh?.monthly_debt_payments), num(r.monthly_debt_payments)),
      totalInterestAnnual: pick(num(kdh?.total_interest_cc_annual) ?? num(kdh?.total_interest_payments), num(r.total_interest_cc_annual)),
      ccInDefault: pick(num(kdh?.cc_debt_in_default), num(r.cc_debt_in_default)),
      savedInterest: pick(num(kdh?.money_saved_cc_interest), num(r.money_saved_cc_interest)),
      savedSettlement: pick(num(kdh?.money_saved_settlement), num(r.money_saved_settlement)),
      pathSelected: asPathList(kdh?.path_selected) || asPathList(r.path_selected),
      otherDebts: str(kdh?.other_debts_eidl) || str(r.other_debts_eidl),
      kdhRecId: kdh?.airtable_record_id || null,
    };

    // ── Cash-flow monthly history (latest budget note per month) ──
    const byMonth: Record<string, any> = {};
    for (const n of noteRows) {
      const raw = n.budgeting_date || n.date_added;
      if (!raw) continue;
      const inc = num(n.income) || 0, exp = num(n.expenses) || 0;
      if (inc === 0 && exp === 0) continue;
      const d = new Date(String(raw));
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const ex = byMonth[key];
      if (!ex || new Date(ex.date).getTime() < d.getTime()) {
        byMonth[key] = {
          month: key, date: raw,
          monthLabel: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          income: inc, expenses: exp, net: inc - exp,
        };
      }
    }
    const cashFlowHistory = Object.values(byMonth).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // ── Notes grouped by category (notes-table rows + per-role notes) ──
    type N = { cat: string; date: string | null; by: string | null; text: string };
    const all: N[] = [];
    for (const n of noteRows) {
      const text = str(n.latest_notes);
      if (!text) continue;
      all.push({ cat: catOf(n.type_of_session), date: n.budgeting_date || n.date_added || null, by: str(n.by_name), text });
    }
    const roleSrc: [string, unknown, unknown, string][] = [
      ["cm", r.cm_latest_note, r.cm_latest_note_at, "Case Manager"],
      ["budget", r.budgeter_notes, r.budgeter_notes_updated_at, "Budgeter"],
      ["debt", r.debt_notes, r.debt_expert_notes_updated_at, "Debt Expert"],
      ["jpa", r.jpa_notes, r.jpa_notes_updated_at, "JPA"],
      ["therapy", r.therapy_notes, null, "Therapy"],
      ["accountant", r.accountant_notes, null, "Accountant"],
      ["business", r.business_coach_notes, null, "Business Coach"],
      ["initial-interview", r.initial_interview_notes, null, "Initial Interview"],
      ["cm", r.broad_goals_notes, r.broad_goals_notes_updated_at, "Broad Goals"],
    ];
    for (const [cat, body, date, by] of roleSrc) {
      const text = str(body);
      if (text) all.push({ cat, date: (date as string) || null, by, text });
    }

    const groups: Record<string, N[]> = {};
    for (const n of all) (groups[n.cat] ||= []).push(n);
    const categories = Object.keys(groups).map((key) => {
      const list = groups[key].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      const latest = list[0];
      const level = staleLevel(latest.date, key);
      return {
        key,
        label: CAT_META[key]?.label || key,
        color: CAT_META[key]?.color || "#8E8B82",
        staleness: level,
        days: daysSince(latest.date),
        latest: { date: dateOnly(latest.date), by: latest.by, text: latest.text },
        notes: list.slice(0, 40).map((n) => ({ date: dateOnly(n.date), by: n.by, text: n.text })),
      };
    });
    const rank = (s: string | null) => (s === "idle" ? 0 : s === "stale" ? 1 : 2);
    categories.sort((a, b) => rank(a.staleness) - rank(b.staleness) || (CAT_ORDER.indexOf(a.key) - CAT_ORDER.indexOf(b.key)));
    const notesByCategory = {
      counts: {
        all: categories.length,
        idle: categories.filter((c) => c.staleness === "idle").length,
        stale: categories.filter((c) => c.staleness === "stale").length,
      },
      categories,
    };

    const lastNote = r.last_cm_note_date || r.notes_last_updated_at || null;

    return json({
      core: {
        lifecycleStatus: str(r.status),
        stage: str(r.ck_client_flow),
        married: r.legally_married === true || r.legally_married === "true" || r.legally_married === "Yes" ? true
          : r.legally_married === false ? false : str(r.legally_married),
        kids: num(r.num_kids),
        kidsAges: str(r.kids_ages),
        intakeDate: dateOnly(r.airtable_created_time),
        directorFlag: str(r.director_flag),
        daysSinceLastNote: daysSince(lastNote),
        currentMonthlyNet: num(r.current_monthly_net),
      },
      cashflow: {
        income: num(r.income_at_pl),
        expenses: num(r.expenses_at_pl),
        net: num(r.net) ?? num(r.current_monthly_net),
        deficit: num(r.monthly_deficit),
      },
      cashFlowHistory,
      debt,
      notesByCategory,
      big5,
    });
  } catch (e) {
    return json({ error: "internal", message: String((e as Error)?.message || e) }, 500);
  }
});
