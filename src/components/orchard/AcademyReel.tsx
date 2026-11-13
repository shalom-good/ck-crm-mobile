import { useState } from "react";
import { SpeakerHigh } from "@phosphor-icons/react";
import { AcademyMark } from "@/components/gv";

/** The 53-second "Two couples, same starting line" cut the Academy site opens with. */
const TRAILER_ID = "1183805646";
const QUIET = `https://player.vimeo.com/video/${TRAILER_ID}?autoplay=1&muted=1&loop=1&playsinline=1&controls=0&title=0&byline=0&portrait=0&dnt=1`;
const LOUD = `https://player.vimeo.com/video/${TRAILER_ID}?autoplay=1&playsinline=1&title=0&byline=0&portrait=0&dnt=1`;

/**
 * The course preview: plays silently on a loop, and "Play with sound" turns
 * it into the real player. Used on the CK Academy door and on a CK family's
 * Learn tab (Shalom 2026-11-11: "show preview as well").
 */
export function AcademyReel({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const [sound, setSound] = useState(false);
  return (
    <section className={`ocf2-ak-reel${sound ? "" : " is-quiet"} ${className}`} style={style} aria-label="Course preview">
      <img src="/academy/trailer-wide.webp" alt="" />
      <iframe key={sound ? "loud" : "quiet"} src={sound ? LOUD : QUIET} title="CK Academy preview" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
      {!sound && (
        <>
          <span className="ocf2-ak-reel-top"><i><AcademyMark size={12} color="#2D3766" /></i>CK Academy</span>
          <span className="ocf2-ak-reel-len">53 second preview</span>
          <button type="button" className="ocf2-ak-sound" onClick={() => setSound(true)}><SpeakerHigh size={16} weight="fill" /> Play with sound</button>
        </>
      )}
    </section>
  );
}
