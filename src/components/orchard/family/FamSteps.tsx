// @ts-nocheck
// COPY of the CRM's components/portal/PortalSteps.jsx (ck-crm-template), so the
// app and the web portal show the same steps. Change both together.
// =====================================================================
// PortalSteps — the top of the family portal (2026-11-08, Minsky's
// feedback: "open up and see their tasks, what do we need to do and did
// I do it yes or no, and check it off").
//
//   1. Right now   one task, one big button
//   2. Your steps  1, 2, 3 … each with its real tasks; the current step
//                  is open, finished steps fold up, later steps say what
//                  opens them
//   3. To-do list  homework, budget, next session (after signing)
//
// Colour coding by kind of task (Message, Book, Read and sign, Meet,
// Do it, On us) with a Colors on / off switch. Icons and words stay in
// plain mode, so colour is never the only cue.
//
// Data: lib/portal/steps.js (pure). Writes: homework ticks go through the
// parent (PATCH /api/portal/homework/[id]); the few tasks the system
// cannot see (sent the WhatsApp, read the plan) are ticked on this device.
// =====================================================================

import { Oil, oilForKind } from "@/components/orchard/Illos";
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildPortalSteps, KINDS } from '@/lib/portalSteps';

const LS_COLORS = 'ck_portal_colors';
const lsGet = (k) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* private mode */ } };

