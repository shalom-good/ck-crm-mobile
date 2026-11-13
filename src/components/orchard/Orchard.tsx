// components/orchard/Orchard.tsx
// The ORCHARD phone look (theme/orchard.css), ported from the CRM's
// components/orchard/Orchard.jsx. Small and presentational: no data
// fetching, each board / profile passes its own rows in.

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";

export type Program = "kdh" | "ck" | "cka";

const MARKS: Record<Program, string> = { kdh: "/orchard/kdh-mark.svg", ck: "/orchard/ck-mark.svg", cka: "/orchard/cka-mark.svg" };
const NAMES: Record<Program, string> = { kdh: "Kosher Debt Help", ck: "Collective Kindness", cka: "CK Academy" };

export function BrandTile({ program = "ck", name, sub }: { program?: Program; name?: string; sub?: ReactNode }) {
  return (
    <span className="oc-brand">
      <span className="oc-brand-tile"><img src={MARKS[program] ?? MARKS.ck} alt="" /></span>
      <span className="oc-brand-name"><b>{name ?? NAMES[program]}</b>{sub ? <span>{sub}</span> : null}</span>
    </span>
  );
}

export interface StageTab { key: string; label: string; count?: number; color?: string }

/** Stage tabs: full names + counts, side scroll. */
export function StageTabs({ stages, active, onPick }: { stages: StageTab[]; active: string; onPick?: (key: string) => void }) {
  // Keep the active tab in view as the lanes swipe (horizontal only, so
  // the page itself never jumps).
  const row = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !on) return;
    const left = on.offsetLeft - el.offsetLeft;
    if (left < el.scrollLeft + 16 || left + on.offsetWidth > el.scrollLeft + el.clientWidth - 16) {
      el.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
    }
  }, [active]);
  return (
    <div ref={row} className="oc-tabs" role="toolbar" aria-label="Stages">
      {stages.map((s) => (
        <button key={s.key} type="button" className="oc-tab" aria-pressed={s.key === active} onClick={() => onPick?.(s.key)}>
          <i style={{ background: s.color || "#9AA59E" }} />{s.label}<em>{s.count ?? 0}</em>
        </button>
      ))}
    </div>
  );
}

export type BadgeTone = "quiet" | "ok" | "paid" | "warn" | "bad" | "ck" | "match" | "go";

export function Badge({ tone = "quiet", children, title }: { tone?: BadgeTone; children: ReactNode; title?: string }) {
  return <span className={`oc-badge oc-badge--${tone}`} title={title}>{children}</span>;
}

export function initialsOf(name?: string | null): string {
  return String(name || "?").replace(/[^A-Za-z\s]/g, " ").trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export function Initials({ name, bg, fg }: { name?: string | null; bg?: string; fg?: string }) {
  return <span className="oc-av" style={{ background: bg, color: fg }} aria-hidden="true">{initialsOf(name)}</span>;
}

export type IconName = "whatsapp" | "call" | "meeting" | "note" | "email" | "clock" | "text" | "open" | "search";

const ICONS: Record<IconName, ReactNode> = {
  whatsapp: <path d="M4 20l1.4-4A8 8 0 1 1 8 19z" />,
  text: <><path d="M4 5h16v11H9l-5 4z" /></>,
  call: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  meeting: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  note: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></>,
  email: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4 7l8 6 8-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  open: <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
};
const ICON_COLOR: Partial<Record<IconName, string>> = { whatsapp: "#2E7D50", call: "#9A3A22", meeting: "#6A4F8A", note: "#34483D", email: "#2F3F78", clock: "#34483D" };

export function Icon({ name, size = 13, color }: { name: IconName; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || ICON_COLOR[name] || "currentColor"} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name] ?? ICONS.note}
    </svg>
  );
}

/** Last activity at the foot of a card. No text = "No log yet". */
export function ActivityLine({ kind = "note", text }: { kind?: IconName; text?: string | null }) {
  if (!text) return <div className="oc-activity"><Badge tone="quiet">No notes yet</Badge></div>;
  return <div className="oc-activity"><Icon name={kind} /><span>{text}</span></div>;
}

