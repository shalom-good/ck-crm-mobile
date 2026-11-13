import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { useParams } from "react-router";
import { IonPage, IonContent } from "@ionic/react";
import { NotePencil, Envelope, ArrowSquareOut } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { useUI } from "@/lib/ui";
import { ROLE_BY_KEY, type RoleKey } from "@/lib/roles";
import { money } from "@/lib/format";
import { fetchFamilyDetail, type FamilyDetail } from "@/lib/api";
import { fetchBriskProfile } from "@/lib/mobileApi";
import { tintFor } from "@/lib/colorHash";
import { AiSummary } from "@/components/AiSummary";
import { Av, Bars, Pill, Row, Strip, type Bar, type Stat } from "@/components/gv";
import { ActivityLine, Badge, Icon, initialsOf } from "@/components/orchard/Orchard";
import { stagePosition, stageLabel, stageOf, statusChip, crossBadges, NO_STAGE } from "@/lib/orchardBoard";

/**
 * Family profile in ORCHARD (2026-11-02): a mint hero (initials tile,
 * name, place, stage chip, status + program badges, Call / Text /
 * WhatsApp / Email / Note), tabs Overview · Money · Notes · Team over the
 * sections below, the journey bar on the real stage order, the forest
 * money card from real figures, and the AI rundown as "Where they stand".
 *
 * Before Orchard it was the staff view of one family in the Grove look, the
 * same structure as the CRM's family profile: square initials + name,
 * the touch pill, the 5-step journey track (done forest, current lime),
 * a stat strip, care team, cash flow (grey income bars, the latest month
 * coral when the net is negative / forest when positive), plans, latest
 * notes, the AI rundown, and Call / WhatsApp / Note.
 *
 * Data: GET /api/mobile/families/:recId (the desktop brisk profile
 * object) first; the older family-detail edge function as fallback.
 * Every section degrades to hidden when its data is missing.
 */

const JOURNEY = ["Applied", "Intake", "Success Plan", "Active care", "Graduation"];
const CRM_URL = "https://crm.collectivekindness.net";

type Raw = Record<string, any>;

interface VM {
  name: string;
  metaLine: string | null;
  journeyIndex: number;
  team: { name: string; role: string; bg?: string; fg?: string }[];
  cashMonths: { label: string; income: number | null; expenses: number | null; net: number | null }[];
  latestNet: number | null;
  latestNetLabel: string | null;
  plans: { name: string; dot: string; sub: string | null; status?: string | null; tone?: "green" | "red" | "gray"; noteCount?: number | null }[];
  notes: { meta: string; text: string }[];
  noteCount: number | null;
  debt: number | null;
  phone: string | null;
  email: string | null;
  summary: string | null;
}

function journeyIndex(opts: { stageCurrent?: string | null; stageIndex?: number | null; planMade?: boolean | null; status?: string | null; hasCash?: boolean }): number {
  const s = String(opts.stageCurrent || "").toLowerCase();
  const st = String(opts.status || "").toLowerCase();
  let idx: number;
  if (/graduat|alumni|offboard/.test(s) || /graduat|alumni/.test(st)) idx = 4;
  else if (/ongoing|support|working|budget|near zero|cash/.test(s)) idx = 3;
  else if (/plan/.test(s)) idx = 2;
  else if (/assess|intake/.test(s)) idx = 1;
  else if (/applied|new/.test(s)) idx = 0;
  else if ((opts.stageIndex ?? 0) >= 1 || opts.hasCash) idx = 3;
  else idx = 1;
  if (opts.planMade && idx < 2) idx = 2;
  return idx;
}

const clip = (s: string, n = 46) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** "2026-05-05" → "May 2026"; anything already pretty passes through. */
const prettyJoined = (s: string) =>
  /^\d{4}-\d{2}-\d{2}/.test(s)
    ? new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : s;

/** "2026-05" / "May 2026" / "May" → "May" for the bar labels. */
const monthShort = (s: string) => {
  if (/^\d{4}-\d{2}/.test(s)) {
    const d = new Date(`${s.slice(0, 7)}-15T12:00:00`);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("en-US", { month: "short" });
  }
  return s.trim().split(/\s+/)[0].slice(0, 3);
};

