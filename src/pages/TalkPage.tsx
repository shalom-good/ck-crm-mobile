import { useLayoutEffect, useRef, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons } from "@ionic/react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { BackButton } from "@/components/BackButton";
import { openExternal } from "@/lib/external";
import { KDH_TALK_URL } from "@/lib/kdhApplyApi";

/* Google lays its booking page out 520px wide and no narrower (a phone
   browser shrinks the whole page to fit). The frame does the same: it is
   520px wide inside and scaled down to the width the screen gives it, so
   nothing is cut off at the right edge. */
const CALENDAR_WIDTH = 520;

/* "Talk to a person": Julie's booking calendar, inside the app. The same
   free 10-minute call kosherdebthelp.com/free-consultation offers, shown
   in a frame so nobody leaves the app to book it. The link underneath
   opens the same calendar in the browser if the frame will not load. */
export function TalkPage() {
  const [loaded, setLoaded] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ k: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth; const h = el.clientHeight;
      if (!w || !h) return;
      const k = Math.min(1, w / CALENDAR_WIDTH);
      setFit((p) => (p && Math.abs(p.k - k) < 0.001 && Math.abs(p.h - h) < 1 ? p : { k, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
          <IonButtons slot="start"><BackButton /></IonButtons>
          <span className="ocf2-kicker" style={{ paddingLeft: 4, color: "var(--oc-mid)", opacity: 1 }}>Kosher Debt Help</span>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="ocf2 ocf2-page--door ocf2-talk">
          <div style={{ padding: "2px 4px 0" }}>
            <h1 className="ocf2-title" style={{ fontSize: 27 }}>Talk to a person</h1>
            <p className="ocf2-sub" style={{ marginTop: 4 }}>Book a free 10-minute call with Julie. Ask anything, big or small.</p>
          </div>
          <div ref={box} className={`ocf2-talk-frame${loaded ? " is-ready" : ""}`}>
            {!loaded && <span className="ck-spin" aria-label="Loading the calendar" />}
            {fit && (
              <iframe
                src={KDH_TALK_URL}
                title="Book a call with Julie"
                loading="eager"
                onLoad={() => setLoaded(true)}
                style={{ width: fit.k < 1 ? CALENDAR_WIDTH : "100%", height: Math.ceil(fit.h / fit.k), transform: fit.k < 1 ? `scale(${fit.k})` : undefined }}
              />
            )}
          </div>
          <button type="button" className="ocf2-link" style={{ alignSelf: "center" }} onClick={() => void openExternal(KDH_TALK_URL)}>
            <ArrowSquareOut size={17} weight="bold" aria-hidden /> Open the calendar in your browser
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}
