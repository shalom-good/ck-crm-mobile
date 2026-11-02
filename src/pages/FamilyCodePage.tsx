import { useEffect, useRef, useState } from "react";
import { useSwipeBack } from "@/lib/swipeBack";
import { BackButton } from "@/components/BackButton";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { familyLogin, PORTAL_WEB_URL } from "@/lib/portalApi";
import { addHouseholdPhone, identifierKind } from "@/lib/identityApi";
import { ApiError } from "@/lib/mobileApi";
import { useAuth, SESSION_ENDED_KEY } from "@/lib/auth";
import { openExternal } from "@/lib/external";
import { HouseArt } from "@/components/gv";
import { CodeSignIn } from "@/components/CodeSignIn";

const LEN = 7;

/**
 * The family door (one sign-in, 2026-11-02). Main path: ONE field for a
 * phone or an email → a 6-digit code (WhatsApp first, email second) →
 * the household's 90-day session (renewed on use). Spouses share ONE
 * household sign-in: either spouse's phone or email opens the same page.
 *
 * Secondary: "I have a 7-letter code from my case manager" (the one-time
 * invite, POST /api/portal/login { code, client: "mobile" }). After it,
 * "Next time, sign in with your phone" adds the phone to the household.
 */
const WEB_LOGIN = `${PORTAL_WEB_URL}/login`;
export function FamilyCodePage() {
  const swipe = useSwipeBack("/start");
  const router = useIonRouter();
  const { signInFamily } = useAuth();
  const [mode, setMode] = useState<"signin" | "letters" | "offer">("signin");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notLive, setNotLive] = useState(false);
  const [phone, setPhone] = useState("");
  const [signStep, setSignStep] = useState<"id" | "code">("id");
  const [pending, setPending] = useState<{ token: string; name: string | null } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // A-13: a family whose session ended lands here with a note on top.
  const [ended] = useState(() => {
    try { const v = sessionStorage.getItem(SESSION_ENDED_KEY) === "1"; sessionStorage.removeItem(SESSION_ENDED_KEY); return v; } catch { return false; }
  });

  const clean = (v: string) => v.toUpperCase().replace(/[^A-Z]/g, "").slice(0, LEN);
  useEffect(() => { if (mode === "letters") { const t = setTimeout(() => inputRef.current?.focus(), 300); return () => clearTimeout(t); } return undefined; }, [mode]);

  const goHome = () => router.push("/home", "root", "replace");

  const submitLetters = async () => {
    if (code.length !== LEN || busy) return;
    setBusy(true); setErr(null); setNotLive(false);
    try {
      const { token, name } = await familyLogin(code);
      // Hold the session until the phone offer is answered.
      setPending({ token, name }); setBusy(false); setMode("offer");
    } catch (e) {
      const ae = e as ApiError;
      if (ae?.message === "no_token") { setNotLive(true); void openExternal(WEB_LOGIN); }
      else if (ae?.status === 429) setErr("Too many tries. Wait a few minutes and try again.");
      else if (ae?.status === 401 || ae?.status === 400) setErr("That code didn't work. Codes are 7 letters, no numbers. Check it with your case manager.");
      else setErr("Could not reach us right now. Check your connection and try again.");
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const finishOffer = async (save: boolean) => {
    if (!pending || busy) return;
    setBusy(true); setErr(null);
    try {
      if (save) await addHouseholdPhone(phone, pending.token);
      await signInFamily(pending.token, pending.name);
      goHome();
    } catch (e) {
      setErr((e as ApiError)?.message || "We could not save that just now. Try again in a moment.");
      setBusy(false);
    }
  };

  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><BackButton href="/start" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "0 20px calc(28px + env(safe-area-inset-bottom))" }} onClick={() => { if (mode === "letters") inputRef.current?.focus(); }}>
          <div className="gv-rise" style={{ borderRadius: 22, background: "linear-gradient(160deg,#EEF8C8,#DDF3E6)", padding: "8px 16px 0", display: "flex", justifyContent: "center" }}>
            <HouseArt width={150} />
          </div>

          {ended && mode === "signin" && (
            <div role="status" className="gv-note gv-rise" style={{ "--i": 1, marginTop: 16 } as React.CSSProperties}>
              It has been a while, so you were signed out. Sign in again to pick up where you left off.
            </div>
          )}

          {mode === "signin" && (
            <CodeSignIn
              area="family"
              title="Open your family page"
              sub="Enter your phone number or email. We will send you a 6-digit code."
              onStep={setSignStep}
              onSignedIn={async (token, data) => { await signInFamily(token, data?.name ?? null); goHome(); }}
            />
          )}

          {mode === "letters" && (<>
            <h1 className="gv-h1 gv-rise" style={{ "--i": 1, marginTop: 22 } as React.CSSProperties}>Enter your family code</h1>
            <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 6 } as React.CSSProperties}>Enter the 7-letter code from your case manager.</p>
            <div className="gv-codewrap gv-rise" style={{ "--i": 3, marginTop: 18 } as React.CSSProperties}>
              <input
                ref={inputRef}
                value={code}
                onChange={(e) => { setCode(clean(e.target.value)); setErr(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") void submitLetters(); }}
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
            <button className="gv-btn block gv-rise" style={{ "--i": 4, marginTop: 16 } as React.CSSProperties} disabled={code.length !== LEN || busy} onClick={() => void submitLetters()}>
              {busy ? "Opening…" : "Open my page"}
            </button>
          </>)}

          {mode === "offer" && (
            <div onClick={(e) => e.stopPropagation()}>
              <h1 className="gv-h1 gv-rise" style={{ "--i": 1, marginTop: 22 } as React.CSSProperties}>You are in</h1>
              <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 6 } as React.CSSProperties}>Next time, sign in with your phone. No code to keep. Either of you can add your own number.</p>
              <label htmlFor="ck-phone" style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--gv-mid)", margin: "18px 2px 6px" }}>Your phone</label>
              <input id="ck-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 123-4567" value={phone}
                onChange={(e) => { setPhone(e.target.value); setErr(null); }}
                style={{ width: "100%", boxSizing: "border-box", minHeight: 52, borderRadius: 14, border: 0, boxShadow: "inset 0 0 0 1.5px var(--gv-hair, #EAEDE7)", background: "#fff", padding: "0 14px", font: "inherit", fontSize: 16, color: "var(--gv-ink)" }} />
              <button className="gv-btn block" style={{ marginTop: 14 }} disabled={identifierKind(phone) !== "phone" || busy} onClick={() => void finishOffer(true)}>{busy ? "Saving…" : "Save my phone"}</button>
              <button className="gv-btn ghost block" style={{ marginTop: 10 }} disabled={busy} onClick={() => void finishOffer(false)}>Not now, open my page</button>
            </div>
          )}

          {err && <div className="gv-gentle" style={{ marginTop: 12 }}>{err}</div>}
          {notLive && (
            <div className="gv-note" style={{ marginTop: 12 }}>
              <div><b>Your page opens in the browser for now.</b> Sign in there and you are in.
                <button className="gv-btn block" style={{ marginTop: 12 }} onClick={() => void openExternal(WEB_LOGIN)}>Open my page</button>
              </div>
            </div>
          )}

          {mode === "signin" && signStep === "id" && (
            <p className="gv-rise" style={{ "--i": 5, margin: "18px 2px 0", fontSize: 14, lineHeight: 1.5, color: "var(--gv-mid)" } as React.CSSProperties}>
              <button className="gv-link" style={{ fontSize: 14 }} onClick={(e) => { e.stopPropagation(); setErr(null); setMode("letters"); }}>I have a 7-letter code from my case manager</button>
            </p>
          )}
          {mode === "letters" && (
            <p style={{ margin: "18px 2px 0", fontSize: 14, lineHeight: 1.5, color: "var(--gv-mid)" }}>
              <button className="gv-link" style={{ fontSize: 14 }} onClick={(e) => { e.stopPropagation(); setErr(null); setMode("signin"); }}>Sign in with my phone or email</button>
            </p>
          )}
          <p className="gv-rise" style={{ "--i": 6, margin: "10px 2px 0", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--gv-mid)" } as React.CSSProperties}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--gv-mint)", color: "var(--gv-go)", display: "grid", placeItems: "center", fontSize: 12, flex: "none" }}>✓</span>
            Private to your family. No password, ever.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
