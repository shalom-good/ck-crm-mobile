import type { Family, Payment, Resource, Activity, Track, Meeting } from "./types";

const ME = "Shalom Goodman";
const ME_EMAIL = "shalom@collectivekindness.net";
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();
const at = (h: number, m: number) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };

/**
 * Families shaped like the /m roster (new_clients ∪ kdh_clients). The
 * attention-input fields (daysSinceLastNote, directorFlag, currentMonthlyNet,
 * stage, lifecycleStatus) are tuned to exercise lib/attention.ts across roles.
 */
export const MOCK_FAMILIES: Family[] = [
  {
    id: "f1", kind: "kdh", name: "Andrew & Rivka Peterson", city: "Lakewood", state: "NJ",
    phone: "603 555-0123", email: "peterson@example.com", program: "Kosher Debt Help",
    labels: ["New intake"], paymentStatus: "behind",
    assignments: { case_manager: ME, debt_expert: "Mordy K", budgeter: "Leivi K" },
    estimatedDebt: 84000, amountPaid: 1200, lastTouchedAt: hoursAgo(2),
    active: true, stage: "Assigned", daysSinceLastNote: 9,
  },
  {
    id: "f2", kind: "kdh", name: "Ralph & Esther Edwards", city: "Monsey", state: "NY",
    phone: "217 555-0113", email: "edwards@example.com", program: "Kosher Debt Help",
    labels: ["VIP"], paymentStatus: "current",
    assignments: { case_manager: ME, debt_expert: "Mordy K" },
    estimatedDebt: 41000, amountPaid: 600, lastTouchedAt: hoursAgo(5),
    active: true, stage: "Active", daysSinceLastNote: 2,
  },
  {
    id: "f3", kind: "ck", name: "Courtney & David Henry", city: "Brooklyn", state: "NY",
    phone: "319 555-0115", email: "henry@example.com", program: "CK Debt",
    labels: ["Plan ready"], paymentStatus: "behind",
    assignments: { case_manager: "Leivi K", debt_expert: ME, budgeter: "Leivi K" },
    estimatedDebt: 122000, amountPaid: 4800, lastTouchedAt: daysAgo(1),
    active: true, lifecycleStatus: "Active", daysSinceLastNote: 33, currentMonthlyNet: -240,
  },
  {
    id: "f4", kind: "ck", name: "Leslie & Sara Alexander", city: "Cleveland", state: "OH",
    phone: "808 555-0111", email: "alexander@example.com", program: "CK Debt",
    labels: ["At risk"], paymentStatus: "behind",
    assignments: { case_manager: "Leivi K", debt_expert: ME },
    estimatedDebt: 67000, amountPaid: 900, lastTouchedAt: hoursAgo(30),
    active: true, lifecycleStatus: "Active", directorFlag: "At risk of dropping off the plan", daysSinceLastNote: 20,
  },
  {
    id: "f5", kind: "ck", name: "Marvin & Leah McKinney", city: "Baltimore", state: "MD",
    phone: "907 555-0101", email: "mckinney@example.com", program: "Job Funnel",
    labels: ["Job search"], paymentStatus: "unknown",
    assignments: { jpa: ME, case_manager: "Leivi K" },
    estimatedDebt: 23000, amountPaid: 0, lastTouchedAt: daysAgo(2),
    active: true, lifecycleStatus: "Active", daysSinceLastNote: 16,
  },
  {
    id: "f6", kind: "ck", name: "Jacob & Chaya Jones", city: "Passaic", state: "NJ",
    phone: "684 555-0102", email: "jones@example.com", program: "CK Debt",
    labels: ["Stable"], paymentStatus: "current",
    assignments: { budgeter: ME, case_manager: "Leivi K", debt_expert: "Mordy K" },
    estimatedDebt: 53000, amountPaid: 2100, lastTouchedAt: hoursAgo(6),
    active: true, lifecycleStatus: "Active", daysSinceLastNote: 5, currentMonthlyNet: 420,
  },
  {
    id: "f7", kind: "kdh", name: "Kristin & Eli Watson", city: "Toronto", state: "ON",
    phone: "405 555-0128", email: "watson@example.com", program: "Kosher Debt Help",
    labels: ["Stable"], paymentStatus: "current",
    assignments: { case_manager: ME, debt_expert: "Mordy K", budgeter: "Leivi K" },
    estimatedDebt: 31000, amountPaid: 5400, lastTouchedAt: daysAgo(3),
    active: true, stage: "Active", daysSinceLastNote: 40,
  },
  {
    id: "f8", kind: "ck", name: "Cameron & Miriam Williamson", city: "Chicago", state: "IL",
    phone: "270 555-0117", email: "williamson@example.com", program: "Job Funnel",
    labels: ["Placed", "Stable"], paymentStatus: "current",
    assignments: { jpa: ME, coordinator: "Leivi K" },
    estimatedDebt: 12000, amountPaid: 800, lastTouchedAt: daysAgo(4),
    active: true, lifecycleStatus: "Active", daysSinceLastNote: 4,
  },
];

