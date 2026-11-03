import { TopBar } from "@/components/TopBar";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import {
  IonPage, IonContent, IonHeader, IonToolbar,
  IonRefresher, IonRefresherContent, useIonActionSheet,
  useIonViewDidEnter, useIonViewWillLeave, type RefresherEventDetail,
} from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Warning, PaperPlaneRight, NotePencil, FileText } from "@phosphor-icons/react";
import {
  fetchChatThread, sendChatMessage, saveMessageAsNote,
  type ChatMessage, type ChatParticipant, type NoteCategory,
} from "@/lib/mobileApi";
import { useAuth } from "@/lib/auth";
import { useUI } from "@/lib/ui";
import { dayLabel } from "@/lib/time";
import { success, tapLight } from "@/lib/haptics";
import { Av, Empty, Pill, type Tint } from "@/components/gv";

/**
 * One family's Experts Chat thread in the Grove look. Bubbles: mine on
 * the right in forest with white text, theirs on the left as a white
 * card with the author's name and a role pill; day separators as quiet
 * eyebrows; alert messages carry a rose left accent. The composer is a
 * white pill with a small alert toggle, @mention suggestions and a round
 * forest send button. Long-press (or right-click) a message to save it
 * to the family record as a note. Polls every 15s while open.
 */

const ROLE_TAG: Record<string, string> = {
  cm: "CM", debt: "Debt", budget: "Budget", oversight: "Oversight", other: "Team",
};
const ROLE_TINT: Record<string, Tint> = { cm: "plum", debt: "sky", budget: "mint" };

