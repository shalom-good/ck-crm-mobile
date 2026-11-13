import type { CSSProperties } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { SignOut, Cloud, Check } from "@phosphor-icons/react";
import { useAppData } from "@/lib/appData";
import { useRole, ROLE_BY_KEY } from "@/lib/roles";
import { useAuth } from "@/lib/auth";
import { syncedAgo } from "@/lib/time";
import { initialsOf } from "@/components/orchard/Orchard";
import { ToolHero } from "@/components/orchard/tools/ToolsKit";

const APP_VERSION = "0.3.0";

/**
 * Settings, in ORCHARD (2026-11-05). The signed-in user IS the provider
 * now; the "View as" control only appears for admins (user.admin or the
 * owner emails) and re-lenses the caseload (drives ?as= on /families).
 */
export function SettingsPage() {
  const router = useIonRouter();
  const { lastSync } = useAppData();
  const { provider, providers, setProvider, me } = useRole();
  const { user, isAdmin, viewAs, signOut } = useAuth();

  const roleLine = (user?.roles ?? []).join(" · ") || ROLE_BY_KEY[provider.role]?.label || "Team member";

  const doSignOut = async () => {
    await signOut();
    router.push("/start", "root", "replace");
  };

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
        <div className="oc-root oco-page">
          <ToolHero title="Settings." tone={`Hi, ${(me.name || "there").split(/\s+/)[0]}.`} bg="var(--oc-lilac)">
            {/* who you are */}
            <div className="oco-rows" style={{ marginTop: 4 }}>
              <div className="oco-row">
                <span className="oco-av is-round" style={{ background: "var(--oc-forest)", color: "var(--oc-lime)", width: 46, height: 46 }} aria-hidden="true">{initialsOf(me.name)}</span>
                <div className="oco-row-t">
                  <b>{me.name}</b>
                  <span>{me.email}</span>
                  {(roleLine || user?.demo || isAdmin) && (
                    <span className="oco-chips" style={{ marginTop: 3 }}>
                      {roleLine && <span className="oco-chip oco-chip--lilac">{roleLine}</span>}
                      {user?.demo ? <span className="oco-chip oco-chip--butter">Demo</span> : isAdmin ? <span className="oco-chip oco-chip--mint">Admin</span> : null}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </ToolHero>

          {/* View as: admins only. Re-lenses the whole app + ?as= on /families. */}
          {isAdmin && (
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="oco-group">View as</div>
              <div className="oco-rows">
                <ChoiceRow name={me.name} label={`Myself (${me.name})`} role="Your own caseload" accent="#2F7556" on={!viewAs} onPick={() => setProvider(null)} />
                {providers.map((p) => {
                  const r = ROLE_BY_KEY[p.role];
                  return <ChoiceRow key={p.email} name={p.name} role={r.label} accent={r.accent} on={viewAs?.email === p.email} onPick={() => setProvider(p.email)} />;
                })}
              </div>
              {viewAs && (
                <p style={{ margin: "0 4px", fontSize: 12.5, fontWeight: 600, color: "var(--oc-mid)", lineHeight: 1.5 }}>
                  You are viewing the app as {viewAs.name}. Chats stay yours.
                </p>
              )}
            </section>
          )}

          <div className="oco-rows">
            {/* sync state */}
            <div className="oco-row">
              <span className="oco-ico" style={{ background: "var(--oc-sky)", color: "#244A73" }}><Cloud size={19} weight="bold" /></span>
              <div className="oco-row-t"><b>Your data</b><span>{syncedAgo(lastSync).replace(/^synced /i, "Synced ")}</span></div>
              <span className="oco-chip oco-chip--mint">Up to date</span>
            </div>
            <button type="button" className="oco-row" onClick={() => router.push("/app-settings")}>
              <span className="oco-ico" style={{ background: "var(--oc-lilac, #E2DBFA)", color: "#3B2F7A" }}><Check size={19} weight="bold" /></span>
              <div className="oco-row-t"><b>Feedback or an idea</b><span>Goes straight to Shalom</span></div>
            </button>
            {/* sign out: rose, the only red on the screen */}
            <button type="button" className="oco-row" onClick={() => void doSignOut()}>
              <span className="oco-ico" style={{ background: "var(--oc-rose)", color: "#9A3A22" }}><SignOut size={19} weight="bold" /></span>
              <div className="oco-row-t"><b style={{ color: "#9A3A22" }}>Sign out</b></div>
            </button>
          </div>

          <div className="oco-foot">Collective Kindness · v{APP_VERSION}</div>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** One "view as" choice: initials on the role's tint, the role as a chip, a forest tick when picked. */
function ChoiceRow({ name, label, role, accent, on, onPick }: { name: string; label?: string; role: string; accent: string; on: boolean; onPick: () => void }) {
  return (
    <button type="button" className="oco-row" onClick={onPick} aria-pressed={on}>
      <span className="oco-av is-round" style={{ background: `${accent}24`, color: accent, width: 38, height: 38, fontSize: 12.5 }} aria-hidden="true">{initialsOf(name)}</span>
      <div className="oco-row-t">
        <b>{label ?? name}</b>
        <span style={{ marginTop: 1 }}><span className="oco-chip" style={{ background: `${accent}24`, color: accent }}>{role}</span></span>
      </div>
      {on && <span className="oco-tick"><Check size={14} weight="bold" /></span>}
    </button>
  );
}
