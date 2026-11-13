import { useEffect, useRef, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { BackButton } from "@/components/BackButton";
import { AcademyMark } from "@/components/gv";
import { Panel } from "@/components/orchard/family/FamKit";
import { useSwipeBack } from "@/lib/swipeBack";
import { useAuth } from "@/lib/auth";
import { ApiError, ACADEMY_URL } from "@/lib/mobileApi";
import { openExternal } from "@/lib/external";
import { academyGoogleReady, academyGoogleUrl, academyNotLive, academyRequestCode, academyVerify, readAcademyGoogleReturn } from "@/lib/academyApi";
import { leaveTo } from "@/lib/device";
import { CodeRail } from "@/components/orchard/CodeRail";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

// Continue with Google (2026-11-11): the CRM runs the Google sign-in in the
// browser and hands the student session back to this return address.
const GOOGLE_APP_RETURN = "net.collectivekindness.ckteam://academy-auth";
const GOOGLE_RETURN = Capacitor.isNativePlatform()
  ? GOOGLE_APP_RETURN
  : (typeof window !== "undefined" ? `${window.location.origin}/start/academy/signin` : "");
const G_REASON: Record<string, string> = {
  nomatch: "is not signed up for CK Academy yet. Try the email you signed up with, or sign up below.",
  cancel: "Google sign-in was closed before it finished. Try again, or use your email.",
  failed: "Google sign-in did not go through. Try again in a moment, or use your email.",
  off: "Google sign-in is not switched on yet. Use your email and we will send a code.",
};

/**
 * "I already signed up": the email they used on the website (or in the
 * app) → a 6-digit code by email → their course. No password to remember.
 */
export function AcademySignInPage() {
  const swipe = useSwipeBack("/start/academy");
  const router = useIonRouter();
  const { signInAcademy } = useAuth();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [email, setEmail] = useState(params.get("email") || "");
  const [step, setStep] = useState<"email" | "code">(params.get("sent") === "1" && params.get("email") ? "code" : "email");
  const existing = params.get("existing") === "1";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const cleanEmail = email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  useEffect(() => { if (step === "code") setTimeout(() => codeRef.current?.focus(), 350); }, [step]);

  const [gBusy, setGBusy] = useState(false);
  // The Google hand-back: a student session, or a plain reason it did not work.
  const takeReturn = async (hash: string) => {
    const r = readAcademyGoogleReturn(hash);
    if (!r) return;
    setGBusy(false);
    if ("token" in r) {
      await signInAcademy(r.token, r.student);
      router.push("/academy", "root", "replace");
      return;
    }
    setStep("email");
    setError(r.reason === "nomatch" ? `${r.email || "That Google account"} ${G_REASON.nomatch}` : G_REASON[r.reason] || G_REASON.failed);
  };
  useEffect(() => {
    // Web build: the CRM sends the browser back to /start/academy/signin#…
    if (typeof window !== "undefined" && /(^|[#&])(academy_token|ag)=/.test(window.location.hash)) {
      const h = window.location.hash;
      window.history.replaceState(null, "", window.location.pathname);
      void takeReturn(h);
    }
    // Native: the CRM opens net.collectivekindness.ckteam://academy-auth#…
    if (!Capacitor.isNativePlatform()) return undefined;
    const sub = CapApp.addListener("appUrlOpen", ({ url }) => {
      if (!url.startsWith(GOOGLE_APP_RETURN)) return;
      void Browser.close().catch(() => {});
      void takeReturn(url);
    });
    return () => { void sub.then((h) => h.remove()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const google = async () => {
    if (gBusy) return;
    setGBusy(true); setError(null);
    try {
      // Checked first, so nobody leaves the app for a page that is not there.
      if (!(await academyGoogleReady())) { setGBusy(false); setError(G_REASON.off); return; }
    } catch (e) {
      setGBusy(false);
      setError(academyNotLive(e) ? G_REASON.off : G_REASON.failed);
      return;
    }
    const url = academyGoogleUrl(GOOGLE_RETURN);
    if (Capacitor.isNativePlatform()) {
      try { await Browser.open({ url }); } catch { setError(G_REASON.failed); }
      setTimeout(() => setGBusy(false), 4000);
    } else {
      leaveTo(url);
    }
  };

  const sendCode = async () => {
    if (!emailOk || busy) return;
    setBusy(true); setError(null);
    try {
      await academyRequestCode(cleanEmail);
      setCode("");
      setStep("code");
    } catch (e) {
      if (academyNotLive(e)) setOffline(true);
      else setError("We could not send the code. Check your connection and try again.");
    } finally { setBusy(false); }
  };

  const verify = async (v: string) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const r = await academyVerify(cleanEmail, v);
      await signInAcademy(r.token, r.student);
      router.push("/academy", "root", "replace");
    } catch (e) {
      setCode("");
      if (academyNotLive(e)) setOffline(true);
      else if (e instanceof ApiError && e.status === 429) setError("Too many tries. Wait a few minutes, then ask for a new code.");
      else setError("That code did not match. Check the newest email from CK Academy, or ask for a new code.");
      setTimeout(() => codeRef.current?.focus(), 50);
    } finally { setBusy(false); }
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
          <IonButtons slot="start"><BackButton href="/start/academy" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="ocf2 ocf2-page--door">
          <section className="ocf2-hero ocf2-t-lilac gv-rise">
            <span aria-hidden style={{ width: 44, height: 44, borderRadius: 14, background: "#fff", display: "grid", placeItems: "center" }}>
              <AcademyMark size={24} color="#2D3766" />
            </span>
            <h1 className="ocf2-h1" style={{ marginTop: 6 }}>
              <span><mark>Welcome back.</mark></span>
              <span className="ocf2-h1-2" style={{ color: "#5A6394" }}>Pick up your course.</span>
            </h1>
            <p className="ocf2-hero-sub" style={{ color: "#2D3766" }}>
              {step === "email"
                ? "Use the Google account or the email you signed up with, here or on the website. No password."
                : existing
                  ? `${cleanEmail} already has a course. We emailed a 6-digit code to open it.`
                  : `We emailed a 6-digit code to ${cleanEmail}.`}
            </p>
          </section>

          {offline ? (
            <Panel tone="butter" style={{ gap: 10 }}>
              <p className="ocf2-p" style={{ color: "#3F360A", fontWeight: 700 }}>Sign-in inside the app is being switched on. Until then your course opens on the website with the same email.</p>
              <button type="button" className="ocf2-btn ocf2-btn--primary is-block" onClick={() => void openExternal(ACADEMY_URL.replace(/\/newlyweds-course$/, "/sign-in"))}>Open my course on the website</button>
            </Panel>
          ) : step === "email" ? (
            <>
              <button type="button" className="ocf2-gbtn gv-rise" style={{ "--i": 1 } as React.CSSProperties} onClick={() => void google()} disabled={gBusy}>
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                {gBusy ? "Opening Google…" : "Continue with Google"}
              </button>
              <div className="ocf2-or gv-rise" style={{ "--i": 2 } as React.CSSProperties}>or get a code by email</div>
              <input
                className="ocf2-input gv-rise"
                style={{ "--i": 2 } as React.CSSProperties}
                type="email" inputMode="email" autoComplete="email" autoCapitalize="none"
                aria-label="Email" placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void sendCode(); }}
              />
              <button type="button" className="ocf2-btn ocf2-btn--primary is-block gv-rise" style={{ "--i": 3, minHeight: 54 } as React.CSSProperties} disabled={!emailOk || busy} onClick={() => void sendCode()}>
                {busy ? "Sending…" : "Email me a code"}
              </button>
              <button type="button" className="ocf2-link gv-rise" style={{ "--i": 4, alignSelf: "center" } as React.CSSProperties} onClick={() => router.push("/start/academy/signup")}>New here? Sign up</button>
            </>
          ) : (
            <>
              <div className="ocf2-code" onClick={() => codeRef.current?.focus()}>
                <input ref={codeRef} value={code} onChange={(e) => onCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" aria-label="6 digit code" />
                <CodeRail value={code} slots={6} ready={code.length === 6} />
              </div>
              <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 54 }} disabled={code.length !== 6 || busy} onClick={() => void verify(code)}>
                {busy ? "Checking…" : "Open my course"}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: -4 }}>
                <button type="button" className="ocf2-link" style={{ color: "var(--oc-mid)" }} onClick={() => { setStep("email"); setError(null); }}>Change email</button>
                <button type="button" className="ocf2-link" onClick={() => void sendCode()}>Send a new code</button>
              </div>
              <p className="ocf2-meta" style={{ margin: "0 4px" }}>Nothing in your inbox after a minute? Check spam, and make sure it is the email you signed up with.</p>
            </>
          )}

          {error && <div className="ocf2-gentle" role="alert">{error}</div>}
        </div>
      </IonContent>
    </IonPage>
  );
}
