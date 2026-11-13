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
import { Chip, SquareAv } from "@/components/orchard/team/TeamKit";

/**
 * Chats tab, in ORCHARD (2026-11-05): the per-family Family Experts Chat
 * threads, scoped to the signed-in provider. One white card of rows:
 * square pastel initials, family name, the last message on one quiet
 * line, and on the right the time, an unread count (forest chip with a
 * lime number) and an alert (rose chip). Alert threads pin on top,
 * mirroring the desktop /chats. Polls every 30s while the tab is visible.
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

  const alerts = chats.filter((c) => c.alert).length;
  const meta = q.isLoading
    ? "Loading your chats"
    : chats.length === 0
      ? "One chat per family you work with."
      : `${chats.length} ${chats.length === 1 ? "family chat" : "family chats"}`;

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div className="oc-root oct" style={{ padding: "calc(var(--ion-safe-area-top, 0px) + 14px) 16px 130px" }}>
          <div className="oct-title-row gv-rise" style={{ ...({ "--i": 0 } as React.CSSProperties) }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <h1 className="oc-title">Chats</h1>
              <span className="oc-sub">{meta}</span>
            </div>
            {(unreadTotal > 0 || alerts > 0) && (
              <span className="oct-chips" style={{ paddingBottom: 3 }}>
                {alerts > 0 && <Chip tone="rose">{alerts} {alerts === 1 ? "alert" : "alerts"}</Chip>}
                {unreadTotal > 0 && <Chip tone="go">{unreadTotal} unread</Chip>}
              </span>
            )}
          </div>

          {q.isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          ) : q.isError ? (
            <div className="oct-empty">Could not load chats. This may be on us. Pull down to retry.</div>
          ) : chats.length === 0 ? (
            <div className="oct-empty">
              {startable.length > 0
                ? "No chats yet. Start one below and the family's whole care team joins automatically."
                : "No chats yet. A chat opens for each family you work with."}
            </div>
          ) : (
            <div className="oct-card gv-rise" style={{ "--i": 1 } as React.CSSProperties}>
              {chats.map((c) => (
                <ChatRow key={c.familyRecId} chat={c} onOpen={() => open(c.familyRecId)} />
              ))}
            </div>
          )}

          {startable.length > 0 && (
            <>
              <div className="oct-head"><h2>Start a chat</h2><small>{startable.length}</small></div>
              <div className="oct-card gv-rise" style={{ "--i": 2 } as React.CSSProperties}>
                {startable.map((s) => (
                  <StartRow key={s.familyRecId} item={s} onOpen={() => open(s.familyRecId)} />
                ))}
              </div>
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
    <button type="button" className="oct-row" onClick={onOpen} style={{ padding: "13px 0" }}>
      <SquareAv name={chat.title} />
      <span className="oct-row-t">
        <b>{chat.title}</b>
        <span className={chat.unread ? "is-unread" : undefined}>{preview}</span>
      </span>
      <span className="oct-row-end">
        <time>{relTime(last?.at)}</time>
        {(chat.unread > 0 || chat.alert) && (
          <span className="oct-chips">
            {chat.alert && <Chip tone="rose">Alert</Chip>}
            {chat.unread > 0 && <Chip tone="go">{chat.unread}</Chip>}
          </span>
        )}
      </span>
    </button>
  );
}

function StartRow({ item, onOpen }: { item: StartableChat; onOpen: () => void }) {
  return (
    <button type="button" className="oct-row" onClick={onOpen} style={{ padding: "11px 0" }}>
      <span className="oct-av oct-av--plus" aria-hidden="true"><Plus size={16} weight="bold" /></span>
      <span className="oct-row-t"><b style={{ fontWeight: 700 }}>{item.name}</b></span>
      <CaretRight size={16} weight="bold" color="var(--oc-mid)" style={{ flex: "none" }} aria-hidden />
    </button>
  );
}
