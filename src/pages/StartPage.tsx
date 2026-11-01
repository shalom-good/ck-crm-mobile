import { useEffect, useState } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { House, UsersThree, CaretRight } from "@phosphor-icons/react";
import { HouseArt } from "@/components/gv";
import { quoteForToday } from "@/lib/quotes";
import { SESSION_ENDED_KEY } from "@/lib/auth";

/**
 * The one place to start. A soft green panel with the CK lockup and a
 * home that sketches itself in, then two doors: a family opens their page
 * with the 7-letter code; a teammate signs in with their team email.
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
          <div className="gv-rise" style={{ borderRadius: 26, background: "linear-gradient(160deg,#EEF8C8,#DDF3E6)", padding: "20px 20px 6px", overflow: "hidden" }}>
            <img src="/ck-logo.png" alt="Collective Kindness" style={{ width: 150, height: "auto", display: "block" }} />
            <div style={{ display: "flex", justifyContent: "center", margin: "6px 0 0" }}><HouseArt width={200} /></div>
          </div>

          <div style={{ padding: "22px 6px 0" }}>
            <h1 className="gv-h1 gv-rise" style={{ "--i": 1, fontSize: 30 } as React.CSSProperties}>Welcome.</h1>
            <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 6 } as React.CSSProperties}>One place for families and the CK team. Who are you today?</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
            <Door i={3} tint="mint" icon={<House size={22} weight="regular" color="var(--gv-mintInk)" />} title="I'm a family" sub="Open your page with the 7-letter code from your case manager." onClick={() => router.push("/start/family")} />
            <Door i={4} tint="sky" icon={<UsersThree size={22} weight="regular" color="var(--gv-skyInk)" />} title="I'm on the CK team" sub="Sign in with your team email." onClick={() => router.push("/start/team")} />
          </div>

          {sessionEnded && (
            <div role="status" className="gv-note gv-rise" style={{ "--i": 5, marginTop: 12 } as React.CSSProperties}>
              Your session ended. Sign in again to continue.
            </div>
          )}

          <figure className="gv-rise" style={{ "--i": 6, margin: "auto 6px 0", paddingTop: 28 } as React.CSSProperties}>
            <blockquote style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.4, color: "var(--gv-ink)", textWrap: "balance" } as React.CSSProperties}>&ldquo;{quote.text}&rdquo;</blockquote>
            <figcaption style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--gv-go)", opacity: .85 }}>{quote.source}</figcaption>
          </figure>
        </div>
      </IonContent>
    </IonPage>
  );
}

function Door({ i, tint, icon, title, sub, onClick }: { i: number; tint: "mint" | "sky"; icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="gv-card gv-rise" style={{ "--i": i, display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", border: 0, cursor: "pointer", padding: "16px 16px" } as React.CSSProperties}>
      <span className="gv-tile" style={{ width: 44, height: 44, borderRadius: 14, background: `var(--gv-${tint})` }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 16.5, fontWeight: 800, letterSpacing: "-.01em", color: "var(--gv-ink)" }}>{title}</span>
        <span style={{ display: "block", fontSize: 13, color: "var(--gv-mid)", marginTop: 3, lineHeight: 1.4 }}>{sub}</span>
      </span>
      <CaretRight size={18} weight="bold" color="var(--gv-quiet)" />
    </button>
  );
}