const NOTE_CATEGORIES: NoteCategory[] = ["General", "Case", "Budgeting", "Debt"];

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function ChatThreadPage() {
  const { familyRecId } = useParams<{ familyRecId: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useUI();
  const [presentSheet] = useIonActionSheet();
  const contentRef = useRef<HTMLIonContentElement | null>(null);

  const [active, setActive] = useState(true);
  useIonViewDidEnter(() => setActive(true));
  useIonViewWillLeave(() => setActive(false));

  const myEmail = (user?.email || "").toLowerCase();
  const q = useQuery({
    queryKey: ["chat", familyRecId],
    queryFn: () => fetchChatThread(familyRecId, myEmail),
    refetchInterval: active ? 15_000 : false,
    staleTime: 5_000,
  });

  // Composer state
  const [text, setText] = useState("");
  const [isAlert, setIsAlert] = useState(false);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [picked, setPicked] = useState<{ token: string; email: string }[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const seq = useRef(0);

  const thread = q.data;
  const participants = thread?.participants ?? [];

  // Server messages + optimistic sends (dedupe once the server echoes).
  const messages = useMemo(() => {
    const server = thread?.messages ?? [];
    const bodies = new Set(server.filter((m) => m.mine).map((m) => m.body));
    return [...server, ...pending.filter((p) => !bodies.has(p.body))];
  }, [thread?.messages, pending]);

  // Clear confirmed optimistic messages.
  useEffect(() => {
    if (!thread?.messages?.length || !pending.length) return;
    const bodies = new Set(thread.messages.filter((m) => m.mine).map((m) => m.body));
    setPending((p) => p.filter((m) => !bodies.has(m.body)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.messages]);

  // Keep the view pinned to the newest message.
  useEffect(() => {
    const t = setTimeout(() => contentRef.current?.scrollToBottom(220), 80);
    return () => clearTimeout(t);
  }, [messages.length]);

  // ── @mention suggestions ───────────────────────────────────────────
  const mentionMatch = /(^|\s)@([\w'.-]*)$/.exec(text);
  const mentionQuery = mentionMatch ? mentionMatch[2].toLowerCase() : null;
  const suggestions = mentionQuery != null
    ? participants.filter((p) =>
        p.email && p.email !== myEmail &&
        (mentionQuery === "" || p.name.toLowerCase().includes(mentionQuery)))
      .slice(0, 4)
    : [];

  const pickMention = (p: ChatParticipant) => {
    if (!p.email) return;
    const first = p.name.trim().split(/\s+/)[0];
    setText((t) => t.replace(/@([\w'.-]*)$/, `@${first} `));
    setPicked((prev) => [...prev.filter((x) => x.email !== p.email), { token: `@${first.toLowerCase()}`, email: p.email! }]);
    inputRef.current?.focus();
  };

  // ── send ───────────────────────────────────────────────────────────
  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const mentions = picked.filter((m) => body.toLowerCase().includes(m.token)).map((m) => m.email);
    const optimistic: ChatMessage = {
      id: `local-${++seq.current}`,
      author: user?.name || "You",
      email: myEmail,
      role: null,
      mine: true,
      body,
      mentions,
      noteId: null,
      noteCategory: null,
      attachments: [],
      isAlert,
      at: new Date().toISOString(),
    };
    setPending((p) => [...p, optimistic]);
    setText("");
    setIsAlert(false);
    setPicked([]);
    void tapLight();
    try {
      await sendChatMessage(familyRecId, body, { mentions, isAlert });
      await qc.invalidateQueries({ queryKey: ["chat", familyRecId] });
      void qc.invalidateQueries({ queryKey: ["chats"] });
    } catch {
      setPending((p) => p.filter((m) => m.id !== optimistic.id));
      setText(body);
      showToast("Send failed. This may be on us. Try again.");
    } finally {
      setSending(false);
    }
  };

  // ── save as note ───────────────────────────────────────────────────
  const saveAsNote = (m: ChatMessage) => {
    if (m.id.startsWith("local-")) return;
    void tapLight();
    presentSheet({
      header: "Save to the family record as a note",
      buttons: [
        ...NOTE_CATEGORIES.map((c) => ({ text: c, data: c })),
        { text: "Cancel", role: "cancel" },
      ],
      onDidDismiss: async (e) => {
        const category = e.detail?.data as NoteCategory | undefined;
        if (e.detail?.role === "cancel" || !category) return;
        try {
          await saveMessageAsNote(familyRecId, m.id, category);
          await success();
          showToast(`Saved as a ${category} note.`);
          void qc.invalidateQueries({ queryKey: ["chat", familyRecId] });
        } catch {
          showToast("Could not save the note. Try again.");
        }
      },
    });
  };

  // Long-press plumbing (touch) + right-click (web QA).
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPress = (m: ChatMessage) => {
    cancelPress();
    pressTimer.current = setTimeout(() => saveAsNote(m), 480);
  };
  const cancelPress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  const refresh = async (e: CustomEvent<RefresherEventDetail>) => {
    await qc.invalidateQueries({ queryKey: ["chat", familyRecId] });
    e.detail.complete();
  };

  const title = thread?.family?.name || thread?.chat?.title || "Family chat";
  const people = participants.length;
  const canSend = !!text.trim() && !sending;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <TopBar back="/tabs/chats" space="Experts chat" style={{ padding: "0 20px 0 14px" }} />
        </IonToolbar>
        {/* Family strip under the toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 20px 12px", background: "var(--gv-paper)", minWidth: 0 }}>
          <Av name={title} size={44} round tint="mint" className="keep" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="gv-h2" style={{ fontSize: 17, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
            {people > 0 && <div className="gv-meta" style={{ marginTop: 1 }}>{people} {people === 1 ? "person" : "people"}</div>}
          </div>
        </div>
      </IonHeader>

      <IonContent ref={contentRef} style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div style={{ padding: "6px 20px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
          {q.isLoading ? (
            <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}><span className="ck-spin" /></div>
          ) : q.isError ? (
            <div style={{ margin: "20px 2px" }}><Empty>Could not open this chat. This may be on us. Pull down to retry.</Empty></div>
          ) : messages.length === 0 ? (
            <div style={{ margin: "20px 2px" }}><Empty>No messages yet. Say hello. The family's care team is here automatically.</Empty></div>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="gv-eyebrow" style={{ textAlign: "center", margin: "14px 0 8px" }}>{dayLabel(m.at)}</div>
                  )}
                  <Bubble
                    m={m}
                    showAuthor={!m.mine && (!prev || prev.email !== m.email || newDay)}
                    onPressStart={() => startPress(m)}
                    onPressEnd={cancelPress}
                    onContext={(e) => { e.preventDefault(); saveAsNote(m); }}
                  />
                </div>
              );
            })
          )}
        </div>
      </IonContent>

      {/* Composer */}
      <div style={{ background: "var(--gv-paper)", padding: "8px 16px calc(10px + env(safe-area-inset-bottom))" }}>
        {suggestions.length > 0 && (
          <div className="gv-chips no-scrollbar" style={{ paddingBottom: 8 }}>
            {suggestions.map((p) => (
              <button key={p.email} className="gv-chip" onClick={() => pickMention(p)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "0 12px 0 6px" }}>
                <Av name={p.name} size={24} round />
                <span style={{ color: "var(--gv-ink)" }}>{p.name}</span>
                {p.role && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gv-mid)" }}>{ROLE_TAG[p.role] ?? p.role}</span>}
              </button>
            ))}
          </div>
        )}
        {isAlert && (
          <div className="gv-gentle" style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 600 }}>
            <Warning size={14} weight="fill" style={{ flex: "none" }} /> Sending as an alert. It pins the chat for everyone.
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "var(--gv-card)", borderRadius: 24, boxShadow: "inset 0 0 0 1px var(--gv-line)", padding: "4px 4px 4px 8px", minWidth: 0 }}>
          <button
            type="button"
            aria-label="Toggle alert"
            aria-pressed={isAlert}
            onClick={() => { setIsAlert((v) => !v); void tapLight(); }}
            className={`gv-pill${isAlert ? " rose" : ""}`}
            style={{ border: 0, cursor: "pointer", flex: "none", height: 30, padding: "0 11px", marginBottom: 7 }}
          >
            <Warning size={14} weight={isAlert ? "fill" : "bold"} /> Alert
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Message the team. @ to tag."
            rows={1}
            style={{
              flex: 1, minWidth: 0, minHeight: 36, maxHeight: 110, resize: "none",
              border: 0, background: "transparent", outline: "none",
              color: "var(--gv-ink)", fontSize: 15, lineHeight: "20px", padding: "8px 4px",
            }}
          />
          <button
            type="button"
            aria-label="Send"
            onClick={() => void send()}
            disabled={!canSend}
            style={{
              width: 44, height: 44, borderRadius: "50%", flex: "none", border: 0, padding: 0,
              background: canSend ? "var(--gv-go)" : "var(--gv-bar)", color: canSend ? "var(--gv-lime)" : "var(--gv-mid)",
              display: "grid", placeItems: "center", cursor: canSend ? "pointer" : "default",
              transition: "background .15s",
            }}
          >
            <PaperPlaneRight size={17} weight="fill" />
          </button>
        </div>
        <div className="gv-meta" style={{ marginTop: 6, textAlign: "center" }}>
          Hold a message to save it to the family record as a note.
        </div>
      </div>
    </IonPage>
  );
}

function Bubble({ m, showAuthor, onPressStart, onPressEnd, onContext }: {
  m: ChatMessage;
  showAuthor: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
  onContext: (e: React.MouseEvent) => void;
}) {
  const mine = m.mine;
  const roleTag = m.role ? ROLE_TAG[m.role] ?? m.role : null;
  const roleTint: Tint = (m.role && ROLE_TINT[m.role]) || "apricot";
  const accent = mine ? "var(--gv-rose)" : "var(--gv-roseInk)";
  const quiet = mine ? "rgba(255,255,255,.8)" : "var(--gv-mid)";
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginTop: 4, minWidth: 0 }}>
      <div
        onTouchStart={onPressStart}
        onTouchEnd={onPressEnd}
        onTouchMove={onPressEnd}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onContextMenu={onContext}
        style={{
          maxWidth: "84%",
          minWidth: 0,
          background: mine ? "var(--gv-go)" : "var(--gv-card)",
          color: mine ? "#fff" : "var(--gv-ink)",
          boxShadow: m.isAlert && !mine ? "inset 0 0 0 1.5px var(--gv-rose)" : undefined,
          borderRadius: 18,
          borderBottomRightRadius: mine ? 6 : 18,
          borderBottomLeftRadius: mine ? 18 : 6,
          padding: "10px 14px 8px",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {!mine && showAuthor && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gv-ink)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.author}</span>
            {roleTag && <Pill tint={roleTint} sm style={{ flex: "none" }}>{roleTag}</Pill>}
          </div>
        )}
        {m.isAlert && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, color: accent, fontSize: 12, fontWeight: 700 }}>
            <Warning size={13} weight="fill" /> Alert
          </div>
        )}
        <div style={{ fontSize: 14.5, lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {m.body}
        </div>
        {m.attachments.length > 0 && m.attachments.map((a, i) => (
          a?.url ? (
            <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12.5, fontWeight: 700, color: mine ? "#fff" : "var(--gv-go)", textDecoration: mine ? "underline" : "none", maxWidth: "100%" }}>
              <FileText size={14} weight="bold" style={{ flex: "none" }} />
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name || "Attachment"}</span>
            </a>
          ) : null
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, justifyContent: "flex-end" }}>
          {m.noteId && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: mine ? "rgba(255,255,255,.85)" : "var(--gv-up)" }}>
              <NotePencil size={11} weight="bold" /> In notes{m.noteCategory ? ` · ${m.noteCategory}` : ""}
            </span>
          )}
          <span className="tnum" style={{ fontSize: 12, color: quiet }}>{fmtTime(m.at)}</span>
        </div>
      </div>
    </div>
  );
}
