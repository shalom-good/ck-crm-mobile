import { useEffect, useRef, useState } from "react";
import { useSwipeBack } from "@/lib/swipeBack";
import { TopBar } from "@/components/TopBar";
import { IonPage, IonContent, IonHeader, IonToolbar, useIonRouter } from "@ionic/react";
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
        <IonToolbar>
          <TopBar back="/start" space="Team" style={{ padding: "0 20px 0 14px" }} />
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "0 20px calc(28px + env(safe-area-inset-bottom))" }}>
          <div className="ck-art plum gv-rise" style={{ padding: "8px 16px 0", marginTop: 6 }}>
            <TeamArt width={150} />
          </div>

          <h1 className="gv-h1 gv-rise" style={{ "--i": 1, marginTop: 22 } as React.CSSProperties}>{greetingWord()}.</h1>
          <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 6 } as React.CSSProperties}>
            {step === "email" ? "Sign in with your team email. We'll send you a 6-digit code." : `We sent a 6-digit code to ${cleanEmail}.`}
          </p>

          {step === "email" ? (
            <>
              <input
                ref={emailRef}
                className="gv-input gv-rise"
                style={{ "--i": 3, marginTop: 18 } as React.CSSProperties}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                placeholder="you@collectivekindness.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void sendCode(); }}
              />
              <button className="gv-btn block gv-rise" style={{ "--i": 4, marginTop: 12 } as React.CSSProperties} disabled={!emailOk || busy} onClick={() => void sendCode()}>
                {busy ? "Sending…" : "Send code"}
              </button>
            </>
          ) : (
            <>
              <div className="gv-codewrap gv-rise" style={{ "--i": 3, marginTop: 18 } as React.CSSProperties} onClick={() => codeRef.current?.focus()}>
                <input
                  ref={codeRef}
                  value={code}
                  onChange={(e) => onCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="6 digit code"
                />
                <div className="gv-boxes" style={{ gridTemplateColumns: "repeat(6, minmax(0,1fr))" }} aria-hidden>
                  {Array.from({ length: 6 }, (_, i) => (
                    <b key={i} className={`tnum ${i === code.length ? "focus" : code[i] ? "filled" : "empty"}`}>{code[i] || ""}</b>
                  ))}
                </div>
              </div>
              <button className="gv-btn block" style={{ marginTop: 14 }} disabled={code.length !== 6 || busy} onClick={() => void verify(code)}>
                {busy ? "Checking…" : "Verify and sign in"}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                <button className="gv-link" style={{ color: "var(--gv-mid)" }} onClick={() => { setStep("email"); setError(null); }}>Change email</button>
                <button className="gv-link" onClick={() => void sendCode()}>Resend code</button>
              </div>
            </>
          )}

          {error && <div className="gv-gentle" style={{ marginTop: 12 }}>{error}</div>}

          <div className="gv-note gv-rise" style={{ "--i": 5, marginTop: 18 } as React.CSSProperties}>
            <i>!</i>
            <div><b>Never paste your CK login into an AI tool, bot or another site.</b> CK staff will never ask for your code. Sign in only here or on crm.collectivekindness.net.</div>
          </div>
          <p className="gv-rise" style={{ "--i": 6, margin: "14px 2px 0", fontSize: 13.5, color: "var(--gv-mid)", lineHeight: 1.5 } as React.CSSProperties}>New to CK? Ask Shalom or Leivi to add your email.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