/** Press-and-hold (450ms, cancelled by a move) → onHold; a normal tap → onTap. */
export function useLongPress(onHold: () => void, onTap: () => void, ms = 450) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const [held, setHeld] = useState(false);
  const clear = () => { if (t.current) clearTimeout(t.current); t.current = null; };
  useEffect(() => clear, []);
  const onPointerDown = useCallback((e: PointerEvent) => {
    fired.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    clear();
    t.current = setTimeout(() => {
      fired.current = true;
      setHeld(true);
      try { navigator.vibrate?.(12); } catch { /* not supported */ }
      onHold();
    }, ms);
  }, [onHold, ms]);
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!start.current) return;
    if (Math.abs(e.clientX - start.current.x) > 8 || Math.abs(e.clientY - start.current.y) > 8) clear();
  }, []);
  const end = useCallback(() => { clear(); start.current = null; setTimeout(() => setHeld(false), 120); }, []);
  const onClick = useCallback((e: MouseEvent) => {
    if (fired.current) { e.preventDefault(); e.stopPropagation(); fired.current = false; return; }
    onTap();
  }, [onTap]);
  const onContextMenu = useCallback((e: MouseEvent) => { e.preventDefault(); }, []);
  return { held, bind: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onPointerLeave: end, onClick, onContextMenu } };
}

/** Bottom sheet. Closes on scrim tap and Escape. */
export function Sheet({ open, onClose, title, aside, children, label }: { open: boolean; onClose: () => void; title: ReactNode; aside?: ReactNode; children: ReactNode; label?: string }) {
  useEffect(() => {
    if (!open) return undefined;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  // Portal to <body>: an .ion-page has contain:layout, which would make it
  // the containing block for position:fixed and leave the tab bar uncovered.
  return createPortal(
    <>
      <div className="oc-scrim" onClick={onClose} aria-hidden="true" />
      <div className="oc-sheet" role="dialog" aria-modal="true" aria-label={label || (typeof title === "string" ? title : undefined)}>
        <span className="oc-sheet-grip" />
        <div className="oc-sheet-head"><b>{title}</b>{aside}</div>
        {children}
      </div>
    </>,
    document.body,
  );
}

export interface MoveStage { key: string; label: string; color?: string }

/** Move-stage sheet. Only used where a real stage write path exists. */
export function MoveSheet({ open, onClose, name, stages, current, next, onMove, busy, footer }: {
  open: boolean; onClose: () => void; name?: string; stages: MoveStage[]; current?: string; next?: string;
  onMove?: (key: string) => void; busy?: boolean; footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={`Move ${name || "client"} to`} aside={footer}>
      <div className="oc-stage-grid">
        {stages.map((s) => (
          <button key={s.key} type="button" disabled={busy || s.key === current}
            className={s.key === current ? "is-now" : s.key === next ? "is-next" : ""}
            onClick={() => onMove?.(s.key)}>
            <i style={{ background: s.color || "#9AA59E" }} />{s.label}{s.key === current ? " · now" : ""}
          </button>
        ))}
      </div>
      <span style={{ fontSize: 12, color: "var(--oc-mid)", textAlign: "center", fontWeight: 600 }}>Press and hold any card to move it. Tap to open.</span>
    </Sheet>
  );
}

/** Lane dots under a swiping board. */
export function LaneDots({ count, index, onGo }: { count: number; index: number; onGo?: (i: number) => void }) {
  // With a mouse there is no swipe: the dots are buttons and two arrows
  // step a lane at a time (the arrows only show on hover-capable screens).
  if (!onGo) return <div className="oc-dots" aria-hidden="true">{Array.from({ length: count }, (_, i) => <span key={i} className={i === index ? "is-on" : ""} />)}</div>;
  return (
    <div className="oc-dotsrow">
      <button type="button" className="oc-dotarrow" aria-label="Previous stage" disabled={index <= 0} onClick={() => onGo(index - 1)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
      </button>
      <div className="oc-dots" role="tablist" aria-label="Stages">
        {Array.from({ length: count }, (_, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === index} aria-label={`Stage ${i + 1} of ${count}`} className={i === index ? "is-on" : ""} onClick={() => onGo(i)} />
        ))}
      </div>
      <button type="button" className="oc-dotarrow" aria-label="Next stage" disabled={index >= count - 1} onClick={() => onGo(index + 1)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
      </button>
    </div>
  );
}

/** Track which lane is in view in an .oc-lanes scroller, and make it
 *  scroll by every input (2026-11-11, Leivi: "i cant scroll back and
 *  forth" with a mouse): touch swipe and trackpad are native; a mouse can
 *  click and drag (taps still open a card), the wheel moves it when the
 *  wheel is mostly sideways or Shift is held (a plain vertical wheel is
 *  left to the page), and the arrow keys step a lane when it has focus. */
export function useLaneIndex() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const idx = useRef(0);
  const scrollTo = useCallback((i: number, smooth = true) => {
    const el = ref.current;
    if (!el) return;
    const n = Math.max(0, Math.min(el.children.length - 1, i));
    const lane = el.children[n] as HTMLElement | undefined;
    if (!lane) return;
    el.scrollTo({ left: lane.offsetLeft - el.offsetLeft - 16 < 0 ? 0 : lane.offsetLeft - 16, behavior: smooth ? "smooth" : "auto" });
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const laneW = () => ((el.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? 1) + 10;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / Math.max(1, laneW()));
        if (i !== idx.current) { idx.current = i; setIndex(i); }
      });
    };
    // mouse drag
    let down: { x: number; left: number } | null = null;
    let dragged = false;
    const onDown = (e: globalThis.PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = { x: e.clientX, left: el.scrollLeft }; dragged = false;
    };
    const onMove = (e: globalThis.PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (!dragged && Math.abs(dx) < 6) return;
      if (!dragged) { dragged = true; el.classList.add("is-drag"); }
      el.scrollLeft = down.left - dx;
    };
    const onUp = () => {
      if (!down) return;
      const was = dragged; down = null;
      if (!was) return;
      el.classList.remove("is-drag");
      scrollTo(Math.round(el.scrollLeft / Math.max(1, laneW())));
      // the click that ends a drag must not open a card
      const stop = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
      el.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => el.removeEventListener("click", stop, { capture: true } as EventListenerOptions), 60);
      dragged = false;
    };
    const onWheel = (e: globalThis.WheelEvent) => {
      const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (sideways) return;              // trackpads already scroll it natively
      if (!e.shiftKey) return;           // a plain vertical wheel belongs to the page
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      scrollTo(idx.current + (e.key === "ArrowRight" ? 1 : -1));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("keydown", onKey);
    };
  });
  return { ref, index, setIndex, scrollTo };
}

