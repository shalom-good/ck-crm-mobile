import { IonPage, IonContent, useIonRouter } from "@ionic/react";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock } from "@phosphor-icons/react";
import { LESSONS, lessonImage } from "@/lib/lessons";
import { fetchAcademyProgress } from "@/lib/portalApi";
import { Card, CountUp, Pill, Row, Track } from "@/components/gv";

/** CK Academy — the eight-episode course, with progress from the portal. */
export function FamilyLearnPage() {
  const router = useIonRouter();
  const q = useQuery({ queryKey: ["academy"], queryFn: fetchAcademyProgress, staleTime: 30_000, retry: 1 });
  const watched = q.data?.watched ?? [];
  const nextUp = LESSONS.find((l) => !watched.includes(l.id)) ?? null;

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 14px) 16px 120px" }}>
          <h1 className="gv-h1 gv-rise">CK Academy</h1>
          <p className="gv-sub gv-rise" style={{ "--i": 1, marginTop: 6 } as React.CSSProperties}>Eight short episodes on money that lasts. Watch in any order; about an hour all together.</p>

          <Card i={2} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gv-ink)" }}><CountUp to={watched.length} /> of {LESSONS.length} watched</span>
              {q.data?.allDone ? <Pill tint="mint">Finished</Pill> : nextUp ? <Pill tint="lime">Next: {nextUp.roman}</Pill> : null}
            </div>
            <Track total={LESSONS.length} done={watched.length} current={watched.length < LESSONS.length ? watched.length : undefined} />
          </Card>

          <Card i={3} style={{ marginTop: 12, padding: "4px 16px" }}>
            {LESSONS.map((l) => {
              const done = watched.includes(l.id);
              const next = nextUp?.id === l.id;
              return (
                <Row key={l.id} onClick={() => router.push(`/fam/learn/${l.id}`)}>
                  <img src={lessonImage(l)} alt="" width={56} height={42} style={{ width: 56, height: 42, borderRadius: 10, objectFit: "cover", flex: "none", background: "var(--gv-inset)" }} loading="lazy" />
                  <span className="t">
                    <b style={{ fontWeight: done ? 600 : 700, color: done ? "var(--gv-mid)" : "var(--gv-ink)" }}><span style={{ color: "var(--gv-quiet)", marginRight: 6 }}>{l.roman}</span>{l.title}</b>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {l.duration}</span>
                  </span>
                  {done ? <Pill tint="mint" sm><Check size={11} weight="bold" /> Watched</Pill> : next ? <Pill tint="lime" sm>Next</Pill> : null}
                </Row>
              );
            })}
          </Card>
        </div>
      </IonContent>
    </IonPage>
  );
}
