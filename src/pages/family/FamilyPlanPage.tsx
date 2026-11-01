import { FamBell } from "@/components/FamBell";
import { useState } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, type RefresherEventDetail } from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, Check, VideoCamera } from "@phosphor-icons/react";
import { fetchSuccessPlan, signSuccessPlan } from "@/lib/portalApi";
import { ApiError } from "@/lib/mobileApi";
import { useUI } from "@/lib/ui";
import { Av, Btn, Card, CardTitle, CountUp, Evt, Eyebrow, Pill, Row, Strip, PlantArt, type Stat, type Tint } from "@/components/gv";

/**
 * The family's success plan — the same content the web portal's
 * PlanJourney renders (GET /api/portal/success-plan): one card per step
 * with the expert, purpose, dates, sessions and tasks; the family's
 * upcoming meetings; and the sign card (typed name + consent, one signer
 * at a time, POST /success-plan/sign) once the case manager has opened
 * signing. Nothing here is invented: every line comes from the plan.
 */

type Raw = Record<string, any>;

const AREA_TINT: Record<string, Tint> = {
  cpa: "sky", accountant: "sky", financial_advisor: "sky", budgeting: "mint", debt: "apricot",
  therapy: "plum", exec_coaching: "plum", business_coaching: "plum", fundraising_coaching: "plum",
  job_funnel: "yellow", resume_writing: "yellow", medical_insurance: "rose", case_manager: "mint",
};
const AREA_ROLE: Record<string, string> = {
  case_manager: "case manager", cpa: "CPA", accountant: "accountant", financial_advisor: "financial advisor",
  budgeting: "budgeter", debt: "debt expert", therapy: "coaching", exec_coaching: "executive coach",
  business_coaching: "business coach", fundraising_coaching: "fundraising coach", job_funnel: "career",
  resume_writing: "résumé", medical_insurance: "insurance",
};
const dd = (s: unknown) => String(s || "").replace(/\s*—\s*/g, ", ");
const firstName = (n?: string | null) => String(n || "").trim().split(/\s+/)[0] || "";
const fmtShort = (d?: string | null) => {
  if (!d) return "";
  const t = new Date(`${String(d).slice(0, 10)}T12:00:00`);
  return Number.isNaN(t.getTime()) ? String(d) : t.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const fmtLong = (d?: string | null) => {
  if (!d) return "";
  // Date-only strings are calendar dates, not UTC midnight (else "June 1" reads May 31).
  const t = /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? new Date(`${d}T12:00:00`) : new Date(d);
  return Number.isNaN(t.getTime()) ? String(d) : t.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function FamilyPlanPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["successPlan"], queryFn: fetchSuccessPlan, staleTime: 30_000, retry: 1 });
  const refresh = async (e: CustomEvent<RefresherEventDetail>) => { await qc.invalidateQueries({ queryKey: ["successPlan"] }); e.detail.complete(); };

  const plan: Raw | null = q.data?.plan ?? null;
  const meetings: Raw[] = Array.isArray(q.data?.meetings) ? q.data!.meetings : [];
  const items: Raw[] = ((plan?.content?.phases as Raw[] | undefined) || []).flatMap((p) => (p.items as Raw[]) || []);
  const experts = [...new Set(items.map((i) => String(i.expertName || "").trim()).filter(Boolean))];
  const target = plan?.targetDate || plan?.content?.targetDate || null;
  const months = target ? Math.max(0, Math.round((new Date(`${String(target).slice(0, 10)}T12:00:00`).getTime() - Date.now()) / (30.4 * 86400000))) : null;
  const signed = plan?.status === "signed";
  const signers: Raw[] = Array.isArray(plan?.signers) ? plan!.signers : [];
  const required = Number(plan?.required || 2);

  const stats: Stat[] = [];
  if (items.length) stats.push({ label: "Steps", value: items.length });
  if (experts.length) stats.push({ label: "Experts", value: experts.length });
  if (months != null) stats.push({ label: "Months to go", value: months });

  let i = 1;
  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 14px) 16px 120px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h1 className="gv-h1 gv-rise">Your plan</h1>
              <p className="gv-sub gv-rise" style={{ "--i": 1, marginTop: 6 } as React.CSSProperties}>
                {q.isLoading ? "Opening your plan…" : !plan ? "Being written with your team." : signed ? `Signed ${fmtLong(plan.signedAt)}.` : target ? `Working toward ${fmtLong(String(target).slice(0, 10))}.` : "Read it through, then sign it together."}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              {plan && <Pill tint={signed ? "mint" : plan.signingAllowed ? "lime" : "yellow"} i={0}>{signed ? "Signed" : plan.signingAllowed ? "Ready to sign" : "In review"}</Pill>}
              <FamBell />
            </div>
          </div>

          {q.isError && !q.data && (
            <Card i={i++} style={{ marginTop: 18 }}>
              <p className="gv-sub">We couldn't open your plan just now.</p>
              <div style={{ marginTop: 12 }}><Btn sm ghost onClick={() => q.refetch()}>Try again</Btn></div>
            </Card>
          )}

          {q.data && !plan && (
            <Card i={i++} style={{ marginTop: 18, textAlign: "center" }}>
              <PlantArt width={140} />
              <h2 className="gv-h2" style={{ fontSize: 19, marginTop: 6 }}>Your plan is being written</h2>
              <p className="gv-sub" style={{ marginTop: 6 }}>Your case manager builds it with your team after the intake call, then goes over it with you.</p>
            </Card>
          )}

          {plan && stats.length > 0 && <div style={{ marginTop: 16 }}><Strip i={i++} stats={stats} /></div>}

          {items.length > 0 && <Eyebrow>The steps</Eyebrow>}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((it, n) => {
              const tint = AREA_TINT[String(it.area)] || "sky";
              const role = AREA_ROLE[String(it.area)] || String(it.area || "").replace(/_/g, " ");
              const tasks: unknown[] = Array.isArray(it.tasks) ? it.tasks : [];
              const sessions: unknown[] = Array.isArray(it.sessions) ? it.sessions : [];
              return (
                <Card key={n} i={i++}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: n === 0 ? "var(--gv-go)" : n === 1 ? "var(--gv-lime)" : "var(--gv-inset)", color: n === 0 ? "#fff" : "var(--gv-ink)", display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 800, flex: "none" }}>{n + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="gv-h2" style={{ fontSize: 16 }}>{it.title || role}</h3>
                      {it.expertName && <div className="gv-meta" style={{ marginTop: 2 }}>{it.expertName} · {role}</div>}
                    </div>
                    {it.expertName && <Av name={String(it.expertName)} size={36} round tint={tint} />}
                  </div>
                  {it.purpose && <p className="gv-sub" style={{ marginTop: 10, color: "var(--gv-text)" }}>{dd(it.purpose)}</p>}
                  {it.expertIntro && <p className="gv-sub" style={{ marginTop: 6 }}>{dd(it.expertIntro)}</p>}
                  {(it.meet || it.startDate) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {it.meet?.firstCallBy && <Pill tint="sky">First call by {fmtShort(it.meet.firstCallBy)}</Pill>}
                      {it.meet?.firstSessionBy && <Pill>Working session by {fmtShort(it.meet.firstSessionBy)}</Pill>}
                      {!it.meet && it.startDate && <Pill tint="sky">Planned start {fmtShort(it.startDate)}</Pill>}
                    </div>
                  )}
                  {sessions.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {sessions.map((s, k) => <Pill key={k} sm><b style={{ marginRight: 4 }}>{k + 1}</b>{fmtShort(String(s))}</Pill>)}
                    </div>
                  )}
                  {tasks.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {tasks.map((t, k) => (
                        <Row key={k} style={{ padding: "9px 0", minHeight: 44 }}>
                          <span style={{ width: 22, height: 22, borderRadius: 7, background: "var(--gv-yellow)", color: "var(--gv-yellowInk)", display: "grid", placeItems: "center", flex: "none" }}><span style={{ width: 7, height: 7, borderRadius: 2, background: "currentColor", opacity: .5 }} /></span>
                          <span className="t"><b style={{ whiteSpace: "normal", fontWeight: 600 }}>{typeof t === "string" ? t : String((t as Raw)?.text ?? (t as Raw)?.label ?? "")}</b></span>
                        </Row>
                      ))}
                    </div>
                  )}
                  {it.notes && <p className="gv-meta" style={{ marginTop: 8, lineHeight: 1.5 }}>{dd(it.notes)}</p>}
                  {it.bookingUrl && (signed || plan?.signingAllowed) && (
                    <div style={{ marginTop: 12 }}><Btn sm ghost href={String(it.bookingUrl)}><CalendarBlank size={16} weight="bold" /> Book with {firstName(it.expertName) || "them"}</Btn></div>
                  )}
                </Card>
              );
            })}
          </div>

          {meetings.length > 0 && (
            <>
              <Eyebrow>Your meetings</Eyebrow>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {meetings.slice(0, 5).map((m, k) => (
                  <Evt key={k} i={i++} tint={k === 0 ? "yellow" : "lavender"} title={m.title || "Meeting"}
                    sub={[m.startTime ? `${fmtDay(m.startTime)} · ${fmtTime(m.startTime)}` : null, m.host ? `with ${m.host}` : null].filter(Boolean).join(" · ")}
                    right={m.joinUrl ? <Btn sm ghost href={m.joinUrl} ariaLabel={`Join ${m.title || "meeting"}`} style={{ minWidth: 44, flex: "none" }}><VideoCamera size={15} weight="bold" /> Join</Btn> : undefined} />
                ))}
              </div>
            </>
          )}

          {plan && <SignCard plan={plan} signers={signers} required={required} i={i++} />}
        </div>
      </IonContent>
    </IonPage>
  );
}

