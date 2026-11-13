import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { IonModal } from "@ionic/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, Sparkle, WhatsappLogo, X } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/mobileApi";
import { ASK_STARTERS, askHelper, isAskSample, type AskDoor, type AskTurn } from "@/lib/askApi";
import { fetchKdhHome } from "@/lib/kdhApi";
import { COORDINATOR_NAME, coordinatorWa } from "@/lib/contact";

interface Msg extends AskTurn { id: number; sample?: boolean; soft?: boolean }

/**
 * "Ask": the helper for a CK family or a Kosher Debt Help client (Shalom
 * 2026-11-11: "add the ai here ... showing up for ck portals and kdh").
 * The lime "Ask" button sits at the end of the tab bar (AskTab below), so it
 * is on every tab and never covers what they are reading. The sheet opens
 * with a few starter questions. It answers from their own screens only, in
 * plain kind words, and a real person is always one tap below.
 */
export function AskTab({ onOpen }: { onOpen: () => void }) {
  // Ionic's tab bar only keeps real tab buttons, so the bar holds an empty
  // slot (ion-tab-button.ocf2-ask-slot) and this button is laid exactly over
  // it, from ion-app. It follows the slot: gone whenever the bar is.
  const path = useLocation().pathname;
  const [box, setBox] = useState<{ l: number; t: number; w: number; h: number } | null>(null);
  useEffect(() => {
    const measure = () => {
      const slot = Array.from(document.querySelectorAll<HTMLElement>("ion-tab-button.ocf2-ask-slot")).find((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0);
      if (!slot) { setBox(null); return; }
      const r = slot.getBoundingClientRect();
      setBox((b) => (b && b.l === r.left && b.t === r.top && b.w === r.width && b.h === r.height ? b : { l: r.left, t: r.top, w: r.width, h: r.height }));
    };
    const timers = [0, 80, 400, 1200].map((ms) => window.setTimeout(measure, ms));
    window.addEventListener("resize", measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    document.querySelectorAll("ion-tab-bar.ocf2-tabbar").forEach((b) => ro?.observe(b));
    return () => { timers.forEach((t) => window.clearTimeout(t)); window.removeEventListener("resize", measure); ro?.disconnect(); };
  }, [path]);
  const host = typeof document !== "undefined" ? (document.querySelector("ion-app") || document.body) : null;
  if (!box || !host) return null;
  return createPortal(
    <button type="button" className="ocf2-tab-ask" style={{ left: box.l, top: box.t, width: box.w, height: box.h }} aria-label="Ask a question" onClick={onOpen}>
      <i aria-hidden><Sparkle size={17} weight="fill" /></i><span>Ask</span>
    </button>,
    host,
  );
}

export function AskHelper({ door, open, onClose }: { door: AskDoor; open: boolean; onClose: () => void }) {
  const { token } = useAuth();
  const setOpen = (v: boolean) => { if (!v) onClose(); };
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  // KDH: the person is their own debt expert (already loaded for the Homework tab).
  const kq = useQuery({ queryKey: ["kdhHome"], queryFn: fetchKdhHome, enabled: door === "kdh" && open, staleTime: 60_000, retry: 0 });
  const expert = door === "kdh" ? kq.data?.expert ?? null : null;
  const person = door === "kdh" ? expert?.firstName || "your debt expert" : COORDINATOR_NAME;
  const personWa = door === "kdh" ? expert?.whatsapp || null : coordinatorWa(`Hi ${COORDINATOR_NAME}, I have a question.`);

  useEffect(() => { if (open) setTimeout(() => end.current?.scrollIntoView({ block: "end", behavior: "smooth" }), 60); }, [msgs, busy, open]);

  const ask = async (raw: string) => {
    const q = raw.trim().slice(0, 600);
    if (!q || busy || !token) return;
    const history: AskTurn[] = msgs.filter((m) => !m.soft).map(({ role, text: t }) => ({ role, text: t }));
    setMsgs((m) => [...m, { id: ++seq.current, role: "user", text: q }]);
    setText(""); setBusy(true);
    try {
      const r = await askHelper(door, token, q, history);
      setMsgs((m) => [...m, { id: ++seq.current, role: "assistant", text: r.answer, sample: r.sample }]);
    } catch (e) {
      const st = e instanceof ApiError ? e.status : 0;
      const code = e instanceof ApiError ? e.message : "";
      const soft = st === 404 || st === 405 || st === 503
        ? `Ask is being switched on. Until then, ${person} is glad to help.`
        : st === 429 ? "A lot of questions came in at once. Give it a minute and ask again."
        : st === 401 ? "Please sign in again, then ask."
        : code === "declined" ? `That one is better with a person. ${person} is glad to help.`
        : "That did not go through. Check your connection and ask again.";
      setMsgs((m) => [...m, { id: ++seq.current, role: "assistant", text: soft, soft: true }]);
    } finally { setBusy(false); }
  };

  const sample = isAskSample(token);

  return (
    <>
      <IonModal isOpen={open} onDidDismiss={() => setOpen(false)} initialBreakpoint={0.92} breakpoints={[0, 0.92]} className="ocf2-asksheet">
        <div className="ocf2-ask">
          <div className="ocf2-ask-head">
            <span className="ocf2-ask-mark" aria-hidden><Sparkle size={20} weight="fill" /></span>
            <div className="ocf2-ask-head-t">
              <h2>Ask anything</h2>
              <p>{door === "kdh" ? "About your homework, your calls and your plan." : "About your plan, your budget and your meetings."}</p>
            </div>
            <button type="button" className="ocf2-round" aria-label="Close" onClick={() => setOpen(false)}><X size={18} weight="bold" /></button>
          </div>

          <div className="ocf2-ask-body">
            {msgs.length === 0 && (
              <div className="ocf2-ask-start">
                <p className="ocf2-ask-hint">No question is too small. Tap one to start, or type your own.</p>
                {ASK_STARTERS[door].map((s, i) => (
                  <button type="button" key={s} className="ocf2-ask-chip gv-rise" style={{ "--i": i } as React.CSSProperties} onClick={() => void ask(s)}>{s}</button>
                ))}
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={`ocf2-ask-msg is-${m.role === "user" ? "me" : "ai"}${m.soft ? " is-soft" : ""}`}>
                {m.text}
                {m.sample && <small>Sample answer, from the sample data.</small>}
              </div>
            ))}
            {busy && <div className="ocf2-ask-msg is-ai is-dots" aria-label="Thinking"><i /><i /><i /></div>}
            <div ref={end} />
          </div>

          <div className="ocf2-ask-foot">
            <form className="ocf2-ask-row" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
              <input className="ocf2-ask-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question" aria-label="Your question" maxLength={600} enterKeyHint="send" autoComplete="off" />
              <button type="submit" className="ocf2-ask-send" aria-label="Send" disabled={!text.trim() || busy}><ArrowUp size={20} weight="bold" /></button>
            </form>
            {personWa && (
              <a className="ocf2-ask-person" href={personWa} target="_blank" rel="noreferrer">
                <WhatsappLogo size={18} weight="fill" aria-hidden /> Rather talk to a person? WhatsApp {person}
              </a>
            )}
            <p className="ocf2-ask-fine">{sample ? "Sample family. " : ""}Answers come from your own page. A guide to your plan, not financial advice.</p>
          </div>
        </div>
      </IonModal>
    </>
  );
}
