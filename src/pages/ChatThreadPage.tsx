import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
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
import { Avatar } from "@/components/Avatar";
import { success, tapLight } from "@/lib/haptics";

/**
 * One family's Experts Chat thread. Bubbles (mine right / terracotta
 * tint, theirs left / white with author + role tag), day separators,
 * ⚠ alert messages with a coral border, a composer with an alert toggle
 * and @mention suggestions, and long-press (or right-click) "Save as
 * note" with a category picker. Polls every 15s while open.
 */

const ROLE_TAG: Record<string, string> = {
  cm: "CM", debt: "Debt", budget: "Budget", oversight: "Oversight", other: "Team",
};

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
  const partNames = participants.map((p) => p.name.split(/\s+/)[0]).slice(0, 4).join(", ");

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
          <IonButtons slot="start"><IonBackButton defaultHref="/tabs/chats" text="" /></IonButtons>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 8px", minWidth: 0 }}>
            <Avatar name={title} size={34} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ck-title)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
              {partNames && <div style={{ fontSize: 11, color: "var(--ck-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{partNames}{participants.length > 4 ? ` +${participants.length - 4}` : ""}</div>}
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div style={{ padding: "8px 14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
          {q.isLoading ? (
            <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}><span className="ck-spin" /></div>
          ) : q.isError ? (
            <div style={{ margin: "24px 8px", padding: 16, borderRadius: 16, background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", fontSize: 13.5, color: "var(--ck-body)", lineHeight: 1.5 }}>
              Could not open this chat. This may be on us. Pull down to retry.
            </div>
          ) : messages.length === 0 ? (
            <div style={{ margin: "24px 8px", padding: 16, borderRadius: 16, background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", fontSize: 13.5, color: "var(--ck-body)", lineHeight: 1.5 }}>
              No messages yet. Say hello. The family's care team is here automatically.
            </div>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
              return (
                <div key={m.id}>
                  {newDay && (
                    <div style={{ display: "flex", justifyContent: "center", margin: "14px 0 8px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--ck-muted)", background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 999, padding: "3px 11px" }}>
                        {dayLabel(m.at)}
                      </span>
                    </div>
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
      <div style={{ background: "var(--ck-bg)", borderTop: "1px solid var(--ck-hairline)", padding: "8px 12px calc(10px + env(safe-area-inset-bottom))" }}>
        {suggestions.length > 0 && (
          <div style={{ display: "flex", gap: 8, paddingBottom: 8, overflowX: "auto" }} className="no-scrollbar">
            {suggestions.map((p) => (
              <button key={p.email} onClick={() => pickMention(p)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px 6px 6px", borderRadius: 999, border: "1px solid var(--ck-hairline)", background: "var(--ck-card)", cursor: "pointer", flexShrink: 0 }}>
                <Avatar name={p.name} size={24} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ck-title)" }}>{p.name}</span>
                {p.role && <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ck-muted)" }}>{ROLE_TAG[p.role] ?? p.role}</span>}
              </button>
            ))}
          </div>
        )}
        {isAlert && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", marginBottom: 8, borderRadius: 10, background: "var(--ck-warn-bg)", color: "var(--ck-warn-fg)", fontSize: 12.5, fontWeight: 600 }}>
            <Warning size={14} weight="fill" /> Sending as an alert. It pins the chat for everyone.
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <button
            aria-label="Toggle alert"
            aria-pressed={isAlert}
            onClick={() => { setIsAlert((v) => !v); void tapLight(); }}
            style={{
              width: 40, height: 40, borderRadius: 999, flexShrink: 0, cursor: "pointer",
              border: `1.5px solid ${isAlert ? "var(--ck-danger)" : "var(--ck-hairline)"}`,
              background: isAlert ? "var(--ck-warn-bg)" : "var(--ck-card)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Warning size={19} weight={isAlert ? "fill" : "regular"} color={isAlert ? "var(--ck-danger)" : "var(--ck-body)"} />
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Message the team. @ to tag."
            rows={1}
            style={{
              flex: 1, minHeight: 40, maxHeight: 110, resize: "none", borderRadius: 18,
              border: "1px solid var(--ck-input-border)", background: "var(--ck-card)",
              color: "var(--ck-title)", fontSize: 14.5, lineHeight: "20px", padding: "9px 14px",
              outline: "none", fontFamily: "inherit",
            }}
            className="ck-input"
          />
          <button
            aria-label="Send"
            onClick={() => void send()}
            disabled={!text.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: 999, flexShrink: 0, border: "none",
              background: text.trim() ? "var(--ck-tint)" : "var(--ck-line-medium)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: text.trim() ? "pointer" : "default",
              boxShadow: text.trim() ? "0 4px 10px rgba(194,83,31,.3)" : "none",
            }}
          >
            <PaperPlaneRight size={19} weight="fill" color="#fff" />
          </button>
        </div>
        <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ck-muted)", textAlign: "center" }}>
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
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginTop: 4 }}>
      <div
        onTouchStart={onPressStart}
        onTouchEnd={onPressEnd}
        onTouchMove={onPressEnd}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onContextMenu={onContext}
        style={{
          maxWidth: "82%",
          background: mine ? "var(--ck-tint-soft)" : "var(--ck-card)",
          border: m.isAlert ? "1.5px solid var(--ck-danger)" : "1px solid var(--ck-hairline)",
          borderRadius: 16,
          borderBottomRightRadius: mine ? 6 : 16,
          borderBottomLeftRadius: mine ? 16 : 6,
          padding: "8px 12px",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {!mine && showAuthor && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ck-tint)" }}>{m.author}</span>
            {roleTag && (
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.04em", color: "var(--ck-muted)", background: "var(--ck-paper)", border: "1px solid var(--ck-hairline)", borderRadius: 999, padding: "1px 7px" }}>
                {roleTag}
              </span>
            )}
          </div>
        )}
        {m.isAlert && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, color: "var(--ck-danger)", fontSize: 11.5, fontWeight: 700 }}>
            <Warning size={13} weight="fill" /> Alert
          </div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ck-title)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {m.body}
        </div>
        {m.attachments.length > 0 && m.attachments.map((a, i) => (
          a?.url ? (
            <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ck-tint)", textDecoration: "none" }}>
              <FileText size={14} weight="bold" /> {a.name || "Attachment"}
            </a>
          ) : null
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, justifyContent: "flex-end" }}>
          {m.noteId && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "var(--ck-success)" }}>
              <NotePencil size={11} weight="bold" /> In notes{m.noteCategory ? ` · ${m.noteCategory}` : ""}
            </span>
          )}
          <span className="tnum" style={{ fontSize: 10.5, color: "var(--ck-muted)" }}>{fmtTime(m.at)}</span>
        </div>
      </div>
    </div>
  );
}
