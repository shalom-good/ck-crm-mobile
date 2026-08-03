import { useEffect, useMemo, useRef, useState } from "react";
import { IonModal } from "@ionic/react";
import { Sparkle, Microphone, ArrowUp, X, PlusCircle, Paperclip } from "@phosphor-icons/react";
import { CAPTURE_KINDS } from "@/lib/mockData";
import { SESSION_TYPES, type ProgramKey } from "@/lib/sessionTypes";
import { useUI } from "@/lib/ui";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import { success, tapLight } from "@/lib/haptics";

type Tab = "ask" | "add";
interface Msg { id: string; role: "me" | "ai"; text: string }

const SUGGESTIONS = [
  "Who needs me today?",
  "Who's behind on payments?",
  "Summarize the Peterson family",
];

/**
 * The center button's AI hub — one inviting sheet that both answers questions
 * (Ask) and captures into the CRM (Add, talk-to-text + auto-filing). Purple
 * Mercury gradient header, segmented toggle, shared mic.
 */
export function AISheet() {
  const { captureOpen, captureMode, captureClient, closeCapture, showToast } = useUI();
  const { me } = useRole();
  const { families } = useAppData(); // already scoped to this worker's caseload
  const [clientId, setClientId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("ask");
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [kind, setKind] = useState<string>("Note");
  const [manualKind, setManualKind] = useState(false);
  const [listening, setListening] = useState(false);
  // Note flow (mirrors desktop Quick Add): program → type of session → date → file.
  const [program, setProgram] = useState<ProgramKey>("ck");
  const [sessionType, setSessionType] = useState<string>(SESSION_TYPES.ck[0]);
  const [noteDate, setNoteDate] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const addFileRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (captureOpen) {
      setTab(captureMode); setText(""); setMsgs([]); setKind("Note"); setManualKind(false); setListening(false);
      setProgram("ck"); setSessionType(SESSION_TYPES.ck[0]); setNoteDate(new Date().toISOString().slice(0, 10)); setFileName("");
      setClientId(captureClient?.id || ""); // pre-fill when opened from a client
    }
  }, [captureOpen, captureMode, captureClient]);

  // Client options — the worker's caseload, plus the pre-filled client if
  // it isn't in that list (e.g. a JF/KDH client).
  const clientOptions = useMemo(() => {
    const opts = [...families].map((f) => ({ id: f.id, name: f.name }));
    if (captureClient && !opts.some((o) => o.id === captureClient.id)) opts.unshift(captureClient);
    return opts.sort((a, b) => a.name.localeCompare(b.name));
  }, [families, captureClient]);

  const guessed = useMemo(() => {
    const t = text.toLowerCase();
    if (/\$|\bpaid\b|\bpayment\b|\bbilling\b|\bcharge\b/.test(t)) return "Payment";
    if (/\bflag\b|\brisk\b|\burgent\b|\bescalat/.test(t)) return "Flag";
    if (/\bcall\b|\bfollow up\b|\bremind\b|\btomorrow\b|\bschedule\b/.test(t)) return "Task";
    return "Note";
  }, [text]);
  useEffect(() => { if (text && !manualKind) setKind(guessed); }, [guessed, text, manualKind]);

  const dictate = () => {
    setListening(true);
    tapLight();
    setTimeout(() => {
      setText((t) => (t ? t + " " : "") + (tab === "ask" ? "Who do I need to call today?" : "Spoke with the family, payment coming Friday."));
      setListening(false);
    }, 1100);
  };

  const sendAsk = (q?: string) => {
    const body = (q ?? text).trim();
    if (!body) return;
    const n = ++seq.current;
    setMsgs((p) => [...p, { id: `m${n}`, role: "me", text: body }, { id: `a${n}`, role: "ai", text: cannedReply(body) }]);
    setText("");
    setTimeout(() => scroll.current?.scrollTo({ top: 1e6, behavior: "smooth" }), 60);
  };

  const submitAdd = async () => {
    if (!text.trim()) return;
    await success();
    showToast(`Filed as ${kind === "Note" ? sessionType : kind} by CK AI`);
    closeCapture();
  };

  return (
    <IonModal isOpen={captureOpen} onDidDismiss={closeCapture} initialBreakpoint={0.92} breakpoints={[0, 0.92]} handle>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "var(--ck-card)" }}>
        {/* clean Lightfield header — white surface, light type, hairline toggle */}
        <div style={{ background: "var(--ck-card)", padding: "20px 18px 14px", position: "relative", borderBottom: "1px solid var(--ck-hairline)" }}>
          <button aria-label="Close" onClick={closeCapture} style={{ position: "absolute", top: 16, right: 14, width: 34, height: 34, borderRadius: 999, border: "1px solid var(--ck-hairline)", background: "var(--ck-card)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} weight="bold" color="var(--ck-muted)" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Sparkle size={16} weight="fill" color="var(--ck-tint)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ck-body)", letterSpacing: "-0.01em" }}>CK AI</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, color: "var(--ck-title)", letterSpacing: "-0.02em", lineHeight: "26px", marginTop: 10, maxWidth: "92%" }}>
            {tab === "ask" ? "Ask anything about your families." : "Add it by talking. I'll file it for you."}
          </div>

          {/* segmented toggle — hairline group, active segment lifts on white */}
          <div style={{ display: "flex", gap: 4, marginTop: 16, background: "var(--ck-bg)", border: "1px solid var(--ck-hairline)", borderRadius: 12, padding: 4 }}>
            {(["ask", "add"] as Tab[]).map((t) => {
              const on = tab === t;
              return (
                <button key={t} onClick={() => setTab(t)} className={on ? "shadow-card" : ""} style={{ flex: 1, height: 38, borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: on ? "var(--ck-card)" : "transparent", color: on ? "var(--ck-title)" : "var(--ck-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {t === "ask" ? <Sparkle size={15} weight={on ? "fill" : "regular"} color={on ? "var(--ck-tint)" : "currentColor"} /> : <PlusCircle size={15} weight={on ? "fill" : "regular"} color={on ? "var(--ck-tint)" : "currentColor"} />}
                  {t === "ask" ? "Ask" : "Add"}
                </button>
              );
            })}
          </div>
        </div>

        {/* body */}
        <div ref={scroll} style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
          {tab === "ask" ? (
            msgs.length === 0 ? (
              <div style={{ height: "100%", minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20px 24px" }}>
                <Sparkle size={26} weight="fill" color="var(--ck-tint)" />
                <div style={{ fontSize: 15.5, fontWeight: 600, color: "var(--ck-title)", marginTop: 12, letterSpacing: "-0.01em" }}>Ask about your families</div>
                <div style={{ fontSize: 13.5, lineHeight: "19px", marginTop: 5, maxWidth: 260, color: "var(--ck-muted)" }}>Payments, notes, who needs you today. Or tap a suggestion below.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {msgs.map((mm) => (
                  <div key={mm.id} style={{ display: "flex", justifyContent: mm.role === "me" ? "flex-end" : "flex-start" }}>
                    <div className={mm.role === "me" ? "" : "shadow-card"} style={{ maxWidth: "84%", padding: "11px 14px", borderRadius: 16, fontSize: 14, lineHeight: "20px", background: mm.role === "me" ? "var(--ck-tint)" : "var(--ck-card)", color: mm.role === "me" ? "#fff" : "var(--ck-body)", border: mm.role === "me" ? "none" : "1px solid var(--ck-hairline)", borderBottomRightRadius: mm.role === "me" ? 5 : 16, borderBottomLeftRadius: mm.role === "me" ? 16 : 5 }}>{mm.text}</div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <>
              <textarea className="ck-input" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type it, or tap the mic and just talk." style={{ width: "100%", height: 150, padding: "14px", borderRadius: 14, border: "1.5px solid var(--ck-input-border)", background: "var(--ck-card)", color: "var(--ck-title)", fontSize: 16, outline: "none", resize: "none", ["--ck-ring" as string]: "#C2531F" } as React.CSSProperties} />
              {listening && <div style={{ fontSize: 12, color: "#C2531F", fontWeight: 600, marginTop: 6 }}>Listening…</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "16px 0 8px", fontSize: 13, fontWeight: 600, color: "var(--ck-muted)" }}>
                <Sparkle size={15} weight="fill" color="#C2531F" /> CK AI will file this as
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {CAPTURE_KINDS.map((k) => {
                  const on = k === kind;
                  return <button key={k} onClick={() => { setKind(k); setManualKind(true); }} style={{ flex: 1, height: 42, borderRadius: 11, cursor: "pointer", border: `1.5px solid ${on ? "var(--ck-title)" : "var(--ck-hairline)"}`, background: on ? "var(--ck-bg)" : "var(--ck-card)", color: on ? "var(--ck-title)" : "var(--ck-body)", fontSize: 13.5, fontWeight: on ? 700 : 500 }}>{k}</button>;
                })}
              </div>

              {/* Note flow — the structured options from the desktop Quick Add */}
              {kind === "Note" && (
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <Lbl>Client</Lbl>
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: "100%", height: 46, borderRadius: 12, border: "1px solid var(--ck-input-border)", background: "var(--ck-card)", color: clientId ? "var(--ck-title)" : "var(--ck-body)", fontSize: 15, padding: "0 12px", outline: "none", boxSizing: "border-box" }}>
                      <option value="">Select a client…</option>
                      {clientOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Lbl>Program</Lbl>
                    <div style={{ display: "flex", background: "var(--ck-bg)", border: "1px solid var(--ck-hairline)", borderRadius: 999, padding: 3, gap: 2 }}>
                      {(["ck", "kdh"] as ProgramKey[]).map((p) => {
                        const on = program === p;
                        return (
                          <button key={p} type="button" onClick={() => { setProgram(p); setSessionType(SESSION_TYPES[p][0]); }} style={{ flex: 1, border: "none", cursor: "pointer", borderRadius: 999, padding: "8px 10px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", background: on ? "var(--ck-card)" : "transparent", color: on ? "var(--ck-title)" : "var(--ck-muted)", boxShadow: on ? "0 1px 2px rgba(17,17,26,.08)" : "none" }}>
                            {p === "ck" ? "Collective Kindness" : "Kosher Debt Help"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Lbl>Type of session</Lbl>
                    <select value={sessionType} onChange={(e) => setSessionType(e.target.value)} style={{ width: "100%", height: 46, borderRadius: 12, border: "1px solid var(--ck-input-border)", background: "var(--ck-card)", color: "var(--ck-title)", fontSize: 15, padding: "0 12px", outline: "none", boxSizing: "border-box" }}>
                      {SESSION_TYPES[program].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <Lbl>Date</Lbl>
                    <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} style={{ width: "100%", height: 46, borderRadius: 12, border: "1px solid var(--ck-input-border)", background: "var(--ck-card)", color: "var(--ck-title)", fontSize: 15, padding: "0 12px", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <Lbl>Attachment · optional</Lbl>
                    <button type="button" onClick={() => addFileRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px dashed var(--ck-input-border)", borderRadius: 12, padding: "11px 14px", background: "var(--ck-card)", color: fileName ? "var(--ck-title)" : "var(--ck-body)", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                      <Paperclip size={16} weight="regular" /> {fileName || "Attach a PDF or file"}
                    </button>
                    <input ref={addFileRef} type="file" hidden onChange={(e) => setFileName(e.target.files?.[0]?.name || "")} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* footer composer */}
        <div style={{ padding: "10px 16px calc(26px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--ck-hairline)" }}>
          {tab === "ask" ? (
            <>
              {msgs.length === 0 && (
                <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => sendAsk(s)} style={{ flexShrink: 0, whiteSpace: "nowrap", cursor: "pointer", background: "var(--ck-card)", border: "1px solid var(--ck-hairline)", borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 500, color: "var(--ck-body)" }}>{s}</button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--ck-card)", border: "1.5px solid var(--ck-input-border)", borderRadius: 24, padding: "6px 6px 6px 16px" }}>
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendAsk()} placeholder="Ask CK AI…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16, color: "var(--ck-title)", height: 40 }} />
                <button aria-label="Dictate" onClick={dictate} style={iconBtn}><Microphone size={22} weight="regular" color="#C2531F" /></button>
                <button aria-label="Send" onClick={() => sendAsk()} disabled={!text.trim()} style={{ width: 40, height: 40, borderRadius: 999, border: "none", cursor: "pointer", background: text.trim() ? "#C2531F" : "var(--ck-hairline)", display: "flex", alignItems: "center", justifyContent: "center" }}><ArrowUp size={20} weight="bold" color="#fff" /></button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button aria-label="Dictate" onClick={dictate} style={{ width: 56, height: 56, borderRadius: 16, border: "1.5px solid var(--ck-hairline)", background: "var(--ck-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Microphone size={22} weight="regular" color="#C2531F" /></button>
              <button onClick={submitAdd} disabled={!text.trim()} style={{ flex: 1, height: 56, borderRadius: 16, border: "none", cursor: "pointer", background: text.trim() ? "#C2531F" : "var(--ck-hairline)", color: text.trim() ? "#fff" : "var(--ck-muted)", fontSize: 16, fontWeight: 600 }}>Add to CRM</button>
            </div>
          )}
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--ck-muted)", marginTop: 8 }}>{me.name.split(" ")[0]} · CK AI files to the right family automatically</div>
        </div>
      </div>
    </IonModal>
  );
}

function cannedReply(q: string): string {
  const t = q.toLowerCase();
  if (t.includes("behind")) return "2 families are behind: Peterson ($240 over 8 days) and Alexander. Want me to draft a check-in text to both?";
  if (t.includes("peterson")) return "Andrew & Rivka Peterson, KDH, Lakewood NJ. Est. debt $84k, $1.2k paid. New intake, no contact in 9 days. You're the case manager.";
  if (t.includes("need") || t.includes("today")) return "As Case Manager, 2 families need you: Peterson (new intake, first contact) and Watson (40d no note). 3 next steps are due today.";
  return "Here's what I found across your families, payments, and notes. (Scaffold reply. Wired to live data once Supabase is connected.)";
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ck-muted)", marginBottom: 7 }}>{children}</div>;
}

const iconBtn: React.CSSProperties = { width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer" };
