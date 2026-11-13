import { useEffect, useRef, useState } from "react";
import { useSwipeBack } from "@/lib/swipeBack";
import { BackButton } from "@/components/BackButton";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { requestCode, verifyCode } from "@/lib/mobileApi";
import { useAuth } from "@/lib/auth";
import { TeamArt } from "@/components/gv";
import { greetingWord } from "@/lib/quotes";

/**
 * The team door: team email → "Send code" → 6-digit code → verify. The
 * verified JWT + user persist via lib/auth and the app routes into the
 * tabs. Same safety note as the CRM sign-in page.
 */
export function TeamLoginPage() {
  const swipe = useSwipeBack("/start");
  const router = useIonRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const cleanEmail = email.trim().toLowerCase();
  const emailOk = /.+@.+\..+/.test(cleanEmail);

  useEffect(() => { const t = setTimeout(() => emailRef.current?.focus(), 350); return () => clearTimeout(t); }, []);

  const sendCode = async () => {
    if (!emailOk || busy) return;
    setBusy(true); setError(null);
    try {
      await requestCode(cleanEmail);
      setStep("code");
      setCode("");
      setTimeout(() => codeRef.current?.focus(), 150);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (full: string) => {
    if (full.length !== 6 || busy) return;
    setBusy(true); setError(null);
    try {
      const { token, user } = await verifyCode(cleanEmail, full);
      await signIn(token, user);
      router.push("/tabs/home", "root", "replace");
    } catch {
      setError("That code did not work. Check it or request a new one.");
      setCode("");
      setBusy(false);
      setTimeout(() => codeRef.current?.focus(), 60);
    }
  };

  const onCode = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 6);
    setCode(v);
    setError(null);
    if (v.length === 6) void verify(v);
  };

  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
          <IonButtons slot="start"><BackButton href="/start" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="ocf2 ocf2-page--door">
          <section className="ocf2-hero ocf2-t-sky gv-rise">
            <div className="ocf2-hero-art"><TeamArt width={138} /></div>
            <h1 className="ocf2-h1">
              <span><mark>{greetingWord()}.</mark></span>
              <span className="ocf2-h1-2" style={{ color: "#4D6A86" }}>Team sign-in.</span>
            </h1>
            <p className="ocf2-hero-sub" style={{ color: "#2F4A63" }}>
              {step === "email" ? "Sign in with your team email. We'll send you a 6-digit code." : `We sent a 6-digit code to ${cleanEmail}.`}
            </p>
          </section>

          {step === "email" ? (
            <>
              <input
                ref={emailRef}
                className="ocf2-input gv-rise"
                style={{ "--i": 2 } as React.CSSProperties}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                aria-label="Team email"
                placeholder="you@collectivekindness.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void sendCode(); }}
              />
              <button type="button" className="ocf2-btn ocf2-btn--primary is-block gv-rise" style={{ "--i": 3, minHeight: 54 } as React.CSSProperties} disabled={!emailOk || busy} onClick={() => void sendCode()}>
                {busy ? "Sending…" : "Send code"}
              </button>
            </>
          ) : (
            <>
              <div className="ocf2-code gv-rise" style={{ "--i": 2 } as React.CSSProperties} onClick={() => codeRef.current?.focus()}>
                <input
                  ref={codeRef}
                  value={code}
                  onChange={(e) => onCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="6 digit code"
                />
                <div className="ocf2-cells" style={{ gridTemplateColumns: "repeat(6, minmax(0,1fr))" }} aria-hidden>
                  {Array.from({ length: 6 }, (_, i) => (
                    <b key={i} className={i === code.length ? "focus" : code[i] ? "filled" : "empty"}>{code[i] || ""}</b>
                  ))}
                </div>
              </div>
              <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 54 }} disabled={code.length !== 6 || busy} onClick={() => void verify(code)}>
                {busy ? "Checking…" : "Verify and sign in"}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: -4 }}>
                <button type="button" className="ocf2-link" style={{ color: "var(--oc-mid)" }} onClick={() => { setStep("email"); setError(null); }}>Change email</button>
                <button type="button" className="ocf2-link" onClick={() => void sendCode()}>Resend code</button>
              </div>
            </>
          )}

          {error && <div className="ocf2-gentle">{error}</div>}

          <div className="ocf2-note gv-rise" style={{ "--i": 4 } as React.CSSProperties}>
            <i aria-hidden>!</i>
            <div><b>Never paste your CK login into an AI tool, bot or another site.</b> CK staff will never ask for your code. Sign in only here or on crm.collectivekindness.net.</div>
          </div>
          <p className="ocf2-meta gv-rise" style={{ "--i": 5, margin: "0 4px" } as React.CSSProperties}>New to CK? Ask Shalom or Leivi to add your email.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
