import { useRef, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton } from "@ionic/react";
import { Sparkle, Microphone, ArrowUp, CaretRight } from "@phosphor-icons/react";
import { useRole } from "@/lib/roles";
import { Card } from "@/components/gv";

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

  const first = me.name.split(" ")[0];
  const canSend = !!text.trim();

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/tabs/home" text="" /></IonButtons>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 17, color: "var(--gv-ink)", letterSpacing: "-.01em" }}>
            <Sparkle size={18} weight="fill" color="var(--gv-go)" /> CK AI
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={content}>
        <div style={{ padding: "8px 16px 120px" }}>
          {msgs.length === 0 ? (
            <div style={{ paddingTop: 12 }}>
              <h1 className="gv-h1 gv-rise" style={{ fontSize: 24, ["--i" as string]: 0 } as React.CSSProperties}>What do you need, {first}?</h1>
              <p className="gv-sub gv-rise" style={{ marginTop: 6, ["--i" as string]: 1 } as React.CSSProperties}>Your families, payments, notes and resources. Ask in your own words.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
                {SUGGESTIONS.map((s, k) => (
                  <Card key={s} i={k + 2} onClick={() => send(s)} style={{ padding: "13px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "var(--gv-ink)", lineHeight: 1.4 }}>{s}</span>
                    <CaretRight size={14} weight="bold" color="var(--gv-quiet)" style={{ flex: "none" }} />
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {msgs.map((m) => <Bubble key={m.id} msg={m} />)}
            </div>
          )}
        </div>
      </IonContent>

      {/* composer: white pill bar on the paper, ghost mic, forest round send (the one primary) */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 16px calc(12px + env(safe-area-inset-bottom))", background: "var(--gv-paper)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--gv-card)", boxShadow: "inset 0 0 0 1px var(--gv-line)", borderRadius: 999, padding: "6px 6px 6px 16px" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask CK AI…"
            style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontSize: 16, color: "var(--gv-ink)", height: 40 }}
          />
          <button aria-label="Dictate" onClick={dictate} style={ghostIcon}><Microphone size={22} weight="regular" /></button>
          <button aria-label="Send" onClick={() => send()} disabled={!canSend} style={{ width: 40, height: 40, borderRadius: 999, border: 0, cursor: canSend ? "pointer" : "default", background: "var(--gv-go)", opacity: canSend ? 1 : 0.35, display: "grid", placeItems: "center", flex: "none", transition: "opacity .15s" }}>
            <ArrowUp size={20} weight="bold" color="#fff" />
          </button>
        </div>
      </div>
    </IonPage>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const mine = msg.role === "me";
  if (mine) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ maxWidth: "84%", padding: "11px 14px", borderRadius: 18, borderBottomRightRadius: 6, fontSize: 14, lineHeight: 1.45, background: "var(--gv-go)", color: "#fff", overflowWrap: "anywhere" }}>{msg.text}</div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div className="gv-card" style={{ maxWidth: "88%", padding: "11px 14px", borderRadius: 18, borderBottomLeftRadius: 6, fontSize: 14, lineHeight: 1.5, color: "var(--gv-text)", overflowWrap: "anywhere" }}>{msg.text}</div>
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

const ghostIcon: React.CSSProperties = { width: 40, height: 40, display: "grid", placeItems: "center", background: "none", border: 0, cursor: "pointer", color: "var(--gv-mid)", borderRadius: 999, flex: "none", padding: 0 };
