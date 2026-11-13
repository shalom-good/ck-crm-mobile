import { useState, type CSSProperties } from "react";
import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { Capacitor } from "@capacitor/core";
import { ChatCircleText, Lightbulb, SignOut, Wrench } from "@phosphor-icons/react";
import { BackButton } from "@/components/BackButton";
import { useAuth } from "@/lib/auth";
import { loadDonor, saveDonor } from "@/lib/donorApi";

/**
 * Settings, for every door (Shalom 2026-11-11): who you are signed in as,
 * a place to send feedback or an idea (emailed to Shalom), and sign out.
 * Feedback posts to this app's own /api/feedback; if that cannot send, the
 * person's mail app opens with the note already written, so nothing is lost.
 */
const FEEDBACK_TO = "shalom@collectivekindness.net";
const KINDS = [
  { k: "Idea", icon: <Lightbulb size={18} weight="bold" /> },
  { k: "Something is not working", icon: <Wrench size={18} weight="bold" /> },
  { k: "Feedback", icon: <ChatCircleText size={18} weight="bold" /> },
] as const;
const APP_VERSION = "0.3.0";

export function AppSettingsPage() {
  const router = useIonRouter();
  const { status, kind, user, family, signOut } = useAuth() as ReturnType<typeof useAuth> & { kind?: string; family?: { name?: string | null } | null };
  const donor = loadDonor();
  const door = status === "signedIn" ? (kind === "family" ? "CK family" : kind === "kdh" ? "Kosher Debt Help" : kind === "academy" ? "CK Academy" : "Team") : donor ? "Donor" : "Not signed in";
  const whoName = (status === "signedIn" ? (user?.name || family?.name) : donor?.name) || "";
  const knownEmail = (status === "signedIn" ? user?.email : donor?.email) || "";

  const [what, setWhat] = useState<string>("Idea");
  const [text, setText] = useState("");
  const [reply, setReply] = useState(knownEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<"sent" | "mail" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ok = text.trim().length >= 3;

  const mailto = () => {
    const body = `${text.trim()}\n\n${whoName ? `From: ${whoName} (${door})` : `From: ${door}`}${reply.trim() ? `\nReply to: ${reply.trim()}` : ""}`;
    window.location.href = `mailto:${FEEDBACK_TO}?subject=${encodeURIComponent(`CK app ${what.toLowerCase()}`)}&body=${encodeURIComponent(body)}`;
  };
  const send = async () => {
    if (!ok || busy) return;
    setBusy(true); setErr(null);
    try {
      const host = Capacitor.isNativePlatform() ? "https://ck-crm-mobile.vercel.app" : "";
      const r = await fetch(`${host}/api/feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: what, text: text.trim(), who: whoName, door, reply: reply.trim(), where: document.referrer || "" }) });
      if (r.ok) { setSent("sent"); setText(""); }
      else if (r.status === 400) setErr("Write a few words first.");
      else { mailto(); setSent("mail"); }
    } catch { mailto(); setSent("mail"); }
    finally { setBusy(false); }
  };
  const out = async () => {
    if (status === "signedIn") await signOut(); else saveDonor(null);
    router.push("/start", "root", "replace");
  };

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as CSSProperties}>
        <div className="ocf2 ocf2-page oas">
          <div className="ocf2-top"><BackButton href="/start" /></div>
          <h1 className="ocf2-h1"><span>Settings</span></h1>

          <section className="oas-card">
            <span className="oas-eb">Signed in as</span>
            <b className="oas-who">{whoName || door}</b>
            <span className="oas-sub">{whoName ? door : status === "signedIn" || donor ? "" : "Open a door from the start page to sign in."}</span>
          </section>

          <section className="oas-card oas-fb">
            <span className="oas-eb">Feedback or an idea</span>
            <b className="oas-h">Tell us what would make this better.</b>
            <p className="oas-sub">It goes straight to Shalom at Collective Kindness.</p>
            {sent ? (
              <div className="oas-done" role="status">
                <b>{sent === "sent" ? "Sent. Thank you." : "Your mail app has the note ready."}</b>
                <span>{sent === "sent" ? "We read every one." : "Press send there and it reaches us."}</span>
                <button type="button" className="ocf2-link" onClick={() => setSent(null)}>Write another</button>
              </div>
            ) : (
              <>
                <div className="oas-kinds" role="radiogroup" aria-label="What kind of note">
                  {KINDS.map((x) => (
                    <button key={x.k} type="button" role="radio" aria-checked={what === x.k} className={`oas-kind${what === x.k ? " is-on" : ""}`} onClick={() => setWhat(x.k)}>{x.icon}{x.k}</button>
                  ))}
                </div>
                <label>
                  <span className="ocf2-label">Your note</span>
                  <textarea className="ocf2-input oas-text" rows={5} maxLength={4000} placeholder="What happened, or what you wish it did" value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} />
                </label>
                <label>
                  <span className="ocf2-label">Email, if you want a reply</span>
                  <input className="ocf2-input" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" placeholder="Optional" value={reply} onChange={(e) => setReply(e.target.value)} />
                </label>
                {err && <div role="alert" className="ocf2-gentle">{err}</div>}
                <button type="button" className="ocf2-btn ocf2-btn--primary is-block" style={{ minHeight: 52 }} disabled={!ok || busy} onClick={() => void send()}>{busy ? "Sending…" : "Send"}</button>
              </>
            )}
          </section>

          {(status === "signedIn" || donor) && (
            <button type="button" className="oas-out" onClick={() => void out()}><SignOut size={18} weight="bold" />Sign out</button>
          )}
          <p className="ocf2-meta" style={{ textAlign: "center" }}>Collective Kindness app · version {APP_VERSION}</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
