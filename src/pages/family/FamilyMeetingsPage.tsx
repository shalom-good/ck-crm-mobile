import { useMemo, useState } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, type RefresherEventDetail } from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, CalendarPlus, VideoCamera, ChatCircleText } from "@phosphor-icons/react";
import { fetchPortalHome } from "@/lib/portalApi";
import { FamBell } from "@/components/FamBell";
import { Av, Btn, Card, CardTitle, Evt, Eyebrow, Pill, Row, CalendarArt } from "@/components/gv";

/**
 * Meetings — everything on the family's calendar with CK: a week strip
 * (today lime, dots on days with meetings), the upcoming list with Join
 * and Add to calendar, and where to book the next one (the budgeter's
 * Calendly, each expert's link, the intake interview while it is open).
 * Source: the same /api/portal/me payload as Home (Calendly snapshot).
 */

type Raw = Record<string, any>;
// Calendar arithmetic, never 24h steps: the clock change (Nov 1) would
// otherwise repeat a day in the strip.
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
const pad = (n: number) => String(n).padStart(2, "0");
const gcalStamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const gcalUrl = (m: Raw) => {
  const s = new Date(m.startTime);
  const e = m.endTime ? new Date(m.endTime) : new Date(s.getTime() + 45 * 60_000);
  const p = new URLSearchParams({ action: "TEMPLATE", text: `${m.title || "Meeting"}${m.host ? ` with ${m.host}` : ""} · Collective Kindness`, dates: `${gcalStamp(s)}/${gcalStamp(e)}`, details: m.joinUrl ? `Join: ${m.joinUrl}` : "" });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
};

/** Day-of-month over a short month, on a 36px white tile inside an Evt row
 *  (14px number, 11px bold uppercase month: nothing under the type floor). */
function DateTile({ iso }: { iso?: string | null }) {
  const d = iso ? new Date(iso) : null;
  const ok = !!d && !Number.isNaN(d.getTime());
  return (
    <span aria-hidden style={{ width: 36, height: 36, margin: 0, borderRadius: 10, background: "var(--gv-card)", display: "grid", placeItems: "center", alignContent: "center", textAlign: "center", lineHeight: 1, flex: "none" }}>
      <b className="tnum" style={{ display: "block", fontSize: 14, fontWeight: 800, color: "var(--gv-ink)" }}>{ok ? d!.getDate() : ""}</b>
      <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".04em", color: "var(--gv-mid)", textTransform: "uppercase", margin: "2px 0 0" }}>{ok ? d!.toLocaleDateString("en-US", { month: "short" }) : ""}</span>
    </span>
  );
}

