import { useEffect, useMemo, useRef, useState } from "react";
import { IonModal } from "@ionic/react";
import { Sparkle, Microphone, ArrowUp, X, Paperclip, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { CAPTURE_KINDS } from "@/lib/mockData";
import { SESSION_TYPES, type ProgramKey } from "@/lib/sessionTypes";
import { useUI } from "@/lib/ui";
import { useRole } from "@/lib/roles";
import { useAppData } from "@/lib/appData";
import { success, tapLight } from "@/lib/haptics";
import { Av, Btn, Chips, Pill, Row } from "@/components/gv";

type Tab = "ask" | "add";
interface Msg { id: string; role: "me" | "ai"; text: string }

const SUGGESTIONS = [
  "Who needs me today?",
  "Who's behind on payments?",
  "Summarize the Peterson family",
];

const MODES: { key: Tab; label: string }[] = [{ key: "ask", label: "Ask" }, { key: "add", label: "Add" }];
const PROGRAMS: { key: ProgramKey; label: string }[] = [{ key: "ck", label: "Collective Kindness" }, { key: "kdh", label: "Kosher Debt Help" }];
const KINDS: { key: string; label: string }[] = CAPTURE_KINDS.map((k) => ({ key: k, label: k }));

/**
 * The center button's AI hub — one white sheet (radius 28) that both answers
 * questions (Ask) and captures into the CRM (Add, talk-to-text + auto-filing).
 * The mode switch is the chip row; the one forest primary is the send / Add button.
 */
export function AISheet() {
  const { captureOpen, captureMode, captureClient, closeCapture, showToast } = useUI();
  const { me } = useRole();
  const { families } = useAppData(); // already scoped to this worker's caseload
  const [clientId, setClientId] = useState<string>("");
  const [clientQ, setClientQ] = useState("");
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
      setClientId(captureClient?.id || ""); setClientQ(""); // pre-fill when opened from a client
    }
  }, [captureOpen, captureMode, captureClient]);

  // Client options — the worker's caseload, plus the pre-filled client if
  // it isn't in that list (e.g. a JF/KDH client).
  const clientOptions = useMemo(() => {
    const opts = [...families].map((f) => ({ id: f.id, name: f.name }));
    if (captureClient && !opts.some((o) => o.id === captureClient.id)) opts.unshift(captureClient);
    return opts.sort((a, b) => a.name.localeCompare(b.name));
  }, [families, captureClient]);
  const picked = clientOptions.find((c) => c.id === clientId) ?? null;
  const clientMatches = useMemo(() => {
    const t = clientQ.trim().toLowerCase();
    return (t ? clientOptions.filter((c) => c.name.toLowerCase().includes(t)) : clientOptions).slice(0, 8);
  }, [clientOptions, clientQ]);

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

  const canSend = !!text.trim();
  const first = me.name.split(" ")[0];

  return (
    <IonModal isOpen={captureOpen} onDidDismiss={closeCapture} initialBreakpoint={0.92} breakpoints={[0, 0.92]} handle>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--gv-card)" }}>
        {/* header: eyebrow, headline, the Ask / Add chips */}
        <div style={{ padding: "22px 18px 14px", position: "relative", borderBottom: "1px solid var(--gv-hair)" }}>
          <button aria-label="Close" className="gv-ib" onClick={closeCapture} style={{ position: "absolute", top: 18, right: 14, borderRadius: 999 }}>
            <X size={16} weight="bold" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Sparkle size={16} weight="fill" color="var(--gv-go)" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gv-mid)" }}>CK AI</span>
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: "var(--gv-ink)", letterSpacing: "-.02em", lineHeight: 1.2, marginTop: 8, paddingRight: 44 }}>
            {tab === "ask" ? "Ask anything about your families." : "Add it by talking. I'll file it for you."}
          </div>
          <div style={{ marginTop: 14 }}><Chips items={MODES} active={tab} onChange={setTab} /></div>
        </div>

        {/* body */}
        <div ref={scroll} style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
          {tab === "ask" ? (
            msgs.length === 0 ? (
              <div style={{ height: "100%", minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20px 24px" }}>
                <Sparkle size={26} weight="fill" color="var(--gv-go)" />
                <div className="gv-h2" style={{ marginTop: 12 }}>Ask about your families</div>
                <p className="gv-sub" style={{ marginTop: 5, maxWidth: 260, fontSize: 13.5 }}>Payments, notes, who needs you today. Or tap a suggestion below.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {msgs.map((mm) => mm.role === "me" ? (
                  <div key={mm.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ maxWidth: "84%", padding: "11px 14px", borderRadius: 18, borderBottomRightRadius: 6, fontSize: 14, lineHeight: 1.45, background: "var(--gv-go)", color: "#fff", overflowWrap: "anywhere" }}>{mm.text}</div>
                  </div>
                ) : (
                  <div key={mm.id} style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div className="gv-card flat" style={{ maxWidth: "88%", padding: "11px 14px", borderRadius: 18, borderBottomLeftRadius: 6, fontSize: 14, lineHeight: 1.5, color: "var(--gv-text)", overflowWrap: "anywhere" }}>{mm.text}</div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <>
              <textarea className="ck-input" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type it, or tap the mic and just talk." style={{ width: "100%", height: 140, padding: 14, borderRadius: 14, border: 0, background: "var(--gv-inset)", color: "var(--gv-ink)", fontSize: 16, lineHeight: 1.5, outline: "none", resize: "none", boxSizing: "border-box" }} />
              {listening && <div style={{ marginTop: 8 }}><Pill tint="lime" i={0}>Listening…</Pill></div>}

              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "16px 0 8px", fontSize: 13, fontWeight: 700, color: "var(--gv-mid)" }}>
                <Sparkle size={15} weight="fill" color="var(--gv-go)" /> CK AI will file this as
              </div>
              <Chips items={KINDS} active={kind} onChange={(k) => { setKind(k); setManualKind(true); }} />

              {/* Note flow — the structured options from the desktop Quick Add */}
              {kind === "Note" && (
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <Lbl>Client</Lbl>
                    {picked ? (
                      <Row>
                        <Av name={picked.name} size={34} />
                        <div className="t"><b>{picked.name}</b><span>Filing to this family</span></div>
                        <button className="gv-link" onClick={() => { setClientId(""); setClientQ(""); }}>Change</button>
                      </Row>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 44, borderRadius: 14, background: "var(--gv-inset)", padding: "0 12px" }}>
                          <MagnifyingGlass size={16} color="var(--gv-quiet)" style={{ flex: "none" }} />
                          <input value={clientQ} onChange={(e) => setClientQ(e.target.value)} placeholder="Search your families" style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontSize: 15, color: "var(--gv-ink)" }} />
                        </div>
                        <div style={{ maxHeight: 236, overflowY: "auto", marginTop: 4 }}>
                          {clientMatches.map((c) => (
                            <Row key={c.id} onClick={() => { setClientId(c.id); void tapLight(); }}>
                              <Av name={c.name} size={34} />
                              <div className="t"><b>{c.name}</b></div>
                              {c.id === captureClient?.id && <Check size={16} weight="bold" color="var(--gv-go)" />}
                            </Row>
                          ))}
                          {clientMatches.length === 0 && <div className="gv-meta" style={{ padding: "12px 2px" }}>No family matches “{clientQ}”.</div>}
                        </div>
                      </>
                    )}
                  </div>
                  <div>
                    <Lbl>Program</Lbl>
                    <Chips items={PROGRAMS} active={program} onChange={(p) => { setProgram(p); setSessionType(SESSION_TYPES[p][0]); }} />
                  </div>
                  <div>
                    <Lbl>Type of session</Lbl>
                    <select value={sessionType} onChange={(e) => setSessionType(e.target.value)} style={field}>
                      {SESSION_TYPES[program].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <Lbl>Date</Lbl>
                    <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} style={field} />
                  </div>
                  <div>
                    <Lbl>Attachment · optional</Lbl>
                    <Btn ghost sm onClick={() => addFileRef.current?.click()} style={{ maxWidth: "100%" }}>
                      <Paperclip size={16} weight="regular" />
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName || "Attach a PDF or file"}</span>
                    </Btn>
                    <input ref={addFileRef} type="file" hidden onChange={(e) => setFileName(e.target.files?.[0]?.name || "")} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* footer composer */}
        <div style={{ padding: "10px 16px calc(26px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--gv-hair)" }}>
          {tab === "ask" ? (
            <>
              {msgs.length === 0 && (
                <div className="gv-chips no-scrollbar" style={{ paddingBottom: 10 }}>
                  {SUGGESTIONS.map((s) => <button key={s} className="gv-chip" onClick={() => sendAsk(s)}>{s}</button>)}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--gv-card)", boxShadow: "inset 0 0 0 1px var(--gv-line)", borderRadius: 999, padding: "6px 6px 6px 16px" }}>
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendAsk()} placeholder="Ask CK AI…" style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontSize: 16, color: "var(--gv-ink)", height: 40 }} />
                <button aria-label="Dictate" onClick={dictate} style={ghostIcon}><Microphone size={22} weight="regular" /></button>
                <button aria-label="Send" onClick={() => sendAsk()} disabled={!canSend} style={{ width: 40, height: 40, borderRadius: 999, border: 0, cursor: canSend ? "pointer" : "default", background: "var(--gv-go)", opacity: canSend ? 1 : 0.35, display: "grid", placeItems: "center", flex: "none", transition: "opacity .15s" }}>
                  <ArrowUp size={20} weight="bold" color="#fff" />
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button aria-label="Dictate" className="gv-ib" onClick={dictate} style={{ width: 52, height: 52, borderRadius: 14, flex: "none", color: listening ? "var(--gv-go)" : undefined }}><Microphone size={22} weight="regular" /></button>
              <Btn onClick={() => void submitAdd()} disabled={!canSend} style={{ flex: 1 }}>Add to CRM</Btn>
            </div>
          )}
          <div className="gv-meta" style={{ textAlign: "center", marginTop: 8 }}>{first} · CK AI files to the right family automatically</div>
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
  return <div className="gv-eyebrow" style={{ marginBottom: 8 }}>{children}</div>;
}

const field: React.CSSProperties = { width: "100%", height: 48, borderRadius: 14, border: 0, background: "var(--gv-inset)", color: "var(--gv-ink)", fontSize: 15, padding: "0 14px", outline: "none", boxSizing: "border-box" };
const ghostIcon: React.CSSProperties = { width: 40, height: 40, display: "grid", placeItems: "center", background: "none", border: 0, cursor: "pointer", color: "var(--gv-mid)", borderRadius: 999, flex: "none", padding: 0 };
