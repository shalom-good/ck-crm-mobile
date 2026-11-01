import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton } from "@ionic/react";
import { Phone, ChatCircleText, NotePencil, Envelope, ArrowSquareOut } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { useUI } from "@/lib/ui";
import { ROLE_BY_KEY, type RoleKey } from "@/lib/roles";
import { money } from "@/lib/format";
import { fetchFamilyDetail, type FamilyDetail } from "@/lib/api";
import { fetchBriskProfile } from "@/lib/mobileApi";
import { tintFor } from "@/lib/colorHash";
import { AiSummary } from "@/components/AiSummary";
import { Av, Bars, Btn, Card, CardTitle, Pill, Row, Strip, Track, type Bar, type Stat } from "@/components/gv";

/**
 * Family profile — the staff view of one family in the Grove look, the
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

export function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getFamily } = useAppData();
  const { openCapture } = useUI();
  const family = getFamily(id);

  const [vm, setVm] = useState<VM | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setVm(null);
    setState("loading");
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
    glanceRows.push({ label: "Program", value: family.program });
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
  if (typeof net === "number") stats.push({ label: "Net a month", value: compactMoney(net), warn: net < 0 });
  if (vm?.debt != null && vm.debt > 0) stats.push({ label: "Debt on file", value: compactMoney(vm.debt) });
  if (vm?.noteCount != null) stats.push({ label: "Notes", value: vm.noteCount });
  if (days != null) stats.push({ label: "Since touch", value: days <= 0 ? "Today" : days, unit: days <= 0 ? undefined : "d" });

  // Cash-flow bars: income per month in grey, the latest month coloured
  // by the sign of the net.
  const bars: Bar[] = (vm?.cashMonths ?? []).map((m, k, arr) => {
    const last = k === arr.length - 1;
    const neg = (m.net ?? vm?.latestNet ?? 0) < 0;
    return { label: monthShort(m.label), value: m.income ?? 0, on: last && neg, go: last && !neg };
  });

  const journey = vm?.journeyIndex;
  let i = 0;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/tabs/families" text="" /></IonButtons>
          <span className="gv-eyebrow" style={{ padding: "0 8px" }}>Family profile</span>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "4px 16px calc(40px + env(safe-area-inset-bottom))" }}>
          <style>{`
            .fd-strip .gv-st { padding: 12px 10px 10px; }
            .fd-strip .gv-st .v { font-size: 20px; }
            @media (max-width: 359px) {
              .fd-strip .gv-st { padding: 11px 7px 9px; }
              .fd-strip .gv-st .v { font-size: 16px; }
              .fd-strip .gv-st small { font-size: 10.5px; }
              .fd-actions .gv-btn svg { display: none; }
            }
          `}</style>

          {/* Name header */}
          <div className="gv-rise" style={{ display: "flex", alignItems: "center", gap: 13, ...({ "--i": i++ } as React.CSSProperties) }}>
            <Av name={name} size={54} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 className="gv-h1" style={{ fontSize: 24, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, minWidth: 0 }}>
                {vm?.metaLine && (
                  <span className="gv-meta" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vm.metaLine}</span>
                )}
                {days != null && (
                  <Pill tint={days >= 4 ? "rose" : "mint"} sm style={{ flex: "none" }}>
                    {days <= 0 ? "touched today" : `${days}d since touch`}
                  </Pill>
                )}
              </div>
            </div>
          </div>

          {family?.directorFlag && (
            <div className="gv-gentle gv-rise" style={{ marginTop: 12, ...({ "--i": i++ } as React.CSSProperties) }}>
              {family.directorFlag}
            </div>
          )}

          {/* Journey: done forest, current lime */}
          <div className="gv-rise" style={{ marginTop: 16, ...({ "--i": i++ } as React.CSSProperties) }}>
            <Track total={JOURNEY.length} done={journey ?? 0} current={journey} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 5, marginTop: 7 }}>
              {JOURNEY.map((label, k) => (
                <span key={label} style={{
                  fontSize: 10, lineHeight: 1.2, textAlign: "center", minWidth: 0,
                  fontWeight: k === journey ? 800 : 600,
                  color: k === journey ? "var(--gv-ink)" : "var(--gv-quiet)",
                }}>{label}</span>
              ))}
            </div>
          </div>

          {state === "loading" && (
            <div style={{ padding: "30px 0", display: "flex", justifyContent: "center" }}><span className="ck-spin" /></div>
          )}
          {state === "error" && (
            <Card i={i++} flat style={{ marginTop: 14 }}>
              <p className="gv-sub" style={{ fontSize: 13.5 }}>Could not load this profile. This may be on us. Go back and try again.</p>
            </Card>
          )}

          {/* The numbers */}
          {stats.length > 0 && state !== "loading" && (
            <div className="fd-strip" style={{ marginTop: 14 }}>
              <Strip i={i++} stats={stats.slice(0, 4)} />
            </div>
          )}

          {/* At a glance — roster-only fallback so the page never reads blank */}
          {glanceRows.length > 0 && (
            <Card i={i++} style={{ marginTop: 12 }}>
              <CardTitle>At a glance</CardTitle>
              <div>
                {glanceRows.map((r) => (
                  <Row key={r.label} style={{ padding: "9px 0", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gv-quiet)" }}>{r.label}</span>
                    <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: "var(--gv-ink)", textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{r.value}</span>
                  </Row>
                ))}
              </div>
            </Card>
          )}

          {/* Care team */}
          {vm && vm.team.length > 0 && (
            <Card i={i++} style={{ marginTop: 12 }}>
              <CardTitle>Care team</CardTitle>
              <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", margin: "0 -4px", padding: "0 4px" }}>
                {vm.team.slice(0, 6).map((t) => {
                  const tt = t.bg && t.fg ? { bg: t.bg, fg: t.fg } : tintFor(t.name);
                  return (
                    <div key={`${t.name}-${t.role}`} style={{ flex: "0 0 auto", width: 84, textAlign: "center", minWidth: 0 }}>
                      <Av name={t.name} size={44} round style={{ margin: "0 auto 6px", background: tt.bg, color: tt.fg }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gv-ink)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                      {t.role && <div style={{ fontSize: 11, color: "var(--gv-quiet)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.role}</div>}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Cash flow */}
          {showCash && (
            <Card i={i++} style={{ marginTop: 12 }}>
              <CardTitle right={vm!.latestNetLabel ? <span className="gv-meta">{vm!.latestNetLabel}</span> : undefined}>Cash flow</CardTitle>
              <div className="tnum" style={{ fontSize: 28, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-.02em", color: vm!.latestNet != null && vm!.latestNet < 0 ? "var(--gv-coral)" : "var(--gv-go)" }}>
                {vm!.latestNet != null ? `${vm!.latestNet < 0 ? "-" : "+"}${money(Math.abs(vm!.latestNet))}` : "No net yet"}
              </div>
              <div className="gv-meta" style={{ marginTop: 3 }}>net a month</div>
              {hasBars && (
                <div style={{ marginTop: 14 }}>
                  <Bars bars={bars} height={56} />
                  <div className="gv-meta" style={{ marginTop: 6, fontSize: 11 }}>Income by month</div>
                </div>
              )}
            </Card>
          )}

          {/* Plans */}
          {vm && vm.plans.length > 0 && (
            <Card i={i++} style={{ marginTop: 12, paddingTop: 14 }}>
              <CardTitle>Plans</CardTitle>
              <div>
                {vm.plans.slice(0, 6).map((pl) => (
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
            </Card>
          )}

          {/* Latest notes */}
          {vm && vm.notes.length > 0 && (
            <Card i={i++} style={{ marginTop: 12 }}>
              <CardTitle>Latest notes</CardTitle>
              {vm.notes.map((n, k) => <NoteRow key={k} meta={n.meta} text={n.text} />)}
            </Card>
          )}

          {/* AI rundown — auto-runs, degrades to a quiet card when off */}
          <div className="gv-rise" style={{ marginTop: 12, ...({ "--i": i++ } as React.CSSProperties) }}>
            <AiSummary id={id} />
          </div>

          {/* Actions: one forest button, two ghosts */}
          <div className="fd-actions gv-rise" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 16, ...({ "--i": i++ } as React.CSSProperties) }}>
            <Btn disabled={!tel} onClick={() => { if (tel) window.location.href = `tel:${tel}`; }} style={{ padding: "0 6px", minWidth: 0, fontSize: 14 }}>
              <Phone size={16} weight="bold" /> Call
            </Btn>
            <Btn ghost disabled={!wa} onClick={() => { if (wa) window.open(`https://wa.me/${wa}`, "_blank"); }} style={{ padding: "0 6px", minWidth: 0, fontSize: 14 }}>
              <ChatCircleText size={16} weight="bold" /> WhatsApp
            </Btn>
            <Btn ghost onClick={() => openCapture("add", { id, name })} style={{ padding: "0 6px", minWidth: 0, fontSize: 14 }}>
              <NotePencil size={16} weight="bold" /> Note
            </Btn>
          </div>

          {/* Tap-to-email */}
          {email && (
            <a href={`mailto:${email}`} className="gv-link" style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", minWidth: 0 }}>
              <Envelope size={15} weight="bold" style={{ flex: "none" }} />
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
            </a>
          )}

          {/* Escape hatch to the desktop CRM profile */}
          <a
            href={crmUrl}
            target="_blank"
            rel="noreferrer"
            className="gv-meta"
            style={{ marginTop: email ? 12 : 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontWeight: 600, textDecoration: "none" }}
          >
            Open full profile in CRM <ArrowSquareOut size={14} weight="regular" />
          </a>
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