export function KindIcon({ kind, size = 15 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (kind) {
    case 'message': return <svg {...p}><path d="M4 5.5h16v10.5H9l-5 4z" /><path d="M8.5 10.5h7" /></svg>;
    case 'book': return <svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>;
    case 'read': return <svg {...p}><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4M9 13h6M9 16.5h4" /></svg>;
    case 'meet': return <svg {...p}><circle cx="9" cy="8.5" r="3.2" /><circle cx="17" cy="9.5" r="2.5" /><path d="M3.5 19.5c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5M15 14.6c2.6-.3 4.7 1.2 5.3 4.4" /></svg>;
    case 'do': return <svg {...p}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 12.2l2.4 2.4 4.8-5" /></svg>;
    case 'wait': return <svg {...p}><path d="M7 3.5h10M7 20.5h10M8 3.5c0 5 8 5 8 8.5s-8 3.5-8 8.5M16 3.5c0 5-8 5-8 8.5" /></svg>;
    case 'lock': return <svg {...p}><rect x="5" y="11" width="14" height="9.5" rx="2.5" /><path d="M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11" /></svg>;
    default: return null;
  }
}

function CheckMark({ done }) {
  return (
    <svg className="ps-ck-svg" viewBox="0 0 32 32" aria-hidden="true">
      <circle className="ps-ck-ring" cx="16" cy="16" r="13.5" />
      <circle className="ps-ck-fill" cx="16" cy="16" r="13.5" />
      {done && <path className="ps-ck-tick" d="M10 16.5l4.2 4.2L22.5 12" />}
    </svg>
  );
}

function ActionBtn({ action, onOpenPlan, big = false }) {
  if (!action) return null;
  const cls = big ? 'ps-go ps-go-big' : 'ps-go';
  if (action.plan) return <button type="button" className={cls} onClick={onOpenPlan}>{action.label}<span aria-hidden="true">→</span></button>;
  return (
    <a className={cls} href={action.href} {...(action.ext ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {action.label}<span aria-hidden="true">→</span>
    </a>
  );
}

function YesNo({ t }) {
  if (t.done) return <span className="ps-yn yes">{t.selfChecked ? 'Done (you)' : 'Done'} ✓</span>;
  if (t.locked) return <span className="ps-yn later">Later</span>;
  if (t.onUs) return t.kind === 'wait' ? null : <span className="ps-yn onus">Coming up</span>;
  return <span className="ps-yn no">Not yet</span>;
}

function TaskRow({ t, onTick, busy, onOpenPlan, popped }) {
  const tickable = !!t.canSelfCheck && !t.locked;
  const cls = ['ps-task', `tone-${KINDS[t.kind]?.tone || 'grey'}`, t.done ? 'is-done' : '', t.locked ? 'is-locked' : '', popped ? 'is-pop' : ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {tickable ? (
        <button
          type="button" className="ps-ck" onClick={() => onTick(t)} disabled={busy}
          aria-pressed={t.done} aria-label={t.done ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`}
        >
          <CheckMark done={t.done} />
        </button>
      ) : (
        <span className="ps-ck ps-ck-auto" aria-hidden="true">
          {t.locked ? <span className="ps-ck-lock"><KindIcon kind="lock" size={14} /></span> : <CheckMark done={t.done} />}
        </span>
      )}
      <div className="ps-tbody">
        <div className="ps-tline">
          <span className="ps-kind"><KindIcon kind={t.kind} size={13} />{t.label}</span>
          <YesNo t={t} />
        </div>
        <div className="ps-ttitle">{t.title}</div>
        {t.locked
          ? <div className="ps-twhy"><KindIcon kind="lock" size={12} /> {t.locked}</div>
          : t.why ? <div className="ps-twhy">{t.why}</div> : null}
      </div>
      {!t.done && !t.locked && t.action && (
        <div className="ps-tact"><ActionBtn action={t.action} onOpenPlan={onOpenPlan} /></div>
      )}
      {t.done && t.action && /join/i.test(t.action.label) && (
        <div className="ps-tact"><ActionBtn action={t.action} onOpenPlan={onOpenPlan} /></div>
      )}
    </div>
  );
}

// ── Swipe cards for the to-do list (Leivi's Cards idea, for families):
// one task in front of you; swipe left = done, right = later; buttons too.
// Card colours cycle so the card behind always looks different (Shalom
// 2026-11-08: "add some orange and pink"). Keyed to the task, so a card
// keeps its colour while it flies off or comes back from Later.
const DECK_TONES = ['butter', 'orange', 'pink', 'lime', 'sky'];
function deckTone(id, order) {
  const i = order.indexOf(id);
  return DECK_TONES[(i < 0 ? 0 : i) % DECK_TONES.length];
}

function SwipeDeck({ items, order = [], onDone, onLater, onOpenPlan }) {
  const [fly, setFly] = useState(null);
  const [dx, setDx] = useState(0);
  const drag = useRef(null);
  const top = items[0];
  const go = (it, dir) => {
    if (fly || !it) return;
    setFly({ id: it.id, dir }); setDx(0);
    setTimeout(() => { setFly(null); if (dir < 0 && it.canSelfCheck) onDone(it); else onLater(it); }, 220);
  };
  const onDown = (e) => { if (fly || e.button > 0) return; drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, on: false }; };
  const onMove = (e) => {
    const d = drag.current; if (!d) return;
    const mx = e.clientX - d.x; const my = e.clientY - d.y;
    if (!d.on) {
      if (Math.abs(mx) < 8) return;
      if (Math.abs(my) > Math.abs(mx)) { drag.current = null; return; }
      d.on = true; try { e.currentTarget.setPointerCapture(d.id); } catch { /* ignore */ }
    }
    setDx(mx);
  };
  const onUp = () => { const d = drag.current; drag.current = null; if (!d?.on) return; if (Math.abs(dx) > 90) go(top, Math.sign(dx)); else setDx(0); };
  if (!top) {
    return (
      <div className="ps-deck-clear"><span className="ps-deck-chk">✓</span><div><b>All done</b><p>Nothing left on your list. New tasks show up here after each session.</p></div></div>
    );
  }
  const leftLabel = top.canSelfCheck ? 'Done' : 'Not now';
  return (
    <div className="ps-deck">
      <div className="ps-deck-stage">
        {items.slice(0, 3).map((it, i) => {
          const isTop = i === 0;
          const flying = fly && fly.id === it.id;
          const style = isTop
            ? { zIndex: 3, transform: flying ? `translateX(${fly.dir * 130}%) rotate(${fly.dir * 14}deg)` : dx ? `translateX(${dx}px) rotate(${dx / 18}deg)` : undefined, opacity: flying ? 0 : 1, transition: dx && !flying ? 'none' : undefined }
            : { zIndex: 3 - i };
          return (
            <div key={it.id} className={`ps-dcard deck-${deckTone(it.id, order)}${isTop ? '' : i === 1 ? ' under' : ' under2'}`} style={style}
              {...(isTop ? { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp } : { 'aria-hidden': true })}>
              {isTop && <><span className="ps-dhint l" style={{ opacity: Math.min(1, -dx / 80) }}>{leftLabel}</span><span className="ps-dhint r" style={{ opacity: Math.min(1, dx / 80) }}>Later</span></>}
              <div className="ps-dtop"><span className="ps-dtag"><KindIcon kind={it.kind} size={13} />{it.label}</span><span className="ps-yn no">Not yet</span></div>
              <div className="ps-dtitle">{it.title}</div>
              {it.why ? <p className="ps-dwhy">{it.why}</p> : null}
              {it.action ? <div className="ps-dfoot" onPointerDown={(e) => e.stopPropagation()}><ActionBtn action={it.action} onOpenPlan={onOpenPlan} /></div> : null}
            </div>
          );
        }).reverse()}
      </div>
      <div className="ps-deck-acts">
        <button type="button" className="ps-dbtn done" onClick={() => go(top, -1)}>{top.canSelfCheck ? '✓ Done' : 'Not now'}</button>
        <span className="ps-dcnt">{items.length} left</span>
        <button type="button" className="ps-dbtn later" onClick={() => go(top, 1)}>Later →</button>
      </div>
      <div className="ps-deck-lead">Swipe left when it is done, right for later.</div>
    </div>
  );
}

export default function PortalSteps({ d, budget = null as any, qs = '', onOpenPlan, onToggleHomework, hwBusy = null as string | null, hideNow = false, stepsSlot = null as HTMLElement | null, stepsCollapsible = false }: any) {
  // Leivi 2026-11-11: the steps list sits at the foot of the page, folded shut.
  const [stepsOpen, setStepsOpen] = useState(() => !stepsCollapsible || lsGet('ck_portal_steps_open') === 'on');
  const toggleSteps = () => setStepsOpen((o) => { lsSet('ck_portal_steps_open', o ? 'off' : 'on'); return !o; });
  const famKey = `ck_portal_checks_${String(d?.name || 'family').replace(/\s+/g, '_')}`;
  const [local, setLocal] = useState(() => new Set());
  const [colors, setColors] = useState(true);
  const [open, setOpen] = useState(null); // step key that is open (null = the current one)
  const [popped, setPopped] = useState(null);
  const popTimer = useRef(null);
  const [view, setView] = useState('list'); // to-do list: cards | list
  const [later, setLater] = useState([]); // ids sent to the back of the cards
  const [undo, setUndo] = useState(null); // { t, timer }

  useEffect(() => {
    const saved = lsGet(famKey);
    if (saved) { try { setLocal(new Set(JSON.parse(saved))); } catch { /* ignore */ } }
    if (lsGet(LS_COLORS) === 'off') setColors(false);
    const v = lsGet('ck_portal_todo_view');
    if (v === 'cards' || v === 'list') setView(v);
    else if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)').matches) setView('cards');
  }, [famKey]);
  useEffect(() => () => clearTimeout(popTimer.current), []);

  const model = useMemo(() => buildPortalSteps(d, { budget, local, qs }), [d, budget, local, qs]);
  const { steps, todo, now, doneSteps, totalSteps } = model;
  const current = steps.find((s) => s.status === 'current') || null;
  const openKey = open ?? current?.key ?? null;
  const signed = !!d?.plan?.signature || !!d?.plan?.signedEffective;

  const pop = (id) => {
    setPopped(id);
    clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPopped(null), 900);
  };

  const tick = (t) => {
    if (t.homework) {
      if (!t.homework.done) pop(t.id);
      onToggleHomework?.(t.homework);
      return;
    }
    setLocal((prev) => {
      const next = new Set(prev);
      if (next.has(t.id)) next.delete(t.id); else { next.add(t.id); pop(t.id); }
      lsSet(famKey, JSON.stringify([...next]));
      return next;
    });
  };

  const toggleColors = () => {
    setColors((c) => { lsSet(LS_COLORS, c ? 'off' : 'on'); return !c; });
  };

  const rowProps = { onTick: tick, onOpenPlan };

  // ── Right now ──
  const nowCard = now ? (
    <section className={`ps-now oil-host${now.onUs ? ' is-wait' : ''}`} aria-label="Right now">
      <Oil name={oilForKind(now.onUs ? 'onus' : now.kind)} w={84} corner />
      <div className="ps-now-top">
        <span className="ps-nowlbl">Right now{now.stepN ? ` · Step ${now.stepN}` : ''}</span>
        <span className="ps-now-kind"><KindIcon kind={now.kind} size={13} />{now.label}</span>
      </div>
      <div className="ps-now-h" role="heading" aria-level={2}>{now.title}</div>
      {now.why && <p className="ps-now-p">{now.why}</p>}
      <div className="ps-now-acts">
        {now.homework ? (
          <>
            {now.action && <ActionBtn action={now.action} onOpenPlan={onOpenPlan} big />}
            <button type="button" className={now.action ? 'ps-did' : 'ps-go ps-go-big'} onClick={() => tick(now)} disabled={hwBusy === now.homework.id}>{now.action ? 'I did it ✓' : <>I did it<span aria-hidden="true">✓</span></>}</button>
          </>
        ) : (
          <ActionBtn action={now.action} onOpenPlan={onOpenPlan} big />
        )}
        {!now.homework && now.canSelfCheck && (
          <button type="button" className="ps-did" onClick={() => tick(now)}>I already did this</button>
        )}
      </div>
    </section>
  ) : (
    <section className="ps-now is-clear oil-host" aria-label="Right now">
      <Oil name="done" w={84} corner />
      <span className="ps-nowlbl">Right now</span>
      <div className="ps-now-h" role="heading" aria-level={2}>You are all caught up</div>
      <p className="ps-now-p">Nothing is waiting on you today. New tasks show up here after each session.</p>
    </section>
  );

  // ── Your steps ──
  const stepsCard = (
    <section className="ps-card" aria-label="Your steps">
      <div className="ps-head">
        <div>
          <span className="ps-eyebrow">Your steps</span>
          <div className="ps-head-h">{doneSteps} of {totalSteps} done{current ? <span>now on step {current.n}</span> : null}</div>
        </div>
        {stepsCollapsible && <Oil name="trail" w={78} frac={totalSteps ? doneSteps / totalSteps : 0} className="oil-drop" style={{ marginLeft: 'auto' }} />}
        {stepsCollapsible ? (
          <button type="button" className="ps-fold" aria-expanded={stepsOpen} onClick={toggleSteps}>
            {stepsOpen ? 'Hide' : 'Show all'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: stepsOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }}><path d="m6 9 6 6 6-6" /></svg>
          </button>
        ) : (
        <button type="button" className={`ps-switch${colors ? ' on' : ''}`} role="switch" aria-checked={colors} onClick={toggleColors}>
          <span className="ps-switch-t" aria-hidden="true"><i /></span>Colors
        </button>
        )}
      </div>
      <div className="ps-bar" aria-hidden="true">
        {steps.map((s) => <span key={s.key} className={s.status} />)}
      </div>
      {stepsOpen && colors && (
        <div className="ps-legend" aria-label="What the colors mean">
          {Object.entries(KINDS).map(([k, v]) => (
            <span key={k} className={`ps-kind tone-${v.tone}`}><KindIcon kind={k} size={12} />{v.label}</span>
          ))}
        </div>
      )}
      {stepsOpen && <ol className="ps-steps">
        {steps.map((s) => {
          const isOpen = openKey === s.key;
          const hasTasks = s.tasks.length > 0;
          const sub = s.status === 'done'
            ? (s.date ? `Done ${s.date}` : 'Done')
            : s.note
              ? s.note
              : hasTasks ? `${s.doneTasks} of ${s.tasks.length} done` : '';
          return (
            <li key={s.key} className={`ps-step ${s.status}${isOpen ? ' open' : ''}`}>
              <button
                type="button" className="ps-step-h"
                onClick={() => hasTasks && setOpen(isOpen ? '__none' : s.key)}
                aria-expanded={hasTasks ? isOpen : undefined}
                disabled={!hasTasks}
              >
                <span className="ps-num">{s.status === 'done' ? <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg> : s.n}</span>
                <span className="ps-step-t">
                  <b>{s.title}</b>
                  {sub && <small>{sub}</small>}
                </span>
                {s.status === 'current' && <span className="ps-now-tag">Now</span>}
                {hasTasks && <span className="ps-chev" aria-hidden="true">›</span>}
              </button>
              {isOpen && hasTasks && (
                <div className="ps-tasks">
                  {s.tasks.map((t) => <TaskRow key={t.id} t={t} popped={popped === t.id} {...rowProps} />)}
                </div>
              )}
            </li>
          );
        })}
      </ol>}
    </section>
  );

  // ── To-do list ──
  const todoOpen = todo.filter((t) => !t.done).length;
  const deckItems = [...todo.filter((t) => !t.done && !later.includes(t.id)), ...later.map((id) => todo.find((t) => t.id === id && !t.done)).filter(Boolean)];
  const pickView = (v) => { setView(v); lsSet('ck_portal_todo_view', v); };
  const doneFromDeck = (t) => {
    tick(t);
    clearTimeout(undo?.timer);
    setUndo({ t, timer: setTimeout(() => setUndo(null), 5000) });
  };
  const undoDone = () => {
    if (!undo) return;
    clearTimeout(undo.timer);
    const t = undo.t;
    setUndo(null);
    if (t.homework) onToggleHomework?.({ ...t.homework, done: true });
    else tick({ ...t });
  };
  const laterFromDeck = (t) => setLater((l) => [...l.filter((x) => x !== t.id), t.id]);
  const todoCard = todo.length > 0 && (
    <section className="ps-card" aria-label="Your to-do list">
      <div className="ps-head">
        <div>
          <span className="ps-eyebrow">Your to-do list</span>
          <div className="ps-head-h">{todoOpen ? `${todoOpen} to do` : 'All done'}<span>{todo.length - todoOpen} of {todo.length} checked off</span></div>
          {view === 'list' && todo.some((t) => t.homework && !t.done) && <div className="ps-hint">Did it? Tap the circle to check it off.</div>}
        </div>
        <div className="ps-seg" role="tablist" aria-label="Show as">
          <button type="button" role="tab" aria-selected={view === 'cards'} className={view === 'cards' ? 'on' : ''} onClick={() => pickView('cards')}>Cards</button>
          <button type="button" role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'on' : ''} onClick={() => pickView('list')}>List</button>
        </div>
      </div>
      {view === 'cards' ? (
        <SwipeDeck items={deckItems} order={todo.map((t) => t.id)} onDone={doneFromDeck} onLater={laterFromDeck} onOpenPlan={onOpenPlan} />
      ) : (
        <div className="ps-tasks ps-tasks-flat">
          {todo.map((t) => (
            <TaskRow key={t.id} t={t} popped={popped === t.id} busy={t.homework && hwBusy === t.homework.id} {...rowProps} />
          ))}
        </div>
      )}
      {undo && (
        <div className="ps-undo" role="status">Checked off: <b>{undo.t.title}</b><button type="button" onClick={undoDone}>Undo</button></div>
      )}
      <div className="ps-fine">New homework shows up here after each session.</div>
    </section>
  );

  return (
    <div className={`ps${colors ? '' : ' ps-plain'}`}>
      {!hideNow && nowCard}
      {stepsSlot ? todoCard : signed ? <>{todoCard}{stepsCard}</> : <>{stepsCard}{todoCard}</>}
      {stepsSlot && createPortal(<div className={`ps${colors ? '' : ' ps-plain'}`}>{stepsCard}</div>, stepsSlot)}
      <PortalStepsStyles />
    </div>
  );
}

export function PortalStepsStyles() {
  return <style dangerouslySetInnerHTML={{ __html: PORTAL_STEPS_CSS }} />;
}

export const PORTAL_STEPS_CSS = `
.ps { --ps-ink:#1C2E29; --ps-mid:#5F6D68; --ps-quiet:#86928C; --ps-line:#EAEDE7; --ps-inset:#F4F6F2;
  --ps-forest:#2F7556; --ps-lime:#D7F36E; --ps-mint:#E0EDE4; --ps-done:#EEF7EF;
  display:flex; flex-direction:column; gap:14px; margin-top:14px; font-family:'Plus Jakarta Sans','Inter',system-ui,sans-serif; color:var(--ps-ink); }
.ps .tone-green { --t-bg:#DDF3E6; --t-fg:#1F6B43; --t-ring:#3FA36F; }
.ps .tone-sky { --t-bg:#DCE8F5; --t-fg:#2C5A8A; --t-ring:#5B8EC4; }
.ps .tone-lilac { --t-bg:#EBDDF5; --t-fg:#6A3F8C; --t-ring:#9A6FC0; }
.ps .tone-peach { --t-bg:#F8DCC9; --t-fg:#8C4A22; --t-ring:#D08354; }
.ps .tone-butter { --t-bg:#FBEFA6; --t-fg:#6B5A00; --t-ring:#C9AE1E; }
.ps .tone-grey { --t-bg:#ECEFEA; --t-fg:#5F6D68; --t-ring:#9AA59F; }
.ps.ps-plain [class*="tone-"] { --t-bg:#F1F3EF; --t-fg:#3F4B46; --t-ring:#9AA59F; }

/* Right now */
.ps-now { background:var(--ps-mint); color:var(--ps-ink); border-radius:24px; padding:22px 22px 20px; position:relative; overflow:hidden;
  box-shadow:0 1px 2px rgba(28,46,41,.04),0 8px 24px rgba(28,46,41,.06); animation:psRise .6s cubic-bezier(.2,.8,.2,1) both; }
.ps-now-top { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.ps .ps-now .ps-nowlbl { font-size:11.5px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--ps-forest) !important; opacity:1; }
.ps-now-kind { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; color:var(--ps-forest); background:#fff; border-radius:999px; padding:4px 10px; }
.ps .ps-now-h { color:var(--ps-ink); font-size:25px; line-height:1.18; font-weight:800; letter-spacing:-.02em; margin:12px 0 6px; max-width:30ch; }
.ps-now-p { font-size:14px; line-height:1.55; color:var(--ps-mid); margin:0; max-width:52ch; font-weight:500; }
.ps-now-acts { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:16px; }
.ps-now .ps-go-big { background:var(--ps-forest); color:var(--ps-lime); position:relative; z-index:1; }
.ps-did { font:inherit; font-size:13px; font-weight:650; color:var(--ps-ink); background:none; border:0; border-bottom:1.5px solid rgba(28,46,41,.3); padding:0 0 1px; cursor:pointer; }
.ps-now.is-wait::after, .ps-now.is-clear::after { display:none; }
.ps .ps-now.is-wait .ps-now-h, .ps .ps-now.is-clear .ps-now-h { color:var(--ps-ink); }
.ps-now.is-wait { background:#fff; color:var(--ps-ink); box-shadow:0 1px 2px rgba(28,46,41,.04),0 8px 24px rgba(28,46,41,.06); }
.ps .ps-now.is-wait .ps-nowlbl { color:var(--ps-forest) !important; }
.ps-now.is-wait .ps-now-kind { background:var(--ps-inset); color:var(--ps-mid); }
.ps-now.is-wait .ps-now-p { color:var(--ps-mid); }
.ps-now.is-clear { background:var(--ps-mint); color:var(--ps-ink); box-shadow:none; }
.ps .ps-now.is-clear .ps-nowlbl { color:var(--ps-forest) !important; }
.ps-now.is-clear .ps-now-p { color:var(--ps-mid); }

/* Buttons */
.ps-go { box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:42px; padding:0 18px; border-radius:14px; border:0;
  background:var(--ps-forest); color:#fff; font:inherit; font-size:13.5px; font-weight:750; text-decoration:none; cursor:pointer; white-space:nowrap;
  transition:transform .12s ease, opacity .12s ease; }
.ps-go:hover { opacity:.9; }
.ps-go:active { transform:scale(.97); }
.ps-go span { font-size:15px; line-height:1; }
.ps-go-big { min-height:52px; padding:0 24px; font-size:15.5px; border-radius:16px; }
.ps-go:disabled { opacity:.5; cursor:default; }

/* Cards */
.ps-card { background:#fff; border-radius:22px; padding:20px 20px 16px; box-shadow:0 1px 2px rgba(28,46,41,.04),0 8px 24px rgba(28,46,41,.06);
  animation:psRise .6s cubic-bezier(.2,.8,.2,1) .08s both; }
.ps-fold { display:inline-flex; align-items:center; gap:6px; min-height:44px; padding:0 14px; border:0; border-radius:999px; background:var(--ps-inset); color:var(--ps-mid); font:inherit; font-size:12.5px; font-weight:800; cursor:pointer; flex:none; }
.ps-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.ps-eyebrow { font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--ps-quiet); }
.ps-head-h { font-size:19px; font-weight:800; letter-spacing:-.015em; margin-top:4px; }
.ps-head-h span { font-size:13px; font-weight:600; color:var(--ps-quiet); margin-left:7px; letter-spacing:0; }
.ps-head-h span::before { content:'· '; }
.ps-hint { font-size:12.5px; font-weight:600; color:var(--ps-mid); margin-top:4px; }
.ps-fine { font-size:12px; color:var(--ps-quiet); font-weight:500; margin-top:12px; }

/* Colors switch */
.ps-switch { display:inline-flex; align-items:center; gap:8px; font:inherit; font-size:12.5px; font-weight:700; color:var(--ps-mid); background:var(--ps-inset);
  border:0; border-radius:999px; padding:6px 12px 6px 7px; cursor:pointer; flex:none; }
.ps-switch-t { width:30px; height:18px; border-radius:999px; background:#CDD3CE; position:relative; transition:background .2s ease; }
.ps-switch-t i { position:absolute; left:2px; top:2px; width:14px; height:14px; border-radius:50%; background:#fff; transition:transform .2s ease; box-shadow:0 1px 2px rgba(0,0,0,.15); }
.ps-switch.on .ps-switch-t { background:var(--ps-forest); }
.ps-switch.on .ps-switch-t i { transform:translateX(12px); }

/* Progress bar */
.ps-bar { display:flex; gap:5px; margin:14px 0 4px; }
.ps-bar span { flex:1; height:8px; border-radius:6px; background:#E9ECE7; position:relative; overflow:hidden; }
.ps-bar span.done::after, .ps-bar span.current::after { content:""; position:absolute; inset:0; border-radius:inherit; background:var(--ps-forest); transform-origin:left; animation:psFill .55s ease both; }
.ps-bar span.current::after { background:var(--ps-lime); }
.ps-bar span:nth-child(2)::after { animation-delay:.1s; } .ps-bar span:nth-child(3)::after { animation-delay:.2s; }
.ps-bar span:nth-child(4)::after { animation-delay:.3s; } .ps-bar span:nth-child(n+5)::after { animation-delay:.4s; }

.ps-legend { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0 2px; }

/* Kind chip */
.ps-kind { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:750; border-radius:999px; padding:3px 9px 3px 7px;
  background:var(--t-bg); color:var(--t-fg); white-space:nowrap; }

/* Steps */
.ps-steps { list-style:none; margin:10px 0 0; padding:0; }
.ps-step { border-top:1px solid var(--ps-line); }
.ps-step:first-child { border-top:0; }
.ps-step-h { width:100%; display:flex; align-items:center; gap:13px; padding:13px 2px; background:none; border:0; font:inherit; color:inherit; text-align:left; cursor:pointer; }
.ps-step-h:disabled { cursor:default; }
.ps-num { width:34px; height:34px; flex:0 0 34px; border-radius:50%; display:grid; place-items:center; font-size:14.5px; font-weight:800;
  background:#EEF1EC; color:var(--ps-quiet); font-variant-numeric:tabular-nums; }
.ps-step.done .ps-num { background:var(--ps-forest); color:var(--ps-lime); }
.ps-step.current .ps-num { background:var(--ps-lime); color:var(--ps-forest); box-shadow:0 0 0 5px #EEF8C8; }
.ps-step-t { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.ps-step-t b { font-size:15.5px; font-weight:750; letter-spacing:-.005em; }
.ps-step.upcoming .ps-step-t b { color:var(--ps-mid); font-weight:650; }
.ps-step-t small { font-size:12.5px; font-weight:550; color:var(--ps-quiet); }
.ps-step.done .ps-step-t small { color:#3B7A2A; }
.ps-now-tag { font-size:10.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--ps-forest); background:var(--ps-lime); border-radius:999px; padding:3px 9px; }
.ps-chev { font-size:20px; color:#B5BDB8; transition:transform .2s ease; line-height:1; }
.ps-step.open .ps-chev { transform:rotate(90deg); }
.ps-tasks { display:flex; flex-direction:column; gap:8px; padding:0 0 14px 47px; animation:psRise .35s ease both; }
.ps-tasks-flat { padding:12px 0 0; }

/* Task row */
.ps-task { display:flex; align-items:center; gap:12px; background:var(--ps-inset); border-radius:16px; padding:12px 14px 12px 10px; transition:background .35s ease; }
.ps-task.is-done { background:var(--ps-done); }
.ps-task.is-locked { opacity:.72; }
.ps-ck { width:44px; height:44px; flex:0 0 44px; display:grid; place-items:center; background:none; border:0; padding:0; cursor:pointer; border-radius:50%; }
.ps-ck:focus-visible { outline:2px solid var(--ps-forest); outline-offset:2px; }
.ps-ck-auto { cursor:default; }
.ps-ck-svg { width:32px; height:32px; overflow:visible; }
.ps-ck-ring { fill:#fff; stroke:var(--t-ring); stroke-width:2.4; }
.ps-ck-fill { fill:var(--ps-forest); transform-origin:center; transform:scale(0); transition:transform .3s cubic-bezier(.3,1.6,.5,1); }
.ps-task.is-done .ps-ck-fill { transform:scale(1); }
.ps-task.is-done .ps-ck-ring { stroke:var(--ps-forest); }
.ps-ck-tick { fill:none; stroke:var(--ps-lime); stroke-width:3.2; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:24; stroke-dashoffset:24; animation:psDraw .45s ease .12s forwards; }
.ps-ck-auto .ps-ck-ring { stroke-dasharray:3 3.4; }
.ps-task.is-done .ps-ck-auto .ps-ck-ring { stroke-dasharray:none; }
.ps-ck-lock { width:32px; height:32px; border-radius:50%; background:#fff; display:grid; place-items:center; color:var(--ps-quiet); }
.ps-task.is-pop .ps-ck-svg { animation:psPop .5s cubic-bezier(.3,1.6,.5,1); }
.ps-task.is-pop { animation:psGlow .9s ease; }
.ps-tbody { flex:1; min-width:0; }
.ps-tline { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.ps-ttitle { font-size:15px; font-weight:700; line-height:1.35; margin-top:5px; color:var(--ps-ink); }
.ps-task.is-done .ps-ttitle { color:var(--ps-mid); text-decoration:line-through; text-decoration-color:rgba(47,117,86,.35); text-decoration-thickness:1.5px; }
.ps-twhy { font-size:12.5px; line-height:1.5; color:var(--ps-mid); font-weight:500; margin-top:2px; display:flex; align-items:center; gap:5px; }
.ps-tact { flex:none; }

/* Done: yes or no */
.ps-yn { font-size:11px; font-weight:800; letter-spacing:.02em; border-radius:999px; padding:2px 8px; white-space:nowrap; }
.ps-yn.yes { background:#D4EDC4; color:#2B6A1F; }
.ps-yn.no { background:#fff; color:#9A4A2F; box-shadow:inset 0 0 0 1.5px #F0CDBF; }
.ps-yn.later { background:#fff; color:var(--ps-quiet); box-shadow:inset 0 0 0 1.5px var(--ps-line); }
.ps-yn.onus { background:#fff; color:var(--ps-mid); box-shadow:inset 0 0 0 1.5px var(--ps-line); }


/* Cards / List switch */
.ps-seg { display:inline-flex; background:var(--ps-inset); border-radius:999px; padding:3px; flex:none; }
.ps-seg button { font:inherit; font-size:12.5px; font-weight:700; color:var(--ps-mid); background:none; border:0; border-radius:999px; padding:6px 13px; cursor:pointer; }
.ps-seg button.on { background:var(--ps-forest); color:var(--ps-lime); }

/* Swipe cards */
.ps-deck { margin-top:14px; }
.ps-deck-stage { position:relative; height:210px; touch-action:pan-y; }
.ps-dcard { position:absolute; inset:0; border-radius:20px; padding:18px; display:flex; flex-direction:column; gap:8px; color:var(--ps-ink);
  user-select:none; -webkit-user-select:none; cursor:grab; transition:transform .22s ease, opacity .22s ease; overflow:hidden; box-sizing:border-box; }
.ps-dcard.deck-butter { --d-bg:#F8EA8C; --d-fg:#5E4F00; }
.ps-dcard.deck-orange { --d-bg:#FFC79E; --d-fg:#8A3E0E; }
.ps-dcard.deck-pink { --d-bg:#F8C3DC; --d-fg:#8A2759; }
.ps-dcard.deck-lime { --d-bg:#DDF19E; --d-fg:#276449; }
.ps-dcard.deck-sky { --d-bg:#CFE2F7; --d-fg:#244E7E; }
.ps-dcard { background:var(--d-bg, #F1F3EF); }
.ps-dcard .ps-dtag { color:var(--d-fg, var(--ps-ink)); }
.ps.ps-plain .ps-dcard { background:#F1F3EF; }
.ps-dcard.under { transform:translateY(10px) scale(.96); opacity:.55; pointer-events:none; }
.ps-dcard.under2 { transform:translateY(19px) scale(.92); opacity:.3; pointer-events:none; }
.ps-dtop { display:flex; align-items:center; gap:8px; }
.ps-dtag { display:inline-flex; align-items:center; gap:5px; background:rgba(255,255,255,.75); color:var(--t-fg); font-size:12px; font-weight:750; padding:3px 9px; border-radius:999px; }
.ps-dtop .ps-yn { margin-left:auto; }
.ps-dtitle { font-size:21px; line-height:1.22; font-weight:800; letter-spacing:-.01em; text-wrap:balance; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; margin-top:4px; }
.ps-dwhy { margin:0; font-size:13.5px; line-height:1.45; color:var(--ps-mid); }
.ps-dfoot { margin-top:auto; }
.ps-dfoot .ps-go { background:#fff; color:var(--ps-ink); }
.ps-dhint { position:absolute; top:14px; padding:4px 10px; border-radius:8px; font-weight:800; font-size:12.5px; pointer-events:none; z-index:2; }
.ps-dhint.l { right:14px; background:var(--ps-forest); color:var(--ps-lime); }
.ps-dhint.r { left:14px; background:#fff; color:var(--ps-ink); }
.ps-deck-acts { display:grid; grid-template-columns:1fr auto 1fr; gap:8px; align-items:center; margin-top:14px; }
.ps-dbtn { height:48px; border-radius:14px; border:0; font:inherit; font-weight:750; font-size:14.5px; cursor:pointer; }
.ps-dbtn.done { background:var(--ps-forest); color:var(--ps-lime); }
.ps-dbtn.later { background:var(--ps-inset); color:var(--ps-ink); }
.ps-dcnt { font-size:12.5px; font-weight:650; color:var(--ps-quiet); min-width:52px; text-align:center; font-variant-numeric:tabular-nums; }
.ps-deck-lead { font-size:12px; color:var(--ps-quiet); text-align:center; margin-top:8px; }
.ps-deck-clear { display:flex; gap:12px; align-items:flex-start; background:var(--ps-mint); border-radius:18px; padding:16px; margin-top:14px; }
.ps-deck-chk { width:30px; height:30px; border-radius:50%; background:var(--ps-forest); color:var(--ps-lime); display:grid; place-items:center; font-weight:800; flex:none; }
.ps-deck-clear b { font-size:15px; }
.ps-deck-clear p { margin:3px 0 0; font-size:13px; color:var(--ps-mid); line-height:1.45; }
.ps-undo { display:flex; align-items:center; gap:8px; margin-top:12px; background:var(--ps-ink); color:#fff; border-radius:14px; padding:10px 12px 10px 14px; font-size:13px; animation:psRise .25s ease both; }
.ps-undo b { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:650; }
.ps-undo button { font:inherit; font-size:13px; font-weight:800; color:var(--ps-lime); background:none; border:0; cursor:pointer; padding:4px 6px; }

@keyframes psRise { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
@keyframes psFill { from { transform:scaleX(0); } to { transform:scaleX(1); } }
@keyframes psDraw { to { stroke-dashoffset:0; } }
@keyframes psPop { 0% { transform:scale(.8); } 55% { transform:scale(1.18); } 100% { transform:scale(1); } }
@keyframes psGlow { 0% { box-shadow:0 0 0 0 rgba(215,243,110,.9); } 100% { box-shadow:0 0 0 14px rgba(215,243,110,0); } }

@media (min-width:1080px) {
  .ps { gap:16px; margin-top:16px; }
  .ps-now { padding:28px 30px 26px; }
  .ps .ps-now-h { font-size:30px; }
  .ps-card { padding:24px 26px 20px; }
  .ps-tasks { padding-left:47px; }
  .ps-tasks.ps-tasks-flat { padding-left:0; }
}
@media (max-width:560px) {
  .ps-now { padding:20px 18px 18px; border-radius:22px; }
  .ps .ps-now-h { font-size:22px; }
  .ps-now .ps-go-big { width:100%; }
  .ps-card { padding:16px 14px 12px; }
  .ps-head-h span { display:block; margin:2px 0 0; }
  .ps-head-h span::before { content:none; }
  .ps-tasks { padding-left:0; }
  .ps-task { flex-wrap:wrap; align-items:flex-start; padding:10px 12px 12px 6px; }
  .ps-tbody { flex-basis:calc(100% - 60px); }
  .ps-tact { width:100%; padding-left:54px; box-sizing:border-box; }
  .ps-tact .ps-go { width:100%; }
}
@media (prefers-reduced-motion: reduce) {
  .ps-dcard { transition:none; }
  .ps-now, .ps-card, .ps-tasks, .ps-bar span::after, .ps-task.is-pop, .ps-task.is-pop .ps-ck-svg { animation:none !important; }
  .ps-ck-tick { animation:none; stroke-dashoffset:0; }
  .ps-ck-fill { transition:none; }
}
`;
