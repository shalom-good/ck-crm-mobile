import { useRef, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons } from "@ionic/react";
import { Sparkle, Microphone, ArrowUp, CaretRight, CurrencyDollar, Users, ClockCountdown, Receipt } from "@phosphor-icons/react";
import { useRole } from "@/lib/roles";

interface Msg { id: string; role: "me" | "ai"; text: string }

const SUGGESTIONS = [
  "Who's behind on payments this week?",
  "Summarize the Peterson family",
  "Which of my families haven't been touched in 7 days?",
  "How much did I bill this month?",
];

/** One pastel tile + icon per suggestion, coloured by meaning (late = peach, info = sky/lilac). */
const SUGGESTION_ICONS = [
  { Icon: CurrencyDollar, bg: "var(--oc-peach)", fg: "#6B3A1C" },
  { Icon: Users, bg: "var(--oc-sky)", fg: "#23415F" },
  { Icon: ClockCountdown, bg: "var(--oc-butter)", fg: "#574A0E" },
  { Icon: Receipt, bg: "var(--oc-lilac)", fg: "#4A3566" },
];

/**
 * Ask CK AI, in the ORCHARD look (2026-11-05): greeting with the name on
 * lime, pastel-tiled suggestion cards, white and forest bubbles on the
 * pale ground, a white rounded composer with one forest send. The composer and message list are real; responses are canned for
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
        <IonToolbar className="oct-bar">
          <IonButtons slot="start"><BackButton href="/tabs/home" /></IonButtons>
          <div className="oc-root" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 17, letterSpacing: "-.01em" }}>
            <Sparkle size={18} weight="fill" color="var(--oc-forest)" /> CK AI
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={content} style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <div className="oc-root oct" style={{ padding: "6px 16px 130px" }}>
          {msgs.length === 0 ? (
            <>
              <header className="oct-hero gv-rise" style={{ ["--i" as string]: 0 } as React.CSSProperties}>
                <h1 className="oct-h1">
                  <span>What do you need, <mark>{first}</mark>?</span>
                  <span className="oct-h1-2" style={{ fontSize: 16, letterSpacing: "-.01em", lineHeight: 1.35, marginTop: 6 }}>Families, payments, notes and resources. Ask in your own words.</span>
                </h1>
              </header>
              <div className="oct-head"><h2>Try one</h2></div>
              <div className="oct-ask-list">
                {SUGGESTIONS.map((s, k) => {
                  const ic = SUGGESTION_ICONS[k % SUGGESTION_ICONS.length];
                  return (
                    <button key={s} type="button" className="oct-ask gv-rise" onClick={() => send(s)} style={{ ["--i" as string]: k + 1 } as React.CSSProperties}>
                      <span className="oct-ask-ic" style={{ background: ic.bg, color: ic.fg }}><ic.Icon size={18} weight="bold" /></span>
                      <b>{s}</b>
                      <CaretRight size={14} weight="bold" color="var(--oc-mid)" style={{ flex: "none" }} />
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {msgs.map((m) => <Bubble key={m.id} msg={m} />)}
            </div>
          )}
        </div>
      </IonContent>

      {/* composer: white rounded bar on the ground, ghost mic, forest round send (the one primary) */}
      <div className="oct-composer oct-ask-wrap" style={{ padding: "10px 16px calc(12px + var(--ion-safe-area-bottom, 0px))" }}>
        <div className="oct-input" style={{ alignItems: "center" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask CK AI"
          />
          <button type="button" aria-label="Dictate" onClick={dictate} className="oct-ghost"><Microphone size={22} weight="regular" /></button>
          <button type="button" aria-label="Send" onClick={() => send()} disabled={!canSend} className="oct-send">
            <ArrowUp size={20} weight="bold" />
          </button>
        </div>
      </div>
    </IonPage>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const mine = msg.role === "me";
  return (
    <div className={`oct-bubble-wrap${mine ? " is-mine" : ""}`}>
      <div className={`oct-bubble${mine ? " is-mine" : ""}`} style={{ maxWidth: mine ? "84%" : "88%", userSelect: "text", WebkitUserSelect: "text" }}>
        {!mine && <div className="oct-ai-tag"><Sparkle size={12} weight="fill" /> CK AI</div>}
        <div className="oct-bubble-body" style={{ fontSize: 14, lineHeight: mine ? 1.45 : 1.5 }}>{msg.text}</div>
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

