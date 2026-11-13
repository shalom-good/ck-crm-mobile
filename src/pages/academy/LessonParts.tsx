// The parts of one CK Academy episode under the video (Shalom 2026-11-11:
// "make it like the full ck academy experience"). Each part is a card that
// says where it stands (done, now, or waiting on the part before it), so
// the page reads as a checklist: watch, quick check, do it together, the
// counselor's code. Wording for the Lesson I steps follows the approved
// "Now make it real" mockup, as on the family page. Styles:
// theme/orchard-academy-lesson.css (.oal-*).
import { useState, type ReactNode } from "react";
import { ArrowSquareOut, CaretDown, Check, Lock, Play } from "@phosphor-icons/react";
import { OBtn } from "@/components/orchard/family/FamKit";
import { openExternal } from "@/lib/external";
import type { AcademyStepInput, AcademySteps, RetirementAnswer, TrumpAnswer } from "@/lib/academyApi";
import type { LessonGuide, LessonResource } from "@/lib/academyExtras";

export type PartState = "done" | "now" | "wait";

/** The four marks under the title: tap one to jump to its card. */
export function Trail({ items }: { items: { id: string; label: string; state: PartState }[] }) {
  return (
    <ol className="oal-trail" aria-label="This episode, step by step">
      {items.map((it, k) => (
        <li key={it.id}>
          <button type="button" className={`oal-trail-i is-${it.state}`} onClick={() => document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth", block: "start" })} aria-label={`${it.label}: ${it.state === "done" ? "done" : it.state === "now" ? "now" : "not yet"}`}>
            <i aria-hidden>{it.state === "done" ? <Check size={12} weight="bold" /> : k === 0 ? <Play size={10} weight="fill" /> : k}</i>
            <span>{it.label}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** One card of the checklist. */
export function Part({ id, n, title, state, chip, waitLine, children }: { id: string; n: number; title: string; state: PartState; chip?: ReactNode; waitLine?: string; children?: ReactNode }) {
  return (
    <section id={id} className={`oal-part is-${state}`} aria-label={title}>
      <header className="oal-part-h">
        <i className="oal-num" aria-hidden>{state === "done" ? <Check size={14} weight="bold" /> : state === "wait" ? <Lock size={13} weight="bold" /> : n}</i>
        <h2>{title}</h2>
        {chip}
      </header>
      {state === "wait" ? <p className="oal-wait">{waitLine}</p> : children}
    </section>
  );
}

/** A quiet "tap to open" block inside a card. */
export function Fold({ title, sub, children, open: start = false }: { title: string; sub?: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(start);
  return (
    <div className={`oal-fold${open ? " is-open" : ""}`}>
      <button type="button" className="oal-fold-h" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span><b>{title}</b>{sub ? <small>{sub}</small> : null}</span>
        <CaretDown size={16} weight="bold" aria-hidden />
      </button>
      {open && <div className="oal-fold-b">{children}</div>}
    </div>
  );
}

/* ── the quick check ────────────────────────────────────────────────── */
export interface QuizItem { prompt: string; choices: string[]; answer: number }

/** Tap an answer for each question, then check. The first try is the one
 *  that is saved (the website's rule); after that the couple can go again
 *  to learn, and that practice round stays on the phone. */
export function QuickCheck({ quiz, explain, saved, busy, onSubmit }: {
  quiz: QuizItem[]; explain: (string | null)[];
  saved: { score: number; total: number } | null; busy: boolean;
  onSubmit: (answers: number[]) => Promise<boolean>;
}) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  // answer: picking. result: just checked, their picks marked. review: a
  // finished quiz reopened, right answers shown without guessing their picks.
  const [mode, setMode] = useState<"answer" | "result" | "review">(saved ? "review" : "answer");
  const [practice, setPractice] = useState<number | null>(null);
  const all = Object.keys(picked).length === quiz.length;
  const reveal = mode !== "answer";
  const review = mode === "review";

  const check = async () => {
    if (!all || busy) return;
    if (!saved) { if ((await onSubmit(quiz.map((_, k) => picked[k]))) === false) return; }
    else setPractice(quiz.filter((q, k) => picked[k] === q.answer).length);
    setMode("result");
  };
  const again = () => { setPicked({}); setPractice(null); setMode("answer"); };

  return (
    <div className="oal-quiz">
      {quiz.map((q, k) => {
        const mine = picked[k];
        const gotIt = reveal && mine === q.answer;
        return (
          <div key={k} className="oal-q">
            <p className="oal-q-t"><span aria-hidden>{k + 1}</span>{q.prompt}</p>
            <div className="oal-opts" role="group" aria-label={`Question ${k + 1}`}>
              {q.choices.map((c, ci) => {
                const chosen = mine === ci;
                const right = ci === q.answer;
                const cls = reveal ? (right ? " is-right" : chosen ? " is-miss" : "") : chosen ? " is-on" : "";
                return (
                  <button type="button" key={ci} className={`oal-opt${cls}`} aria-pressed={chosen} disabled={reveal || busy} onClick={() => setPicked((p) => ({ ...p, [k]: ci }))}>
                    <i aria-hidden>{reveal && right ? <Check size={12} weight="bold" /> : null}</i>
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
            {reveal && !review && (
              <p className={`oal-fb${gotIt ? " is-right" : ""}`}>{gotIt ? "That is it." : "Not quite. The one marked in green is the answer."}{explain[k] ? ` ${explain[k]}` : ""}</p>
            )}
            {review && explain[k] ? <p className="oal-fb is-right">{explain[k]}</p> : null}
          </div>
        );
      })}

      {!reveal && (
        <>
          <OBtn block disabled={!all || busy} onClick={() => void check()} style={{ minHeight: 52 }}>{busy ? "Saving…" : saved ? "Check again" : "Check our answers"}</OBtn>
          <p className="oal-note">{saved ? "This round is for you. Your first try is the one that was saved." : "Your first try is the one your counselor sees. You can go again after."}</p>
        </>
      )}
      {reveal && saved && (
        <div className="oal-score" role="status">
          <b>{practice != null ? `This time: ${practice} of ${quiz.length}` : `You got ${saved.score} of ${saved.total}`}</b>
          <span>{practice != null ? `Your saved first try was ${saved.score} of ${saved.total}.` : saved.score === saved.total ? "All of them. Your counselor sees this." : "Your counselor sees this first try. Go again any time to learn it."}</span>
          <button type="button" className="oal-link" onClick={again}>Try again</button>
        </div>
      )}
    </div>
  );
}

/* ── Lesson I: now make it real ─────────────────────────────────────── */
const TRUMP_SITE = "https://trumpaccounts.gov/";
const TRUMP_VIDEO = "https://www.youtube.com/watch?v=bfZV0tDVzJY";
const usd = (n: number | null | undefined) => (n == null ? "" : `$${Math.round(n).toLocaleString("en-US")}`);
const numOr = (v: string) => { const n = Number(v.replace(/[^0-9.]/g, "")); return v.trim() && Number.isFinite(n) ? n : null; };

function Pick({ on, title, sub, onClick }: { on: boolean; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" className={`oal-pick${on ? " is-on" : ""}`} aria-pressed={on} onClick={onClick}>
      <i aria-hidden>{on ? <Check size={12} weight="bold" /> : null}</i>
      <span><b>{title}</b><small>{sub}</small></span>
    </button>
  );
}
function Money({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="oal-money">
      <span>{label}</span>
      <span className="oal-money-in"><i aria-hidden>$</i><input className="ocf2-input" inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, "").slice(0, 9))} /></span>
    </label>
  );
}

/** The two real steps after Episode I, with the same answers the website
 *  saves. "Not yet" is kept and asks the counselor for help; it is not done. */
export function MoneySteps({ steps, counselor, guide, onSave }: {
  steps: AcademySteps; counselor: string; guide: LessonGuide | null;
  onSave: (body: AcademyStepInput) => Promise<boolean>;
}) {
  const [ret, setRet] = useState<RetirementAnswer | null>(steps.retirement.status);
  const [openAmt, setOpenAmt] = useState(steps.retirement.opening != null ? String(steps.retirement.opening) : "");
  const [monthly, setMonthly] = useState(steps.retirement.monthly != null ? String(steps.retirement.monthly) : "");
  const [ta, setTa] = useState<TrumpAnswer | null>(steps.trump.status);
  const [kids, setKids] = useState(steps.trump.kids || 1);
  const [bonus, setBonus] = useState(steps.trump.bonus);
  const [video, setVideo] = useState(false);
  const [busy, setBusy] = useState<"ret" | "ta" | null>(null);
  const [saved, setSaved] = useState({ ret: !!steps.retirement.status, ta: !!steps.trump.status });
  const [err, setErr] = useState<string | null>(null);

  const save = async (which: "ret" | "ta", body: AcademyStepInput) => {
    if (busy) return;
    setBusy(which); setErr(null);
    const ok = await onSave(body);
    if (ok) setSaved((s) => ({ ...s, [which]: true })); else setErr("That did not save. Check your connection and try again.");
    setBusy(null);
  };
  const count = (steps.retirement.done ? 1 : 0) + (steps.trump.done ? 1 : 0);

  return (
    <div className="oal-real">
      <div className="oal-real-h">
        <span className={`ocf2-chip ${count === 2 ? "ocf2-t-mint" : "ocf2-t-butter"}`}>{count} of 2 done</span>
        <h3>Now make it real</h3>
        <p className="ocf2-p">Two steps from this episode. Do both and Episode II can open. Your counselor sees your answers.</p>
      </div>

      <div className={`oal-step${steps.retirement.done ? " is-done" : ""}`}>
        <span className="ocf2-kicker">For the two of you</span>
        <h4>Did you open a retirement account?</h4>
        <p className="ocf2-p">Open the account, set a monthly amount, and let time do the rest. Make sure the money is <b>invested in the market</b> once it lands. Cash sitting in the account does not grow.</p>
        {guide && (
          <Fold title={guide.title} sub={guide.eyebrow}>
            {guide.intro.map((t, i) => <p key={i} className="ocf2-p">{t}</p>)}
            <ol className="oal-guide">
              {guide.steps.map((s, i) => (
                <li key={i}>
                  <b>{s.title}</b>
                  <ul>{s.lines.map((l, j) => <li key={j}>{l}</li>)}</ul>
                  {s.tip ? <p className="oal-tip">{s.tip}</p> : null}
                </li>
              ))}
            </ol>
            {guide.closing.map((t, i) => <p key={i} className="ocf2-p">{t}</p>)}
            <p className="ocf2-meta">{guide.disclaimer}</p>
          </Fold>
        )}
        <div className="oal-picks" role="group" aria-label="Retirement account">
          <Pick on={ret === "opened"} title="Yes, we opened one" sub="Tell us how much you started with" onClick={() => { setRet("opened"); setSaved((s) => ({ ...s, ret: false })); }} />
          <Pick on={ret === "already_had"} title="We already had one" sub="Opened before the course" onClick={() => { setRet("already_had"); setSaved((s) => ({ ...s, ret: false })); }} />
          <Pick on={ret === "not_yet"} title="Not yet" sub="Get help from your guidance counselor" onClick={() => { setRet("not_yet"); setSaved((s) => ({ ...s, ret: false })); }} />
        </div>
        {ret === "opened" && <div className="oal-two"><Money label="We opened it with" value={openAmt} onChange={setOpenAmt} placeholder="500" /><Money label="Automatic every month" value={monthly} onChange={setMonthly} placeholder="150" /></div>}
        {ret === "already_had" && <Money label="Automatic every month (leave empty if nothing yet)" value={monthly} onChange={setMonthly} placeholder="150" />}
        {ret === "not_yet" && <p className="ocf2-p">That is okay. It takes about 15 minutes. If you are not sure which account or how, {counselor} will help you get it done.</p>}
        {ret && (
          <>
            <OBtn block kind={saved.ret ? "light" : "primary"} disabled={busy === "ret"} onClick={() => void save("ret", { step: "retirement", status: ret, opening: numOr(openAmt), monthly: numOr(monthly) })} style={{ minHeight: 50 }}>
              {busy === "ret" ? "Saving…" : ret === "not_yet" ? `Ask ${counselor} for help` : "Save our answer"}
            </OBtn>
            {saved.ret && <p className="oal-saved"><Check size={13} weight="bold" /> {ret === "not_yet" ? `Saved. Come back and tap "Yes, we opened one" once it is open.` : `Saved${ret === "opened" && openAmt ? `: ${usd(Number(openAmt))} to start` : ""}${monthly ? `, ${usd(Number(monthly))} a month` : ""}.`}</p>}
          </>
        )}
      </div>

      {steps.trump.available !== false && (
        <div className={`oal-step${steps.trump.done ? " is-done" : ""}`}>
          <span className="ocf2-kicker">For your kids</span>
          <h4>There is money waiting in your child's name</h4>
          <p className="ocf2-p">On October 1 the U.S. Treasury opened a Trump Account for every child with a Social Security number. <b>Your child already has one.</b> You cannot see what is in it until a parent claims it.</p>
          <div className="oal-grow" aria-label="$1,000 from the U.S. Treasury, left alone">
            <div><b>$1,000</b><small>at birth</small></div>
            <div><b>$3,996</b><small>at 18</small></div>
            <div className="is-big"><b>$148,780</b><small>at 65</small></div>
          </div>
          <p className="ocf2-p"><b>You have to ask for it.</b> The Treasury gives $1,000 to babies born 2025 through 2028. It is not automatic. You request it in the app when you claim the account.</p>
          <p className="ocf2-p">Child born before 2025? Many children born 2016 through 2024 got $250 from Michael and Susan Dell. You see it once you claim.</p>
          <p className="ocf2-meta">The example uses 8% a year in the market with nothing added. 8% is an example, not a promise.</p>
          <div className="ocf2-chips"><span className="ocf2-chip">Free</span><span className="ocf2-chip">About 10 minutes</span><span className="ocf2-chip">No deposit needed</span></div>
          <p className="ocf2-p"><b>Grab these first:</b> your child's Social Security card and your own ID.</p>
          <OBtn block kind="light" onClick={() => void openExternal(TRUMP_SITE)} style={{ minHeight: 52 }}>Claim it on TrumpAccounts.gov <ArrowSquareOut size={15} weight="bold" /></OBtn>
          <button type="button" className="oal-link" aria-expanded={video} onClick={() => setVideo((v) => !v)}>Watch it done first (7 minutes)</button>
          {video && <OBtn block kind="light" onClick={() => void openExternal(TRUMP_VIDEO)} style={{ minHeight: 48 }}>Play: How to open a Trump Account</OBtn>}
          <p className="ocf2-meta">The official U.S. government site. It opens outside the app, and this page stays here for when you come back.</p>
          <p className="oal-ask">When you are back, tell us where you stand</p>
          <div className="oal-picks" role="group" aria-label="Trump Account">
            <Pick on={ta === "claimed"} title="Done, we claimed it" sub="Our child's account is set up in the app" onClick={() => { setTa("claimed"); setSaved((s) => ({ ...s, ta: false })); }} />
            <Pick on={ta === "not_yet"} title="Not yet" sub="Get help from your guidance counselor" onClick={() => { setTa("not_yet"); setSaved((s) => ({ ...s, ta: false })); }} />
            <Pick on={ta === "no_kids"} title="We don't have kids yet" sub="Or our children are not eligible" onClick={() => { setTa("no_kids"); setSaved((s) => ({ ...s, ta: false })); }} />
          </div>
          {ta === "claimed" && (
            <>
              <div className="oal-kids">
                <span className="oal-ask" style={{ margin: 0 }}>For how many children?</span>
                <span className="oal-stepper">
                  <button type="button" aria-label="One fewer" onClick={() => setKids((k) => Math.max(1, k - 1))}>−</button>
                  <output>{kids}</output>
                  <button type="button" aria-label="One more" onClick={() => setKids((k) => Math.min(20, k + 1))}>+</button>
                </span>
              </div>
              <label className="oal-agree">
                <input type="checkbox" checked={bonus} onChange={(e) => setBonus(e.target.checked)} />
                <span>We asked for the Treasury's $1,000 in the app (babies born 2025 through 2028)</span>
              </label>
            </>
          )}
          {ta === "not_yet" && <p className="ocf2-p">That is okay. If anything is in the way, {counselor} will help you get it done.</p>}
          {ta === "no_kids" && <p className="ocf2-p">No problem. When a baby arrives, come back to this page. Babies born through 2028 start with $1,000 from the Treasury.</p>}
          {ta && (
            <>
              <OBtn block kind={saved.ta ? "light" : "primary"} disabled={busy === "ta"} onClick={() => void save("ta", { step: "trump", status: ta, kids, bonus })} style={{ minHeight: 50 }}>
                {busy === "ta" ? "Saving…" : ta === "not_yet" ? `Ask ${counselor} for help` : "Save our answer"}
              </OBtn>
              {saved.ta && <p className="oal-saved"><Check size={13} weight="bold" /> {ta === "claimed" ? "Saved. That money is now working for your child." : ta === "not_yet" ? `Saved. Come back and tap "Done, we claimed it" when it is finished.` : "Saved."}</p>}
            </>
          )}
          <p className="ocf2-meta">Collective Kindness is not connected to the Treasury or the IRS. There are lookalike sites. Only use the official app or TrumpAccounts.gov.</p>
        </div>
      )}
      {err && <div role="alert" className="ocf2-gentle">{err}</div>}
    </div>
  );
}

/* ── further study ──────────────────────────────────────────────────── */
const KIND: Record<string, string> = { video: "Video", podcast: "Podcast", article: "Article", calculator: "Calculator", tool: "Tool", app: "App", pdf: "PDF", link: "Link" };
export function FurtherStudy({ items }: { items: LessonResource[] }) {
  if (!items.length) return null;
  return (
    <Fold title="Further study" sub={`${items.length} picks for this episode`}>
      <div className="oal-res">
        {items.map((r, k) => (
          <button type="button" key={k} className="oal-res-i" onClick={() => void openExternal(r.href)}>
            <span><b>{r.title}</b><small>{[KIND[r.kind] || "Link", r.blurb].filter(Boolean).join(" · ")}</small></span>
            <ArrowSquareOut size={15} weight="bold" aria-hidden />
          </button>
        ))}
      </div>
    </Fold>
  );
}

/* ── the code ───────────────────────────────────────────────────────── */
/** Six cells, the same look as the family code screen. */
export function CodeCells({ value, onChange, onEnter, disabled }: { value: string; onChange: (v: string) => void; onEnter: () => void; disabled?: boolean }) {
  return (
    <div className="ocf2-code oal-code">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
        onKeyDown={(e) => { if (e.key === "Enter") onEnter(); }}
        autoCapitalize="characters" autoCorrect="off" autoComplete="one-time-code" spellCheck={false} inputMode="text"
        aria-label="Your counselor's code, six letters or numbers" disabled={disabled}
      />
      <div className="ocf2-cells" style={{ gridTemplateColumns: "repeat(6, minmax(0,1fr))" }} aria-hidden>
        {Array.from({ length: 6 }, (_, i) => <b key={i} className={i === value.length ? "focus" : value[i] ? "filled" : "empty"}>{value[i] || ""}</b>)}
      </div>
    </div>
  );
}
