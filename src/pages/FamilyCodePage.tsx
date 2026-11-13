import { useEffect, useRef, useState } from "react";
import { leaveTo } from "@/lib/device";
import { useSwipeBack } from "@/lib/swipeBack";
import { BackButton } from "@/components/BackButton";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { familyLogin, requestFamilyEmailCode, verifyFamilyEmailCode, PORTAL_WEB_URL } from "@/lib/portalApi";
import { ApiError } from "@/lib/mobileApi";
import { kdhLogin } from "@/lib/kdhApi";
import { useAuth, SESSION_ENDED_KEY } from "@/lib/auth";
import { openExternal } from "@/lib/external";
import { PlkHouse, PlkHouseStyles } from "@/components/orchard/family/PlkHouse";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { CRM_HOST } from "@/lib/mobileApi";
import { useQueryClient } from "@tanstack/react-query";
import { FAMILY_DEMO_TOKEN, resetFamilyDemo } from "@/lib/portalDemo";
import { KDH_DEMO_TOKEN } from "@/lib/kdhApi";
import { resetKdhPlusSample } from "@/lib/kdhPlusApi";
import { DONOR_DEMO_EMAIL, donorVerify, saveDonor } from "@/lib/donorApi";
import { setPersona } from "@/lib/demoPersona";
import { useFitScreen } from "@/lib/useFitScreen";
import { CodeRail } from "@/components/orchard/CodeRail";
import { COORDINATOR_NAME, coordinatorWa } from "@/lib/contact";
import { WhatsappLogo } from "@phosphor-icons/react";

// Family codes: 6 letters for new ones, older codes (and KDH homework codes)
// are 7. Six boxes show; a seventh appears when they keep typing.
const MIN = 6;
const LEN = 7;
// Reserved (never a real code, never sent to the server): opens the
// "All access" chooser of sample doors for the owner.
const ALL_ACCESS_CODE = "CKTEAM";
// Example walk-throughs (reserved, never sent to the server): each opens one
// SAMPLE door with a name on it. Only the name is set; every figure behind
// it is the made-up sample data, never that person's record.
const EXAMPLES: Record<string, { door: "donor" | "family" | "kdh" | "kdhplus"; name: string }> = {
  BORUCH: { door: "donor", name: "Boruch Leivi Bartfield" },
  BENFAM: { door: "family", name: "Ben" },
  MENDYK: { door: "kdh", name: "Mendy" },
  KDHPLUS: { door: "kdhplus", name: "Mendy" },
};
// Continue with Google (2026-11-08): the CRM runs the Google sign-in in the
// browser sheet and hands the family session back to this return address.
const GOOGLE_RETURN = Capacitor.isNativePlatform()
  ? "net.collectivekindness.ckteam://portal-auth"
  : (typeof window !== "undefined" ? `${window.location.origin}/start/family` : "");
