// components/orchard/family/FamKit.tsx
// The ORCHARD look for the family-facing screens (2026-11-05): the start
// doors and the family's own pages. A phone cut of the CRM's HomeKit
// (PageHero with the name on a lime highlight + a two-tone second line,
// colour stat tiles, one lime "up next" card, the journey stepper, mini
// bars). Presentational only: every page passes its own data in.
// Styles: theme/orchard-family.css (.ocf2-*).
//
// Family rules (from the audit): no coral/red on family money, a lime dot
// instead of a red count, homework "next up" never red, 44px taps, no
// green status dots, warm plain copy.

import type { CSSProperties, ReactNode } from "react";
import { useIonActionSheet, useIonRouter } from "@ionic/react";
import { Bell } from "@phosphor-icons/react";
import { useFamilyAlerts } from "@/lib/familyAlerts";
import { useAuth } from "@/lib/auth";
import { PORTAL_WEB_URL } from "@/lib/portalApi";

export type Tone = "mint" | "butter" | "peach" | "lilac" | "sky" | "rose" | "lime" | "forest" | "white";

/** CK mark on a forest tile + the name; optional small line under it. */
export function FamBrand({ sub }: { sub?: ReactNode }) {
  return (
    <span className="ocf2-brand">
      <span className="ocf2-brand-tile"><img src="/orchard/ck-mark.svg" alt="" /></span>
      <span className="ocf2-brand-name"><b>Collective Kindness</b>{sub ? <span>{sub}</span> : null}</span>
    </span>
  );
}

/** The family's bell: lime dot when something new needs them, never a red count. */
export function FamBellO() {
  const router = useIonRouter();
  const { count } = useFamilyAlerts();
  return (
    <button type="button" className="ocf2-round" aria-label={count ? `${count} new alert${count === 1 ? "" : "s"}` : "Alerts"} onClick={() => router.push("/fam/alerts")}>
      <Bell size={20} weight="bold" color="#16211C" />
      {count > 0 && <i className="ocf2-bell-dot" aria-hidden />}
    </button>
  );
}

const famInitials = (n: string) => String(n || "?").replace(/[^A-Za-z\s]/g, " ").trim().split(/\s+/).filter((w) => !/^(and)$/i.test(w)).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "F";

/** The family's own menu, behind their initials: settings, the web portal, sign out. */
export function FamMe({ name }: { name?: string | null }) {
  const router = useIonRouter();
  const { family, signOut } = useAuth();
  const [present] = useIonActionSheet();
  const who = name || family?.name || "Your family";
  const menu = () => present({
    header: who,
    buttons: [
      { text: "Settings and feedback", handler: () => { router.push("/app-settings"); } },
      { text: "Open the web portal", handler: () => { window.open(`${PORTAL_WEB_URL}/login`, "_blank"); } },
      { text: "Sign out", role: "destructive", handler: () => { void signOut().then(() => router.push("/start", "root", "replace")); } },
      { text: "Cancel", role: "cancel" },
    ],
  });
  return <button type="button" className="ocf2-round is-lilac" aria-label="Menu" onClick={menu}>{famInitials(who)}</button>;
}

/** The same top bar on every family tab (Shalom 2026-11-11: "shouldnt this
 *  be on every page?"): the CK mark and name, the bell, their menu. Always
 *  in the same place, so nobody has to go Home to find sign out or alerts. */
export function FamTop({ name }: { name?: string | null }) {
  return (
    <div className="ocf2-top">
      <FamBrand />
      <div className="ocf2-top-r"><FamBellO /><FamMe name={name} /></div>
    </div>
  );
}

/** Page head for a family tab: the shared top bar, then a big title, one
 *  short line and (optionally) a drawing beside it. `before` sits between
 *  the bar and the title (the CK Academy logo on Learn). */
export function FamHead({ title, sub, aside, art, before }: { title: ReactNode; sub?: ReactNode; aside?: ReactNode; art?: ReactNode; before?: ReactNode }) {
  return (
    <>
      <FamTop />
      {before}
      <div className="ocf2-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="ocf2-title">{title}</h1>
          {sub ? <p className="ocf2-sub">{sub}</p> : null}
        </div>
        {(art || aside) ? <div className="ocf2-head-aside">{art}{aside}</div> : null}
      </div>
    </>
  );
}

