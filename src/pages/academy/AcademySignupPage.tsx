import { useRef, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { CaretRight, Check } from "@phosphor-icons/react";
import { BackButton } from "@/components/BackButton";
import { Panel } from "@/components/orchard/family/FamKit";
import { useAuth } from "@/lib/auth";
import { ACADEMY_URL } from "@/lib/mobileApi";
import { openExternal } from "@/lib/external";
import { academyNotLive, academySignup } from "@/lib/academyApi";

/* The same application the website asks (ck-academy IntakeForm.tsx), with
   the same answer keys, so a couple who signs up here lands in the CRM
   exactly like one who signed up online. Three short screens instead of
   one long form. */
const STATUS = ["Engaged", "Married", "Single"];
const QUESTIONS: { key: string; label: string; options: string[] }[] = [
  { key: "Retirement account", label: "Do you have a retirement account?", options: ["Yes", "No", "Not sure"] },
  { key: "Monthly budget", label: "Do you keep a monthly budget together?", options: ["Yes", "Sometimes", "No"] },
  { key: "Debt", label: "Any credit card debt right now?", options: ["None", "Some", "A lot"] },
  { key: "Emergency fund", label: "An emergency fund of a month or more?", options: ["Yes", "No", "Not sure"] },
  { key: "Comfort talking money", label: "How comfortable are the two of you talking to each other about money?", options: ["Very", "Somewhat", "Not yet", "N/A"] },
];
const HEARD = ["A friend", "WhatsApp", "COLlive", "My shul or school", "Instagram"];

function Opts({ options, value, onPick }: { options: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="ocf2-ak-opts">
      {options.map((o) => (
        <button type="button" key={o} className={`ocf2-ak-opt${value === o ? " is-on" : ""}`} aria-pressed={value === o} onClick={() => onPick(o)}>{o}</button>
      ))}
    </div>
  );
}

export function AcademySignupPage() {
  const router = useIonRouter();
  const { signInAcademy } = useAuth();
  const content = useRef<HTMLIonContentElement>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [heard, setHeard] = useState("");
  const [heardOther, setHeardOther] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [debtAmount, setDebtAmount] = useState("");
  const [kdhApply, setKdhApply] = useState(true);
  const [hopes, setHopes] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  // Same rules as the website: a real first and last name, a real number.
  const nameWords = name.trim().split(/\s+/).filter((w) => w.replace(/[^A-Za-z֐-׿]/g, "").length > 1);
  const cleanEmail = email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const digits = phone.replace(/\D/g, "");
  const phoneOk = digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
  const ageOk = /^\d{2}$/.test(age.trim()) && Number(age) >= 16;
  const howHeard = heard === "Other" ? heardOther.trim() : heard;
  const carriesDebt = answers["Debt"] === "Some" || answers["Debt"] === "A lot";

  const missing: string[][] = [
    [
      ...(nameWords.length < 2 ? ["Your first and last name"] : []),
      ...(!emailOk ? ["Your email"] : []),
      ...(!phoneOk ? ["A phone number with 10 digits"] : []),
    ],
    [
      ...(!ageOk ? ["Your age"] : []),
      ...(!city.trim() ? ["Your city"] : []),
      ...(!status ? ["Engaged, married or single"] : []),
      ...(!howHeard ? ["How you heard about us"] : []),
    ],
    [
      ...QUESTIONS.filter((x) => !answers[x.key]).map((x) => x.label),
      ...(carriesDebt && !debtAmount.trim() ? ["About how much credit card debt"] : []),
    ],
  ];

  const go = (n: number) => { setStep(n); setShowMissing(false); setError(null); void content.current?.scrollToTop(250); };
  const back = () => (step === 0 ? router.push("/start/academy", "back", "pop") : go(step - 1));

  const next = async () => {
    if (missing[step].length) { setShowMissing(true); return; }
    if (step < 2) { go(step + 1); return; }
    if (busy) return;
    setBusy(true);
    setError(null);
    const merged: Record<string, string> = { ...answers, City: city.trim(), "How heard": howHeard };
    if (carriesDebt && debtAmount.trim()) merged["Credit card debt amount"] = debtAmount.trim();
    if (carriesDebt && kdhApply) merged["Applied to KDH"] = "Yes";
    if (hopes.trim()) merged["Hopes For Course"] = hopes.trim();
    try {
      const r = await academySignup({
        name: name.trim(), email: cleanEmail, phone: phone.trim(), age: age.trim(), relationshipStatus: status,
        answers: merged, kdhApply: carriesDebt && kdhApply, debtAmount: carriesDebt ? debtAmount.trim() : null,
      });
      if (r.token && r.student) {
        await signInAcademy(r.token, r.student);
        router.push("/academy", "root", "replace");
        return;
      }
      // The email already has a course (or the record is still landing):
      // a sign-in code was emailed, so finish on the code screen.
      router.push(`/start/academy/signin?email=${encodeURIComponent(cleanEmail)}&sent=1${r.existing ? "&existing=1" : ""}`, "forward", "replace");
    } catch (e) {
      if (academyNotLive(e)) setOffline(true);
      else setError("That did not go through. Check your connection and try again. Nothing was lost.");
    } finally {
      setBusy(false);
    }
  };

  const heads = [
    { t: "Who is signing up?", s: "One sign-up covers both of you." },
    { t: "A little about you", s: "So your guidance counselor knows who they are meeting." },
    { t: "Where you are today", s: "No wrong answers. Most couples start with a few of these at No." },
  ];

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
          <IonButtons slot="start"><BackButton onClick={back} /></IonButtons>
          <span className="ocf2-kicker" style={{ paddingLeft: 4, color: "var(--oc-mid)", opacity: 1 }}>Step {step + 1} of 3</span>
        </IonToolbar>
      </IonHeader>
      <IonContent ref={content} style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="ocf2 ocf2-page--door" style={{ paddingBottom: 48 }}>
          <div className="ocf2-ak-steps" aria-hidden>{[0, 1, 2].map((k) => <i key={k} className={k <= step ? "is-on" : ""} />)}</div>
          <div style={{ padding: "2px 4px 0" }}>
            <h1 className="ocf2-title" style={{ fontSize: 27 }}>{heads[step].t}</h1>
            <p className="ocf2-sub" style={{ marginTop: 4 }}>{heads[step].s}</p>
          </div>

          {step === 0 && (
            <>
              <label className="ocf2-ak-field">
                <span className="ocf2-label">Full name</span>
                <input className="ocf2-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoCapitalize="words" placeholder="First and last" />
              </label>
              <label className="ocf2-ak-field">
                <span className="ocf2-label">Email</span>
                <input className="ocf2-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" />
              </label>
              <label className="ocf2-ak-field">
                <span className="ocf2-label">Phone</span>
                <input className="ocf2-input" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 555-5555" />
              </label>
              <p className="ocf2-meta" style={{ margin: "0 4px" }}>Your counselor reaches you on WhatsApp at this number. Your sign-in code comes to this email.</p>
            </>
          )}

          {step === 1 && (
            <>
              <div className="ocf2-ak-two">
                <label className="ocf2-ak-field">
                  <span className="ocf2-label">City</span>
                  <input className="ocf2-input" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" autoCapitalize="words" placeholder="Brooklyn" />
                </label>
                <label className="ocf2-ak-field">
                  <span className="ocf2-label">Your age</span>
                  <input className="ocf2-input" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="24" />
                </label>
              </div>
              <div>
                <p className="ocf2-ak-q">Engaged, married or single?</p>
                <Opts options={STATUS} value={status} onPick={setStatus} />
              </div>
              <div>
                <p className="ocf2-ak-q">How did you hear about us?</p>
                <Opts options={[...HEARD, "Other"]} value={heard} onPick={setHeard} />
                {heard === "Other" && <input className="ocf2-input" style={{ marginTop: 10 }} value={heardOther} onChange={(e) => setHeardOther(e.target.value)} placeholder="Tell us where" aria-label="Where you heard about us" />}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {QUESTIONS.map((x) => (
                <div key={x.key}>
                  <p className="ocf2-ak-q">{x.label}</p>
                  <Opts options={x.options} value={answers[x.key] ?? ""} onPick={(v) => setAnswers((p) => ({ ...p, [x.key]: v }))} />
                  {x.key === "Debt" && carriesDebt && (
                    <Panel tone="lilac" style={{ marginTop: 12, gap: 10 }}>
                      <label className="ocf2-ak-field">
                        <span className="ocf2-label" style={{ color: "#2D3766" }}>About how much?</span>
                        <input className="ocf2-input" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} inputMode="numeric" placeholder="$8,000 (a rough number is fine)" />
                      </label>
                      <label className="ocf2-ak-check" style={{ color: "#2D3766" }}>
                        <input type="checkbox" checked={kdhApply} onChange={(e) => setKdhApply(e.target.checked)} />
                        <span className="ocf2-ak-box"><Check size={14} weight="bold" /></span>
                        <span>Also apply to Kosher Debt Help with this sign-up. A real person works the debt down with you, privately. There is a one-time $50 fee, and if that is hard, just say so.</span>
                      </label>
                    </Panel>
                  )}
                </div>
              ))}
              <label className="ocf2-ak-field">
                <span className="ocf2-label">What do you hope to take out of this course? <span style={{ fontWeight: 600, color: "var(--oc-mid)" }}>Optional</span></span>
                <textarea className="ocf2-input" value={hopes} onChange={(e) => setHopes(e.target.value)} rows={3} placeholder="A few words is enough" />
              </label>
            </>
          )}

          {showMissing && missing[step].length > 0 && (
            <div className="ocf2-gentle" role="alert">
              <b>Almost there.</b> Still needed: {missing[step].join(", ")}.
            </div>
          )}
          {error && <div className="ocf2-gentle" role="alert">{error}</div>}

          {offline ? (
            <Panel tone="butter" style={{ gap: 10 }}>
              <p className="ocf2-p" style={{ color: "#3F360A", fontWeight: 700 }}>Sign-up inside the app is being switched on. You can finish on the website today, and your course will be waiting here with the same email.</p>
              <button type="button" className="ocf2-btn ocf2-btn--primary is-block" onClick={() => void openExternal(`${ACADEMY_URL}/buy`)}>Finish on the website</button>
            </Panel>
          ) : (
            <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 54 }} disabled={busy} onClick={() => void next()}>
              {step < 2 ? <>Continue <CaretRight size={18} weight="bold" /></> : busy ? "Setting up your course…" : "Start Episode 1"}
            </button>
          )}
          {step === 0 && (
            <button type="button" className="ocf2-link" style={{ alignSelf: "center" }} onClick={() => router.push("/start/academy/signin")}>I already signed up</button>
          )}
          {step === 2 && !offline && <p className="ocf2-meta" style={{ textAlign: "center", margin: "0 8px" }}>Episode 1 is free. Nothing to pay today.</p>}
        </div>
      </IonContent>
    </IonPage>
  );
}
