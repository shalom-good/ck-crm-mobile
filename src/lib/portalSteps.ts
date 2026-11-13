// @ts-nocheck
// COPY of the CRM's lib/portal/steps.js (ck-crm-template). Same rules on the
// web portal and in the app: change both together. Tests live in the CRM
// (tests/portalSteps.test.js).
// lib/portal/steps.js
// =====================================================================
// The family's steps and tasks, built from the portal payload
// (GET /api/portal/me). Pure function, no fetching, so the web portal,
// the phone layout and the CK app all show the same list.
//
// Feedback from Minsky (2026-11-08): the portal read like a news feed.
// Families should open it and see their steps, the actual things to get
// done, whether each one is done (yes or no), a link to go do it, and
// colour coding that helps with executive functioning (with a plain mode).
//
// Rules:
//  - Steps follow the server's journey (d.journey.steps) in order: 1, 2, 3.
//  - A task is done only on real evidence (booking, signature, logged
//    session, staff check) or, for homework, the family's own tick.
//  - A few tasks the system cannot see (sent the WhatsApp, read the plan)
//    can be self-checked; the caller keeps those in `local` (a Set of ids).
//  - Never invent numbers or dates.
// =====================================================================

// Each kind of task has one colour and one icon. Colour is never the only
// cue: the icon and the word stay in plain mode.
const KINDS = {
  message: { label: 'Message', tone: 'green' },
  book: { label: 'Book', tone: 'sky' },
  read: { label: 'Read and sign', tone: 'lilac' },
  meet: { label: 'Meet', tone: 'peach' },
  do: { label: 'Do it', tone: 'butter' },
  wait: { label: 'On us', tone: 'grey' },
};

const AREA_NAMES = {
  budgeting: 'Budgeting', debt: 'Debt', cpa: 'Taxes', therapy: 'Counseling',
  resume_writing: 'Resume', medical_insurance: 'Medical insurance', job_funnel: 'Career', tuition: 'Tuition',
};

const firstWord = (s) => String(s || '').trim().split(/\s+/)[0] || '';
const fmtShort = (iso) => {
  if (!iso) return null;
  const s = String(iso);
  const d = new Date(s.length === 10 ? `${s}T12:00:00Z` : s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(s.length === 10 ? { timeZone: 'UTC' } : {}) });
};
const fmtWhen = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const fmtMonth = (iso) => {
  if (!iso) return null;
  const d = new Date(String(iso).length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
};

// First http(s) link in a task's text → { text without it, url }.
function splitLink(raw) {
  const s = String(raw || '');
  const m = s.match(/https?:\/\/[^\s)]+/i);
  if (!m) return { text: s.trim(), url: null };
  const url = m[0].replace(/[.,;:!?]+$/, '');
  const text = s.replace(m[0], '').replace(/\s{2,}/g, ' ').replace(/[\s:,-]+$/, '').trim();
  return { text, url };
}
function linkLabel(url) {
  if (/calendly\.com|calendar\.app\.google/i.test(url)) return 'Pick a time';
  if (/docs\.google\.com\/forms|forms\.gle|typeform|jotform/i.test(url)) return 'Fill it out';
  if (/vimeo|youtube|youtu\.be|loom\.com/i.test(url)) return 'Watch it';
  if (/drive\.google|docs\.google|dropbox/i.test(url)) return 'Open it';
  return 'Open the link';
}

/**
 * @param {object} d        portal payload from /api/portal/me
 * @param {object} [opts]
 * @param {object|null} [opts.budget]  /api/portal/budget/pulse answer (or null)
 * @param {Set<string>} [opts.local]   ids the family ticked themselves
 * @param {string} [opts.qs]           query string to keep on portal links (staff preview)
 * @returns {{ steps: object[], todo: object[], now: object|null, doneSteps: number, totalSteps: number }}
 */
