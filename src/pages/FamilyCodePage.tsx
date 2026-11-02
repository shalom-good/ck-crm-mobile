import { useEffect, useRef, useState } from "react";
import { useSwipeBack } from "@/lib/swipeBack";
import { BackButton } from "@/components/BackButton";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { familyLogin, requestFamilyEmailCode, verifyFamilyEmailCode, PORTAL_WEB_URL } from "@/lib/portalApi";
import { ApiError } from "@/lib/mobileApi";
import { useAuth, SESSION_ENDED_KEY } from "@/lib/auth";
import { openExternal } from "@/lib/external";
import { HouseArt } from "@/components/gv";

const LEN = 7;

/**
 * The family door: the 7-letter code a case manager shared (same alphabet
 * and same endpoint as the web portal's lock screen). One real input
 * drives seven display cells so phone keyboards behave. Wrong code = a
 * gentle inline line, never harsh.
 *
 * "Lost your code?" (A-02) swaps the boxes for the email sign-in the API
 * already has (POST /api/portal/login {email} → 6-digit code → /verify),
 * on this same screen. A phone field joins it with the login overhaul.
 * Until the backend hands the app a token (mobile-portal-token), a right
 * code opens the web portal in the in-app browser instead (A-01 interim).
 */
const WEB_LOGIN = `${PORTAL_WEB_URL}/login`;
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
export function FamilyCodePage() {
  const swipe = useSwipeBack("/start");
  const router = useIonRouter();
  const { signInFamily } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notLive, setNotLive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // "Lost your code?" (email → 6-digit code), on this screen
  const [lost, setLost] = useState<null | "email" | "code">(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  // A-13: a family whose session ended lands here with a note on top.
  const [ended] = useState(() => {
    try { const v = sessionStorage.getItem(SESSION_ENDED_KEY) === "1"; sessionStorage.removeItem(SESSION_ENDED_KEY); return v; } catch { return false; }
  });

  const openWeb = (url = WEB_LOGIN) => { setNotLive(true); void openExternal(url); };

  const clean = (v: string) => v.toUpperCase().replace(/[^A-Z]/g, "").slice(0, LEN);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 350); return () => clearTimeout(t); }, []);

  const submit = async () => {
    if (code.length !== LEN || busy) return;
    setBusy(true); setErr(null); setNotLive(false);
    try {
      const { token, name } = await familyLogin(code);
      await signInFamily(token, name);
      router.push("/home", "root", "replace");
    } catch (e) {
      const ae = e as ApiError;
      if (ae?.message === "no_token") openWeb();
      else if (ae?.status === 429) setErr("Too many tries. Give it a few minutes and try again.");
      else if (ae?.status === 401 || ae?.status === 400) setErr("That code didn't work. Codes are 7 letters, no numbers. Or tap \"Lost your code?\" to get one by email.");
      else setErr("Could not reach us right now. Check your connection and try again.");
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const sendEmailCode = async () => {
    if (!validEmail(email) || busy) return;
    setBusy(true); setErr(null);
    try {
      await requestFamilyEmailCode(email.trim().toLowerCase());
      setOtp(""); setLost("code");
      setTimeout(() => otpRef.current?.focus(), 80);
    } catch (e) {
      setErr((e as ApiError)?.status === 400 ? "Check the email and try again." : "Could not reach us right now. Check your connection and try again.");
    }
    setBusy(false);
  };

  const verifyEmailCode = async (c: string) => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const { token, name } = await verifyFamilyEmailCode(email.trim().toLowerCase(), c);
      if (!token) { setBusy(false); openWeb(); return; }
      await signInFamily(token, name);
      router.push("/home", "root", "replace");
    } catch (e) {
      const ae = e as ApiError;
      setErr(ae?.status === 429 ? "Too many tries. Give it a few minutes and try again." : ae?.status === 401 ? "That code didn't work, or it is older than 10 minutes. Send a new one." : "Could not reach us right now. Check your connection and try again.");
      setOtp(""); setBusy(false);
      otpRef.current?.focus();
    }
  };

  const showLost = () => { setLost("email"); setErr(null); setNotLive(false); setTimeout(() => emailRef.current?.focus(), 80); };
  const backToCode = () => { setLost(null); setErr(null); setTimeout(() => inputRef.current?.focus(), 80); };

  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><BackButton href="/start" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "0 20px calc(28px + env(safe-area-inset-bottom))" }} onClick={() => { if (!lost) inputRef.current?.focus(); }}>
          <div className="gv-rise" style={{ borderRadius: 22, background: "linear-gradient(160deg,#EEF8C8,#DDF3E6)", padding: "8px 16px 0", display: "flex", justifyContent: "center" }}>
            <HouseArt width={170} />
          </div>

          {ended && (
            <div role="status" className="gv-note gv-rise" style={{ "--i": 1, marginTop: 16 } as React.CSSProperties}>
              It has been a while, so you were signed out. Enter your code to pick up where you left off.
            </div>
          )}

          <h1 className="gv-h1 gv-rise" style={{ "--i": 1, marginTop: 22 } as React.CSSProperties}>{lost ? "Get a code by email" : "Open your family page"}</h1>
          <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 6 } as React.CSSProperties}>
            {lost === "email" ? "Enter the email your case manager has for you. We will send a 6-digit code." : lost === "code" ? <>If <b style={{ color: "var(--gv-ink)" }}>{email.trim()}</b> is on file, a 6-digit code is on its way. It works for 10 minutes.</> : "Enter the 7-letter code from your case manager."}
          </p>

          {!lost && (<>
          <div className="gv-codewrap gv-rise" style={{ "--i": 3, marginTop: 18 } as React.CSSProperties}>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => { setCode(clean(e.target.value)); setErr(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="one-time-code"
              spellCheck={false}
              inputMode="text"
              aria-label="Your 7 letter family code"
            />
            <div className="gv-boxes" style={{ gridTemplateColumns: `repeat(${LEN}, minmax(0,1fr))` }} aria-hidden>
              {Array.from({ length: LEN }, (_, i) => (
                <b key={i} className={i === code.length ? "focus" : code[i] ? "filled" : "empty"}>{code[i] || ""}</b>
              ))}
            </div>
          </div>

          <button className="gv-btn block gv-rise" style={{ "--i": 4, marginTop: 16 } as React.CSSProperties} disabled={code.length !== LEN || busy} onClick={() => void submit()}>
            {busy ? "Opening…" : "Open my page"}
          </button>
          </>)}

          {lost === "email" && (
            <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 18 }}>
              {/* A phone (WhatsApp) field joins here with the login overhaul. */}
              <label htmlFor="fam-email" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--gv-mid)", margin: "0 2px 6px" }}>Email</label>
              <input
                id="fam-email"
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErr(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") void sendEmailCode(); }}
                style={{ width: "100%", boxSizing: "border-box", minHeight: 52, borderRadius: 14, border: 0, boxShadow: "inset 0 0 0 1.5px var(--gv-hair, #EAEDE7)", background: "#fff", padding: "0 14px", font: "inherit", fontSize: 16, color: "var(--gv-ink)" }}
              />
              <button className="gv-btn block" style={{ marginTop: 14 }} disabled={!validEmail(email) || busy} onClick={() => void sendEmailCode()}>
                {busy ? "Sending…" : "Send me a code"}
              </button>
            </div>
          )}

          {lost === "code" && (
            <div onClick={(e) => { e.stopPropagation(); otpRef.current?.focus(); }} style={{ marginTop: 18 }}>
              <div className="gv-codewrap">
                <input
                  ref={otpRef}
                  value={otp}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setOtp(v); setErr(null); if (v.length === 6) void verifyEmailCode(v); }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  aria-label="Your 6 digit code"
                  disabled={busy}
                />
                <div className="gv-boxes" style={{ gridTemplateColumns: "repeat(6, minmax(0,1fr))" }} aria-hidden>
                  {Array.from({ length: 6 }, (_, i) => (
                    <b key={i} className={i === otp.length ? "focus" : otp[i] ? "filled" : "empty"}>{otp[i] || ""}</b>
                  ))}
                </div>
              </div>
              {busy && <p className="gv-sub" style={{ marginTop: 10 }}>Checking…</p>}
              <div style={{ display: "flex", gap: 16, marginTop: 14, paddingLeft: 8 }}>
                <button className="gv-link" onClick={() => { setOtp(""); void requestFamilyEmailCode(email.trim().toLowerCase()).catch(() => {}); }}>Send a new code</button>
                <button className="gv-link" onClick={() => { setLost("email"); setOtp(""); setErr(null); }}>Use another email</button>
              </div>
            </div>
          )}

          {err && <div className="gv-gentle" style={{ marginTop: 12 }}>{err}</div>}
          {notLive && (
            <div className="gv-note" style={{ marginTop: 12 }}>
              <div><b>Your page opens in the browser for now.</b> Sign in there and you are in. The app will open it directly soon.
                <button className="gv-btn block" style={{ marginTop: 12 }} onClick={() => void openExternal(WEB_LOGIN)}>Open my page</button>
              </div>
            </div>
          )}

          {lost ? (
            <p className="gv-rise" style={{ "--i": 5, margin: "18px 2px 0", fontSize: 14, lineHeight: 1.5, color: "var(--gv-mid)" } as React.CSSProperties}>
              Found your code? <button className="gv-link" style={{ fontSize: 14 }} onClick={(e) => { e.stopPropagation(); backToCode(); }}>Use my family code</button>
            </p>
          ) : (
            <p className="gv-rise" style={{ "--i": 5, margin: "18px 2px 0", fontSize: 14, lineHeight: 1.5, color: "var(--gv-mid)" } as React.CSSProperties}>
              <button className="gv-link" style={{ fontSize: 14 }} onClick={(e) => { e.stopPropagation(); showLost(); }}>Lost your code?</button>{" "}
              Get one by email, or ask your case manager.
            </p>
          )}
          <p className="gv-rise" style={{ "--i": 6, margin: "10px 2px 0", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--gv-mid)" } as React.CSSProperties}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--gv-mint)", color: "var(--gv-go)", display: "grid", placeItems: "center", fontSize: 12, flex: "none" }}>✓</span>
            Private to your family. We never share it.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