export function FamilyMeetingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["portalHome"], queryFn: fetchPortalHome, staleTime: 60_000, retry: 1 });
  const refresh = async (e: CustomEvent<RefresherEventDetail>) => { await qc.invalidateQueries({ queryKey: ["portalHome"] }); e.detail.complete(); };
  const d = q.data;
  const meetings: Raw[] = useMemo(() => (Array.isArray(d?.meetings) ? d!.meetings : []).filter((m: Raw) => m.startTime).sort((a: Raw, b: Raw) => +new Date(a.startTime) - +new Date(b.startTime)), [d]);
  const [sel, setSel] = useState<number | null>(null); // day offset from today, null = all

  const today = addDays(new Date(), 0);
  const days = Array.from({ length: 7 }, (_, k) => addDays(today, k));
  const onDay = (m: Raw, day: Date) => dayKey(new Date(m.startTime)) === dayKey(day);
  const shown = sel == null ? meetings : meetings.filter((m) => onDay(m, days[sel]));

  const gate: Raw | null = d?.interviewGate || null;
  const sessions: Raw = d?.sessions || {};
  const members: Raw[] = Array.isArray(d?.team?.members) ? d!.team.members : [];
  const bookable = members.filter((m) => m.calendly);
  const primaryBook = gate && !gate.booked && gate.calendly ? { label: `Book your interview with ${String(gate.interviewerName || "").split(" ").slice(-1)[0] || "us"}`, href: gate.calendly }
    : sessions.bookUrl && !sessions.locked ? { label: `Book a session with ${sessions.budgeterName ? String(sessions.budgeterName).split(" ")[0] : "your budgeter"}`, href: sessions.bookUrl }
    : d?.nextStep?.calendly ? { label: "Book a time", href: d.nextStep.calendly } : null;

  let i = 2;
  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--gv-paper)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 14px) 16px 120px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h1 className="gv-h1 gv-rise">Meetings</h1>
              <p className="gv-sub gv-rise" style={{ "--i": 1, marginTop: 6 } as React.CSSProperties}>
                {q.isLoading ? "Checking the calendar…" : meetings.length === 0 ? "Nothing booked yet." : meetings.length === 1 ? "One meeting coming up." : `${meetings.length} meetings coming up.`}
              </p>
            </div>
            <FamBell style={{ marginTop: 4 }} />
          </div>

          {/* week strip */}
          <Card i={i++} style={{ marginTop: 16, padding: "12px 10px 10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 4 }}>
              {days.map((day, k) => {
                const has = meetings.some((m) => onDay(m, day));
                const on = sel === k;
                return (
                  <button key={k} onClick={() => setSel(on ? null : k)} style={{ border: 0, background: on ? "var(--gv-lime)" : "transparent", borderRadius: 14, padding: "8px 0 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", font: "inherit", color: "var(--gv-mid)" }}>
                    <small style={{ fontSize: 12, fontWeight: 600 }}>{day.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3)}</small>
                    <b className="tnum" style={{ fontSize: 16, fontWeight: 800, color: "var(--gv-ink)", width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "50%", boxShadow: k === 0 && !on ? "inset 0 0 0 2px var(--gv-go)" : "none" }}>{day.getDate()}</b>
                    <i style={{ width: 6, height: 6, borderRadius: "50%", background: has ? "var(--gv-go)" : "transparent" }} />
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "0 4px" }}>
              <span className="gv-meta">{days[0].toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              {sel != null && <button className="gv-link" onClick={() => setSel(null)}>All upcoming</button>}
            </div>
          </Card>

          {/* upcoming */}
          <Eyebrow>{sel == null ? "Coming up" : days[sel].toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</Eyebrow>
          {q.isError && !d && (
            <Card i={i++}><p className="gv-sub">We couldn't reach the calendar just now.</p><div style={{ marginTop: 12 }}><Btn sm ghost onClick={() => q.refetch()}>Try again</Btn></div></Card>
          )}
          {!q.isLoading && shown.length === 0 && (
            <Card i={i++} style={{ textAlign: "center" }}>
              <CalendarArt width={150} />
              <p className="gv-sub" style={{ marginTop: 4 }}>{sel == null ? "Nothing on the calendar yet. Book below and it shows up here." : "Nothing that day."}</p>
            </Card>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shown.map((m, k) => (
              <Card key={k} i={i++} style={{ padding: 0, overflow: "hidden" }}>
                <Evt tint={k === 0 && sel == null ? "yellow" : "lavender"}
                  icon={<DateTile iso={m.startTime} />}
                  title={m.title || "Meeting"}
                  sub={`${fmtDay(m.startTime)} · ${fmtTime(m.startTime)}${m.host ? ` · with ${m.host}` : ""}`} />
                <div style={{ display: "flex", gap: 8, padding: "10px 14px 12px", flexWrap: "wrap" }}>
                  {m.joinUrl && <Btn sm href={m.joinUrl}><VideoCamera size={15} weight="bold" /> Join</Btn>}
                  <Btn sm ghost href={gcalUrl(m)}><CalendarPlus size={15} weight="bold" /> Add to calendar</Btn>
                </div>
              </Card>
            ))}
          </div>

          {/* book */}
          {(primaryBook || bookable.length > 0 || (gate && !gate.booked && gate.whatsapp)) && (
            <>
              <Eyebrow>Book a time</Eyebrow>
              <Card i={i++}>
                {primaryBook && <Btn block href={primaryBook.href}><CalendarBlank size={18} weight="bold" /> {primaryBook.label}</Btn>}
                {gate && !gate.booked && !gate.calendly && gate.whatsapp && <Btn block href={gate.whatsapp}><ChatCircleText size={18} weight="bold" /> WhatsApp {gate.interviewerName || "us"} to set a time</Btn>}
                {bookable.length > 0 && (
                  <div style={{ marginTop: primaryBook ? 6 : 0 }}>
                    {bookable.map((m, k) => (
                      <Row key={k}>
                        <Av name={String(m.name || "Team")} size={38} round />
                        <span className="t"><b>{m.name}</b><span>{m.role}</span></span>
                        <Btn sm ghost href={m.calendly} ariaLabel={`Book with ${m.name || "your team"}`} style={{ minWidth: 44, flex: "none" }}><CalendarBlank size={15} weight="bold" /> Book</Btn>
                      </Row>
                    ))}
                  </div>
                )}
                {sessions.total > 0 && !sessions.locked && (
                  <p className="gv-meta" style={{ marginTop: 10 }}>Budgeting: {sessions.done || 0} of {sessions.total} sessions done{Array.isArray(sessions.labels) && sessions.labels[Number(sessions.done || 0)] ? ` · next is ${sessions.labels[Number(sessions.done || 0)]}` : ""}.</p>
                )}
              </Card>
            </>
          )}
          {d?.team?.coordinator?.whatsapp && (
            <p className="gv-meta" style={{ textAlign: "center", marginTop: 16 }}>Need to move a meeting? <a href={d.team.coordinator.whatsapp} target="_blank" rel="noreferrer" className="gv-hit" style={{ color: "var(--gv-go)", fontWeight: 700 }}>Message {String(d.team.coordinator.name || "the coordinator").split(" ")[0]}</a>.</p>
          )}
          {!d?.team?.coordinator?.whatsapp && d && <Pill style={{ display: "none" }}>.</Pill>}
        </div>
      </IonContent>
    </IonPage>
  );
}
