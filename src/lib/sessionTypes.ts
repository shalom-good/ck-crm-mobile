/**
 * Note / session types for the Quick Add note flow — mirrored 1:1 from the
 * desktop CRM's /quick-add screen so logging a client update is the same
 * structured action on mobile (program → type of session → date → notes).
 */
export type ProgramKey = "ck" | "kdh";

export const SESSION_TYPES: Record<ProgramKey, string[]> = {
  ck: [
    "Initial Interview",
    "CM Weekly Update",
    "CM General Update",
    "Monthly Budget Meeting",
    "Budgeter General Update",
    "Accountant Update",
    "Executive Functioning Notes",
    "At Time of P&L",
    "Booking Notes",
    "Broad Goals",
    "Therapy Notes",
    "General Update",
  ],
  kdh: [
    "Initial Intake",
    "Follow Up",
    "General Update",
    "Meeting Notes",
    "Debt Expert Review",
  ],
};
