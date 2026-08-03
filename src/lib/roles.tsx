import React, { createContext, useContext } from "react";
import { useAuth } from "./auth";

/**
 * Roles are the lens; the PROVIDER is who you're viewing as. Since real
 * sign-in landed, the signed-in user IS the provider — their team roles
 * (from the JWT) pick which assignment fields scope the caseload.
 * Admins (user.admin or the owner emails) can "view as" a teammate from
 * Settings; that override also drives ?as= on GET /families.
 */

export type RoleKey =
  | "case_manager"
  | "debt_expert"
  | "budgeter"
  | "jpa"
  | "coordinator"
  | "director";

export interface Role {
  key: RoleKey;
  label: string;
  short: string;
  accent: string;
  blurb: string;
}

export const ROLES: Role[] = [
  { key: "case_manager", label: "Case Manager", short: "CM", accent: "#C2531F", blurb: "Owns the family relationship end to end." },
  { key: "debt_expert", label: "Debt Expert", short: "DE", accent: "#3D7FB8", blurb: "Builds and runs the debt strategy." },
  { key: "budgeter", label: "Budgeter", short: "BG", accent: "#7FA24C", blurb: "Keeps the monthly budget on track." },
  { key: "jpa", label: "Job Placement", short: "JPA", accent: "#8A6A1E", blurb: "Moves clients toward income." },
  { key: "coordinator", label: "Coordinator", short: "CO", accent: "#232B36", blurb: "Keeps everything moving between roles." },
  { key: "director", label: "Director", short: "DIR", accent: "#C2531F", blurb: "Sees everything. Steps in where needed." },
];

export const ROLE_BY_KEY: Record<RoleKey, Role> = ROLES.reduce(
  (a, r) => ({ ...a, [r.key]: r }),
  {} as Record<RoleKey, Role>,
);

/** Map the free-form team roles[] strings from the JWT to our role lens. */
export function roleKeyFromRoles(roles: string[] | undefined | null, admin?: boolean): RoleKey {
  const r = (roles || []).map((x) => String(x).toLowerCase());
  if (admin || r.some((x) => x.includes("director") || x.includes("exec") || x.includes("owner") || x.includes("admin"))) return "director";
  if (r.some((x) => x.includes("debt"))) return "debt_expert";
  if (r.some((x) => x.includes("budget"))) return "budgeter";
  if (r.some((x) => x === "jpa" || x.includes("job"))) return "jpa";
  if (r.some((x) => x.includes("coordinator"))) return "coordinator";
  return "case_manager";
}

export interface Provider {
  name: string;
  email: string;
  role: RoleKey;
}

/** Real team members with live caseloads — the admin "View as" set. */
export const VIEW_AS_CHOICES: Provider[] = [
  { name: "Leah Herman", email: "leahherman714@gmail.com", role: "case_manager" },
  { name: "Yossi Katzman", email: "ckyossi@gmail.com", role: "case_manager" },
  { name: "Mordy Richler", email: "Mordyrichler@gmail.com", role: "debt_expert" },
  { name: "Levi Pinson", email: "levi@kosherdebthelp.com", role: "debt_expert" },
  { name: "Shua Piekarski", email: "Shuap770@gmail.com", role: "debt_expert" },
  { name: "Hanna (Exec)", email: "hanna@kosherdebthelp.com", role: "director" },
];

interface RoleContextValue {
  /** The effective identity the app is lensed through (view-as wins). */
  provider: Provider;
  /** Admin "view as" choices. */
  providers: Provider[];
  /** Switch the view-as lens; pass null / your own email to reset. */
  setProvider: (email: string | null) => void;
  role: Role;
  /** The actual signed-in person (never the view-as identity). */
  me: { name: string; email: string };
  /** Non-null email when an admin lens is active (drives ?as=). */
  viewAsEmail: string | null;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user, viewAs, setViewAs, isAdmin } = useAuth();

  const selfProvider: Provider = {
    name: user?.name || user?.email || "Team member",
    email: (user?.email || "").toLowerCase(),
    role: roleKeyFromRoles(user?.roles, user?.admin),
  };

  const provider: Provider = viewAs
    ? { name: viewAs.name, email: viewAs.email, role: (viewAs.role as RoleKey) || "case_manager" }
    : selfProvider;

  const setProvider = (email: string | null) => {
    if (!isAdmin) return;
    if (!email || email.toLowerCase() === selfProvider.email) { setViewAs(null); return; }
    const hit = VIEW_AS_CHOICES.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (hit) setViewAs({ email: hit.email, name: hit.name, role: hit.role });
  };

  const value: RoleContextValue = {
    provider,
    providers: VIEW_AS_CHOICES,
    setProvider,
    role: ROLE_BY_KEY[provider.role] ?? ROLE_BY_KEY.case_manager,
    me: { name: selfProvider.name, email: selfProvider.email },
    viewAsEmail: viewAs ? viewAs.email : null,
  };
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
