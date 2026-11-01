import { useEffect, useRef, useState } from "react";
import { useSwipeBack } from "@/lib/swipeBack";
import { BackButton } from "@/components/BackButton";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { familyLogin, PORTAL_WEB_URL } from "@/lib/portalApi";
import { ApiError } from "@/lib/mobileApi";
import { useAuth } from "@/lib/auth";
import { HouseArt } from "@/components/gv";

const LEN = 7;

/**
 * The family door: the 7-letter code a case manager shared (same alphabet
 * and same endpoint as the web portal's lock screen). One real input
 * drives seven display cells so phone keyboards behave. Wrong code = a
 * gentle inline line, never harsh.
 */
export function FamilyCodePage() {
  const swipe = useSwipeBack("/start");
  const router = useIonRouter();
  const { signInFamily } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notLive, setNotLive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (ae?.message === "no_token") setNotLive(true);
      else if (ae?.status === 429) setErr("Too many tries. Give it a few minutes and try again.");
      else if (ae?.status === 401 || ae?.status === 400) setErr("That code didn't match. Double check it with your case manager.");
      else setErr("Could not reach us right now. Check your connection and try again.");
      setBusy(false);
      inputRef.current?.focus();
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
        <div style={{ padding: "0 20px calc(28px + env(safe-area-inset-bottom))" }} onClick={() => inputRef.current?.focus()}>
          <div className="gv-rise" style={{ borderRadius: 22, background: "linear-gradient(160deg,#EEF8C8,#DDF3E6)", padding: "8px 16px 0", display: "flex", justifyContent: "center" }}>
            <HouseArt width={170} />
          </div>

          <h1 className="gv-h1 gv-rise" style={{ "--i": 1, marginTop: 22 } as React.CSSProperties}>Welcome back</h1>
          <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 6 } as React.CSSProperties}>Enter your family code to open your page.</p>

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

          {err && <div className="gv-gentle" style={{ marginTop: 12 }}>{err}</div>}
          {notLive && (
            <div className="gv-note" style={{ marginTop: 12 }}>
              <i>!</i>
              <div><b>The app side of family sign-in is still switching on.</b> Your code works on the web portal right now. <a href={`${PORTAL_WEB_URL}/login`} target="_blank" rel="noreferrer" style={{ color: "var(--gv-go)", fontWeight: 700 }}>Open the portal</a> and try the app again in a little while.</div>
            </div>
          )}

          <p className="gv-rise" style={{ "--i": 5, margin: "18px 2px 0", fontSize: 13.5, lineHeight: 1.5, color: "var(--gv-quiet)" } as React.CSSProperties}>Don&apos;t have your code? Your case manager has it. Just ask.</p>
          <p className="gv-rise" style={{ "--i": 6, margin: "10px 2px 0", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--gv-mid)" } as React.CSSProperties}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--gv-mint)", color: "var(--gv-go)", display: "grid", placeItems: "center", fontSize: 12, flex: "none" }}>✓</span>
            Private to your family. We never share it.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
