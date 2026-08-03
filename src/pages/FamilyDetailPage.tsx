import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton } from "@ionic/react";
import { Phone, ChatCircleText, NotePencil } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { useUI } from "@/lib/ui";
import { ROLE_BY_KEY, type RoleKey } from "@/lib/roles";
import { money } from "@/lib/format";
import { fetchFamilyDetail, type FamilyDetail } from "@/lib/api";
import { fetchBriskProfile } from "@/lib/mobileApi";
import { tintFor, monogram } from "@/lib/colorHash";
import { AiSummary } from "@/components/AiSummary";

/**
 * Family profile — the warm-Brisk mobile profile (approved mockup):
 * name header + "Nd since touch", the 5-segment journey stepper, care
 * team tiles, the cash-flow card (sage in / terracotta out bars), plan
 * chips, latest notes with "Read full", and Call / WhatsApp / Note.
 *
 * Data: GET /api/mobile/families/:recId (the desktop brisk profile
 * object) first; the older family-detail edge function as fallback.
 * Every section degrades to hidden when its data is missing.
 */

const JOURNEY = ["Applied", "Intake", "Success Plan", "Active care", "Graduation"];

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
    dot: String(pl?.dot ?? "var(--ck-tint)"),
    sub: pl?.owner && pl.owner !== "Unassigned"
      ? [String(pl.owner), pl?.role ? String(pl.role) : null].filter(Boolean).join(" · ")
      : (pl?.summary ? clip(String(pl.summary)) : null),
    status: pl?.status ? String(pl.status) : null,
    tone: pl?.tone === "red" ? "red" as const : pl?.tone === "gray" ? "gray" as const : "green" as const,
    noteCount: typeof pl?.noteCount === "number" ? pl.noteCount : null,
  }));
  const debtTotal = p?.debt?.total ?? p?.debt?.current ?? null;
  if (debtTotal != null && !plans.some((pl: { name: string }) => /debt/i.test(pl.name))) {
    plans.push({ name: "Debt", dot: "#C2531F", sub: `${money(Number(debtTotal))} on file`, status: null, tone: "green" as const, noteCount: null });
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
    phone: p?.phone ?? null,
    email: p?.email ?? null,
    summary: p?.caseSummary ?? null,
  };
}

