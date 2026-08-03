import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Redirect, Route, useLocation } from "react-router-dom";
import {
  IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonLabel, setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { House, UsersThree, ChatsCircle, ChatCircleText, BookOpenText } from "@phosphor-icons/react";

import { HomePage } from "@/pages/HomePage";
import { FamiliesPage } from "@/pages/FamiliesPage";
import { FamilyDetailPage } from "@/pages/FamilyDetailPage";
import { JobFunnelPage } from "@/pages/JobFunnelPage";
import { JobFunnelDetailPage } from "@/pages/JobFunnelDetailPage";
import { PaymentsPage } from "@/pages/PaymentsPage";
import { ResourcesPage } from "@/pages/ResourcesPage";
import { AskPage } from "@/pages/AskPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { DesignPage } from "@/pages/DesignPage";
import { LoginPage } from "@/pages/LoginPage";
import { ChatsPage } from "@/pages/ChatsPage";
import { ChatThreadPage } from "@/pages/ChatThreadPage";
import { AISheet } from "@/components/AISheet";
import { Toast } from "@/components/Toast";
import { useUI } from "@/lib/ui";
import { useAuth } from "@/lib/auth";

setupIonicReact({ mode: "ios" });

function TabsShell() {
  const { openCapture, captureOpen } = useUI();
  // Ionic keeps this shell mounted (hidden) under pushed detail pages;
  // since the FAB portals to ion-app it would stay visible there — only
  // render it while a tab route is actually showing.
  const location = useLocation();
  const onTabRoute = location.pathname.startsWith("/tabs");
  return (
    <>
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/tabs/home" component={HomePage} />
        <Route exact path="/tabs/families" component={FamiliesPage} />
        <Route exact path="/tabs/chats" component={ChatsPage} />
        <Route exact path="/tabs/job-funnel" component={JobFunnelPage} />
        <Route exact path="/tabs/payments" component={PaymentsPage} />
        <Route exact path="/tabs/resources" component={ResourcesPage} />
        <Route exact path="/tabs/settings" component={SettingsPage} />
        <Route exact path="/tabs"><Redirect to="/tabs/home" /></Route>
      </IonRouterOutlet>

      {/* Warm-Brisk tab bar: Home · Families · [raised Ask] · Chats ·
          Resources. Payments + Job Funnel left the bar (still routable —
          Home links to them). */}
      <IonTabBar slot="bottom" style={{ "--background": "var(--ck-card)", "--border": "0px", height: "calc(64px + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)", borderTopLeftRadius: "26px", borderTopRightRadius: "26px", borderTop: "1px solid var(--ck-hairline)", boxShadow: "0 -10px 28px rgba(35,43,54,0.06)" } as Record<string, string>}>
        <IonTabButton tab="home" href="/tabs/home">
          <House size={24} weight="regular" /><IonLabel style={{ fontSize: 11, fontWeight: 600 }}>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="families" href="/tabs/families">
          <UsersThree size={24} weight="regular" /><IonLabel style={{ fontSize: 11, fontWeight: 600 }}>Families</IonLabel>
        </IonTabButton>

        {/* Empty center slot — the raised Ask button is portaled to
            ion-app so no tab/page containment can clip it (see below). */}
        <IonTabButton tab="ask" disabled aria-hidden="true" />

        <IonTabButton tab="chats" href="/tabs/chats">
          <ChatsCircle size={24} weight="regular" /><IonLabel style={{ fontSize: 11, fontWeight: 600 }}>Chats</IonLabel>
        </IonTabButton>
        <IonTabButton tab="resources" href="/tabs/resources">
          <BookOpenText size={24} weight="regular" /><IonLabel style={{ fontSize: 11, fontWeight: 600 }}>Resources</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>

    {/* Raised terracotta "Ask" button — portaled to ion-app so it lives
        outside ion-tabs / ion-page containment and floats above the bar. */}
    {onTabRoute && !captureOpen && createPortal(
      <button
        aria-label="Ask CK AI"
        className="ck-fab"
        onClick={() => openCapture("ask")}
        style={{
          position: "fixed", left: "50%", transform: "translateX(-50%)",
          bottom: "calc(env(safe-area-inset-bottom) + 26px)", zIndex: 200,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <span style={{
          width: 56, height: 56, borderRadius: 999,
          background: "var(--ck-tint)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 0 5px var(--ck-card), 0 8px 18px rgba(194,83,31,.38)",
        }}>
          <ChatCircleText size={26} weight="regular" color="#fff" />
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ck-tint)" }}>Ask</span>
      </button>,
      document.querySelector("ion-app") ?? document.body,
    )}
    </>
  );
}

export function App() {
  const { openCapture } = useUI();
  const { status } = useAuth();

  // Deep link: ckcrm://add (or #add) opens the capture sheet from anywhere.
  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#add") openCapture("add");
      else if (window.location.hash === "#ai") openCapture("ask");
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [openCapture]);

  // Session restoring — a quiet paper splash, no flash of the login form.
  if (status === "loading") {
    return (
      <IonApp>
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ck-bg)" }}>
          <span className="ck-spin" />
        </div>
      </IonApp>
    );
  }

  const authed = status === "signedIn";

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/login" render={() => (authed ? <Redirect to="/tabs/home" /> : <LoginPage />)} />
          <Route exact path="/family/:id" render={() => (authed ? <FamilyDetailPage /> : <Redirect to="/login" />)} />
          <Route exact path="/chat/:familyRecId" render={() => (authed ? <ChatThreadPage /> : <Redirect to="/login" />)} />
          <Route exact path="/job-funnel/:id" render={() => (authed ? <JobFunnelDetailPage /> : <Redirect to="/login" />)} />
          <Route exact path="/ask" render={() => (authed ? <AskPage /> : <Redirect to="/login" />)} />
          <Route exact path="/design" component={DesignPage} />
          <Route path="/tabs" render={() => (authed ? <TabsShell /> : <Redirect to="/login" />)} />
          <Route exact path="/"><Redirect to={authed ? "/tabs/home" : "/login"} /></Route>
        </IonRouterOutlet>
      </IonReactRouter>

      {/* App-wide overlays */}
      <AISheet />
      <Toast />
    </IonApp>
  );
}
