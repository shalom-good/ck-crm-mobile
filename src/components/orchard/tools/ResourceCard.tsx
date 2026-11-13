import type { CSSProperties, KeyboardEvent } from "react";
import { Phone, Envelope, ArrowSquareOut } from "@phosphor-icons/react";
import type { Resource } from "@/lib/types";
import { initialsOf } from "@/components/orchard/Orchard";
import { tintOf } from "./ToolsKit";

/** Directory card in Orchard: tinted initials, name, contact chip, two-line
 *  description, then Call / Email / Website pills. Tapping the card does
 *  what the old row did (website, else call). */
export function ResourceCard({ resource: r, onOpen, i = 0 }: { resource: Resource; onOpen?: () => void; i?: number }) {
  const t = tintOf(r.category || r.name);
  const tel = r.phone ? r.phone.replace(/[^0-9+]/g, "") : "";
  const url = r.link ? (r.link.startsWith("http") ? r.link : `https://${r.link}`) : "";
  // Skip the contact chip when it only repeats the phone number.
  const digits = (v?: string) => (v || "").replace(/\D/g, "");
  const contact = r.contact && !(digits(r.contact).length >= 7 && digits(r.contact) === digits(r.phone)) ? r.contact : null;
  const key = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(); } };
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <div className="oco-card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={key} style={{ "--i": i } as CSSProperties}>
      <div className="oco-card-hd">
        <span className="oco-av" style={{ background: t.bg, color: t.ink }} aria-hidden="true">{initialsOf(r.name)}</span>
        <div className="oco-main">
          <div className="oco-name" style={{ whiteSpace: "normal" }}>{r.name}</div>
          {contact && <div className="oco-chips"><span className="oco-chip oco-chip--sky">{contact}</span></div>}
        </div>
        <span className="oco-caret" aria-hidden="true">›</span>
      </div>
      {r.description && <p className="oco-desc">{r.description}</p>}
      {(tel || r.email || url) && (
        <div className="oco-pills" onClick={stop}>
          {tel && <a className="oco-pill" href={`tel:${tel}`} aria-label={`Call ${r.name}`}><Phone size={14} weight="bold" /><span>{r.phone}</span></a>}
          {r.email && <a className="oco-pill" href={`mailto:${r.email}`} aria-label={`Email ${r.name}`}><Envelope size={14} weight="bold" /><span>Email</span></a>}
          {url && <a className="oco-pill is-go" href={url} target="_blank" rel="noreferrer" aria-label={`Open ${r.name} website`}><span>Website</span><ArrowSquareOut size={14} weight="bold" /></a>}
        </div>
      )}
    </div>
  );
}