function vmFromFallback(detail: FamilyDetail | null, fam: { name: string; city?: string; state?: string; phone: string; email: string; assignments: Partial<Record<RoleKey, string>>; stage?: string; lifecycleStatus?: string; currentMonthlyNet?: number | null } | undefined): VM {
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

  const plans: VM["plans"] = [];
  if (detail?.debt?.current != null || detail?.debt?.atAssessment != null) {
    plans.push({ name: "Debt", dot: "#C2531F", sub: `${money(Number(detail?.debt?.current ?? detail?.debt?.atAssessment))} on file` });
  }

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
    phone: fam?.phone ?? null,
    email: fam?.email ?? null,
    summary: null,
  };
}

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
  const tint = tintFor(name);
  const phone = (vm?.phone || family?.phone || "").trim();
  const tel = phone.replace(/[^0-9+]/g, "");
  const wa = tel.replace(/^\+/, "").replace(/^0+/, "");

  const maxBar = useMemo(() => {
    const vals = (vm?.cashMonths ?? []).flatMap((m) => [m.income ?? 0, m.expenses ?? 0]);
    return Math.max(1, ...vals);
  }, [vm?.cashMonths]);

  const hasBars = (vm?.cashMonths ?? []).some((m) => m.income != null || m.expenses != null);
  const showCash = vm != null && (vm.latestNet != null || hasBars);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
          <IonButtons slot="start"><IonBackButton defaultHref="/tabs/families" text="" /></IonButtons>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.09em", color: "var(--ck-label)", padding: "0 8px" }}>FAMILY PROFILE</div>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <div style={{ padding: "4px 18px 40px" }}>
          {/* Name header */}
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 54, height: 54, borderRadius: 999, background: tint.bg, color: tint.fg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
              {monogram(name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ck-title)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</h1>
              <div style={{ fontSize: 12, color: "var(--ck-body)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {vm?.metaLine ? `${vm.metaLine} · ` : ""}
                {days != null && (
                  <span style={{ color: days >= 4 ? "var(--ck-danger)" : "var(--ck-ok-fg)", fontWeight: 700 }}>
                    {days <= 0 ? "touched today" : `${days}d since touch`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {family?.directorFlag && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 12, background: "var(--ck-warn-bg)", fontSize: 13, color: "var(--ck-warn-fg)", fontWeight: 500 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ck-danger)", flex: "none" }} />
              {family.directorFlag}
            </div>
          )}

          {/* Journey stepper */}
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            {JOURNEY.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 3,
                background: vm == null ? "var(--ck-line-medium)"
                  : i < vm.journeyIndex ? "var(--ck-success)"
                  : i === vm.journeyIndex ? "var(--ck-tint)"
                  : "var(--ck-line-medium)",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
            {JOURNEY.map((label, i) => (
              <span key={label} style={{
                fontSize: 9.5, fontWeight: i === vm?.journeyIndex ? 700 : 600, letterSpacing: "0.02em",
                color: i === vm?.journeyIndex ? "var(--ck-tint)" : "var(--ck-muted)",
              }}>{label}</span>
            ))}
          </div>

          {state === "loading" && (
            <div style={{ padding: "30px 0", display: "flex", justifyContent: "center" }}><span className="ck-spin" /></div>
          )}
          {state === "error" && (
            <Card><p style={{ margin: 0, fontSize: 13.5, color: "var(--ck-body)", lineHeight: 1.5 }}>Could not load this profile. This may be on us. Go back and try again.</p></Card>
          )}

          {/* Care team */}
          {vm && vm.team.length > 0 && (
            <Card>
              <CardTitle>CARE TEAM</CardTitle>
              <div style={{ display: "flex", gap: 8, overflowX: "auto" }} className="no-scrollbar">
                {vm.team.slice(0, 4).map((t) => {
                  const tt = t.bg && t.fg ? { bg: t.bg, fg: t.fg } : tintFor(t.name);
                  return (
                    <div key={`${t.name}-${t.role}`} style={{ flex: "1 0 30%", minWidth: 96, background: "var(--ck-paper)", border: "1px solid var(--ck-hairline)", borderRadius: 14, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 999, margin: "0 auto 6px", background: tt.bg, color: tt.fg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
                        {monogram(t.name)}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ck-title)", lineHeight: 1.15 }}>{t.name}</div>
                      <div style={{ fontSize: 9.5, color: "var(--ck-label)", marginTop: 2 }}>{t.role}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Cash flow */}
          {showCash && (
            <Card>
              <CardTitle>CASH FLOW</CardTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flexShrink: 0 }}>
                  <div className="tnum" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: vm!.latestNet != null && vm!.latestNet < 0 ? "var(--ck-danger)" : "var(--ck-success)" }}>
                    {vm!.latestNet != null ? `${vm!.latestNet < 0 ? "-" : "+"}${money(Math.abs(vm!.latestNet))}` : "No net yet"}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--ck-body)", marginTop: 2 }}>
                    per month{vm!.latestNetLabel ? ` · ${vm!.latestNetLabel}` : ""}
                  </div>
                </div>
                {hasBars && (
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 5, height: 44 }}>
                    {vm!.cashMonths.map((m, i) => (
                      <span key={i} style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 3, height: "100%" }}>
                        <span title={`${m.label} in`} style={{ flex: 1, height: `${Math.max(6, Math.round(((m.income ?? 0) / maxBar) * 100))}%`, background: "var(--ck-bar-in)", borderRadius: "4px 4px 2px 2px" }} />
                        <span title={`${m.label} out`} style={{ flex: 1, height: `${Math.max(6, Math.round(((m.expenses ?? 0) / maxBar) * 100))}%`, background: "var(--ck-bar-out)", borderRadius: "4px 4px 2px 2px" }} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {hasBars && (
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <Legend color="var(--ck-bar-in)" label="In" />
                  <Legend color="var(--ck-bar-out)" label="Out" />
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--ck-muted)" }}>
                    {vm!.cashMonths.map((m) => m.label).filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
            </Card>
          )}

          {/* Plans */}
          {vm && vm.plans.length > 0 && (
            <Card>
              <CardTitle>PLANS</CardTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {vm.plans.slice(0, 6).map((pl) => (
                  <div key={pl.name} style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--ck-paper)", border: "1px solid var(--ck-hairline)", borderRadius: 14, padding: "11px 12px", minWidth: 0 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: pl.dot, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ck-title)" }}>
                        {pl.name}
                        {typeof pl.noteCount === "number" && pl.noteCount > 0 && (
                          <span style={{ fontWeight: 500, color: "var(--ck-muted)", marginLeft: 6, fontSize: 11 }}>{pl.noteCount} notes</span>
                        )}
                      </div>
                      {pl.sub && <div style={{ fontSize: 11, color: "var(--ck-label)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.sub}</div>}
                    </div>
                    {pl.status && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0,
                        background: pl.tone === "red" ? "#FAE5DE" : pl.tone === "gray" ? "var(--ck-hairline)" : "#EAF3DE",
                        color: pl.tone === "red" ? "#B4351F" : pl.tone === "gray" ? "var(--ck-muted)" : "#27500A",
                      }}>{pl.status}</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Latest notes */}
          {vm && vm.notes.length > 0 && (
            <Card>
              <CardTitle>LATEST NOTES</CardTitle>
              {vm.notes.map((n, i) => <NoteRow key={i} meta={n.meta} text={n.text} first={i === 0} />)}
            </Card>
          )}

          {/* AI rundown — auto-runs, degrades to a quiet card when off */}
          <div style={{ marginTop: 11 }}>
            <AiSummary id={id} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 9, marginTop: 13 }}>
            <ActionBtn primary disabled={!tel} onClick={() => { if (tel) window.location.href = `tel:${tel}`; }}>
              <Phone size={16} weight="bold" color="#fff" /> Call
            </ActionBtn>
            <ActionBtn disabled={!wa} onClick={() => { if (wa) window.open(`https://wa.me/${wa}`, "_blank"); }}>
              <ChatCircleText size={16} weight="bold" /> WhatsApp
            </ActionBtn>
            <ActionBtn onClick={() => openCapture("add", { id, name })}>
              <NotePencil size={16} weight="bold" /> Note
            </ActionBtn>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="shadow-card" style={{ marginTop: 11, background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 20, padding: "12px 15px" }}>{children}</div>;
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "var(--ck-label)" }}>{children}</h3>;
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 600, color: "var(--ck-body)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 3, background: color }} /> {label}
    </span>
  );
}

function NoteRow({ meta, text, first }: { meta: string; text: string; first: boolean }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 150;
  return (
    <div style={{ borderTop: first ? "none" : "1px solid var(--ck-hairline)", padding: first ? "2px 0 11px" : "11px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 10.5, color: "var(--ck-label)", marginBottom: 4, fontWeight: 600 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</span>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: "#3A4250", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
        {open || !long ? text : `${text.slice(0, 150).trimEnd()}… `}
        {long && (
          <button onClick={() => setOpen((v) => !v)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--ck-tint)", fontWeight: 600, fontSize: 11.5 }}>
            {open ? "Show less" : "Read full"}
          </button>
        )}
      </p>
    </div>
  );
}

function ActionBtn({ children, primary, disabled, onClick }: { children: React.ReactNode; primary?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        fontSize: 13, fontWeight: 700, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
        background: primary ? "var(--ck-tint)" : "var(--ck-card)",
        border: primary ? "1px solid var(--ck-tint)" : "1px solid var(--ck-line-medium)",
        color: primary ? "#fff" : "var(--ck-title)",
        boxShadow: primary ? "0 6px 14px rgba(194,83,31,.28)" : "none",
      }}
    >
      {children}
    </button>
  );
}
