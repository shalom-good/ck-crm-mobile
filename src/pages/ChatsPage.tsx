import { useState } from "react";
import {
  IonPage, IonContent, IonRefresher, IonRefresherContent, useIonRouter,
  useIonViewDidEnter, useIonViewWillLeave, type RefresherEventDetail,
} from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Warning, CaretRight, Plus } from "@phosphor-icons/react";
import { fetchChats, type ChatListItem, type StartableChat } from "@/lib/mobileApi";
import { useAuth } from "@/lib/auth";
import { relTime } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { SkeletonCard } from "@/components/Skeleton";

/**
 * Chats tab — the per-family Family Experts Chat threads, scoped to the
 * signed-in provider. Alert threads (a ⚠ message) pin on top with a
 * coral tint, mirroring the desktop /chats behavior. Polls every 30s
 * while the tab is visible.
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

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--ck-bg)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>

        <div style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)", padding: "calc(env(safe-area-inset-top) + 14px) 16px 130px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px" }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--ck-title)" }}>Chats</h1>
            {unreadTotal > 0 && (
              <span className="tnum" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ck-tint)" }}>{unreadTotal} unread</span>
            )}
          </div>
          <p style={{ margin: "3px 2px 16px", fontSize: 12.5, color: "var(--ck-body)" }}>Family Experts Chats for your families.</p>

          {q.isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          ) : q.isError ? (
            <Card>
              <div style={{ padding: 16, fontSize: 13.5, color: "var(--ck-body)", lineHeight: 1.5 }}>
                Could not load chats. This may be on us. Pull down to retry.
              </div>
            </Card>
          ) : chats.length === 0 ? (
            <Card>
              <div style={{ padding: 16, fontSize: 13.5, color: "var(--ck-body)", lineHeight: 1.5 }}>
                No chats yet. Start one below and the family's whole care team joins automatically.
              </div>
            </Card>
          ) : (
            <Card>
              {chats.map((c, i) => (
                <ChatRow key={c.familyRecId} chat={c} first={i === 0} onOpen={() => open(c.familyRecId)} />
              ))}
            </Card>
          )}

          {startable.length > 0 && (
            <>
              <SectionLabel style={{ marginTop: 22 }}>START A CHAT</SectionLabel>
              <Card>
                {startable.map((s, i) => (
                  <StartRow key={s.familyRecId} item={s} first={i === 0} onOpen={() => open(s.familyRecId)} />
                ))}
              </Card>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

function ChatRow({ chat, first, onOpen }: { chat: ChatListItem; first: boolean; onOpen: () => void }) {
  const last = chat.lastMessage;
  return (
    <button
      onClick={onOpen}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px",
        background: chat.alert ? "rgba(180,53,31,0.05)" : "none",
        border: "none", borderTop: first ? "none" : "1px solid var(--ck-hairline)",
        cursor: "pointer", textAlign: "left",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar name={chat.title} size={44} />
        {chat.alert && (
          <span style={{ position: "absolute", top: -4, right: -4, width: 20, height: 20, borderRadius: 999, background: "var(--ck-warn-bg)", border: "2px solid var(--ck-card)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Warning size={11} weight="fill" color="var(--ck-danger)" />
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: chat.unread ? 700 : 600, color: "var(--ck-title)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {chat.title}
          </span>
          <span className="tnum" style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: chat.unread ? "var(--ck-tint)" : "var(--ck-muted)" }}>
            {relTime(last?.at)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: chat.unread ? "var(--ck-title)" : "var(--ck-body)", fontWeight: chat.unread ? 550 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {last ? <>{last.author ? <b style={{ fontWeight: 600 }}>{last.author}: </b> : null}{last.body}</> : "No messages yet"}
          </span>
          {chat.unread > 0 && (
            <span className="tnum" style={{ flexShrink: 0, minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "var(--ck-tint)", color: "#fff", fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function StartRow({ item, first, onOpen }: { item: StartableChat; first: boolean; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "none", border: "none", borderTop: first ? "none" : "1px solid var(--ck-hairline)", cursor: "pointer", textAlign: "left" }}
    >
      <span style={{ width: 36, height: 36, borderRadius: 999, background: "var(--ck-tint-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Plus size={16} weight="bold" color="var(--ck-tint)" />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--ck-title)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
      <CaretRight size={16} weight="bold" color="var(--ck-muted)" style={{ opacity: 0.6, flexShrink: 0 }} />
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="shadow-card" style={{ background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 20, overflow: "hidden" }}>{children}</div>;
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.09em", color: "var(--ck-label)", margin: "0 2px 10px", ...style }}>{children}</div>;
}