/** Pastel per stage position, cycling. */
export const OC_PASTELS = [
  { bg: "#FBEFA6", dot: "#E6B23A" }, { bg: "#EBDDF5", dot: "#9B7FC0" }, { bg: "#DCE8F5", dot: "#5C8FC4" },
  { bg: "#DDEFE3", dot: "#5E9C76" }, { bg: "#F8DCC9", dot: "#C97B3D" }, { bg: "#E4F2B8", dot: "#2F7556" },
  { bg: "#EFE7DC", dot: "#8B6B4A" }, { bg: "#FBE1D8", dot: "#C2533A" }, { bg: "#ECEAE4", dot: "#8A857C" },
  { bg: "#E2F3D5", dot: "#2E6B3F" },
];

/** Full-width search field (never just an icon). */
export function SearchBar({ value, onChange, placeholder = "Search name, city, phone, email", count, label = "Search" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; count?: number; label?: string;
}) {
  return (
    <label className="oc-search">
      <Icon name="search" size={18} color="#16211C" />
      <input type="search" inputMode="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" aria-label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {value ? <span className="oc-search-count">{count != null ? `${count} found` : ""}</span> : null}
      {value ? <button type="button" className="oc-search-clear" aria-label="Clear search" onClick={() => onChange("")} style={{ width: 36, height: 36 }}>×</button> : null}
    </label>
  );
}
