import { useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { useParams } from "react-router";
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons,
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
import { Chip, SquareAv, type ChipTone } from "@/components/orchard/team/TeamKit";

/**
 * One family's Experts Chat thread in the ORCHARD look (2026-11-05).
 * Bubbles on the pale ground: mine on the right in forest with white
 * text, theirs on the left in white with the author's name and a pastel
 * role chip; day separators as small inset pills; alert messages turn
 * rose (theirs) or carry a rose ring (mine). The composer is a white
 * rounded bar with an alert toggle chip, @mention suggestions and a
 * round forest send button. Long-press (or right-click) a message to save it
 * to the family record as a note. Polls every 15s while open.
 */

const ROLE_TAG: Record<string, string> = {
  cm: "CM", debt: "Debt", budget: "Budget", oversight: "Oversight", other: "Team",
};
const ROLE_TONE: Record<string, ChipTone> = { cm: "lilac", debt: "sky", budget: "mint" };

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
        <IonToolbar className="oct-bar">
          <IonButtons slot="start"><BackButton href="/tabs/chats" /></IonButtons>
          <span className="oct-bar-label">Experts chat</span>
        </IonToolbar>
        {/* Family strip under the toolbar */}
        <div className="oct-fam">
          <SquareAv name={title} />
          <div className="oct-fam-t">
            <b>{title}</b>
            {people > 0 && <span>{people} {people === 1 ? "person" : "people"} in this chat</span>}
          </div>
        </div>
      </IonHeader>

      <IonContent ref={contentRef} style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div className="oc-root" style={{ padding: "4px 14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
          {q.isLoading ? (
            <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}><span className="ck-spin" /></div>
          ) : q.isError ? (
            <div className="oct-empty" style={{ margin: "20px 2px" }}>Could not open this chat. This may be on us. Pull down to retry.</div>
          ) : messages.length === 0 ? (
            <div className="oct-empty" style={{ margin: "20px 2px" }}>No messages yet. Say hello. The family's care team is here automatically.</div>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column" }}>
                  {newDay && <div className="oct-day">{dayLabel(m.at)}</div>}
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
      <div className="oct-composer">
        {suggestions.length > 0 && (
          <div className="oct-mentions">
            {suggestions.map((p) => (
              <button key={p.email} type="button" className="oct-mention" onClick={() => pickMention(p)}>
                <SquareAv name={p.name} sm />
                <span>{p.name}</span>
                {p.role && <small>{ROLE_TAG[p.role] ?? p.role}</small>}
              </button>
            ))}
          </div>
        )}
        {isAlert && (
          <div className="oct-alert-note">
            <Warning size={14} weight="fill" style={{ flex: "none" }} /> Sending as an alert. It pins the chat for everyone.
          </div>
        )}
        <div className="oct-input">
          <button
            type="button"
            aria-label="Toggle alert"
            aria-pressed={isAlert}
            onClick={() => { setIsAlert((v) => !v); void tapLight(); }}
            className="oct-alert-toggle"
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
          />
          <button type="button" aria-label="Send" className="oct-send" onClick={() => void send()} disabled={!canSend}>
            <PaperPlaneRight size={17} weight="fill" />
          </button>
        </div>
        <div className="oct-hint">Hold a message to save it to the family record as a note.</div>
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
  const roleTone: ChipTone = (m.role && ROLE_TONE[m.role]) || "butter";
  return (
    <div className={`oct-bubble-wrap${mine ? " is-mine" : ""}`}>
      <div
        className={`oct-bubble${mine ? " is-mine" : ""}${m.isAlert ? " is-alert" : ""}`}
        onTouchStart={onPressStart}
        onTouchEnd={onPressEnd}
        onTouchMove={onPressEnd}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onContextMenu={onContext}
      >
        {!mine && showAuthor && (
          <div className="oct-bubble-who">
            <b>{m.author}</b>
            {roleTag && <Chip tone={roleTone}>{roleTag}</Chip>}
          </div>
        )}
        {m.isAlert && (
          <div className="oct-bubble-alert"><Warning size={13} weight="fill" /> Alert</div>
        )}
        <div className="oct-bubble-body">{m.body}</div>
        {m.attachments.length > 0 && m.attachments.map((a, i) => (
          a?.url ? (
            <a key={i} href={a.url} target="_blank" rel="noreferrer" className="oct-bubble-file">
              <FileText size={14} weight="bold" style={{ flex: "none" }} />
              <span>{a.name || "Attachment"}</span>
            </a>
          ) : null
        ))}
        <div className="oct-bubble-meta">
          {m.noteId && (
            <span className="oct-noted">
              <NotePencil size={11} weight="bold" /> In notes{m.noteCategory ? ` · ${m.noteCategory}` : ""}
            </span>
          )}
          <time>{fmtTime(m.at)}</time>
        </div>
      </div>
    </div>
  );
}
