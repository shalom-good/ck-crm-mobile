import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Redirect, Route, useLocation } from "react-router-dom";
import {
  IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonLabel, setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { House, UsersThree, ChatsCircle, Sparkle, BookOpenText } from "@phosphor-icons/react";

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
import { StartPage } from "@/pages/StartPage";
import { FamilyCodePage } from "@/pages/FamilyCodePage";
import { TeamLoginPage } from "@/pages/TeamLoginPage";
import { FamilyTabs } from "@/pages/family/FamilyTabs";
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

      {/* Grove tab bar: white glass, hairline top, the active icon on a
          soft-lime pill (the CRM's phone bar). Home · Families · [Ask] ·
          Chats · Resources. Payments + Job Funnel are reached from Home. */}
      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/tabs/home">
          <House size={24} weight="regular" /><IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="families" href="/tabs/families">
          <UsersThree size={24} weight="regular" /><IonLabel>Families</IonLabel>
        </IonTabButton>

        {/* Empty center slot — the raised Ask button is portaled to
            ion-app so no tab/page containment can clip it (see below). */}
        <IonTabButton tab="ask" disabled aria-hidden="true" />

        <IonTabButton tab="chats" href="/tabs/chats">
          <ChatsCircle size={24} weight="regular" /><IonLabel>Chats</IonLabel>
        </IonTabButton>
        <IonTabButton tab="resources" href="/tabs/resources">
          <BookOpenText size={24} weight="regular" /><IonLabel>Resources</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>

    {/* Raised forest "Ask" button — portaled to ion-app so it lives
        outside ion-tabs / ion-page containment and floats above the bar. */}
    {onTabRoute && !captureOpen && createPortal(
      <button
        aria-label="Ask CK AI"
        className="ck-fab"
        onClick={() => openCapture("ask")}
        style={{
          position: "fixed", left: "50%", transform: "translateX(-50%)",
          bottom: "calc(env(safe-area-inset-bottom) + 24px)", zIndex: 200,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <span style={{
          width: 56, height: 56, borderRadius: 999,
          background: "var(--gv-go)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 0 5px var(--gv-card), 0 10px 24px -8px rgba(46,81,70,.6)",
        }}>
          <Sparkle size={24} weight="fill" color="var(--gv-lime)" />
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gv-ink)" }}>Ask</span>
      </button>,
      document.querySelector("ion-app") ?? document.body,
    )}
    </>
  );
}

export function App() {
  const { openCapture } = useUI();
  const { status, kind } = useAuth();

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

  // Session restoring — a quiet paper splash, no flash of the start screen.
  if (status === "loading") {
    return (
      <IonApp>
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gv-paper)" }}>
          <span className="ck-spin" />
        </div>
      </IonApp>
    );
  }

  const team = status === "signedIn" && kind === "team";
  const family = status === "signedIn" && kind === "family";
  // Where a signed-in person belongs; signed-out people start at /start.
  const home = team ? "/tabs/home" : family ? "/fam/home" : "/start";

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* doors */}
          <Route exact path="/start" render={() => (status === "signedIn" ? <Redirect to={home} /> : <StartPage />)} />
          <Route exact path="/start/family" render={() => (status === "signedIn" ? <Redirect to={home} /> : <FamilyCodePage />)} />
          <Route exact path="/start/team" render={() => (status === "signedIn" ? <Redirect to={home} /> : <TeamLoginPage />)} />
          <Route exact path="/login"><Redirect to={status === "signedIn" ? home : "/start/team"} /></Route>

          {/* family world */}
          <Route path="/fam" render={() => (family ? <FamilyTabs /> : <Redirect to={home} />)} />
          <Route exact path="/home"><Redirect to={home} /></Route>

          {/* team world */}
          <Route exact path="/family/:id" render={() => (team ? <FamilyDetailPage /> : <Redirect to={home} />)} />
          <Route exact path="/chat/:familyRecId" render={() => (team ? <ChatThreadPage /> : <Redirect to={home} />)} />
          <Route exact path="/job-funnel/:id" render={() => (team ? <JobFunnelDetailPage /> : <Redirect to={home} />)} />
          <Route exact path="/ask" render={() => (team ? <AskPage /> : <Redirect to={home} />)} />
          <Route path="/tabs" render={() => (team ? <TabsShell /> : <Redirect to={home} />)} />

          <Route exact path="/design" component={DesignPage} />
          <Route exact path="/"><Redirect to={home} /></Route>
        </IonRouterOutlet>
      </IonReactRouter>

      {/* App-wide overlays (team only in practice; harmless otherwise) */}
      <AISheet />
      <Toast />
    </IonApp>
  );
}
