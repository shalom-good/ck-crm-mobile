import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { setAuthToken, setOnUnauthorized, fetchMe, type ApiUser } from "./mobileApi";
import { setPortalToken } from "./portalApi";
import { enablePushAfterSignIn } from "./push";

/**
 * One session store, two kinds of people:
 *
 *   team   — email → 6-digit code → 90-day JWT from /api/mobile/auth/verify.
 *            The signed-in user IS the provider; admins can "view as" a
 *            teammate (drives ?as= on /families).
 *   family — the 7-letter portal code → portal token from /api/portal/login
 *            (client: "mobile"). Reads the same payload as the web portal.
 *
 * The session persists in Capacitor Preferences (localStorage on web) and
 * restores on launch. A 401 anywhere ends it and the app returns to /start.
 */

const SESSION_KEY = "ck_session";
const VIEW_AS_KEY = "ck_view_as";
/** Set (sessionStorage) when a 401 ended the session, so the start screen
 *  can say so once. An explicit sign-out never sets it. */
export const SESSION_ENDED_KEY = "ck_session_ended";

/** Emails that always get the admin "View as" control, even if the token
 *  arrives without admin:true. */
export const ADMIN_EMAILS = [
  "shalom@collectivekindness.net",
  "shalomygoodman@gmail.com",
  "leivi@collectivekindness.net",
];

export type AuthStatus = "loading" | "signedOut" | "signedIn";
export type SessionKind = "team" | "family";
export interface FamilySession { name: string | null; clientId?: string | null }

interface AuthValue {
  status: AuthStatus;
  /** Which world the session belongs to (null while signed out). */
  kind: SessionKind | null;
  token: string | null;
  user: ApiUser | null;
  family: FamilySession | null;
  /** admin flag OR one of the hardwired owner emails */
  isAdmin: boolean;
  /** Non-null when an admin is viewing the app as a teammate. */
  viewAs: { email: string; name: string; role: string } | null;
  signIn: (token: string, user: ApiUser) => Promise<void>;
  signInFamily: (token: string, name: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  setViewAs: (v: { email: string; name: string; role: string } | null) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

async function prefGet(key: string): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  } catch {
    try { return localStorage.getItem(key); } catch { return null; }
  }
}
async function prefSet(key: string, value: string) {
  try { await Preferences.set({ key, value }); } catch { try { localStorage.setItem(key, value); } catch { /* noop */ } }
}
async function prefRemove(key: string) {
  try { await Preferences.remove({ key }); } catch { try { localStorage.removeItem(key); } catch { /* noop */ } }
}

type Saved =
  | { kind?: "team"; token: string; user: ApiUser }
  | { kind: "family"; token: string; name: string | null };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [kind, setKind] = useState<SessionKind | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [family, setFamily] = useState<FamilySession | null>(null);
  const [viewAs, setViewAsState] = useState<{ email: string; name: string; role: string } | null>(null);

  const clearSession = useCallback(async (reason?: "unauthorized") => {
    if (reason === "unauthorized") {
      try { sessionStorage.setItem(SESSION_ENDED_KEY, "1"); } catch { /* noop */ }
    }
    setAuthToken(null);
    setPortalToken(null);
    setToken(null);
    setUser(null);
    setFamily(null);
    setKind(null);
    setViewAsState(null);
    setStatus("signedOut");
    await prefRemove(SESSION_KEY);
    await prefRemove(VIEW_AS_KEY);
  }, []);

  // 401 anywhere → sign out (token expired, roster removal, code revoked).
  useEffect(() => {
    setOnUnauthorized(() => { void clearSession("unauthorized"); });
    return () => setOnUnauthorized(null);
  }, [clearSession]);

  // Restore the session on launch; team sessions re-validate with GET /me
  // (best-effort: network trouble keeps the stored session).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await prefGet(SESSION_KEY);
      if (cancelled) return;
      if (!raw) { setStatus("signedOut"); return; }
      try {
        const saved = JSON.parse(raw) as Saved;
        if (!saved?.token) { setStatus("signedOut"); return; }

        if (saved.kind === "family") {
          setPortalToken(saved.token);
          setToken(saved.token);
          setFamily({ name: saved.name ?? null });
          setKind("family");
          setStatus("signedIn");
          return;
        }

        if (!saved.user?.email) { setStatus("signedOut"); return; }
        setAuthToken(saved.token);
        setToken(saved.token);
        setUser(saved.user);
        setKind("team");
        setStatus("signedIn");
        const savedViewAs = await prefGet(VIEW_AS_KEY);
        if (savedViewAs && !cancelled) {
          try { setViewAsState(JSON.parse(savedViewAs)); } catch { /* noop */ }
        }
        try {
          const me = await fetchMe();
          if (!cancelled && me?.user?.email) {
            setUser(me.user);
            await prefSet(SESSION_KEY, JSON.stringify({ kind: "team", token: saved.token, user: me.user }));
          }
        } catch { /* 401 already handled by onUnauthorized; other errors keep the session */ }
      } catch {
        if (!cancelled) setStatus("signedOut");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (newToken: string, newUser: ApiUser) => {
    setPortalToken(null);
    setFamily(null);
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
    setKind("team");
    setStatus("signedIn");
    await prefSet(SESSION_KEY, JSON.stringify({ kind: "team", token: newToken, user: newUser }));
    // Native only; quietly no-ops on web and when permission is denied.
    void enablePushAfterSignIn();
  }, []);

  const signInFamily = useCallback(async (newToken: string, name: string | null) => {
    setAuthToken(null);
    setUser(null);
    setViewAsState(null);
    setPortalToken(newToken);
    setToken(newToken);
    setFamily({ name });
    setKind("family");
    setStatus("signedIn");
    await prefSet(SESSION_KEY, JSON.stringify({ kind: "family", token: newToken, name }));
    await prefRemove(VIEW_AS_KEY);
  }, []);

  const signOut = useCallback(async () => { await clearSession(); }, [clearSession]);

  const setViewAs = useCallback((v: { email: string; name: string; role: string } | null) => {
    setViewAsState(v);
    if (v) void prefSet(VIEW_AS_KEY, JSON.stringify(v));
    else void prefRemove(VIEW_AS_KEY);
  }, []);

  const isAdmin = kind === "team" && !!user && (user.admin === true || ADMIN_EMAILS.includes((user.email || "").toLowerCase()));

  const value = useMemo<AuthValue>(
    () => ({ status, kind, token, user, family, isAdmin, viewAs: isAdmin ? viewAs : null, signIn, signInFamily, signOut, setViewAs }),
    [status, kind, token, user, family, isAdmin, viewAs, signIn, signInFamily, signOut, setViewAs],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
