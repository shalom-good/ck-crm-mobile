import { useState } from "react";
import { Redirect, Route, useLocation } from "react-router-dom";
import { IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonLabel } from "@ionic/react";
import { ListChecks, CalendarBlank, ArrowRight } from "@phosphor-icons/react";
import { KdhHomeworkPage } from "./KdhHomeworkPage";
import { KdhSessionsPage } from "./KdhSessionsPage";
import { KdhNextPage, KdhApplyPage } from "./KdhNextPages";
import { KdhPlusPage } from "./KdhPlusPage";
import { AskHelper, AskTab } from "@/components/orchard/AskHelper";

/** A KDH client's world (2026-11-05): this week's homework and every past
 *  session. The expert is one tap away on WhatsApp from both screens. */
export function KdhTabs() {
  // Inside KDH Plus the tab bar is hidden: it is one flow with its own back
  // button, and the three tabs under it were confusing (Leivi 2026-11-11).
  const inPlus = useLocation().pathname.startsWith("/kdh/plus");
  const [ask, setAsk] = useState(false);
  return (
    <>
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/kdh/homework" component={KdhHomeworkPage} />
        <Route exact path="/kdh/session/:id" component={KdhHomeworkPage} />
        <Route exact path="/kdh/sessions" component={KdhSessionsPage} />
        <Route exact path="/kdh/next" component={KdhNextPage} />
        <Route exact path="/kdh/plus" component={KdhPlusPage} />
        {/* The old "Build your budget" page: KDH Plus replaced it (2026-11-11). */}
        <Route exact path="/kdh/next/budget"><Redirect to="/kdh/plus" /></Route>
        <Route exact path="/kdh/next/apply" component={KdhApplyPage} />
        <Route exact path="/kdh"><Redirect to="/kdh/homework" /></Route>
      </IonRouterOutlet>
      <IonTabBar slot="bottom" className={`ocf2-tabbar has-ask${inPlus ? " is-hidden" : ""}`}>
        <IonTabButton tab="homework" href="/kdh/homework"><ListChecks size={24} weight="bold" /><IonLabel>Homework</IonLabel></IonTabButton>
        <IonTabButton tab="next" href="/kdh/next"><ArrowRight size={24} weight="bold" /><IonLabel>What next</IonLabel></IonTabButton>
        <IonTabButton tab="sessions" href="/kdh/sessions"><CalendarBlank size={24} weight="bold" /><IonLabel>Sessions</IonLabel></IonTabButton>
        {/* The empty slot the lime "Ask" button sits on (2026-11-11, see AskTab). */}
        <IonTabButton tab="ask" disabled aria-hidden="true" className="ocf2-ask-slot" />
      </IonTabBar>
    </IonTabs>
    {!ask && <AskTab onOpen={() => setAsk(true)} />}
    <AskHelper door="kdh" open={ask} onClose={() => setAsk(false)} />
    </>
  );
}
