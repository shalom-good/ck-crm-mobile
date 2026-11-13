// CK Academy inside the family page (Shalom 2026-11-11): the join step, the
// guidance counselor card and the two Lesson I check-offs (retirement
// account, Trump Account). Wording follows the approved Lesson I mockup
// ("Now make it real"). Styles: theme/orchard-learn-cka.css (.olc-*).
import { Oil } from "@/components/orchard/Illos";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, CaretRight, Check, Lock, WhatsappLogo } from "@phosphor-icons/react";
import {
  joinAcademy, saveAcademyCheckoff, retirementDone, trumpDone,
  type AcademyJoin, type CheckoffInput, type RetirementStatus, type TrumpStatus,
} from "@/lib/portalApi";
import { openExternal } from "@/lib/external";
import { OBtn, Panel, Face } from "@/components/orchard/family/FamKit";

export const JOIN_KEY = ["academy-join"];
const TRUMP_SITE = "https://trumpaccounts.gov/";
const TRUMP_VIDEO = "https://www.youtube.com/watch?v=bfZV0tDVzJY";
const GENTLE = "We could not sign you up just now. Try again in a little while.";
const money = (n: number | null | undefined) => (n == null ? "" : `$${Math.round(n).toLocaleString("en-US")}`);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const wa = (n?: string | null) => { const d = String(n || "").replace(/\D/g, ""); return d.length >= 10 ? `https://wa.me/${d.length === 10 ? "1" + d : d}` : null; };

/* ── 1. Agree to join ─────────────────────────────────────────────── */
export function JoinCard({ join }: { join: AcademyJoin }) {
  const qc = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const who = join.family.coupleName || join.family.firstName;

  const go = async () => {
    if (!agreed || busy) return;
    setBusy(true); setErr(null);
    try { qc.setQueryData(JOIN_KEY, await joinAcademy(who)); }
    catch { setErr(GENTLE); }
    finally { setBusy(false); }
  };

  return (
    <Panel tone="lilac" className="olc-join oil-host">
      <Oil name="screen" w={92} corner />
      <span className="ocf2-kicker oil-clear" style={{ color: "#2D3766", opacity: .8 }}>First step</span>
      <h2 className="olc-h2 oil-clear">Join CK Academy</h2>
      <p className="ocf2-p" style={{ color: "#2D3766" }}>Eight short episodes on money that lasts, with a guidance counselor beside you.</p>
      <ul className="olc-list">
        <li><i aria-hidden><Check size={12} weight="bold" /></i>About an hour of video, all together</li>
        <li><i aria-hidden><Check size={12} weight="bold" /></i>A guidance counselor you can book</li>
        <li><i aria-hidden><Check size={12} weight="bold" /></i>Two real steps after Episode I</li>
      </ul>
      {who && <p className="olc-who">Joining as <b>{who}</b></p>}
      <label className="olc-agree">
        <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setErr(null); }} />
        <span>We agree to join CK Academy. Our CK team and our guidance counselor can see our progress.</span>
      </label>
      <OBtn block disabled={!agreed || busy} onClick={() => void go()} style={{ minHeight: 54 }}>{busy ? "Joining…" : "Join CK Academy"}</OBtn>
      {err && <div role="alert" className="ocf2-gentle">{err}</div>}
      <p className="ocf2-meta" style={{ color: "#2D3766" }}>We use the name, email and phone your CK team already has.</p>
    </Panel>
  );
}

/* ── 2. The guidance counselor ────────────────────────────────────── */
export function CounselorCard({ join }: { join: AcademyJoin }) {
  const c = join.counselor;
  if (!c) return null;
  const chat = wa(c.whatsapp);
  const upcoming = c.bookedFor && new Date(c.bookedFor).getTime() > Date.now() ? c.bookedFor : null;
  return (
    <Panel className="olc-counselor">
      <div className="olc-counselor-top">
        <Face name={c.name} size={46} tone="lilac" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="ocf2-kicker">Your guidance counselor</span>
          <b className="olc-name">{c.name}</b>
        </div>
        {c.metAt && <span className="ocf2-chip ocf2-t-mint"><Check size={12} weight="bold" /> Met</span>}
      </div>
      <p className="ocf2-p">
        {upcoming ? `Your call is booked for ${day(upcoming)}.`
          : c.metAt ? `You met on ${day(c.metAt)}. Book again any time you have a question.`
          : c.assigned ? `${c.firstName} walks the course with you and helps with the steps after each episode.`
          : "Book a first call to get started. Your counselor walks the course with you."}
      </p>
      <div className="olc-row">
        {c.bookingUrl && <OBtn kind={c.metAt || upcoming ? "light" : "primary"} onClick={() => void openExternal(c.bookingUrl!)} style={{ minHeight: 48, flex: 1 }}><CalendarBlank size={17} weight="bold" /> {upcoming ? "Change the time" : "Book a time"}</OBtn>}
        {chat && <OBtn kind="light" onClick={() => void openExternal(chat)} style={{ minHeight: 48, flex: 1 }}><WhatsappLogo size={18} weight="fill" /> Message {c.firstName}</OBtn>}
      </div>
    </Panel>
  );
}

