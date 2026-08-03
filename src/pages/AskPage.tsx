import { useRef, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton } from "@ionic/react";
import { Sparkle, Microphone, ArrowUp } from "@phosphor-icons/react";
import { useRole } from "@/lib/roles";

interface Msg { id: string; role: "me" | "ai"; text: string }

const SUGGESTIONS = [
  "Who's behind on payments this week?",
  "Summarize the Peterson family",
  "Which of my families haven't been touched in 7 days?",
  "How much did I bill this month?",
];

/**
 * Ask CK AI. The composer and message list are real; responses are canned for
 * the scaffold. After Supabase, the send handler streams from an edge function
 * that has read access to the caller's families, payments, and notes.
 */
export function AskPage() {
  const { me } = useRole();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const content = useRef<HTMLIonContentElement>(null);
  const seq = useRef(0);

  const send = (q?: string) => {
    const body = (q ?? text).trim();
    if (!body) return;
    const n = ++seq.current;
    const mine: Msg = { id: `m-${n}`, role: "me", text: body };
    const reply: Msg = { id: `a-${n}`, role: "ai", text: cannedReply(body) };
    setMsgs((prev) => [...prev, mine, reply]);
    setText("");
    setTimeout(() => content.current?.scrollToBottom(300), 80);
  };

  const dictate = () => {
    setText((t) => (t ? t + " " : "") + "Who do I need to call today?");
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
          <IonButtons slot="start"><IonBackButton defaultHref="/tabs/home" text="" /></IonButtons>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 17, color: "var(--ck-title)" }}>
            <Sparkle size={18} weight="fill" color="#C2531F" /> CK AI
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={content} style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <div style={{ padding: "8px 16px 120px" }}>
          {msgs.length === 0 ? (
            <div style={{ paddingTop: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8, marginBottom: 24 }}>
                <span style={{ width: 56, height: 56, borderRadius: 999, background: "linear-gradient(135deg,#C2531F,#C2531F)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkle size={28} weight="fill" color="#fff" />
                </span>
                <h2 style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 700, color: "var(--ck-title)" }}>Ask about anything</h2>
                <p style={{ margin: 0, fontSize: 14, color: "var(--ck-muted)", maxWidth: 260 }}>Your families, payments, notes, and resources. {me.name.split(" ")[0]}, what do you need?</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="shadow-card" style={{ textAlign: "left", cursor: "pointer", backgroundColor: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 14, padding: "14px 16px", fontSize: 14, color: "var(--ck-body)" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {msgs.map((m) => <Bubble key={m.id} msg={m} />)}
            </div>
          )}
        </div>
      </IonContent>

      {/* composer */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 16px calc(10px + env(safe-area-inset-bottom))", backgroundColor: "var(--ck-bg)", borderTop: "1px solid var(--ck-hairline)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, backgroundColor: "var(--ck-card)", border: "1.5px solid var(--ck-input-border)", borderRadius: 24, padding: "6px 6px 6px 16px" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask CK AI…"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16, color: "var(--ck-title)", height: 40 }}
          />
          <button aria-label="Dictate" onClick={dictate} style={iconBtn}><Microphone size={22} weight="regular" color="#C2531F" /></button>
          <button aria-label="Send" onClick={() => send()} disabled={!text.trim()} style={{ width: 40, height: 40, borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: text.trim() ? "#C2531F" : "var(--ck-hairline)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowUp size={20} weight="bold" color="#fff" />
          </button>
        </div>
      </div>
    </IonPage>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const mine = msg.role === "me";
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
      <div
        className={mine ? "" : "shadow-card"}
        style={{
          maxWidth: "82%", padding: "12px 14px", borderRadius: 18, fontSize: 14, lineHeight: "20px",
          backgroundColor: mine ? "#C2531F" : "var(--ck-card)",
          color: mine ? "#fff" : "var(--ck-body)",
          border: mine ? "none" : "1px solid var(--ck-hairline)",
          borderBottomRightRadius: mine ? 6 : 18, borderBottomLeftRadius: mine ? 18 : 6,
        }}
      >
        {msg.text}
      </div>
    </div>
  );
}

function cannedReply(q: string): string {
  const t = q.toLowerCase();
  if (t.includes("behind")) return "2 families are behind: Peterson ($240 over 8 days) and Alexander (1 missed). Want me to draft a check-in text to both?";
  if (t.includes("peterson")) return "Andrew & Rivka Peterson, KDH, Lakewood NJ. Est. debt $84k, $1.2k paid. Behind on 2 payments, no contact in 9 days. Care team: you (CM), Mordy (DE), Leivi (Budget).";
  if (t.includes("touched") || t.includes("haven't")) return "3 of your families haven't been touched in 7+ days: Peterson (9d), McKinney (2d is fine), Watson (3d). Peterson is the one to call first.";
  if (t.includes("bill") || t.includes("month")) return "You've billed $1,060 this month across 5 families. $640 collected, $180 still due, $240 overdue.";
  return "Here's what I found across your families, payments, and notes. (This is a scaffold reply. Once Supabase is wired I'll answer from live data.)";
}

const iconBtn: React.CSSProperties = { width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" };