/** Strip-sized money: "$1,240", "$12.4k", "-$300". */
const compactMoney = (n: number) => {
  const a = Math.abs(n);
  const body = a >= 10000 ? `$${(a / 1000).toFixed(a >= 100000 ? 0 : 1).replace(/\.0$/, "")}k` : money(a);
  return `${n < 0 ? "-" : ""}${body}`;
};

function vmFromBrisk(p: Raw): VM {
  const monthlyRaw: Raw[] = Array.isArray(p?.money?.monthly) ? p.money.monthly : [];
  const cashMonths = monthlyRaw.slice(-4).map((m) => ({
    label: String(m?.month ?? m?.monthLabel ?? ""),
    income: typeof m?.income === "number" ? m.income : null,
    expenses: typeof m?.expenses === "number" ? m.expenses : null,
    net: typeof m?.net === "number" ? m.net : null,
  }));
  const latestNet = typeof p?.money?.net === "number" ? p.money.net
    : typeof p?.money?.currentMonthlyNet === "number" ? p.money.currentMonthlyNet
    : cashMonths.length ? cashMonths[cashMonths.length - 1].net : null;

  const plans = (Array.isArray(p?.plans) ? p.plans : []).map((pl: Raw) => ({
    name: String(pl?.name ?? "Plan"),
    dot: String(pl?.dot ?? "var(--gv-mintInk)"),
    sub: pl?.owner && pl.owner !== "Unassigned"
      ? [String(pl.owner), pl?.role ? String(pl.role) : null].filter(Boolean).join(" · ")
      : (pl?.summary ? clip(String(pl.summary)) : null),
    status: pl?.status ? String(pl.status) : null,
    tone: pl?.tone === "red" ? "red" as const : pl?.tone === "gray" ? "gray" as const : "green" as const,
    noteCount: typeof pl?.noteCount === "number" ? pl.noteCount : null,
  }));
  const debtTotal = p?.debt?.total ?? p?.debt?.current ?? null;
  if (debtTotal != null && !plans.some((pl: { name: string }) => /debt/i.test(pl.name))) {
    plans.push({ name: "Debt", dot: "var(--gv-lavenderInk)", sub: `${money(Number(debtTotal))} on file`, status: null, tone: "green" as const, noteCount: null });
  }

  const notesRaw: Raw[] = Array.isArray(p?.caseNotes) ? p.caseNotes : [];
  const notes = notesRaw.slice(0, 4).map((n) => ({
    meta: [n?.type ?? "Note", n?.date ?? null].filter(Boolean).join(" · "),
    text: String(n?.text ?? n?.summary ?? "").trim(),
  })).filter((n) => n.text);

  const metaBits = [p?.city, p?.intakeDate ? `joined ${prettyJoined(String(p.intakeDate))}` : null].filter(Boolean);

  return {
    name: String(p?.name ?? "Family"),
    metaLine: metaBits.length ? metaBits.join(" · ") : null,
    journeyIndex: journeyIndex({
      stageCurrent: p?.stage?.current ?? null,
      stageIndex: typeof p?.stage?.index === "number" ? p.stage.index : null,
      planMade: !!p?.planMade,
      status: p?.status ?? null,
      hasCash: !!(p?.money?.hasData || cashMonths.length),
    }),
    team: (Array.isArray(p?.providers) ? p.providers : []).map((t: Raw) => ({
      name: String(t?.name ?? "Team"),
      role: String(t?.role ?? ""),
      bg: t?.bg, fg: t?.fg,
    })),
    cashMonths,
    latestNet,
    latestNetLabel: cashMonths.length ? cashMonths[cashMonths.length - 1].label : null,
    plans,
    notes,
    noteCount: typeof p?.noteCount === "number" ? p.noteCount : notesRaw.length ? notesRaw.length : null,
    debt: debtTotal != null && Number.isFinite(Number(debtTotal)) ? Number(debtTotal) : null,
    phone: p?.phone ?? null,
    email: p?.email ?? null,
    summary: p?.caseSummary ?? null,
  };
}