function SignCard({ plan, signers, required, i }: { plan: Raw; signers: Raw[]; required: number; i: number }) {
  const qc = useQueryClient();
  const { showToast } = useUI();
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const signed = plan.status === "signed";
  const doneCount = signers.filter((s) => s.signedAt || s.name).length;

  const sign = async () => {
    if (!name.trim() || !agreed || busy) return;
    setBusy(true); setErr(null);
    try {
      await signSuccessPlan(name.trim());
      showToast("Signed. Thank you.");
      setName(""); setAgreed(false);
      await qc.invalidateQueries({ queryKey: ["successPlan"] });
      await qc.invalidateQueries({ queryKey: ["portalHome"] });
    } catch (e) {
      const ae = e as ApiError;
      setErr(ae?.message === "consent_required" ? "Tick the box to confirm you read the plan." : ae?.status === 403 ? "Signing is not open yet. Your case manager opens it after your meeting." : "Could not save the signature. Try again in a moment.");
    } finally { setBusy(false); }
  };

  return (
    <>
      <Eyebrow>{signed ? "Signed" : "Sign the plan"}</Eyebrow>
      <Card i={i}>
        {signers.length > 0 && (
          <div style={{ marginBottom: signed ? 0 : 10 }}>
            {signers.map((s, k) => (
              <Row key={k}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: s.signedAt || s.name ? "var(--gv-mint)" : "transparent", boxShadow: s.signedAt || s.name ? "none" : "inset 0 0 0 2px var(--gv-line)", color: "var(--gv-go)", display: "grid", placeItems: "center", flex: "none" }}>{(s.signedAt || s.name) && <Check size={14} weight="bold" />}</span>
                <span className="t"><b>{s.name || `Signer ${s.n ?? k + 1}`}</b>{s.signedAt && <span>Signed {fmtLong(s.signedAt)}</span>}</span>
              </Row>
            ))}
          </div>
        )}
        {!signed && plan.signingAllowed && doneCount < required && (
          <>
            <CardTitle right={<Pill tint="lime">{doneCount} of {required}</Pill>}>{doneCount === 0 ? "First signature" : "Second signature"}</CardTitle>
            <input className="gv-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full name" autoComplete="name" aria-label="Your full name" />
            {/* The whole 48px row is the control: a tap anywhere on the label toggles the box. */}
            <label style={{ display: "flex", gap: 12, alignItems: "center", minHeight: 48, marginTop: 8, padding: "6px 2px", fontSize: 13.5, lineHeight: 1.5, color: "var(--gv-text)", cursor: "pointer", userSelect: "none", WebkitTapHighlightColor: "transparent" }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 24, height: 24, margin: 0, flex: "none", accentColor: "#2E5146", cursor: "pointer" }} />
              <span style={{ minWidth: 0 }}>I read the plan, and I agree to show up for the steps my family chose.</span>
            </label>
            {err && <div className="gv-gentle" style={{ marginTop: 10 }}>{err}</div>}
            <Btn block disabled={!name.trim() || !agreed || busy} onClick={() => void sign()} style={{ marginTop: 14 }}>{busy ? "Signing…" : "Sign the plan"}</Btn>
          </>
        )}
        {!signed && !plan.signingAllowed && (
          <div className="gv-note"><i>!</i><div><b>Signing opens after your meeting.</b> Go over the plan with your case manager first; the sign button appears here right after.</div></div>
        )}
        {signed && signers.length === 0 && <p className="gv-sub">Signed {fmtLong(plan.signedAt)}.</p>}
      </Card>
    </>
  );
}
