import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton } from "@ionic/react";
import { CRM_HOST } from "@/lib/mobileApi";

/**
 * Adopt a family, inside the app (Shalom 2026-11-01: "the app should allow
 * it ... but also give a public page as well, so donors can choose"). The
 * page itself lives in the CRM at /adopt and is shown here in an embedded
 * view with the header hidden; it carries its own donor sign-in (email
 * code or Google) and Stripe checkout, and tags the claim as made from the
 * app. One source of truth, so the two surfaces never drift.
 */
export function AdoptPage() {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/start/donor" text="" /></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false} style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <iframe
          title="Adopt a family"
          src={`${CRM_HOST}/adopt?embed=1&surface=app`}
          allow="payment *"
          style={{ border: 0, width: "100%", height: "100%", display: "block", background: "var(--gv-paper)" }}
        />
      </IonContent>
    </IonPage>
  );
}

export default AdoptPage;