/** Next steps — client_tracks for the signed-in user, overdue + due today. */
export const MOCK_TRACKS: Track[] = [
  { id: "t1", familyId: "f4", familyName: "Leslie & Sara Alexander", familyKind: "ck", step: "Call after director flag", type: "Call", dueAt: daysAgo(1), ownerEmail: ME_EMAIL, done: false },
  { id: "t2", familyId: "f1", familyName: "Andrew & Rivka Peterson", familyKind: "kdh", step: "Send budget worksheet", type: "Email", dueAt: daysAgo(2), ownerEmail: ME_EMAIL, done: false },
  { id: "t3", familyId: "f7", familyName: "Kristin & Eli Watson", familyKind: "kdh", step: "Confirm this month's payment", type: "Call", dueAt: at(17, 0), ownerEmail: ME_EMAIL, done: false },
];

/** Today's meetings (Calendly/Google) — mocked until that API is wired. */
export const MOCK_MEETINGS: Meeting[] = [
  { id: "mtg1", at: at(10, 30), durationMin: 30, clientName: "Ralph & Esther Edwards", expertName: ME, location: "Zoom" },
  { id: "mtg2", at: at(14, 0), durationMin: 45, clientName: "Courtney & David Henry", expertName: ME, location: "Phone" },
];

export const MOCK_PAYMENTS: Payment[] = [
  { id: "p1", familyId: "f1", familyName: "Andrew & Rivka Peterson", amount: 120, date: daysAgo(8), status: "overdue", method: "Card", initiative: "KDH", assignedTo: ME },
  { id: "p2", familyId: "f1", familyName: "Andrew & Rivka Peterson", amount: 120, date: daysAgo(1), status: "overdue", method: "Card", initiative: "KDH", assignedTo: ME },
  { id: "p3", familyId: "f7", familyName: "Kristin & Eli Watson", amount: 180, date: hoursAgo(20), status: "due", method: "ACH", initiative: "KDH", assignedTo: ME },
  { id: "p4", familyId: "f2", familyName: "Ralph & Esther Edwards", amount: 300, date: hoursAgo(4), status: "paid", method: "Card", initiative: "KDH", assignedTo: ME },
  { id: "p5", familyId: "f3", familyName: "Courtney & David Henry", amount: 250, date: daysAgo(2), status: "paid", method: "ACH", initiative: "CK Debt", assignedTo: ME },
  { id: "p6", familyId: "f6", familyName: "Jacob & Chaya Jones", amount: 90, date: daysAgo(3), status: "paid", method: "Zelle", initiative: "CK Debt", assignedTo: ME },
];

export const MOCK_RESOURCES: Resource[] = [
  { id: "r1", name: "Hatzlocha Grants", category: "Emergency Funds", contact: "R. Feldman", phone: "718 555-0144", description: "One-time hardship grants for tuition and rent." },
  { id: "r2", name: "Parnasa Network", category: "Employment", contact: "Mushki R", phone: "347 555-0199", description: "Job leads and recruiter intros for the Job Funnel." },
  { id: "r3", name: "Tomchei Shabbos", category: "Food", phone: "845 555-0121", description: "Weekly food packages, all communities." },
  { id: "r4", name: "Credit Counseling Co-op", category: "Debt", contact: "Mordy K", description: "Pro-bono debt strategy sessions." },
  { id: "r5", name: "Refuah Health Fund", category: "Medical", phone: "732 555-0188", description: "Bridges medical bills while insurance processes." },
  { id: "r6", name: "Yad Eliezer Budgeting", category: "Budgeting", contact: "Leivi K", description: "Hands-on monthly budget coaching." },
];

export const MOCK_ACTIVITY: Record<string, Activity[]> = {
  f1: [
    { id: "fa1", familyId: "f1", kind: "status", summary: "Marked behind on payments", at: hoursAgo(1), by: "System" },
    { id: "fa2", familyId: "f1", kind: "call", summary: "Outbound call · no answer", at: hoursAgo(26), by: "Shalom" },
    { id: "fa3", familyId: "f1", kind: "payment", summary: "Payment failed · $120", at: daysAgo(8), by: "Stripe" },
    { id: "fa4", familyId: "f1", kind: "note", summary: "Note", body: "Said cash is tight until next paycheck. Follow up Thursday.", at: daysAgo(9), by: "Shalom" },
  ],
};

export function activityFor(familyId: string): Activity[] {
  return MOCK_ACTIVITY[familyId] ?? [
    { id: `${familyId}-c`, familyId, kind: "status", summary: "Family created", at: daysAgo(20) },
  ];
}

export const CAPTURE_KINDS = ["Note", "Task", "Payment", "Flag"] as const;
