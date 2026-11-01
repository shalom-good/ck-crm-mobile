import { useState } from "react";
import {
  IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter,
  useIonViewDidEnter, useIonViewWillLeave, type RefresherEventDetail,
} from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretRight, Plus } from "@phosphor-icons/react";
import { fetchChats, type ChatListItem, type StartableChat } from "@/lib/mobileApi";
import { useAuth } from "@/lib/auth";
import { relTime } from "@/lib/time";
import { SkeletonCard } from "@/components/Skeleton";
import { Av, Card, Empty, Eyebrow, Pill, Row } from "@/components/gv";

/**
 * Chats tab — the per-family Family Experts Chat threads, scoped to the
 * signed-in provider. One white card of rows: square initials, family
 * name, the last message on one quiet line, and on the right the time,
 * an unread count (forest pill) and an alert (rose pill). Alert threads
 * pin on top, mirroring the desktop /chats. Polls every 30s while the
 * tab is visible.
 */
export function ChatsPage() {
  const router = useIonRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [active, setActive] = useState(true);

  useIonViewDidEnter(() => setActive(true));
  useIonViewWillLeave(() => setActive(false));

  const q = useQuery({
    queryKey: ["chats", user?.email],
    queryFn: fetchChats,
    refetchInterval: active ? 30_000 : false,
    staleTime: 10_000,
  });

  const chats = q.data?.chats ?? [];
  const startable = q.data?.startable ?? [];
  const unreadTotal = chats.reduce((n, c) => n + c.unread, 0);

  const refresh = async (e: CustomEvent<RefresherEventDetail>) => {
    await qc.invalidateQueries({ queryKey: ["chats"] });
    e.detail.complete();
  };

  const open = (recId: string) => router.push(`/chat/${recId}`);

  const meta = [
    "Family Experts Chats for your families.",
    unreadTotal > 0 ? `${unreadTotal} unread` : null,
  ].filter(Boolean).join(" · ");

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div style={{ padding: "calc(env(safe-area-inset-top) + 14px) 16px 130px" }}>
          <div className="gv-rise" style={{ padding: "0 2px", ...({ "--i": 0 } as React.CSSProperties) }}>
            <h1 className="gv-h1">Chats</h1>
            <p className="gv-meta" style={{ margin: "5px 0 16px" }}>{meta}</p>
          </div>

          {q.isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          ) : q.isError ? (
            <Empty>Could not load chats. This may be on us. Pull down to retry.</Empty>
          ) : chats.length === 0 ? (
            <Empty>
              {startable.length > 0
                ? "No chats yet. Start one below and the family's whole care team joins automatically."
                : "No chats yet. A chat opens for each family you work with."}
            </Empty>
          ) : (
            <Card i={1} style={{ padding: "2px 16px" }}>
              {chats.map((c) => (
                <ChatRow key={c.familyRecId} chat={c} onOpen={() => open(c.familyRecId)} />
              ))}
            </Card>
          )}

          {startable.length > 0 && (
            <>
              <Eyebrow style={{ marginTop: 24 }}>Start a chat</Eyebrow>
              <Card i={2} style={{ padding: "2px 16px" }}>
                {startable.map((s) => (
                  <StartRow key={s.familyRecId} item={s} onOpen={() => open(s.familyRecId)} />
                ))}
              </Card>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

function ChatRow({ chat, onOpen }: { chat: ChatListItem; onOpen: () => void }) {
  const last = chat.lastMessage;
  const preview = last
    ? `${last.author ? `${last.author}: ` : ""}${last.body}`
    : "No messages yet";
  return (
    <Row onClick={onOpen} style={{ padding: "13px 0" }}>
      <Av name={chat.title} size={44} />
      <span className="t">
        <b>{chat.title}</b>
        <span style={{ color: chat.unread ? "var(--gv-text)" : "var(--gv-quiet)", fontWeight: chat.unread ? 600 : 400 }}>{preview}</span>
      </span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flex: "none" }}>
        <span className="gv-meta tnum" style={{ fontSize: 12 }}>{relTime(last?.at)}</span>
        {(chat.unread > 0 || chat.alert) && (
          <span style={{ display: "flex", gap: 4 }}>
            {chat.alert && <Pill tint="rose" sm>Alert</Pill>}
            {chat.unread > 0 && <Pill tint="go" sm><span className="tnum">{chat.unread}</span></Pill>}
          </span>
        )}
      </span>
    </Row>
  );
}

function StartRow({ item, onOpen }: { item: StartableChat; onOpen: () => void }) {
  return (
    <Row onClick={onOpen} style={{ padding: "11px 0" }}>
      <span className="gv-tile" style={{ background: "var(--gv-inset)", color: "var(--gv-go)" }}>
        <Plus size={16} weight="bold" />
      </span>
      <span className="t"><b style={{ fontWeight: 600 }}>{item.name}</b></span>
      <CaretRight size={16} weight="bold" color="var(--gv-quiet)" style={{ flex: "none" }} />
    </Row>
  );
}