function buildPortalSteps(d, opts = {}) {
  const local = opts.local || new Set();
  const qs = opts.qs || '';
  const budget = opts.budget || null;
  if (!d || !d.journey) return { steps: [], todo: [], now: null, doneSteps: 0, totalSteps: 0 };

  const journey = d.journey.steps || [];
  const stepDone = (key) => journey.find((s) => s.key === key)?.status === 'done';
  const ns = d.nextStep || {};
  const members = d.team?.members || [];
  const cm = members.find((m) => m.hero) || null;
  const coordinator = d.team?.coordinator || null;
  const cmName = ns.cmName || cm?.name || null;
  const cmFirst = ns.cmFirst || firstWord(cmName) || 'your case manager';
  const budgFirst = firstWord(d.sessions?.budgeterName) || 'your budgeter';
  const debtFirst = firstWord(d.debtExpertName) || 'your debt expert';
  const signedEff = !!d.plan?.signature || !!d.plan?.signedEffective;
  const nurture = d.branding === 'nurture';
  const interviewer = d.branding === 'st' ? 'Yossi' : 'Rabbi Einstein';
  // Until staff check "meeting set", the family is still arranging the CM meeting.
  const beforeMeeting = ns.kind === 'wait_cm' || ns.kind === 'meet_cm_wa';
  const ext = (href) => (href && /^https?:/i.test(href) ? true : false);
  const link = (label, href) => (href ? { label, href, ext: ext(href) } : null);
  const helpHref = coordinator?.whatsapp || null;

  const tasksFor = (key) => {
    switch (key) {
      case 'interview':
        return [{
          id: 'interview', kind: 'meet',
          title: `Have your interview with ${interviewer}`,
          why: stepDone('interview') ? null : 'Both of you on the call, if you are married.',
          done: stepDone('interview'),
        }];

      case 'meet_cm': {
        const out = [];
        if (ns.kind === 'wait_cm') {
          out.push({
            id: 'cm-assign', kind: 'wait',
            title: 'We are picking your case manager and writing your plan',
            why: ns.hint || 'Nothing for you to do yet. We will let you know.',
            done: false, onUs: true,
          });
        } else {
          const href = ns.whatsapp || ns.calendly || cm?.whatsapp || cm?.calendly || helpHref;
          const sysDone = !beforeMeeting || stepDone('meet_cm');
          out.push({
            id: 'cm-message', kind: 'message',
            title: `WhatsApp ${cmFirst} to set a time`,
            why: sysDone ? null : 'Your message is already typed. Just press send.',
            done: sysDone || local.has('cm-message'),
            selfChecked: !sysDone && local.has('cm-message'),
            canSelfCheck: !sysDone,
            action: sysDone ? null : link(ns.whatsapp ? `WhatsApp ${cmFirst}` : 'Pick a time', href),
          });
        }
        out.push({
          id: 'cm-meet', kind: 'meet',
          title: `Meet ${cmFirst} and go over your plan`,
          why: stepDone('meet_cm') ? null : `${cmFirst === 'your case manager' ? 'Your case manager' : cmFirst} checks this off after you meet.`,
          done: stepDone('meet_cm'),
          locked: ns.kind === 'wait_cm' ? 'Opens once your case manager is picked' : null,
        });
        return out;
      }

      case 'sign': {
        const planReady = !!d.plan?.hasStructured || !!d.plan?.docUrl;
        const signLocked = signedEff ? null
          : !planReady ? 'Opens once your plan is written'
          : (beforeMeeting || ns.kind === 'review_plan') ? `Opens after you meet ${cmFirst}`
          : null;
        return [
          {
            id: 'plan-read', kind: 'read',
            title: 'Read your success plan',
            why: signedEff ? null : nurture ? 'Take your time. Note anything you want to change.' : 'Read it together. Note anything you want to change.',
            done: signedEff || local.has('plan-read'),
            selfChecked: !signedEff && local.has('plan-read'),
            canSelfCheck: !signedEff && planReady,
            locked: planReady ? null : 'Opens once your plan is written',
            action: planReady && !signedEff ? { label: 'Open my plan', plan: true } : null,
          },
          {
            id: 'plan-sign', kind: 'read',
            title: nurture ? 'Sign your plan' : 'Sign your plan (each of you signs)',
            why: signedEff ? null : 'Your signature makes it official.',
            done: signedEff,
            locked: signLocked,
            action: !signedEff && !signLocked ? { label: 'Sign now', plan: true } : null,
          },
        ];
      }

      case 'appointments': {
        const locked = d.sessions?.locked ? 'Opens once your plan is signed' : null;
        const rows = d.planBookings || [];
        if (!rows.length) {
          const doneB = (d.sessions?.done || 0) > 0 || (d.meetings || []).length > 0;
          return [{
            id: 'book-budgeting', kind: d.sessions?.bookUrl ? 'book' : 'wait',
            title: d.sessions?.bookUrl ? `Book your first session with ${budgFirst}` : `${budgFirst === 'your budgeter' ? 'Your budgeter' : budgFirst} will reach out to set a time`,
            done: doneB, locked,
            action: !doneB && !locked ? link('Pick a time', d.sessions?.bookUrl) : null,
            onUs: !d.sessions?.bookUrl,
          }];
        }
        return rows.map((r) => {
          const area = AREA_NAMES[r.area] || r.title || 'Your plan';
          const who = firstWord(r.expertName) || 'your expert';
          const url = r.bookingUrl || (r.area === 'budgeting' ? d.sessions?.bookUrl : null);
          const met = (r.area === 'budgeting' && (d.sessions?.done || 0) > 0)
            || (r.area === 'debt' && stepDone('debt'))
            || (r.area === 'therapy' && stepDone('coach'));
          const done = !!r.booked || met;
          return {
            id: `book-${r.area}`, kind: url ? 'book' : 'wait',
            title: url
              ? (r.area === 'budgeting' ? `Book your first budget session with ${who}` : `Book your ${area.toLowerCase()} meeting with ${who}`)
              : `${who} will reach out to set your ${area.toLowerCase()} meeting`,
            why: r.booked ? `Booked for ${fmtWhen(r.booked.start)}` : met ? null : url ? 'Pick any time that works for you.' : 'Nothing for you to do yet.',
            done, locked, onUs: !url,
            action: locked ? null
              : r.booked?.joinUrl ? link('Join the call', r.booked.joinUrl)
              : !done ? link('Pick a time', url) : null,
          };
        });
      }

      case 'budgeter':
        return [{
          id: 'meet-budgeter', kind: 'meet',
          title: `Have your first budget session with ${budgFirst}`,
          why: stepDone('budgeter') ? null : 'Checks off once the session is logged.',
          done: stepDone('budgeter'),
          locked: d.sessions?.locked ? 'Opens once your plan is signed' : null,
        }];

      case 'debt':
        return [{
          id: 'meet-debt', kind: 'meet',
          title: `Meet ${debtFirst} about your debt`,
          why: stepDone('debt') ? null : `${debtFirst === 'your debt expert' ? 'Your debt expert' : debtFirst} checks this off after you meet.`,
          done: stepDone('debt'),
          locked: d.sessions?.locked ? 'Opens once your plan is signed' : null,
        }];

      case 'coach':
        return [{
          id: 'meet-coach', kind: 'meet',
          title: 'Meet your counselor',
          why: stepDone('coach') ? null : 'Checks off after your first session.',
          done: stepDone('coach'),
          locked: d.sessions?.locked ? 'Opens once your plan is signed' : null,
        }];

      default:
        return [];
    }
  };

  const steps = journey.map((s, i) => {
    const tasks = tasksFor(s.key).map((t) => ({ ...t, label: KINDS[t.kind]?.label || '' }));
    const target = s.key === 'graduation' && s.target ? fmtMonth(s.target) : null;
    return {
      n: i + 1,
      key: s.key,
      title: s.label,
      status: s.status, // done | current | upcoming
      date: s.date ? fmtShort(s.date) : null,
      note: s.key === 'graduation'
        ? (s.status === 'done' ? 'You made it.' : target ? `Aim for around ${target}. Keep going.` : 'The finish line.')
        : null,
      tasks,
      doneTasks: tasks.filter((t) => t.done).length,
    };
  });

  // ── This week: the ongoing to-do list once the plan is signed ──
  const todo = [];
  if (signedEff) {
    for (const h of d.homework || []) {
      // A link typed into the task becomes its button (no extra field needed).
      const { text, url } = splitLink(h.text);
      todo.push({
        id: `hw-${h.id}`, kind: 'do', label: KINDS.do.label,
        title: text || h.text,
        why: h.by ? `From ${h.by}` : null,
        done: !!h.done, homework: h, canSelfCheck: true,
        action: url ? { label: linkLabel(url), href: url, ext: true } : null,
      });
    }
    if (budget) {
      const started = budget.started || budget.status === 'published' || budget.status === 'confirmed';
      const href = `/portal/budget${qs}`;
      if ((budget.inboxCount || 0) > 0) {
        todo.push({ id: 'budget-inbox', kind: 'do', label: KINDS.do.label, title: `File ${budget.inboxCount} charge${budget.inboxCount === 1 ? '' : 's'} in your budget`, why: 'One tap each.', done: false, action: { label: 'Open the inbox', href: `${href}#inbox` } });
      } else if (budget.status === 'published') {
        todo.push({ id: 'budget-confirm', kind: 'read', label: KINDS.read.label, title: 'Look over your budget and confirm it', why: `${budgFirst === 'your budgeter' ? 'Your budgeter' : budgFirst} finished it. Check each part.`, done: false, action: { label: 'Open my budget', href } });
      } else if (!started) {
        todo.push({ id: 'budget-start', kind: 'do', label: KINDS.do.label, title: 'Start your budget', why: `Build it with ${budgFirst} at your session, or start on your own.`, done: false, action: { label: 'Start my budget', href } });
      }
    }
    const sDone = d.sessions?.done || 0;
    const sTotal = d.sessions?.total || 0;
    const budgBooked = (d.planBookings || []).some((r) => r.area === 'budgeting' && r.booked);
    if (sDone > 0 && sDone < sTotal && d.sessions?.bookUrl) {
      todo.push({
        id: `book-session-${sDone + 1}`, kind: 'book', label: KINDS.book.label,
        title: `Book budget session ${sDone + 1} of ${sTotal}`,
        why: budgBooked ? 'You have a time on the calendar.' : 'About a month after your last one.',
        done: budgBooked,
        action: budgBooked ? null : { label: 'Pick a time', href: d.sessions.bookUrl, ext: true },
      });
    }
  }

  // ── Right now: the first open task you can act on ──
  // Actionable = the family can do something here: a link to follow, a box
  // to tick, or homework. "Meet X" rows wait on the meeting itself.
  const actionable = (t) => !t.done && !t.locked && !t.onUs && (!!t.action || !!t.canSelfCheck || !!t.homework);
  const ordered = [
    ...steps.filter((s) => s.status === 'current'),
    ...steps.filter((s) => s.status !== 'current'),
  ];
  let now = null;
  for (const s of ordered) {
    const t = s.tasks.find(actionable);
    if (t) { now = { ...t, stepN: s.n, stepTitle: s.title }; break; }
  }
  if (!now) {
    const t = todo.find(actionable);
    if (t) now = { ...t, stepN: null, stepTitle: 'Your to-do list' };
  }
  if (!now) {
    const cur = steps.find((s) => s.status === 'current');
    // Nothing to press: show what is coming (on us, or the meeting itself).
    const wait = cur?.tasks.find((t) => !t.done && !t.locked);
    if (wait) now = { ...wait, onUs: true, stepN: cur.n, stepTitle: cur.title };
  }

  return {
    steps,
    todo,
    now,
    doneSteps: steps.filter((s) => s.status === 'done').length,
    totalSteps: steps.length,
  };
}

export { buildPortalSteps, splitLink, KINDS, AREA_NAMES };