function vmFromFallback(detail: FamilyDetail | null, fam: { name: string; city?: string; state?: string; phone: string; email: string; assignments: Partial<Record<RoleKey, string>>; stage?: string; lifecycleStatus?: string; currentMonthlyNet?: number | null; estimatedDebt?: number } | undefined): VM {
  const hist = detail?.cashFlowHistory ?? [];
  const cashMonths = hist.slice(-4).map((r) => ({ label: r.monthLabel, income: r.income, expenses: r.expenses, net: r.net }));
  const latestNet = detail?.cashflow?.net ?? fam?.currentMonthlyNet ?? (cashMonths.length ? cashMonths[cashMonths.length - 1].net : null);

  const team = Object.entries(fam?.assignments ?? {}).map(([rk, name]) => ({
    name: String(name),
    role: ROLE_BY_KEY[rk as RoleKey]?.label ?? "Provider",
  }));

  const notes = (detail?.notesByCategory?.categories ?? []).slice(0, 4).map((c) => ({
    meta: [c.label, c.latest.date, c.latest.by].filter(Boolean).join(" · "),
    text: c.latest.text,
  })).filter((n) => n.text);

  const debtRaw = detail?.debt?.current ?? detail?.debt?.atAssessment ?? null;
  const debt = debtRaw != null ? Number(debtRaw) : (fam?.estimatedDebt ?? 0) > 0 ? Number(fam!.estimatedDebt) : null;

  const plans: VM["plans"] = [];
  if (detail?.debt?.current != null || detail?.debt?.atAssessment != null) {
    plans.push({ name: "Debt", dot: "var(--gv-lavenderInk)", sub: `${money(Number(detail?.debt?.current ?? detail?.debt?.atAssessment))} on file` });
  }

  const allNotes = detail?.notesByCategory?.counts?.all;

  return {
    name: fam?.name ?? "Family",
    metaLine: [fam?.city, detail?.core?.intakeDate ? `joined ${prettyJoined(String(detail.core.intakeDate))}` : null].filter(Boolean).join(" · ") || null,
    journeyIndex: journeyIndex({
      stageCurrent: detail?.core?.stage ?? fam?.stage ?? null,
      status: detail?.core?.lifecycleStatus ?? fam?.lifecycleStatus ?? null,
      hasCash: cashMonths.length > 0 || latestNet != null,
    }),
    team,
    cashMonths,
    latestNet,
    latestNetLabel: cashMonths.length ? cashMonths[cashMonths.length - 1].label : null,
    plans,
    notes,
    noteCount: typeof allNotes === "number" && allNotes > 0 ? allNotes : null,
    debt,
    phone: fam?.phone ?? null,
    email: fam?.email ?? null,
    summary: null,
  };
}

const PLAN_TINT = { green: "mint", red: "rose", gray: "none" } as const;

type Tab = "overview" | "money" | "notes" | "team";

