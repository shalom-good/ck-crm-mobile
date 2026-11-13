import { Oil } from "@/components/orchard/Illos";
import { useMemo, useState } from "react";
import { IonPage, IonContent, IonRefresher, IonRefresherContent, type RefresherEventDetail } from "@ionic/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, CalendarPlus, VideoCamera, ChatCircleText } from "@phosphor-icons/react";
import { fetchPortalHome } from "@/lib/portalApi";
import { DateTile, Face, FamHead, OBtn, Panel, SectionHead, SoftError, toneFor } from "@/components/orchard/family/FamKit";

/**
 * ORCHARD (2026-11-05): week strip in a white card, the next meeting
 * lilac with a forest Join, the rest white, a booking card.
 *
 * Meetings: everything on the family's calendar with CK: a week strip
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

  // The next meeting from now on, for the calendar drawing and the strip.
  const ahead = meetings.filter((m) => +new Date(m.endTime || m.startTime) >= Date.now() - 60 * 60_000);
  const nextAt: Date | null = ahead.length ? new Date(ahead[0].startTime) : null;
  const nextK = nextAt ? days.findIndex((day) => dayKey(day) === dayKey(nextAt)) : -1;

  const gate: Raw | null = d?.interviewGate || null;
  const sessions: Raw = d?.sessions || {};
  const members: Raw[] = Array.isArray(d?.team?.members) ? d!.team.members : [];
  const bookable = members.filter((m) => m.calendly);
  const primaryBook = gate && !gate.booked && gate.calendly ? { label: `Book your interview with ${String(gate.interviewerName || "").split(" ").slice(-1)[0] || "us"}`, href: gate.calendly }
    : sessions.bookUrl && !sessions.locked ? { label: `Book a session with ${sessions.budgeterName ? String(sessions.budgeterName).split(" ")[0] : "your budgeter"}`, href: sessions.bookUrl }
    : d?.nextStep?.calendly ? { label: "Book a time", href: d.nextStep.calendly } : null;

  return (
    <IonPage>
      <IonContent style={{ "--background": "var(--oc-ground)" } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={refresh}><IonRefresherContent /></IonRefresher>
        <div className="ocf2 ocf2-page">
          <FamHead title="Meetings"
            art={<Oil name="cal" w={100} className="oil-drop" cal={{ today, next: nextAt, more: ahead.slice(1, 6).map((m) => new Date(m.startTime)) }} />}
            sub={q.isLoading ? "Checking the calendar." : meetings.length === 0 ? "Nothing booked yet. Pick a time when you are ready." : meetings.length === 1 ? "One meeting coming up. We will be there." : `${meetings.length} meetings coming up. We will be there.`} />

          {/* week strip: today ringed, the picked day lime, a small count under days with meetings */}
          <Panel style={{ padding: "10px 8px 8px", gap: 4 }}>
            <div className="ocf2-week">
              {days.map((day, k) => {
                const n = meetings.filter((m) => onDay(m, day)).length;
                const on = sel === k;
                return (
                  <button type="button" key={k} aria-pressed={on} aria-label={`${day.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}${n ? `, ${n} meeting${n === 1 ? "" : "s"}` : ""}`}
                    style={{ "--k": k } as React.CSSProperties}
                    className={`ocf2-day${on ? " is-on" : ""}${k === 0 ? " is-today" : ""}${n ? " has" : ""}${k === nextK ? " is-next" : ""}`} onClick={() => setSel(on ? null : k)}>
                    <small>{day.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3)}</small>
                    <b>{day.getDate()}</b>
                    <em aria-hidden>{n || ""}</em>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px", minHeight: 32 }}>
              <span className="ocf2-meta">{days[0].toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              {sel != null && <button type="button" className="ocf2-link" style={{ fontSize: 12.5 }} onClick={() => setSel(null)}>All upcoming</button>}
            </div>
          </Panel>

          {/* upcoming */}
          <SectionHead>{sel == null ? "Coming up" : days[sel].toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</SectionHead>
          {q.isError && !d && <SoftError onRetry={() => q.refetch()}>We couldn't reach the calendar just now.</SoftError>}
          {!q.isLoading && shown.length === 0 && (
            <Panel className="oil-stack">
              <Oil name={sel == null ? "cal" : "cup"} w={128} cal={{ today }} />
              <p className="ocf2-p">{sel == null ? "Nothing on the calendar yet, and that is fine. When you book a time below, it shows up here." : "Nothing that day. A free evening."}</p>
            </Panel>
          )}
          {shown.map((m, k) => {
            // One look for every meeting (2026-11-11, "colors went off"): a soft
            // tone per card, a white date tile, the same two buttons.
            const tone = (["lilac", "peach", "sky"] as const)[k % 3];
            return (
              <section key={k} className={`ocf2-meet ocf2-t-${tone}`} style={{ color: "var(--oc-ink)" }}>
                <div className="ocf2-meet-top">
                  <DateTile iso={m.startTime} tone="white" />
                  <span className="ocf2-row-t">
                    <b>{m.title || "Meeting"}</b>
                    <small>{`${fmtDay(m.startTime)} · ${fmtTime(m.startTime)}${m.host ? ` · with ${m.host}` : ""}`}</small>
                  </span>
                </div>
                <div className="ocf2-meet-a">
                  {m.joinUrl && <OBtn sm kind="primary" href={m.joinUrl}><VideoCamera size={15} weight="bold" /> Join</OBtn>}
                  <OBtn sm kind="light" href={gcalUrl(m)}><CalendarPlus size={15} weight="bold" /> Add to calendar</OBtn>
                </div>
              </section>
            );
          })}

          {/* book */}
          {(primaryBook || bookable.length > 0 || (gate && !gate.booked && gate.whatsapp)) && (
            <>
              <SectionHead>Book a time</SectionHead>
              <Panel>
                {primaryBook && (
                  <div className="oil-row">
                    <Oil name="session" w={58} className="oil-drop" />
                    <div className="oil-row-t"><OBtn block kind={shown.some((m) => m.joinUrl) && sel == null ? "lime" : "primary"} href={primaryBook.href}><CalendarBlank size={18} weight="bold" /> {primaryBook.label}</OBtn></div>
                  </div>
                )}
                {gate && !gate.booked && !gate.calendly && gate.whatsapp && <OBtn block href={gate.whatsapp}><ChatCircleText size={18} weight="bold" /> WhatsApp {gate.interviewerName || "us"} to set a time</OBtn>}
                {bookable.length > 0 && (
                  <div className="ocf2-rows">
                    {bookable.map((m, k) => (
                      <div key={k} className="ocf2-row">
                        <Face name={String(m.name || "Team")} size={38} tone={toneFor(String(m.name || "Team"))} />
                        <span className="ocf2-row-t"><b>{m.name}</b><small>{m.role}</small></span>
                        <OBtn sm kind="ghost" href={m.calendly} ariaLabel={`Book with ${m.name || "your team"}`} style={{ flex: "none", padding: "0 14px" }}><CalendarBlank size={15} weight="bold" /> Book</OBtn>
                      </div>
                    ))}
                  </div>
                )}
                {sessions.total > 0 && !sessions.locked && (
                  <p className="ocf2-meta">Budgeting: {sessions.done || 0} of {sessions.total} sessions done{Array.isArray(sessions.labels) && sessions.labels[Number(sessions.done || 0)] ? ` · next is ${sessions.labels[Number(sessions.done || 0)]}` : ""}.</p>
                )}
              </Panel>
            </>
          )}
          {d?.team?.coordinator?.whatsapp && (
            <p className="ocf2-meta" style={{ textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "0 6px" }}>
              Need to move a meeting? <a href={d.team.coordinator.whatsapp} target="_blank" rel="noreferrer" className="ocf2-link" style={{ fontSize: 12.5 }}>Message {String(d.team.coordinator.name || "the coordinator").split(" ")[0]}</a>
            </p>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
