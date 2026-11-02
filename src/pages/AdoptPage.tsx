import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons } from "@ionic/react";
import { useSwipeBack } from "@/lib/swipeBack";
import { BackButton } from "@/components/BackButton";
import { useEffect, useState } from "react";
import { CRM_HOST } from "@/lib/mobileApi";
import { loadDonorSession } from "@/lib/donorSession";

/**
 * Adopt a family, inside the app (Shalom 2026-11-01: "the app should allow
 * it ... but also give a public page as well, so donors can choose"). The
 * page itself lives in the CRM at /adopt and is shown here in an embedded
 * view with the header hidden; it carries its own donor sign-in (email
 * code or Google) and Stripe checkout, and tags the claim as made from the
 * app. One source of truth, so the two surfaces never drift.
 */
export function AdoptPage() {
  const swipe = useSwipeBack("/start/donor");
  // One sign-in: a donor signed in on the donor door is signed in here too.
  // The token rides in the URL hash (never sent to a server); the page keeps it.
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    void loadDonorSession().then((s) => setSrc(`${CRM_HOST}/adopt?embed=1&surface=app${s?.token ? `#ck_token=${encodeURIComponent(s.token)}` : ""}`));
  }, []);
  return (
    <IonPage ref={swipe as React.RefObject<HTMLElement>}>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><BackButton href="/start/donor" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false} style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        {src && <iframe
          title="Adopt a family"
          src={src}
          allow="payment *"
          style={{ border: 0, width: "100%", height: "100%", display: "block", background: "var(--gv-paper)" }}
        />}
      </IonContent>
    </IonPage>
  );
}

export default AdoptPage;
