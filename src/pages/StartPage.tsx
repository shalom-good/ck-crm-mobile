import { useEffect, useState, type ReactNode } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { CaretRight } from "@phosphor-icons/react";
import { HouseArt, GiftArt, BookArt } from "@/components/gv";
import { quoteForToday } from "@/lib/quotes";
import { SESSION_ENDED_KEY } from "@/lib/auth";
import { ACADEMY_URL, GIVE_URL } from "@/lib/mobileApi";
import { openExternal } from "@/lib/external";

/**
 * The one place to start. A soft green panel with the CK lockup and a
 * home that sketches itself in, then three doors: a family opens their
 * page with the 7-letter code, a donor is pointed to the donor portal on
 * the web, CK Academy opens in the browser. Below them the one forest
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
        sessionStorage.removeItem(SESSION_ENDED_KEY);
        setSessionEnded(true);
      }
    } catch { /* noop */ }
  }, []);

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top) + 12px) 14px calc(24px + env(safe-area-inset-bottom))" }}>
          {/* green panel */}
          <div className="gv-rise" style={{ borderRadius: 26, background: "linear-gradient(160deg,#EEF8C8,#DDF3E6)", padding: "18px 20px 4px", overflow: "hidden" }}>
            <img src="/ck-logo.png" alt="Collective Kindness" style={{ width: 150, height: "auto", display: "block" }} />
            <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 0" }}><HouseArt width={176} /></div>
          </div>

          <div style={{ padding: "20px 6px 0" }}>
            <h1 className="gv-h1 gv-rise" style={{ "--i": 1 } as React.CSSProperties}>Welcome.</h1>
            <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 6 } as React.CSSProperties}>One place to start. Who are you today?</p>
          </div>

          {/* the three doors */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            <Door i={3} art={<HouseArt width={64} strokeWidth={6.5} still />} title="I'm a CK family" sub="Open your page with the 7-letter code from your case manager." onClick={() => router.push("/start/family")} />
            <Door i={4} art={<GiftArt width={58} strokeWidth={4.4} />} title="I'm a donor" sub="Your gifts, and what they did" onClick={() => router.push("/start/donor")} />
            <Door i={5} art={<BookArt width={58} strokeWidth={4.4} />} title="CK Academy" sub="Eight short episodes on money that lasts." onClick={() => void openExternal(ACADEMY_URL)} />
          </div>

          {/* the one forest button */}
          <button className="gv-btn block gv-rise" style={{ "--i": 6, marginTop: 14 } as React.CSSProperties} onClick={() => void openExternal(GIVE_URL)}>
            Donate
          </button>

          {sessionEnded && (
            <div role="status" className="gv-note gv-rise" style={{ "--i": 7, marginTop: 12 } as React.CSSProperties}>
              Your session ended. Sign in again to continue.
            </div>
          )}

          {/* quiet team door */}
          <div className="gv-rise" style={{ "--i": 7, display: "flex", justifyContent: "center", marginTop: 6 } as React.CSSProperties}>
            <button
              onClick={() => router.push("/start/team")}
              style={{ background: "none", border: 0, font: "inherit", fontSize: 13, fontWeight: 600, color: "var(--gv-quiet)", padding: "14px 16px", minHeight: 44, cursor: "pointer" }}
            >
              Team sign-in
            </button>
          </div>

          <figure className="gv-rise" style={{ "--i": 8, margin: "auto 6px 0", paddingTop: 20 } as React.CSSProperties}>
            <blockquote style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.4, color: "var(--gv-ink)", textWrap: "balance" } as React.CSSProperties}>&ldquo;{quote.text}&rdquo;</blockquote>
            <figcaption style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--gv-go)", opacity: .85 }}>{quote.source}</figcaption>
          </figure>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** A white card row: line drawing, title 16/800, 13px subline, chevron. */
function Door({ i, art, title, sub, onClick }: { i: number; art: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="gv-card gv-rise" style={{ "--i": i, display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 44, textAlign: "left", border: 0, cursor: "pointer", font: "inherit", padding: "12px 14px 12px 12px" } as React.CSSProperties}>
      <span aria-hidden style={{ width: 64, height: 60, display: "grid", placeItems: "center", flex: "none" }}>{art}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 16, lineHeight: 1.2, fontWeight: 800, letterSpacing: "-.01em", color: "var(--gv-ink)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 13, color: "var(--gv-mid)", marginTop: 3, lineHeight: 1.4 }}>{sub}</span>
      </span>
      <CaretRight size={18} weight="bold" color="var(--gv-quiet)" style={{ flex: "none" }} />
    </button>
  );
}