/* ── 3. Lesson I: a one-line summary for the Learn tab ────────────── */
export function StepsSummary({ join, watchedOne, onOpen }: { join: AcademyJoin; watchedOne: boolean; onOpen: () => void }) {
  const n = (retirementDone(join) ? 1 : 0) + (trumpDone(join) ? 1 : 0);
  return (
    <button type="button" className="olc-sum" onClick={onOpen}>
      <span aria-hidden className={`olc-sum-n${n === 2 ? " is-done" : ""}`}>{n === 2 ? <Check size={16} weight="bold" /> : `${n}/2`}</span>
      <span className="olc-sum-t">
        <b>{n === 2 ? "Episode I steps done" : "Make Episode I real"}</b>
        <small>{n === 2 ? "Retirement account and Trump Account" : watchedOne ? "Two steps: a retirement account and your child's Trump Account" : "Two steps wait at the end of Episode I"}</small>
      </span>
      <CaretRight size={16} weight="bold" aria-hidden />
    </button>
  );
}

/* ── 3. Lesson I: the two check-offs ──────────────────────────────── */
function Opt({ on, title, sub, onClick }: { on: boolean; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" className="olc-opt" aria-pressed={on} onClick={onClick}>
      <i aria-hidden>{on && <Check size={12} weight="bold" />}</i>
      <span><b>{title}</b><small>{sub}</small></span>
    </button>
  );
}
function Money({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="olc-money">
      <span className="ocf2-label">{label}</span>
      <span className="olc-money-in"><em>$</em><input inputMode="numeric" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 7))} /></span>
    </label>
  );
}
function StepCard({ n, kicker, title, done, children }: { n: number; kicker: string; title: string; done: boolean; children: ReactNode }) {
  return (
    <Panel className="olc-step">
      <div className="olc-step-h">
        <div style={{ minWidth: 0 }}>
          <span className="ocf2-kicker">Step {n} of 2 · {kicker}</span>
          <h3 className="olc-h3">{title}</h3>
        </div>
        {done && <span className="ocf2-tick is-done" style={{ width: 28, height: 28, flex: "none" }} aria-label="Done"><Check size={14} weight="bold" /></span>}
      </div>
      {children}
    </Panel>
  );
}

