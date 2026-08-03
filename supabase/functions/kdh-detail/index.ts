// kdh-detail — the full KDH client profile for the mobile detail page,
// mirroring the CK family-detail: status, debt (incl. CC in default),
// notes grouped by CATEGORY (all providers) with Idle/Stale freshness,
// total paid, and intake-fee-paid. Read-only, service role.
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
const asList = (v: unknown): string | null =>
  Array.isArray(v) ? (v.map((x) => String(x).trim()).filter(Boolean).join(", ") || null) : str(v);

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
  if (d >= 30) return "idle";
  if (d >= 14) return "stale";
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { id } = (await req.json().catch(() => ({}))) as { id?: string };
    if (!id) return json({ error: "id required" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows } = await sb.from("kdh_clients").select("*")
      .or(`id.eq.${id},airtable_record_id.eq.${id}`).limit(1);
    const r: any = rows?.[0];
    if (!r) return json({ error: "not_found" }, 404);

    const [noteRes, payRes, appRes] = await Promise.all([
      sb.from("notes").select("latest_notes,type_of_session,budgeting_date,date_added,by_name")
        .eq("kdh_client_id", r.id).order("date_added", { ascending: false }).limit(200),
      sb.from("client_payments").select("amount,payment_date").eq("kdh_client_id", r.id).eq("paid", true),
      sb.from("kdh_intake_applications").select("payment_status,paid_at").eq("client_id", r.id)
        .eq("payment_status", "paid").order("paid_at", { ascending: false }).limit(1),
    ]);
    const noteRows: any[] = (noteRes as any).data || [];

    let totalPaid = 0, lastPaymentDate: string | null = null;
    for (const p of ((payRes as any).data || [])) {
      totalPaid += num(p.amount) || 0;
      if (p.payment_date && (!lastPaymentDate || p.payment_date > lastPaymentDate)) lastPaymentDate = p.payment_date;
    }
    const app = (appRes as any).data?.[0] || null;

    // Notes grouped by category (all providers).
    type N = { cat: string; date: string | null; by: string | null; text: string };
    const all: N[] = [];
    for (const n of noteRows) {
      const text = str(n.latest_notes);
      if (!text) continue;
      all.push({ cat: catOf(n.type_of_session), date: n.budgeting_date || n.date_added || null, by: str(n.by_name), text });
    }
    const roleSrc: [string, unknown, unknown, string][] = [
      ["cm", r.cm_latest_note, r.cm_latest_note_at, "Case Manager"],
      ["debt", r.debt_notes, r.debt_expert_notes_updated_at, "Debt Expert"],
      ["budget", r.budgeter_notes, r.budgeter_notes_updated_at, "Budgeter"],
      ["jpa", r.jpa_notes, r.jpa_notes_updated_at, "JPA"],
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
        key, label: CAT_META[key]?.label || key, color: CAT_META[key]?.color || "#8E8B82",
        staleness: level, days: daysSince(latest.date),
        latest: { date: dateOnly(latest.date), by: latest.by, text: latest.text },
        notes: list.slice(0, 40).map((n) => ({ date: dateOnly(n.date), by: n.by, text: n.text })),
      };
    });
    const rank = (s: string | null) => (s === "idle" ? 0 : s === "stale" ? 1 : 2);
    categories.sort((a, b) => rank(a.staleness) - rank(b.staleness) || (CAT_ORDER.indexOf(a.key) - CAT_ORDER.indexOf(b.key)));

    return json({
      core: {
        name: str(r.full_name) || [str(r.first_name), str(r.last_name)].filter(Boolean).join(" ") || "KDH client",
        stage: str(r.mordy_view),
        currentStatus: str(r.current_status),
        email: str(r.email),
        phone: str(r.phone),
        location: [str(r.city), str(r.state)].filter(Boolean).join(", ") || null,
        debtExpert: str(r.debt_expert_name) || null,
      },
      debt: {
        atAssessment: num(r.total_cc_debt_at_assessment),
        current: num(r.current_debt_amount),
        apr: num(r.approx_apr) ?? num(r.apr),
        monthlyPayments: num(r.monthly_debt_payments),
        totalInterestAnnual: num(r.total_interest_cc_annual) ?? num(r.total_interest_payments),
        ccInDefault: num(r.cc_debt_in_default),
        savedInterest: num(r.money_saved_cc_interest),
        savedSettlement: num(r.money_saved_settlement),
        pathSelected: asList(r.path_selected),
        otherDebts: str(r.other_debts_eidl),
      },
      totalPaid: Math.round(totalPaid),
      lastPaymentDate,
      intakeFeePaid: !!app,
      intakeFeePaidAt: app?.paid_at || null,
      notesByCategory: {
        counts: {
          all: categories.length,
          idle: categories.filter((c) => c.staleness === "idle").length,
          stale: categories.filter((c) => c.staleness === "stale").length,
        },
        categories,
      },
    });
  } catch (e) {
    return json({ error: "internal", message: String((e as Error)?.message || e) }, 500);
  }
});
