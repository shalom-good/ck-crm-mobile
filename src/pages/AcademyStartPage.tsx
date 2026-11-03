import { IonPage, IonContent, IonHeader, IonToolbar } from "@ionic/react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { BookArt, AcademyMark } from "@/components/gv";
import { TopBar } from "@/components/TopBar";
import { useSwipeBack } from "@/lib/swipeBack";
import { ACADEMY_URL } from "@/lib/mobileApi";
import { openExternal } from "@/lib/external";

/**
 * The CK Academy door: one opening page, then the Academy opens inside the
 * app (Capacitor's in-app browser on a phone). A native student sign-in
 * with course progress is the later phase of the brief.
 */
export function AcademyStartPage() {
  const swipe = useSwipeBack("/start");
  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <TopBar back="/start" space="Academy" style={{ padding: "0 20px 0 14px" }} />
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "0 20px calc(28px + env(safe-area-inset-bottom))" }}>
          <div className="ck-art sky gv-rise" style={{ position: "relative", padding: "18px 16px 6px", marginTop: 6 }}>
            <BookArt width={168} />
            <span aria-hidden style={{ position: "absolute", top: 14, right: 14, width: 44, height: 44, borderRadius: 14, background: "#fff", display: "grid", placeItems: "center" }}>
              <AcademyMark size={24} color="var(--gv-skyInk, #33415F)" />
            </span>
          </div>

          <p className="gv-eyebrow gv-rise" style={{ "--i": 1, marginTop: 22, color: "var(--gv-skyInk)" } as React.CSSProperties}>CK Academy</p>
          <h1 className="gv-h1 gv-rise" style={{ "--i": 1, marginTop: 6 } as React.CSSProperties}>Money that lasts.</h1>
          <p className="gv-sub gv-rise" style={{ "--i": 2, marginTop: 8 } as React.CSSProperties}>
            Short, honest courses for couples and families. Start with Newlyweds Financial Mastery: eight lessons, worksheets you keep, and real people at the end of it.
          </p>

          <div className="gv-rise" style={{ "--i": 3, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 18 } as React.CSSProperties}>
            {[["8", "lessons"], ["1", "workbook"], ["∞", "at your pace"]].map(([n, l]) => (
              <span key={l} style={{ background: "var(--gv-card)", color: "var(--gv-ink)", borderRadius: 16, padding: "14px 8px", textAlign: "center", minHeight: 44 }}>
                <b style={{ display: "block", fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1 }}>{n}</b>
                <small style={{ display: "block", fontSize: 12, fontWeight: 500, marginTop: 4, color: "var(--gv-mid)" }}>{l}</small>
              </span>
            ))}
          </div>

          <button className="gv-btn block gv-rise" style={{ "--i": 4, marginTop: 22 } as React.CSSProperties} onClick={() => void openExternal(ACADEMY_URL)}>
            Open CK Academy <ArrowSquareOut size={16} />
          </button>

          <p className="gv-rise" style={{ "--i": 5, margin: "14px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--gv-mid)", textAlign: "center" } as React.CSSProperties}>
            It opens inside the app. Students sign in there for now. Your progress in this app comes next.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
