import { useRef, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { CaretRight, ChatCircleDots, Check } from "@phosphor-icons/react";
import { BackButton } from "@/components/BackButton";
import { Panel } from "@/components/orchard/family/FamKit";
import { openExternal } from "@/lib/external";
import { KDH_CONTACT_OPTIONS, KDH_SITE_APPLY_URL, submitKdhApplication, type KdhContactPreference } from "@/lib/kdhApplyApi";

/* Applying to Kosher Debt Help from the front door. The same seven answers
   the website's application asks (the CRM's /apply?program=kdh), sent to the
   same place, so the KDH team sees it in Applications like any other. Two
   short screens instead of one long form, then what happens next. */
export function KdhApplyPage() {
  const router = useIonRouter();
  const content = useRef<HTMLIonContentElement>(null);
  const [step, setStep] = useState(0);
  const [firstNames, setFirstNames] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState<KdhContactPreference | "">("");
  const [heard, setHeard] = useState("");
  const [showMissing, setShowMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const cleanEmail = email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  // Clients write from the US, Canada and abroad: any real-looking number passes.
  const phoneOk = phone.replace(/\D/g, "").length >= 7;

  const missing: string[][] = [
    [
      ...(!firstNames.trim() ? ["Your first name, and your spouse's if you are married"] : []),
      ...(!lastName.trim() ? ["Your last name"] : []),
      ...(!phoneOk ? ["A phone number"] : []),
      ...(!emailOk ? ["Your email"] : []),
    ],
    [
      ...(!city.trim() ? ["Your city"] : []),
      ...(!contact ? ["WhatsApp or email"] : []),
      ...(!heard.trim() ? ["How you heard about us"] : []),
    ],
  ];

  const go = (n: number) => { setStep(n); setShowMissing(false); setError(null); void content.current?.scrollToTop(250); };
  const back = () => (done || step === 0 ? router.push("/start", "back", "pop") : go(step - 1));

  const next = async () => {
    if (missing[step].length) { setShowMissing(true); return; }
    if (step === 0) { go(1); return; }
    if (busy || !contact) return;
    setBusy(true);
    setError(null);
    try {
      await submitKdhApplication({ firstNames, lastName, phone, email: cleanEmail, city, contactPreference: contact, referralSource: heard });
      setDone(true);
      void content.current?.scrollToTop(0);
    } catch {
      setError("That did not go through. Check your connection and try again. Nothing was lost.");
    } finally {
      setBusy(false);
    }
  };

  const heads = [
    { t: "Who is applying?", s: "Confidential and judgment-free. One application covers both of you." },
    { t: "How do we reach you?", s: "A real person from the team reviews every application." },
  ];

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
          <IonButtons slot="start"><BackButton onClick={back} /></IonButtons>
          <span className="ocf2-kicker" style={{ paddingLeft: 4, color: "var(--oc-mid)", opacity: 1 }}>{done ? "Kosher Debt Help" : `Step ${step + 1} of 2`}</span>
        </IonToolbar>
      </IonHeader>
      <IonContent ref={content} style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        {done ? (
          <div className="ocf2 ocf2-page--door" style={{ paddingBottom: 48 }}>
            <Panel tone="mint" style={{ gap: 12, alignItems: "flex-start" }}>
              <span aria-hidden className="ocf2-kd-tick"><Check size={22} weight="bold" /></span>
              <h1 className="ocf2-title" style={{ fontSize: 27 }}>Thank you. Your application is in.</h1>
              <p className="ocf2-p" style={{ color: "#276449" }}>A member of our team will review it and reach out. Keep an eye on your email and your phone.</p>
            </Panel>
            <Panel style={{ gap: 6 }}>
              <p className="ocf2-ak-q" style={{ margin: 0 }}>What happens next</p>
              <p className="ocf2-p">Look out for an email with the intake form to fill out. That is the next step.</p>
            </Panel>
            <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 54 }} onClick={() => router.push("/start/talk")}>
              <ChatCircleDots size={20} weight="bold" aria-hidden /> Talk to a person
            </button>
            <p className="ocf2-meta" style={{ textAlign: "center", margin: "0 8px" }}>Questions about the program? Julie takes free 10-minute calls.</p>
            <button type="button" className="ocf2-link" style={{ alignSelf: "center" }} onClick={() => router.push("/start", "back", "pop")}>Back to the start</button>
          </div>
        ) : (
          <div className="ocf2 ocf2-page--door" style={{ paddingBottom: 48 }}>
            <div className="ocf2-ak-steps" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }} aria-hidden>{[0, 1].map((k) => <i key={k} className={k <= step ? "is-on" : ""} />)}</div>
            <div style={{ padding: "2px 4px 0" }}>
              <span className="ocf2-kicker" style={{ color: "#1F4467", opacity: 1 }}>Kosher Debt Help</span>
              <h1 className="ocf2-title" style={{ fontSize: 27, marginTop: 4 }}>{heads[step].t}</h1>
              <p className="ocf2-sub" style={{ marginTop: 4 }}>{heads[step].s}</p>
            </div>

            {step === 0 && (
              <>
                <label className="ocf2-ak-field">
                  <span className="ocf2-label">First name of both you and your spouse</span>
                  <input className="ocf2-input" value={firstNames} onChange={(e) => setFirstNames(e.target.value)} autoComplete="given-name" autoCapitalize="words" placeholder="Dan and Leah" />
                </label>
                <label className="ocf2-ak-field">
                  <span className="ocf2-label">Last name</span>
                  <input className="ocf2-input" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" autoCapitalize="words" placeholder="Last name" />
                </label>
                <label className="ocf2-ak-field">
                  <span className="ocf2-label">Phone</span>
                  <input className="ocf2-input" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 555-5555" />
                </label>
                <label className="ocf2-ak-field">
                  <span className="ocf2-label">Email</span>
                  <input className="ocf2-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" />
                </label>
              </>
            )}

            {step === 1 && (
              <>
                <label className="ocf2-ak-field">
                  <span className="ocf2-label">City</span>
                  <input className="ocf2-input" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" autoCapitalize="words" placeholder="Brooklyn" />
                </label>
                <div>
                  <p className="ocf2-ak-q">How should we contact you?</p>
                  <div className="ocf2-ak-opts">
                    {KDH_CONTACT_OPTIONS.map((o) => (
                      <button type="button" key={o} className={`ocf2-ak-opt${contact === o ? " is-on" : ""}`} aria-pressed={contact === o} onClick={() => setContact(o)}>{o}</button>
                    ))}
                  </div>
                </div>
                <label className="ocf2-ak-field">
                  <span className="ocf2-label">How did you hear about Kosher Debt Help?</span>
                  <input className="ocf2-input" value={heard} onChange={(e) => setHeard(e.target.value)} autoCapitalize="sentences" placeholder="A name, an org, or which ad" />
                </label>
                <p className="ocf2-meta" style={{ margin: "0 4px" }}>The more exact, the better. It tells us where to reach the next family.</p>
              </>
            )}

            {showMissing && missing[step].length > 0 && (
              <div className="ocf2-gentle" role="alert">
                <b>Almost there.</b> Still needed: {missing[step].join(", ")}.
              </div>
            )}
            {error && (
              <div className="ocf2-gentle" role="alert">
                {error}{" "}
                <button type="button" className="ocf2-kd-inline" onClick={() => void openExternal(KDH_SITE_APPLY_URL)}>Or apply on the website.</button>
              </div>
            )}

            <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 54 }} disabled={busy} onClick={() => void next()}>
              {step === 0 ? <>Continue <CaretRight size={18} weight="bold" /></> : busy ? "Sending…" : "Send my application"}
            </button>
            {step === 0 && (
              <>
                <button type="button" className="ocf2-link" style={{ alignSelf: "center" }} onClick={() => router.push("/start/talk")}>
                  <ChatCircleDots size={17} weight="bold" aria-hidden /> Talk to a person first
                </button>
                <button type="button" className="ocf2-quiet" style={{ alignSelf: "center", marginTop: -10 }} onClick={() => router.push("/start/family")}>I already have a code</button>
              </>
            )}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
