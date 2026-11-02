import { useEffect, useState, type ReactNode } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { CaretRight } from "@phosphor-icons/react";
import { HouseArt, GiftArt, AcademyMark, CalcArt } from "@/components/gv";
import { quoteForToday } from "@/lib/quotes";
import { SESSION_ENDED_KEY, LAST_DOOR_KEY } from "@/lib/auth";
import { GIVE_URL, CHECK_URL, CRM_HOST } from "@/lib/mobileApi";
import { openExternal } from "@/lib/external";

/**
 * The one place to start. A soft green panel with the CK lockup and a
 * home that sketches itself in, then three doors: a family opens their
 * page with the 7-letter code, a donor is pointed to the donor portal on
 * the web, CK Academy opens in the browser, and "Check your monthly number"
 * opens the CRM's public /check in the in-app browser. Below them the one forest
 * button, Donate; at the foot a quiet team sign-in and the day's quote.
 * Nothing red, no badges, nothing urgent.
 */
export function StartPage() {
  const router = useIonRouter();
  const quote = quoteForToday();

  // A 401 brought the person here (lib/auth sets the flag): say so once.
  const [sessionEnded, setSessionEnded] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_ENDED_KEY) === "1") {
        // A-13: a family goes straight back to its code screen, which shows
        // the note on top (it clears the flag there).
        if (localStorage.getItem(LAST_DOOR_KEY) === "family") { router.push("/start/family", "forward", "replace"); return; }
        sessionStorage.removeItem(SESSION_ENDED_KEY);
        setSessionEnded(true);
      }
    } catch { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top) + 12px) 14px calc(24px + env(safe-area-inset-bottom))" }}>
          {/* green panel */}
          <div className="gv-rise" style={{ borderRadius: 26, background: "linear-gradient(160deg,#EEF8C8,#DDF3E6)", padding: "14px 20px 2px", overflow: "hidden" }}>
            <img src="/ck-logo.png" alt="Collective Kindness" style={{ width: 150, height: "auto", display: "block" }} />
            <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 0" }}><HouseArt width={136} /></div>
          </div>

          <div style={{ padding: "14px 6px 0" }}>
            <h1 className="gv-h1 gv-rise" style={{ "--i": 1 } as React.CSSProperties}>Welcome.</h1>
            <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 6 } as React.CSSProperties}>One place to start. Who are you today?</p>
          </div>

          {sessionEnded && (
            <div role="status" className="gv-note gv-rise" style={{ "--i": 2, marginTop: 14 } as React.CSSProperties}>
              It has been a while, so you were signed out. Pick your door below to pick up where you left off.
            </div>
          )}

          {/* the three doors */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            <Door i={3} art={<HouseArt width={64} strokeWidth={6.5} still />} title="I'm a CK family" sub="Open your page with the 7-letter code from your case manager." onClick={() => router.push("/start/family")} />
            <Door i={4} art={<GiftArt width={58} strokeWidth={4.4} />} title="I'm a donor" sub="Your gifts, and what they did" onClick={() => router.push("/start/donor")} />
            <Door i={5} art={<span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--gv-mint, #DDF3E6)", display: "grid", placeItems: "center" }}><AcademyMark size={28} color="var(--gv-mintInk, #1F5E3A)" /></span>} title="CK Academy" sub="Courses on money that lasts, for couples and families." onClick={() => router.push("/start/academy")} />
            <Door i={6} art={<CalcArt width={56} strokeWidth={7} />} title="Check your monthly number" sub="See what comes in, what goes out, and what CK would do next." onClick={openCheck} />
          </div>

          {/* the one forest button */}
          <button className="gv-btn block gv-rise" style={{ "--i": 7, marginTop: 12 } as React.CSSProperties} onClick={() => void openExternal(GIVE_URL)}>
            Donate
          </button>

          {/* quiet team door */}
          <div className="gv-rise" style={{ "--i": 8, display: "flex", justifyContent: "center", marginTop: 2 } as React.CSSProperties}>
            <button
              onClick={() => router.push("/start/team")}
              style={{ background: "none", border: 0, font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--gv-quiet)", padding: "14px 16px", minHeight: 44, cursor: "pointer" }}
            >
              Team sign-in
            </button>
          </div>

          <figure className="gv-rise" style={{ "--i": 9, margin: "auto 6px 0", paddingTop: 8 } as React.CSSProperties}>
            <blockquote style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.4, color: "var(--gv-ink)", textWrap: "balance" } as React.CSSProperties}>&ldquo;{quote.text}&rdquo;</blockquote>
            <figcaption style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--gv-go)", opacity: .85 }}>{quote.source}</figcaption>
          </figure>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** The monthly-number door: log the tap (no PII: event, door, a random
 *  device id), then open /check in the in-app browser. */
function openCheck() {
  try {
    let id = localStorage.getItem("ck-device-id");
    if (!id) {
      const a = new Uint8Array(12); crypto.getRandomValues(a);
      id = Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("ck-device-id", id);
    }
    const body = JSON.stringify({ event: "door_tap", door: "app", step: "start", ms: Math.round(performance.now()), device: id });
    void fetch(`${CRM_HOST}/api/public/check/event`, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body }).catch(() => {});
  } catch { /* never block the door */ }
  void openExternal(CHECK_URL);
}

/** A white card row: line drawing, title 16/800, 13px subline, chevron. */
function Door({ i, art, title, sub, onClick }: { i: number; art: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="gv-card gv-rise" style={{ "--i": i, display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 44, textAlign: "left", border: 0, cursor: "pointer", font: "inherit", padding: "10px 14px 10px 12px" } as React.CSSProperties}>
      <span aria-hidden style={{ width: 64, height: 60, display: "grid", placeItems: "center", flex: "none" }}>{art}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 16, lineHeight: 1.2, fontWeight: 800, letterSpacing: "-.01em", color: "var(--gv-ink)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 13, color: "var(--gv-mid)", marginTop: 3, lineHeight: 1.4 }}>{sub}</span>
      </span>
      <CaretRight size={18} weight="bold" color="var(--gv-quiet)" style={{ flex: "none" }} />
    </button>
  );
}
