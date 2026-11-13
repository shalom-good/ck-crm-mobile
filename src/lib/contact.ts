/**
 * contact.ts — the person a family can always reach.
 *
 * Shalom 2026-11-11: "make sure to add whatsapp Tovi at any time."
 * The number is the coordinator line the web portal already gives every
 * family (PORTAL_COORDINATOR_WA in the CRM, lib/data/portalHome.js). If
 * Tovi's own number is different, set VITE_COORDINATOR_WA at build time or
 * change the default here: every "WhatsApp Tovi" link in the app reads it.
 */
const env = (import.meta as any).env || {};

export const COORDINATOR_NAME: string = env.VITE_COORDINATOR_NAME || "Tovi";
const DIGITS = String(env.VITE_COORDINATOR_WA || "16469148102").replace(/\D/g, "");

/** A WhatsApp link to the coordinator, with an optional opening line. */
export const coordinatorWa = (text?: string) => `https://wa.me/${DIGITS}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