export function LessonOneSteps({ join }: { join: AcademyJoin }) {
  const qc = useQueryClient();
  const counselor = join.counselor?.firstName || "your guidance counselor";
  const r0 = join.checkoffs.retirement;
  const t0 = join.checkoffs.trump;
  const [ret, setRet] = useState<RetirementStatus | null>(r0?.status ?? null);
  const [openAmt, setOpenAmt] = useState(r0?.openAmount != null ? String(r0.openAmount) : "");
  const [monthly, setMonthly] = useState(r0?.monthly != null ? String(r0.monthly) : "");
  const [ta, setTa] = useState<TrumpStatus | null>(t0?.status ?? null);
  const [kids, setKids] = useState(t0?.kids || 1);
  const [bonus, setBonus] = useState(!!t0?.bonus);
  const [busy, setBusy] = useState<"ret" | "ta" | null>(null);
  const [saved, setSaved] = useState<{ ret?: boolean; ta?: boolean }>({});
  const [err, setErr] = useState<string | null>(null);
  const [video, setVideo] = useState(false);

  const save = async (which: "ret" | "ta", input: CheckoffInput) => {
    if (busy) return;
    setBusy(which); setErr(null);
    try { qc.setQueryData(JOIN_KEY, await saveAcademyCheckoff(input)); setSaved((s) => ({ ...s, [which]: true })); }
    catch { setErr("Could not save that. Try again."); }
    finally { setBusy(null); }
  };
  const numOr = (v: string) => (v === "" ? null : Number(v));
  const done = (retirementDone(join) ? 1 : 0) + (trumpDone(join) ? 1 : 0);

  return (
    <div className="olc-steps">
      <div className="olc-steps-h">
        <span className={`ocf2-chip ${done === 2 ? "ocf2-t-mint" : "ocf2-t-butter"}`}>{done} of 2 done</span>
        <h2 className="olc-h2">Now make it real</h2>
        <p className="ocf2-p">Two steps from this episode. Your counselor sees your answers.</p>
      </div>

      <StepCard n={1} kicker="For the two of you" title="Did you open a retirement account?" done={retirementDone(join)}>
        <p className="ocf2-p">Open the account, set a monthly amount, and let time do the rest. Make sure the money is <b>invested in the market</b> once it lands. Cash sitting in the account does not grow.</p>
        <div className="olc-opts" role="group" aria-label="Retirement account">
          <Opt on={ret === "opened"} title="Yes, we opened one" sub="Tell us how much you started with" onClick={() => { setRet("opened"); setSaved((s) => ({ ...s, ret: false })); }} />
          <Opt on={ret === "already_had"} title="We already had one" sub="Opened before the course" onClick={() => { setRet("already_had"); setSaved((s) => ({ ...s, ret: false })); }} />
          <Opt on={ret === "not_yet"} title="Not yet" sub="Get help from your guidance counselor" onClick={() => { setRet("not_yet"); setSaved((s) => ({ ...s, ret: false })); }} />
        </div>
        {ret === "opened" && (
          <div className="olc-follow">
            <div className="olc-two">
              <Money label="We opened it with" value={openAmt} onChange={setOpenAmt} placeholder="500" />
              <Money label="Automatic every month" value={monthly} onChange={setMonthly} placeholder="150" />
            </div>
          </div>
        )}
        {ret === "already_had" && (
          <div className="olc-follow"><Money label="Automatic every month (leave empty if nothing yet)" value={monthly} onChange={setMonthly} placeholder="150" /></div>
        )}
        {ret === "not_yet" && (
          <div className="olc-follow"><p className="ocf2-p">That is okay. It takes about 15 minutes. If you are not sure which account or how, {counselor} will help you get it done.</p></div>
        )}
        {ret && (
          <div className="olc-save">
            <OBtn block kind={saved.ret ? "light" : "primary"} disabled={busy === "ret"} onClick={() => void save("ret", { step: "retirement", status: ret, openAmount: numOr(openAmt), monthly: numOr(monthly) })} style={{ minHeight: 50 }}>
              {busy === "ret" ? "Saving…" : ret === "not_yet" ? `Ask ${counselor} for help` : "Save our answer"}
            </OBtn>
            {saved.ret && <p className="olc-saved"><Check size={13} weight="bold" /> {ret === "not_yet" ? `Saved. ${join.counselor?.firstName || "Your counselor"} will see this. Come back and tap "Yes, we opened one" once it is open.` : `Saved${ret === "opened" && openAmt ? `: ${money(Number(openAmt))} to start` : ""}${monthly ? `, ${money(Number(monthly))} a month` : ""}.`}</p>}
          </div>
        )}
      </StepCard>

      <StepCard n={2} kicker="For your kids" title="There is money waiting in your child's name" done={trumpDone(join)}>
        <p className="ocf2-p">On October 1 the U.S. Treasury opened a Trump Account for every child with a Social Security number. <b>Your child already has one.</b> You cannot see what is in it until a parent claims it.</p>
        <div className="olc-grow" aria-label="$1,000 from the U.S. Treasury, left alone">
          <div><b>$1,000</b><small>at birth</small></div>
          <div><b>$3,996</b><small>at 18</small></div>
          <div className="is-big"><b>$148,780</b><small>at 65</small></div>
        </div>
        <p className="ocf2-p"><b>You have to ask for it.</b> The Treasury gives $1,000 to babies born 2025 through 2028. It is not automatic. You request it in the app when you claim the account.</p>
        <p className="ocf2-p">Child born before 2025? Many children born 2016 through 2024 got $250 from Michael and Susan Dell. You see it once you claim.</p>
        <p className="ocf2-meta">The example uses 8% a year in the market with nothing added. 8% is an example, not a promise.</p>
        <div className="olc-cta">
          <div className="ocf2-chips"><span className="ocf2-chip">Free</span><span className="ocf2-chip">About 10 minutes</span><span className="ocf2-chip">No deposit needed</span></div>
          <p className="ocf2-meta">You can add your own money if you want to, up to $5,000 a year. You do not have to.</p>
          <p className="ocf2-p"><b>Grab these first:</b> your child's Social Security card and your own ID.</p>
          <OBtn block onClick={() => void openExternal(TRUMP_SITE)} style={{ minHeight: 52 }}>Claim it on TrumpAccounts.gov</OBtn>
          <button type="button" className="ocf2-link olc-vid" aria-expanded={video} onClick={() => setVideo((v) => !v)}>Watch it done first (7 minutes)</button>
          {video && <OBtn block kind="light" onClick={() => void openExternal(TRUMP_VIDEO)} style={{ minHeight: 48 }}>Play: How to open a Trump Account</OBtn>}
          <p className="ocf2-meta">The official U.S. government site. It opens outside the app, and this page stays here for when you come back.</p>
        </div>
        <p className="olc-q">When you are back, tell us where you stand</p>
        <div className="olc-opts" role="group" aria-label="Trump Account">
          <Opt on={ta === "claimed"} title="Done, we claimed it" sub="Our child's account is set up in the app" onClick={() => { setTa("claimed"); setSaved((s) => ({ ...s, ta: false })); }} />
          <Opt on={ta === "not_yet"} title="Not yet" sub="Get help from your guidance counselor" onClick={() => { setTa("not_yet"); setSaved((s) => ({ ...s, ta: false })); }} />
          <Opt on={ta === "no_kids"} title="We don't have kids yet" sub="Or our children are not eligible" onClick={() => { setTa("no_kids"); setSaved((s) => ({ ...s, ta: false })); }} />
        </div>
        {ta === "claimed" && (
          <div className="olc-follow">
            <div className="olc-kids">
              <span className="olc-q" style={{ margin: 0 }}>For how many children?</span>
              <span className="olc-stepper">
                <button type="button" aria-label="One fewer" onClick={() => setKids((k) => Math.max(1, k - 1))}>−</button>
                <output>{kids}</output>
                <button type="button" aria-label="One more" onClick={() => setKids((k) => Math.min(20, k + 1))}>+</button>
              </span>
            </div>
            <label className="olc-agree is-plain">
              <input type="checkbox" checked={bonus} onChange={(e) => setBonus(e.target.checked)} />
              <span>We asked for the Treasury's $1,000 in the app (babies born 2025 through 2028)</span>
            </label>
          </div>
        )}
        {ta === "not_yet" && <div className="olc-follow"><p className="ocf2-p">That is okay. If anything is in the way, {counselor} will help you get it done.</p></div>}
        {ta === "no_kids" && <div className="olc-follow"><p className="ocf2-p">No problem. When a baby arrives, come back to this page. Babies born through 2028 start with $1,000 from the Treasury.</p></div>}
        {ta && (
          <div className="olc-save">
            <OBtn block kind={saved.ta ? "light" : "primary"} disabled={busy === "ta"} onClick={() => void save("ta", { step: "trump", status: ta, kids, bonus })} style={{ minHeight: 50 }}>
              {busy === "ta" ? "Saving…" : ta === "not_yet" ? `Ask ${counselor} for help` : "Save our answer"}
            </OBtn>
            {saved.ta && <p className="olc-saved"><Check size={13} weight="bold" /> {ta === "claimed" ? "Saved. That money is now working for your child." : ta === "not_yet" ? `Saved. ${join.counselor?.firstName || "Your counselor"} will see this. Come back and tap "Done, we claimed it" when it is finished.` : "Saved."}</p>}
          </div>
        )}
        <p className="ocf2-meta">Collective Kindness is not connected to the Treasury or the IRS. There are lookalike sites. Only use the official app or TrumpAccounts.gov.</p>
      </StepCard>
      {err && <div role="alert" className="ocf2-gentle">{err}</div>}
    </div>
  );
}

/** Shown in place of an episode while the family has not joined yet. */
export function LockedNote({ onBack }: { onBack: () => void }) {
  return (
    <Panel tone="butter" className="olc-locked">
      <span aria-hidden className="olc-lock"><Lock size={18} weight="bold" /></span>
      <p className="ocf2-p" style={{ color: "#3F360A", fontWeight: 700 }}>Join CK Academy to open the episodes. It takes one tap.</p>
      <OBtn block onClick={onBack} style={{ minHeight: 50 }}>Go to the join step</OBtn>
    </Panel>
  );
}
