import { WhatsappLogo } from "@phosphor-icons/react";
import { COORDINATOR_NAME, coordinatorWa } from "@/lib/contact";

/** A real person, from the foot of a family tab (Shalom 2026-11-11: "make
 *  sure to add whatsapp Tovi at any time. add that to the bottom"). */
export function TalkFoot({ line = "A real person, for anything at all." }: { line?: string }) {
  return (
    <a className="ocf2-talk" href={coordinatorWa(`Hi ${COORDINATOR_NAME}, I have a question.`)} target="_blank" rel="noreferrer">
      <span className="ocf2-talk-ico" aria-hidden><WhatsappLogo size={19} weight="fill" /></span>
      <span className="ocf2-talk-t"><b>WhatsApp {COORDINATOR_NAME}</b><small>{line}</small></span>
    </a>
  );
}
