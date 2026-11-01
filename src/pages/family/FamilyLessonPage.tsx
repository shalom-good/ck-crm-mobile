import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { useParams } from "react-router";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, useIonRouter } from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CaretRight } from "@phosphor-icons/react";
import { LESSONS, lessonEmbed } from "@/lib/lessons";
import { fetchAcademyProgress, markLessonWatched } from "@/lib/portalApi";
import { useUI } from "@/lib/ui";
import { Btn, Card, CardTitle, Pill } from "@/components/gv";

/** One episode: the video, the idea, a three-question check, "I watched this". */
export function FamilyLessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useIonRouter();
  const qc = useQueryClient();
  const { showToast } = useUI();
  const lesson = LESSONS.find((l) => l.id === Number(id)) ?? LESSONS[0];
  const next = LESSONS.find((l) => l.id === lesson.id + 1) ?? null;
  const q = useQuery({ queryKey: ["academy"], queryFn: fetchAcademyProgress, staleTime: 30_000, retry: 1 });
  const done = (q.data?.watched ?? []).includes(lesson.id);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);

  const mark = async () => {
    if (busy || done) return;
    setBusy(true);
    try {
      const p = await markLessonWatched(lesson.id);
      qc.setQueryData(["academy"], p);
      showToast(p.allDone ? "That was the whole course. Beautifully done." : "Marked as watched");
    } catch { showToast("Could not save that. Try again."); }
    finally { setBusy(false); }
  };

  const correct = lesson.quiz.filter((qz, k) => picked[k] === qz.answer).length;
  const answered = Object.keys(picked).length;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start"><BackButton href="/fam/learn" /></IonButtons>
          <span className="gv-eyebrow" style={{ paddingLeft: 4 }}>Episode {lesson.roman}</span>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <div style={{ padding: "0 16px 120px" }}>
          <div className="gv-rise" style={{ borderRadius: 18, overflow: "hidden", background: "#0E1715", aspectRatio: "16 / 9", maxWidth: "100%" }}>
            <iframe src={lessonEmbed(lesson)} title={lesson.title} style={{ width: "100%", height: "100%", border: 0, display: "block" }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginTop: 16 }}>
            <h1 className="gv-h1 gv-rise" style={{ "--i": 1, fontSize: 24 } as React.CSSProperties}>{lesson.title}</h1>
            {done && <Pill tint="mint" i={0} style={{ marginTop: 6 }}><Check size={12} weight="bold" /> Watched</Pill>}
          </div>
          <p className="gv-meta gv-rise" style={{ "--i": 2, marginTop: 4 } as React.CSSProperties}>{lesson.duration}</p>
          <p className="gv-sub gv-rise" style={{ "--i": 3, marginTop: 10, color: "var(--gv-text)", fontWeight: 600 } as React.CSSProperties}>{lesson.blurb}</p>
          {lesson.body && <p className="gv-sub gv-rise" style={{ "--i": 4, marginTop: 8 } as React.CSSProperties}>{lesson.body}</p>}

          {lesson.inspiration && (
            <Card i={5} inset style={{ marginTop: 14 }}>
              <span className="gv-eyebrow">You leave with</span>
              <p className="gv-sub" style={{ marginTop: 6, color: "var(--gv-text)" }}>{lesson.inspiration}</p>
            </Card>
          )}

          {lesson.quiz.length > 0 && (
            <Card i={6} style={{ marginTop: 14 }}>
              <CardTitle right={answered === lesson.quiz.length ? <Pill tint={correct === lesson.quiz.length ? "mint" : "yellow"}>{correct} of {lesson.quiz.length}</Pill> : undefined}>Quick check</CardTitle>
              {lesson.quiz.map((qz, k) => (
                <div key={k} style={{ paddingTop: k === 0 ? 0 : 14, marginTop: k === 0 ? 0 : 14, borderTop: k === 0 ? 0 : "1px solid var(--gv-hair)" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "var(--gv-ink)", lineHeight: 1.4 }}>{qz.prompt}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {qz.choices.map((c, ci) => {
                      const chosen = picked[k] === ci;
                      const reveal = picked[k] != null;
                      const right = ci === qz.answer;
                      const bg = reveal && right ? "var(--gv-mint)" : reveal && chosen && !right ? "var(--gv-rose)" : "var(--gv-inset)";
                      const fg = reveal && right ? "var(--gv-mintInk)" : reveal && chosen && !right ? "var(--gv-roseInk)" : "var(--gv-text)";
                      return (
                        <button key={ci} onClick={() => setPicked((p) => (p[k] != null ? p : { ...p, [k]: ci }))} style={{ textAlign: "left", border: 0, borderRadius: 12, padding: "10px 12px", background: bg, color: fg, font: "inherit", fontSize: 13.5, lineHeight: 1.4, fontWeight: reveal && right ? 700 : 500, cursor: reveal ? "default" : "pointer", display: "flex", gap: 8, alignItems: "flex-start" }}>
                          {reveal && right && <Check size={16} weight="bold" style={{ flex: "none", marginTop: 1 }} />}
                          <span>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </Card>
          )}

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {!done && <Btn block disabled={busy} onClick={() => void mark()}>{busy ? "Saving…" : "I watched this"}</Btn>}
            {next && <Btn block ghost onClick={() => router.push(`/fam/learn/${next.id}`, "forward", "replace")}>Next: {next.title} <CaretRight size={16} weight="bold" /></Btn>}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
