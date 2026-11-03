/**
 * Line icons for the CK look: 2px stroke, round caps (the App Store set's
 * own glyphs, lucide style). Size defaults to the tab bar's 20px.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = ({ size = 20, ...rest }: P) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...rest,
});

export const IcHome = (p: P) => <svg {...base(p)}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
export const IcFamilies = (p: P) => <svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M2 20c1-3.5 3.6-5.5 7-5.5s6 2 7 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.4 2.4 4 5.5" /></svg>;
export const IcChats = (p: P) => <svg {...base(p)}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>;
export const IcBook = (p: P) => <svg {...base(p)}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></svg>;
export const IcSparkle = (p: P) => <svg {...base(p)}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>;
export const IcTasks = (p: P) => <svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 12l3 3 5-6" /></svg>;
export const IcCalendar = (p: P) => <svg {...base(p)}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>;
export const IcCard = (p: P) => <svg {...base(p)}><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M2.5 10h19M6.5 15h4" /></svg>;
export const IcBriefcase = (p: P) => <svg {...base(p)}><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18" /></svg>;
export const IcChevron = (p: P) => <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>;
export const IcCheck = (p: P) => <svg {...base(p)}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