/** Hero: greeting with the name on a lime highlight, a quieter second line. */
export function Hero({ tone = "mint", lead, mark, line2, sub, art, children, style }: {
  tone?: Tone; lead?: ReactNode; mark?: ReactNode; line2?: ReactNode; sub?: ReactNode; art?: ReactNode; children?: ReactNode; style?: CSSProperties;
}) {
  return (
    <section className={`ocf2-hero ocf2-t-${tone}`} style={style}>
      {art ? <div className="ocf2-hero-art">{art}</div> : null}
      <h1 className="ocf2-h1">
        <span>{lead}{mark ? <mark>{mark}</mark> : null}</span>
        {line2 ? <span className="ocf2-h1-2">{line2}</span> : null}
      </h1>
      {sub ? <p className="ocf2-hero-sub">{sub}</p> : null}
      {children}
    </section>
  );
}

/** The one lime card: what to do next. */
export function NextCard({ kicker = "Up next", title, body, hint, art, cornerArt, children }: {
  kicker?: ReactNode; title: ReactNode; body?: ReactNode; hint?: ReactNode; art?: ReactNode; cornerArt?: ReactNode; children?: ReactNode;
}) {
  return (
    <section className={`ocf2-next${cornerArt ? " oil-host" : ""}`} aria-label="Up next">
      {cornerArt}
      <span className={`ocf2-kicker${cornerArt ? " oil-clear oil-drop-clear" : ""}`}>{kicker}</span>
      <h2 className={`ocf2-next-t${cornerArt ? " oil-clear oil-drop-clear" : ""}`}>{title}</h2>
      {body ? <p className="ocf2-next-b">{body}</p> : null}
      {hint ? <p className="ocf2-next-h">{hint}</p> : null}
      {art ? <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>{art}</div> : null}
      {children ? <div className="ocf2-next-a">{children}</div> : null}
    </section>
  );
}

export interface TileDef { key: string; label: string; n: ReactNode; sub?: ReactNode; tone: Tone; onClick?: () => void }

/** Colour stat tiles: label, a big tight number, a small line. */
export function Tiles({ tiles, money }: { tiles: TileDef[]; money?: boolean }) {
  return (
    <div className={`ocf2-tiles${money ? " is-money" : ""}`} style={{ gridTemplateColumns: `repeat(${Math.max(1, tiles.length)}, minmax(0, 1fr))` }}>
      {tiles.map((t) => {
        const body = (<><span className="ocf2-tile-l">{t.label}</span><b className="ocf2-tile-n">{t.n}</b>{t.sub ? <span className="ocf2-tile-s">{t.sub}</span> : null}</>);
        return t.onClick
          ? <button key={t.key} type="button" className={`ocf2-tile ocf2-t-${t.tone}`} onClick={t.onClick}>{body}</button>
          : <div key={t.key} className={`ocf2-tile ocf2-t-${t.tone}`}>{body}</div>;
      })}
    </div>
  );
}

/** Segmented journey track; only the current step keeps its name on a phone. */
export function Stepper({ total, done, current, label }: { total: number; done: number; current?: number; label?: ReactNode }) {
  return (
    <div className="ocf2-stepper" role="img" aria-label={`${done} of ${total} done`}>
      <div className="ocf2-stepper-track">
        {Array.from({ length: total }, (_, k) => (
          <i key={k} className={k < done ? "done" : k === current ? "now" : ""} />
        ))}
      </div>
      {label ? <span className="ocf2-stepper-l">{label}</span> : null}
    </div>
  );
}

/** Section title over a card: 16/800 + an optional quiet link. */
export function SectionHead({ children, aux, onAux }: { children: ReactNode; aux?: ReactNode; onAux?: () => void }) {
  return (
    <div className="ocf2-sec">
      <h2>{children}</h2>
      {aux ? (onAux ? <button type="button" className="ocf2-sec-link" onClick={onAux}>{aux}</button> : <span>{aux}</span>) : null}
    </div>
  );
}

