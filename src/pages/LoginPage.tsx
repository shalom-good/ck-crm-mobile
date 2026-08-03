import { useRef, useState } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { Logo } from "@/components/Logo";
import { requestCode, verifyCode } from "@/lib/mobileApi";
import { useAuth } from "@/lib/auth";

/**
 * Sign-in: email → "Send code" → 6-digit code boxes → verify.
 * The verified JWT + user persist via lib/auth (Capacitor Preferences,
 * localStorage on web) and the app routes into the tabs.
 */
export function LoginPage() {
  const router = useIonRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  const cleanEmail = email.trim().toLowerCase();
  const emailOk = /.+@.+\..+/.test(cleanEmail);
  const code = digits.join("");

  const sendCode = async () => {
    if (!emailOk || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestCode(cleanEmail);
      setStep("code");
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => boxRefs.current[0]?.focus(), 120);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (fullCode?: string) => {
    const c = fullCode ?? code;
    if (c.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await verifyCode(cleanEmail, c);
      await signIn(token, user);
      router.push("/tabs/home", "root", "replace");
    } catch {
      setError("That code did not work. Check it or request a new one.");
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => boxRefs.current[0]?.focus(), 60);
    } finally {
      setBusy(false);
    }
  };

  const setDigit = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, "");
    // Paste of the whole code into any box fills the row.
    if (v.length > 1) {
      const next = ["", "", "", "", "", ""];
      for (let k = 0; k < 6; k++) next[k] = v[k] ?? "";
      setDigits(next);
      const filled = Math.min(v.length, 6);
      boxRefs.current[Math.min(filled, 5)]?.focus();
      if (filled === 6) void verify(next.join(""));
      return;
    }
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) boxRefs.current[i + 1]?.focus();
    if (v && i === 5) {
      const full = next.join("");
      if (full.length === 6) void verify(full);
    }
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      boxRefs.current[i - 1]?.focus();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
    }
  };

  const input: React.CSSProperties = {
    width: "100%", height: 52, borderRadius: 14, border: "1px solid var(--ck-input-border)",
    background: "var(--ck-card)", color: "var(--ck-title)", fontSize: 16, padding: "0 16px",
    outline: "none",
  };
  const primary: React.CSSProperties = {
    width: "100%", height: 52, borderRadius: 14, border: "none", cursor: "pointer",
    background: "var(--ck-tint)", color: "#fff", fontSize: 15.5, fontWeight: 700,
    boxShadow: "0 6px 14px rgba(194,83,31,.28)", opacity: busy ? 0.7 : 1,
  };

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px calc(40px + env(safe-area-inset-bottom))" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
            <Logo size={64} />
            <h1 style={{ margin: "18px 0 0", fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ck-title)" }}>CK Team</h1>
            <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--ck-body)", textAlign: "center" }}>
              {step === "email" ? "Sign in with your team email." : `We sent a 6-digit code to ${cleanEmail}.`}
            </p>
          </div>

          <div className="shadow-card" style={{ background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 20, padding: 20 }}>
            {step === "email" ? (
              <>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "var(--ck-label)", marginBottom: 8 }}>EMAIL</label>
                <input
                  style={input}
                  className="ck-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  placeholder="you@collectivekindness.net"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void sendCode(); }}
                />
                <button style={{ ...primary, marginTop: 14, opacity: emailOk && !busy ? 1 : 0.55 }} disabled={!emailOk || busy} onClick={() => void sendCode()}>
                  {busy ? "Sending…" : "Send code"}
                </button>
              </>
            ) : (
              <>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "var(--ck-label)", marginBottom: 10 }}>ENTER CODE</label>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { boxRefs.current[i] = el; }}
                      value={d}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => onKey(i, e)}
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      maxLength={6}
                      aria-label={`Digit ${i + 1}`}
                      style={{
                        width: 46, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700,
                        borderRadius: 12, border: `1.5px solid ${d ? "var(--ck-tint)" : "var(--ck-input-border)"}`,
                        background: "var(--ck-paper)", color: "var(--ck-title)", outline: "none",
                      }}
                      className="tnum"
                    />
                  ))}
                </div>
                <button style={{ ...primary, marginTop: 16, opacity: code.length === 6 && !busy ? 1 : 0.55 }} disabled={code.length !== 6 || busy} onClick={() => void verify()}>
                  {busy ? "Checking…" : "Verify and sign in"}
                </button>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                  <button onClick={() => { setStep("email"); setError(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ck-body)" }}>
                    Change email
                  </button>
                  <button onClick={() => void sendCode()} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ck-tint)" }}>
                    Resend code
                  </button>
                </div>
              </>
            )}
            {error && (
              <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 12, background: "var(--ck-warn-bg)", color: "var(--ck-warn-fg)", fontSize: 13, fontWeight: 500 }}>
                {error}
              </div>
            )}
          </div>

          <p style={{ margin: "18px 4px 0", fontSize: 12, color: "var(--ck-muted)", textAlign: "center", lineHeight: 1.5 }}>
            Codes go to team emails only. If yours does not arrive, this may be on us. Ping Shalom.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