export function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getFamily } = useAppData();
  const { openCapture } = useUI();
  const family = getFamily(id);

  const [vm, setVm] = useState<VM | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    let cancelled = false;
    setVm(null);
    setState("loading");
    setTab("overview");
    (async () => {
      // New API first; the older edge function keeps the page alive if
      // it fails (or the route is not deployed yet).
      try {
        const p = await fetchBriskProfile(id);
        if (cancelled) return;
        if (p && (p.name || p.recId)) { setVm(vmFromBrisk(p)); setState("ok"); return; }
        throw new Error("empty profile");
      } catch {
        try {
          const d = await fetchFamilyDetail(id);
          if (cancelled) return;
          setVm(vmFromFallback(d, family));
          setState(d || family ? "ok" : "error");
        } catch {
          if (cancelled) return;
          if (family) { setVm(vmFromFallback(null, family)); setState("ok"); }
          else setState("error");
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const days = family?.daysSinceLastNote ?? null;
  const name = vm?.name ?? family?.name ?? "Family";
  const phone = (vm?.phone || family?.phone || "").trim();
  const tel = phone.replace(/[^0-9+]/g, "");
  const wa = tel.replace(/^\+/, "").replace(/^0+/, "");

  const hasBars = (vm?.cashMonths ?? []).some((m) => m.income != null);
  const showCash = vm != null && (vm.latestNet != null || hasBars);
  const email = (vm?.email || family?.email || "").trim();
  const crmUrl = `${CRM_URL}/families/${encodeURIComponent(id)}`;

  // When the rich profile comes back thin (roster-only fields), an
  // "At a glance" card keeps the page from ever reading blank.
  const sparse = state !== "loading"
    && (vm == null || (vm.team.length === 0 && !showCash && vm.plans.length === 0 && vm.notes.length === 0));
  const glanceRows: { label: string; value: string }[] = [];
  if (sparse && family) {
    glanceRows.push({ label: "Program", value: family.programLabel || family.program });
    const status = family.lifecycleStatus || family.stage;
    if (status) glanceRows.push({ label: "Status", value: String(status) });
    if (family.assignments.case_manager) glanceRows.push({ label: "Case manager", value: family.assignments.case_manager });
    if (typeof family.currentMonthlyNet === "number") {
      glanceRows.push({ label: "Monthly net", value: `${family.currentMonthlyNet < 0 ? "-" : "+"}${money(Math.abs(family.currentMonthlyNet))}` });
    }
    if ((family.estimatedDebt ?? 0) > 0) glanceRows.push({ label: "Est. debt", value: money(family.estimatedDebt!) });
    if ((family.amountPaid ?? 0) > 0) glanceRows.push({ label: "Paid so far", value: money(family.amountPaid!) });
    if (days != null) glanceRows.push({ label: "Last note", value: days <= 0 ? "Today" : `${days}d ago` });
  }

  // The stat strip: only the numbers that exist, at most four.
  const stats: Stat[] = [];
  const net = vm?.latestNet ?? family?.currentMonthlyNet ?? null;
  // Plain wording, and room for the whole number (2026-11-11: "wording is
  // icky", "$3,78 / 5" was wrapping in a four-across strip).
  const ago = (d: number) => (d <= 0 ? "Today" : d === 1 ? "Yesterday" : d < 60 ? `${d} days ago` : d < 730 ? `${Math.round(d / 30)} months ago` : `${Math.floor(d / 365)} years ago`);
  if (typeof net === "number") stats.push({ label: net < 0 ? "Short each month" : "Left over each month", value: money(Math.abs(net)), warn: net < 0 });
  if (vm?.debt != null && vm.debt > 0) stats.push({ label: "Debt", value: compactMoney(vm.debt) });
  if (vm?.noteCount != null) stats.push({ label: "Notes", value: vm.noteCount });
  if (days != null) stats.push({ label: "Last note", value: ago(days), warn: days > 30 });

  // The most important next step, from what is on file (rules, not AI):
  // the first that applies leads, the next two follow.
  const roleHas = (re: RegExp) => (vm?.team ?? []).some((t) => re.test(t.role));
  const steps: { h: string; why: string; act: "note" | "call" | "none" }[] = [];
  if (days != null && days > 30) steps.push({ h: `Reach out to ${name.split(" ")[0] || "the family"}`, why: `The last note is from ${ago(days)}. Call, then log a note.`, act: "call" });
  if (vm && vm.plans.length === 0 && state !== "loading") steps.push({ h: "Build the success plan", why: "No plan is on file yet.", act: "none" });
  if (typeof net === "number" && net < 0) steps.push({ h: "Go over the budget", why: `They are short ${money(Math.abs(net))} a month.`, act: "none" });
  if (vm?.debt != null && vm.debt > 0 && vm.team.length > 0 && !roleHas(/debt/i)) steps.push({ h: "Bring in a debt expert", why: `${compactMoney(vm.debt)} of debt is on file and nobody on the team covers debt.`, act: "none" });
  if (vm && vm.team.length > 0 && !roleHas(/budget/i) && vm.cashMonths.length === 0) steps.push({ h: "Assign a budgeter", why: "No budgeter and no cash flow on file.", act: "none" });
  if (!phone && !(vm?.email || family?.email)) steps.push({ h: "Get a phone number or email", why: "There is no way to reach them on file.", act: "none" });
  if (days != null && days > 14 && days <= 30) steps.push({ h: "Log a check-in", why: `The last note is from ${ago(days)}.`, act: "note" });
  const nextStep = steps[0] ?? null;

  // Cash-flow bars: income per month in grey, the latest month coloured
  // by the sign of the net.
  const bars: Bar[] = (vm?.cashMonths ?? []).map((m, k, arr) => {
    const last = k === arr.length - 1;
    const neg = (m.net ?? vm?.latestNet ?? 0) < 0;
    return { label: monthShort(m.label), value: m.income ?? 0, on: last && neg, go: last && !neg };
  });

  // Journey: the real stage order when the roster stage sits on it (CK
  // flow / KDH forward run), else the 5-step journey read off the profile.
  const pos = family ? stagePosition(family) : null;
  const journey = pos
    ? { steps: pos.order.map((s) => stageLabel(family!.kind, s)), index: pos.index }
    : vm ? { steps: JOURNEY, index: vm.journeyIndex } : null;
  const stageText = family ? (stageOf(family) === NO_STAGE ? null : stageLabel(family.kind, stageOf(family))) : null;
  const chip = family ? statusChip(family) : null;
  const badges = family ? crossBadges(family) : [];
  const isKdh = family?.kind === "kdh";
  const paid = (family?.amountPaid ?? 0) > 0 ? family!.amountPaid! : null;

  // Forest money card: the monthly net when there is one, else the debt.
  const moneyBig = typeof net === "number"
    ? { label: `Net a month${vm?.latestNetLabel ? ` · ${vm.latestNetLabel}` : ""}`, value: `${net < 0 ? "-" : "+"}${money(Math.abs(net))}` }
    : vm?.debt != null && vm.debt > 0 ? { label: "Debt on file", value: money(vm.debt) }
    : (family?.estimatedDebt ?? 0) > 0 ? { label: "Estimated debt", value: money(family!.estimatedDebt!) }
    : null;
  const moneyChips: { text: string; warm?: boolean }[] = [];
  if (typeof net === "number" && vm?.debt != null && vm.debt > 0) moneyChips.push({ text: `${money(vm.debt)} debt on file` });
  if (paid != null) moneyChips.push({ text: `${money(paid)} paid` });
  if (typeof net === "number" && net < 0) moneyChips.push({ text: "Short each month", warm: true });

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "money", label: "Money" },
    { key: "notes", label: vm?.noteCount ? `Notes · ${vm.noteCount}` : "Notes" },
    { key: "team", label: "Team" },
  ];
  const off = (on: boolean) => (on ? undefined : ("true" as const));

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="oc-root" style={{ paddingBottom: "calc(40px + var(--ion-safe-area-bottom, 0px))" }}>
          <style>{`
            .fd-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
            .fd-tile { background: var(--oc-card, #fff); border-radius: 18px; padding: 13px 14px 12px; display: flex; flex-direction: column; gap: 5px; min-width: 0; box-shadow: 0 1px 2px rgba(22,33,28,.04); }
            .fd-tile small { font-size: 12px; font-weight: 700; color: var(--oc-mid, #5B6B62); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .fd-tile b { font-size: 22px; font-weight: 800; letter-spacing: -.03em; line-height: 1.1; color: var(--oc-ink, #16211C); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .fd-tile b.warn { color: var(--oc-bad, #B4532A); }
            .fd-nextstep { border-radius: 22px; padding: 16px; display: flex; flex-direction: column; gap: 6px; background: linear-gradient(135deg, #DCE8F7 0%, #E4E1F6 100%); color: var(--oc-ink, #16211C); }
            .fd-nextstep .oc-eyebrow { color: #2D3766; }
            .fd-nextstep > b { font-size: 19px; font-weight: 800; letter-spacing: -.02em; line-height: 1.2; }
            .fd-nextstep > p { margin: 0; font-size: 14px; line-height: 1.45; color: #3F4A63; }
            .fd-nextacts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
            .fd-nextacts a, .fd-nextacts button { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px; border: 0; border-radius: 999px; background: #fff; color: var(--oc-ink, #16211C); font: inherit; font-size: 13.5px; font-weight: 800; text-decoration: none; cursor: pointer; }
            .fd-nextacts a:first-child { background: var(--oc-forest, #2F7556); color: #fff; }
            .fd-alsosteps { list-style: none; margin: 8px 0 0; padding: 8px 0 0; border-top: 1px solid rgba(45,55,102,.14); display: flex; flex-direction: column; gap: 8px; }
            .fd-alsosteps li { display: flex; flex-direction: column; gap: 1px; }
            .fd-alsosteps b { font-size: 14px; font-weight: 800; }
            .fd-alsosteps span { font-size: 12.5px; color: #3F4A63; }
            .fd-nextsrc { font-size: 11.5px; color: #5A6384; margin-top: 4px; }
            .fd-strip .gv-st { padding: 12px 10px 10px; }
            .fd-strip .gv-st .v { font-size: 20px; }
            .oc-quick5 { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
            .oc-quick5 > * { border-radius: 16px; font-size: 11.5px; }
            @media (max-width: 359px) {
              .fd-strip .gv-st { padding: 11px 7px 9px; }
              .fd-strip .gv-st .v { font-size: 16px; }
              .fd-strip .gv-st small { font-size: 10.5px; }
              .oc-quick5 > * { font-size: 10.5px; }
            }
          `}</style>

          {/* Mint hero */}
          <div className="oc-hero">
            <div className="oc-hero-top">
              <BackButton href="/tabs/families" />
              <span>{isKdh ? "KDH client" : "CK family"}</span>
              <a className="oc-round" href={crmUrl} target="_blank" rel="noreferrer" aria-label="Open full profile in CRM">
                <ArrowSquareOut size={18} weight="bold" />
              </a>
            </div>
            <div className="oc-hero-id">
              <span className="oc-hero-av" aria-hidden="true">{initialsOf(name)}</span>
              <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <h1 className="oc-hero-name" style={{ margin: 0, overflowWrap: "anywhere" }}>{name}</h1>
                {vm?.metaLine && <span className="oc-hero-meta">{vm.metaLine}</span>}
                <div className="oc-badges">
                  {stageText && <Badge tone="go">{stageText}</Badge>}
                  {chip && <Badge tone={chip.tone}>{chip.text}</Badge>}
                  {badges.map((b) => <Badge key={b.text} tone={b.tone}>{b.text}</Badge>)}
                  {days != null && days <= 0 && <Badge tone="ok">Note logged today</Badge>}
                </div>
              </div>
            </div>
            <div className="oc-quick oc-quick5">
              <a href={tel ? `tel:${tel}` : undefined} aria-disabled={off(!!tel)}><Icon name="call" size={18} color="currentColor" />Call</a>
              <a href={tel ? `sms:${tel}` : undefined} aria-disabled={off(!!tel)}><Icon name="text" size={18} color="currentColor" />Text</a>
              <a href={wa ? `https://wa.me/${wa}` : undefined} target="_blank" rel="noreferrer" aria-disabled={off(!!wa)}><Icon name="whatsapp" size={18} color="currentColor" />WhatsApp</a>
              <a href={email ? `mailto:${email}` : undefined} aria-disabled={off(!!email)}><Icon name="email" size={18} color="currentColor" />Email</a>
              <button type="button" className="is-primary" onClick={() => openCapture("add", { id, name })}><Icon name="note" size={18} color="currentColor" />Note</button>
            </div>
          </div>

          <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
            {family?.directorFlag && (
              <div className="oc-panel" style={{ background: "var(--oc-rose)", gap: 4 }}>
                <span className="oc-eyebrow" style={{ color: "var(--oc-bad)" }}>Director flag</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{family.directorFlag}</span>
              </div>
            )}

            <div className="oc-ptabs" role="tablist" aria-label="Profile sections">
              {tabs.map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>
              ))}
            </div>

            {state === "loading" && (
              <div style={{ padding: "30px 0", display: "flex", justifyContent: "center" }}><span className="ck-spin" /></div>
            )}
            {state === "error" && (
              <div className="oc-panel"><p className="gv-sub" style={{ fontSize: 13.5, margin: 0 }}>Could not load this profile. This may be on us. Go back and try again.</p></div>
            )}

            {/* ── Overview ── (panels stay mounted so the AI rundown runs once) */}
            <div style={{ display: tab === "overview" ? "flex" : "none", flexDirection: "column", gap: 12 }}>
              {journey && state !== "loading" && (
                <div className="oc-panel">
                  <div className="oc-panel-title">Journey<small>Step {journey.index + 1} of {journey.steps.length}</small></div>
                  <div className="oc-journey" aria-hidden="true">
                    {journey.steps.map((s, k) => <span key={s} className={k < journey.index ? "is-done" : k === journey.index ? "is-now" : ""} />)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--oc-mid)" }}>
                    <span>{journey.steps[0]}</span>
                    <b style={{ color: "var(--oc-ink)", fontWeight: 800, textAlign: "center" }}>{journey.steps[journey.index]}</b>
                    <span style={{ textAlign: "right" }}>{journey.steps[journey.steps.length - 1]}</span>
                  </div>
                </div>
              )}

              {moneyBig && state !== "loading" && (
                <button type="button" className="oc-money" onClick={() => setTab("money")} style={{ border: 0, textAlign: "left", font: "inherit", cursor: "pointer" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <small>{moneyBig.label}</small>
                    <small style={{ color: "var(--oc-forest)", fontWeight: 800 }}>See money</small>
                  </span>
                  <b>{moneyBig.value}</b>
                  {moneyChips.length > 0 && (
                    <div className="oc-money-chips">
                      {moneyChips.map((c) => <span key={c.text} className={c.warm ? "is-warm" : undefined}>{c.text}</span>)}
                    </div>
                  )}
                </button>
              )}

              {glanceRows.length > 0 && (
                <div className="oc-panel">
                  <div className="oc-panel-title">At a glance</div>
                  <div>
                    {glanceRows.map((r) => (
                      <Row key={r.label} style={{ padding: "9px 0", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--oc-mid)" }}>{r.label}</span>
                        <span className="tnum" style={{ fontSize: 13, fontWeight: 700, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{r.value}</span>
                      </Row>
                    ))}
                  </div>
                </div>
              )}

              {/* The existing AI rundown, named the Orchard way. */}
              <AiSummary id={id} title="Where they stand" className="oc-panel" />
            </div>

            {/* ── Money ── */}
            <div style={{ display: tab === "money" ? "flex" : "none", flexDirection: "column", gap: 12 }}>
              {stats.length > 0 && state !== "loading" && (
                <div className="fd-tiles">
                  {stats.slice(0, 4).map((st) => (
                    <div key={st.label} className="fd-tile">
                      <small>{st.label}</small>
                      <b className={`tnum${st.warn ? " warn" : ""}`}>{st.value}</b>
                    </div>
                  ))}
                </div>
              )}
              {showCash && (
                <div className="oc-panel">
                  <div className="oc-panel-title">Cash flow{vm!.latestNetLabel ? <small>{vm!.latestNetLabel}</small> : null}</div>
                  <div className="tnum" style={{ fontSize: 30, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-.03em", color: vm!.latestNet != null && vm!.latestNet < 0 ? "var(--oc-bad)" : "var(--oc-forest)" }}>
                    {vm!.latestNet != null ? `${vm!.latestNet < 0 ? "-" : "+"}${money(Math.abs(vm!.latestNet))}` : "No net yet"}
                  </div>
                  <div className="gv-meta" style={{ marginTop: -8 }}>net a month</div>
                  {hasBars && (
                    <div>
                      <Bars bars={bars} height={56} />
                      <div className="gv-meta" style={{ marginTop: 6, fontSize: 11 }}>Income by month</div>
                    </div>
                  )}
                </div>
              )}
              {(vm?.debt != null && vm.debt > 0) || paid != null ? (
                <div className="oc-panel">
                  <div className="oc-panel-title">Debt and payments</div>
                  {vm?.debt != null && vm.debt > 0 && (
                    <Row style={{ padding: "8px 0", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--oc-mid)" }}>Debt on file</span>
                      <b className="tnum" style={{ fontSize: 15 }}>{money(vm.debt)}</b>
                    </Row>
                  )}
                  {paid != null && (
                    <Row style={{ padding: "8px 0", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--oc-mid)" }}>Paid so far</span>
                      <b className="tnum" style={{ fontSize: 15 }}>{money(paid)}</b>
                    </Row>
                  )}
                </div>
              ) : null}
              {state !== "loading" && stats.length === 0 && !showCash && !(vm?.debt) && paid == null && (
                <div className="oc-panel"><span style={{ fontSize: 13.5, color: "var(--oc-mid)" }}>No money figures on file for this family yet.</span></div>
              )}
            </div>

            {/* ── Notes ── */}
            <div style={{ display: tab === "notes" ? "flex" : "none", flexDirection: "column", gap: 12 }}>
              {nextStep && state !== "loading" && (
                <div className="fd-nextstep">
                  <span className="oc-eyebrow">Most important next step</span>
                  <b>{nextStep.h}</b>
                  <p>{nextStep.why}</p>
                  <div className="fd-nextacts">
                    {nextStep.act === "call" && tel && <a href={`tel:${tel}`}><Icon name="call" size={16} color="currentColor" />Call</a>}
                    {nextStep.act === "call" && wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} color="currentColor" />WhatsApp</a>}
                    <button type="button" onClick={() => openCapture("add", { id, name })}><Icon name="note" size={16} color="currentColor" />Log a note</button>
                  </div>
                  {steps.length > 1 && (
                    <ul className="fd-alsosteps">
                      {steps.slice(1, 3).map((x) => <li key={x.h}><b>{x.h}</b><span>{x.why}</span></li>)}
                    </ul>
                  )}
                  <small className="fd-nextsrc">Suggested from what is on file.</small>
                </div>
              )}
              {vm?.summary && (
                <div className="oc-next">
                  <span className="oc-eyebrow" style={{ color: "#6B5A00" }}>Case summary</span>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{vm.summary}</p>
                </div>
              )}
              <div className="oc-panel">
                <div className="oc-panel-title">Latest notes{vm?.noteCount ? <small>{vm.noteCount} in all</small> : null}</div>
                {vm && vm.notes.length > 0 ? (
                  <div>{vm.notes.map((n, k) => <NoteRow key={k} meta={n.meta} text={n.text} />)}</div>
                ) : (
                  <ActivityLine text={null} />
                )}
                <button type="button" className="oc-btn" onClick={() => openCapture("add", { id, name })}>
                  <NotePencil size={16} weight="bold" /> Add a note
                </button>
              </div>
            </div>

            {/* ── Team and plans ── */}
            <div style={{ display: tab === "team" ? "flex" : "none", flexDirection: "column", gap: 12 }}>
              {vm && vm.team.length > 0 ? (
                <div className="oc-panel">
                  <div className="oc-panel-title">Care team</div>
                  <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", margin: "0 -4px", padding: "0 4px" }}>
                    {vm.team.slice(0, 8).map((t) => {
                      const tt = t.bg && t.fg ? { bg: t.bg, fg: t.fg } : tintFor(t.name);
                      return (
                        <div key={`${t.name}-${t.role}`} style={{ flex: "0 0 auto", width: 84, textAlign: "center", minWidth: 0 }}>
                          <Av name={t.name} size={44} round style={{ margin: "0 auto 6px", background: tt.bg, color: tt.fg }} />
                          <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                          {t.role && <div style={{ fontSize: 11, color: "var(--oc-mid)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.role}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : state !== "loading" ? (
                <div className="oc-panel"><span style={{ fontSize: 13.5, color: "var(--oc-mid)" }}>No care team on file yet.</span></div>
              ) : null}

              {vm && vm.plans.length > 0 && (
                <div className="oc-panel">
                  <div className="oc-panel-title">Plans</div>
                  <div>
                    {vm.plans.slice(0, 8).map((pl) => (
                      <Row key={pl.name} style={{ padding: "10px 0" }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: pl.dot, flex: "none" }} />
                        <span className="t">
                          <b>{pl.name}</b>
                          {pl.sub && <span>{pl.sub}</span>}
                        </span>
                        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flex: "none" }}>
                          {pl.status && <Pill tint={PLAN_TINT[pl.tone ?? "green"]} sm>{pl.status}</Pill>}
                          {typeof pl.noteCount === "number" && pl.noteCount > 0 && (
                            <span className="gv-meta tnum" style={{ fontSize: 11 }}>{pl.noteCount} {pl.noteCount === 1 ? "note" : "notes"}</span>
                          )}
                        </span>
                      </Row>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Files and links */}
            <div className="oc-links" style={{ marginTop: 4 }}>
              {email && (
                <a className="oc-link" href={`mailto:${email}`} style={{ minWidth: 0, maxWidth: "100%" }}>
                  <Envelope size={15} weight="bold" style={{ flex: "none" }} />
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
                </a>
              )}
              <a className="oc-link" href={crmUrl} target="_blank" rel="noreferrer">
                Open full profile in CRM <ArrowSquareOut size={14} weight="bold" />
              </a>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

function NoteRow({ meta, text }: { meta: string; text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 150;
  return (
    <Row style={{ padding: "10px 0", alignItems: "flex-start", flexDirection: "column", gap: 4 }}>
      <span className="gv-meta" style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{meta}</span>
      <p style={{ margin: 0, fontSize: 13.5, color: "var(--gv-ink)", lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {open || !long ? text : `${text.slice(0, 150).trimEnd()}… `}
        {long && (
          <button className="gv-link" onClick={() => setOpen((v) => !v)}>
            {open ? "Show less" : "Read full"}
          </button>
        )}
      </p>
    </Row>
  );
}