export function Panel({ children, tone = "white", className = "", style, id }: { children: ReactNode; tone?: Tone; className?: string; style?: CSSProperties; id?: string }) {
  return <section id={id} className={`ocf2-panel ocf2-t-${tone} ${className}`.trim()} style={style}>{children}</section>;
}

/** Buttons: forest (the one call to action), light (white), lime. */
export function OBtn({ children, kind = "primary", href, onClick, sm, block, disabled, ariaLabel, style }: {
  children: ReactNode; kind?: "primary" | "light" | "lime" | "ghost"; href?: string; onClick?: () => void; sm?: boolean; block?: boolean; disabled?: boolean; ariaLabel?: string; style?: CSSProperties;
}) {
  const cls = `ocf2-btn ocf2-btn--${kind}${sm ? " is-sm" : ""}${block ? " is-block" : ""}`;
  if (href) return <a className={cls} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-label={ariaLabel} style={style}>{children}</a>;
  return <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel} style={style}>{children}</button>;
}

/** Initials on a pastel circle (people) or rounded square. */
export function Face({ name, size = 40, tone = "mint", square }: { name: string; size?: number; tone?: Tone; square?: boolean }) {
  const ini = String(name || "?").replace(/[^A-Za-z\s]/g, " ").trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return <span aria-hidden className={`ocf2-face ocf2-t-${tone}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.34), borderRadius: square ? Math.round(size * 0.32) : "50%" }}>{ini}</span>;
}

const TONES: Tone[] = ["mint", "lilac", "butter", "sky", "peach", "rose"];
export function toneFor(name: string): Tone {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

/** Day-of-month over a short month on a white tile. */
export function DateTile({ iso, tone = "white" }: { iso?: string | null; tone?: Tone }) {
  const d = iso ? new Date(iso) : null;
  const ok = !!d && !Number.isNaN(d.getTime());
  return (
    <span aria-hidden className={`ocf2-date ocf2-t-${tone}`}>
      <b>{ok ? d!.getDate() : ""}</b>
      <small>{ok ? d!.toLocaleDateString("en-US", { month: "short" }) : ""}</small>
    </span>
  );
}

export interface BarDef { label: string; n: number; hi?: boolean; tip?: string }
/** Mini bars, mint with the latest month in forest. Never coral. */
export function MiniBars({ bars, height = 76, onPick }: { bars: BarDef[]; height?: number; onPick?: (k: number) => void }) {
  const max = Math.max(1, ...bars.map((b) => Math.abs(b.n)));
  // Tappable months: hover shows the month's line, a tap opens it in the card.
  if (onPick) return (
    <div className="ocf2-bars is-pick" style={{ height }}>
      {bars.map((b, k) => (
        <button type="button" key={k} className="ocf2-bar" aria-pressed={!!b.hi} aria-label={b.tip || b.label} data-tip={b.tip || undefined} onClick={() => onPick(k)}>
          <i className={b.hi ? "hi" : ""} style={{ height: `${Math.max(8, (Math.abs(b.n) / max) * 100)}%` }} />
          <small>{b.label}</small>
        </button>
      ))}
    </div>
  );
  return (
    <div className="ocf2-bars" style={{ height }} role="img" aria-label={bars.map((b) => b.label).join(", ")}>
      {bars.map((b, k) => (
        <span key={k} className="ocf2-bar">
          <i className={b.hi ? "hi" : ""} style={{ height: `${Math.max(8, (Math.abs(b.n) / max) * 100)}%` }} />
          <small>{b.label}</small>
        </span>
      ))}
    </div>
  );
}

/** A friendly "could not load" card with one retry. */
export function SoftError({ children, onRetry }: { children: ReactNode; onRetry: () => void }) {
  return (
    <Panel>
      <p className="ocf2-p">{children}</p>
      <div><OBtn kind="light" sm onClick={onRetry}>Try again</OBtn></div>
    </Panel>
  );
}

/** Shimmer placeholders while a page loads. */
export function Loading({ n = 3 }: { n?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: n }, (_, k) => <div key={k} className="ocf2-skel" style={{ height: k === 0 ? 150 : 96 }} />)}
    </div>
  );
}