const googleStartUrl = () => `${CRM_HOST}/api/portal/google/start?remember=1&app=${encodeURIComponent(GOOGLE_RETURN)}`;
const G_REASON: Record<string, string> = {
  nomatch: "isn't on your file yet. Use your family code, or ask your coordinator to add this Gmail.",
  many: "is on more than one family's file. Please use your family code.",
  cancel: "Google sign-in was closed before it finished. Try again, or use your family code.",
  failed: "Google sign-in didn't go through. Try again in a moment, or use your family code.",
  off: "Google sign-in isn't switched on yet. Please use your family code.",
  busy: "Too many tries. Wait a few minutes, or use your family code.",
};

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
  const { signInFamily, signInKdh } = useAuth();
  const qc = useQueryClient();
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
  // Six slots; a seventh shows only once a seventh letter is typed (older
  // codes), so no empty box is left hanging after a six-letter code.
  const cells = Math.max(MIN, Math.min(LEN, code.length));
  const [gBusy, setGBusy] = useState(false);

  // The Google hand-back: #token=…&name=… (signed in) or #g=<reason>&email=…
  const takeReturn = async (hash: string) => {
    const q = new URLSearchParams(hash.replace(/^#/, ""));
    const token = q.get("token");
    if (token) {
      await signInFamily(token, q.get("name") || null);
      router.push("/home", "root", "replace");
      return;
    }
    const g = q.get("g");
    if (g) {
      const email = q.get("email");
      setGBusy(false);
      setErr(g === "nomatch" || g === "many" ? `${email || "That Gmail"} ${G_REASON[g]}` : G_REASON[g] || G_REASON.failed);
    }
  };
  useEffect(() => {
    // Web build: the CRM sends the browser back to /start/family#…
    if (typeof window !== "undefined" && /(^|[#&])(token|g)=/.test(window.location.hash)) {
      const h = window.location.hash;
      window.history.replaceState(null, "", window.location.pathname);
      void takeReturn(h);
    }
    // Native: the CRM opens net.collectivekindness.ckteam://portal-auth#…
    if (!Capacitor.isNativePlatform()) return undefined;
    const sub = CapApp.addListener("appUrlOpen", ({ url }) => {
      if (!url.startsWith("net.collectivekindness.ckteam://portal-auth")) return;
      void Browser.close().catch(() => {});
      void takeReturn(url.slice(url.indexOf("#")));
    });
    return () => { void sub.then((h) => h.remove()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const google = async () => {
    setGBusy(true); setErr(null);
    if (Capacitor.isNativePlatform()) {
      try { await Browser.open({ url: googleStartUrl() }); } catch { setGBusy(false); setErr(G_REASON.failed); }
      setTimeout(() => setGBusy(false), 4000);
    } else {
      leaveTo(googleStartUrl());
    }
  };
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 350); return () => clearTimeout(t); }, []);

  const submit = async () => {
    if (code.length < MIN || busy) return;
    if (code === ALL_ACCESS_CODE) { setCode(""); setErr(null); router.push("/start/all"); return; }
    const ex = EXAMPLES[code];
    if (ex) {
      setBusy(true); setErr(null);
      qc.clear();
      try {
        if (ex.door === "donor") {
          setPersona({ donor: ex.name });
          saveDonor(await donorVerify(DONOR_DEMO_EMAIL, "072026"));
          setCode(""); setBusy(false);
          router.push("/start/donor");
        } else if (ex.door === "family") {
          setPersona({ family: ex.name });
          resetFamilyDemo();
          await signInFamily(FAMILY_DEMO_TOKEN, `${ex.name}'s family`);
        } else {
          setPersona({ kdh: ex.name });
          if (ex.door === "kdhplus") resetKdhPlusSample();
          await signInKdh(KDH_DEMO_TOKEN, ex.name);
          // The route itself redirects to homework once signed in (as on
          // "All access"); the KDH Plus example then steps in from there.
          if (ex.door === "kdhplus") setTimeout(() => router.push("/kdh/plus"), 900);
        }
      } catch { setErr("That example did not open. Try again."); setBusy(false); }
      return;
    }
    setBusy(true); setErr(null); setNotLive(false);
    try {
      const { token, name } = await familyLogin(code);
      await signInFamily(token, name);
      router.push("/home", "root", "replace");
    } catch (e) {
      let ae = e as ApiError;
      // Not a CK family code: it may be a KDH client's homework code (same
      // 7 letters). Only a plain "no match" falls through to KDH.
      if (ae?.status === 401) {
        try {
          const k = await kdhLogin(code);
          await signInKdh(k.token, k.name);
          router.push("/kdh/homework", "root", "replace");
          return;
        } catch (ke) { ae = ke as ApiError; if (ae?.status === 404) ae = new ApiError(401, "unauthorized"); }
      }
      if (ae?.message === "no_token") openWeb();
      else if (ae?.status === 429) setErr("Too many tries. Give it a few minutes and try again.");
      else if (ae?.status === 401 || ae?.status === 400) setErr("That code didn't work. Codes are 6 or 7 letters, no numbers. Or tap \"Lost your code?\" to get one by email.");
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

  // The fit rule: this screen is one page, no scroll (2026-11-11).
  const fitRef = useFitScreen<HTMLDivElement>(5, [lost, err, notLive, ended]);

  const showLost = () => { setLost("email"); setErr(null); setNotLive(false); setTimeout(() => emailRef.current?.focus(), 80); };
  const backToCode = () => { setLost(null); setErr(null); setTimeout(() => inputRef.current?.focus(), 80); };

  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div ref={fitRef} className="ocf2 ocf2-page--door ocf2-fitpage" onClick={() => { if (!lost) inputRef.current?.focus(); }}>
          <section className="ocf2-hero ocf2-t-mint gv-rise">
            <span className="ocf2-fitback" onClick={(e) => e.stopPropagation()}><BackButton href="/start" /></span>
            {/* Typing the code wakes the house: two letters light one window, four
                the other, and a full code opens the door. */}
            <div className={`ocf2-hero-art${lost ? "" : ` ocf2-codehouse${code.length >= 2 ? " is-w1" : ""}${code.length >= 4 ? " is-w2" : ""}${code.length >= MIN ? " is-ready" : ""}`}`}><PlkHouse style={{ width: "var(--fit-art, 200px)", maxWidth: "100%" }} /></div>
            <h1 className="ocf2-h1">
              {lost ? <><span>Get a code</span><span className="ocf2-h1-2">by email.</span></> : <><span>Open your</span><span><mark>family page</mark></span></>}
            </h1>
            <p className="ocf2-hero-sub">
              {lost === "email" ? "Enter the email your case manager has for you. We will send a 6-digit code." : lost === "code" ? <>If <b style={{ color: "var(--oc-ink)" }}>{email.trim()}</b> is on file, a 6-digit code is on its way. It works for 10 minutes.</> : "Continue with Google, or enter the family code from your case manager."}
            </p>
          </section>

          {ended && (
            <div role="status" className="ocf2-note ocf2-t-butter gv-rise" style={{ "--i": 1 } as React.CSSProperties}>
              It has been a while, so you were signed out. Enter your code to pick up where you left off.
            </div>
          )}

          {!lost && (<>
          <button type="button" className="ocf2-gbtn gv-rise" style={{ "--i": 1 } as React.CSSProperties} onClick={(e) => { e.stopPropagation(); void google(); }} disabled={gBusy}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            {gBusy ? "Opening Google…" : "Continue with Google"}
          </button>
          <div className="ocf2-or gv-rise" style={{ "--i": 2 } as React.CSSProperties}>or use your family code</div>
          <div className="ocf2-code gv-rise" style={{ "--i": 2 } as React.CSSProperties}>
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
              aria-label="Your family code"
            />
            <CodeRail value={code} slots={cells} ready={code.length >= MIN} />
          </div>

          <button type="button" className="ocf2-btn ocf2-btn--primary is-block gv-rise" style={{ "--i": 3, minHeight: 54 } as React.CSSProperties} disabled={code.length < MIN || busy} onClick={() => void submit()}>
            {busy ? "Opening…" : "Open my page"}
          </button>
          </>)}

          {lost === "email" && (
            <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* A phone (WhatsApp) field joins here with the login overhaul. */}
              <div>
                <label htmlFor="fam-email" className="ocf2-label">Email</label>
                <input
                  id="fam-email"
                  ref={emailRef}
                  className="ocf2-input"
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
                />
              </div>
              <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 54 }} disabled={!validEmail(email) || busy} onClick={() => void sendEmailCode()}>
                {busy ? "Sending…" : "Send me a code"}
              </button>
            </div>
          )}

          {lost === "code" && (
            <div onClick={(e) => { e.stopPropagation(); otpRef.current?.focus(); }}>
              <div className="ocf2-code">
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
                <CodeRail value={otp} slots={6} ready={otp.length === 6} />
              </div>
              {busy && <p className="ocf2-meta" style={{ marginTop: 10 }}>Checking…</p>}
              <div style={{ display: "flex", gap: 18, marginTop: 8, flexWrap: "wrap" }}>
                <button type="button" className="ocf2-link" onClick={() => { setOtp(""); void requestFamilyEmailCode(email.trim().toLowerCase()).catch(() => {}); }}>Send a new code</button>
                <button type="button" className="ocf2-link" onClick={() => { setLost("email"); setOtp(""); setErr(null); }}>Use another email</button>
              </div>
            </div>
          )}

          {err && <div className="ocf2-gentle">{err}</div>}
          {notLive && (
            <div className="ocf2-note" style={{ flexDirection: "column" }}>
              <div><b>Your page opens in the browser for now.</b> Sign in there and you are in. The app will open it directly soon.</div>
              <button type="button" className="ocf2-btn ocf2-btn--primary is-block" onClick={() => void openExternal(WEB_LOGIN)}>Open my page</button>
            </div>
          )}

          <div className="gv-rise" style={{ "--i": 4, margin: "-4px 4px 0" } as React.CSSProperties}>
            {lost ? (
              <p className="ocf2-p" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0 8px" }}>
                Found your code? <button type="button" className="ocf2-link" onClick={(e) => { e.stopPropagation(); backToCode(); }}>Use my family code</button>
              </p>
            ) : (
              <p className="ocf2-p" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0 8px" }}>
                <button type="button" className="ocf2-link" onClick={(e) => { e.stopPropagation(); showLost(); }}>Lost your code?</button>
                <span style={{ fontSize: 13.5, color: "var(--oc-mid)" }}>Get one by email, or ask your case manager.</span>
              </p>
            )}
          </div>
          <div className="ocf2-proglogos gv-rise" style={{ "--i": 5 } as React.CSSProperties} aria-label="One code opens your page in any of these programs">
            <img src="/ck-logo.png" alt="Collective Kindness" className="is-tall" />
            <img src="/logos/kdh.png" alt="Kosher Debt Help" />
            <span className="ocf2-nurturelogo"><img src="/logos/nurture.svg" alt="Project Nurture" /><img src="/logos/nurture-bird.webp" alt="" aria-hidden className="bird" /></span>
            <img src="/logos/shluchim-thrive.svg" alt="Shluchim Thrive" className="is-tall" />
          </div>
          <p className="ocf2-safe gv-rise" style={{ "--i": 5, margin: "0 4px" } as React.CSSProperties}>
            <i aria-hidden>✓</i>
            Private to your family. We never share it.
          </p>
          <a className="ocf2-talk gv-rise" style={{ "--i": 6 } as React.CSSProperties} href={coordinatorWa("Hi " + COORDINATOR_NAME + ", I need a hand opening my page in the CK app.")} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            <span className="ocf2-talk-ico" aria-hidden><WhatsappLogo size={19} weight="fill" /></span>
            <span className="ocf2-talk-t"><b>Stuck? WhatsApp {COORDINATOR_NAME}</b><small>A real person, glad to help.</small></span>
          </a>
        </div>
        <PlkHouseStyles />
        <style>{`
          .ocf2-gbtn { display:flex; align-items:center; justify-content:center; gap:11px; width:100%; min-height:54px; border-radius:16px; background:#fff; border:1.5px solid #D9DFD7; font:inherit; font-size:15.5px; font-weight:700; color:var(--oc-ink, #16211C); cursor:pointer; }
          .ocf2-gbtn:active { transform:scale(.98); }
          .ocf2-gbtn:disabled { opacity:.6; }
          .ocf2-or { display:flex; align-items:center; gap:12px; font-size:12.5px; font-weight:700; color:var(--oc-mid, #5B6B62); }
          .ocf2-or::before, .ocf2-or::after { content:""; flex:1; height:1px; background:#E3E8E1; }
          .ocf2-hero-art .plk-house { animation:none; }
          .ocf2-page--door .ocf2-btn:disabled { opacity:.42 !important; }
        `}</style>
      </IonContent>
    </IonPage>
  );
}
