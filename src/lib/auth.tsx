import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { setAuthToken, setOnUnauthorized, fetchMe, type ApiUser } from "./mobileApi";
import { enablePushAfterSignIn } from "./push";

/**
 * Real sign-in: email → 6-digit code → JWT from /api/mobile/auth/verify.
 * The token + user persist in Capacitor Preferences (localStorage on web)
 * and restore on launch. The signed-in user IS the provider; admins can
 * additionally "view as" a teammate (drives ?as= on /families).
 */

const SESSION_KEY = "ck_session";
const VIEW_AS_KEY = "ck_view_as";

/** Emails that always get the admin "View as" control, even if the token
 *  arrives without admin:true. */
export const ADMIN_EMAILS = [
  "shalom@collectivekindness.net",
  "shalomygoodman@gmail.com",
  "leivi@collectivekindness.net",
];

export type AuthStatus = "loading" | "signedOut" | "signedIn";

interface AuthValue {
  status: AuthStatus;
  token: string | null;
  user: ApiUser | null;
  /** admin flag OR one of the hardwired owner emails */
  isAdmin: boolean;
  /** Non-null when an admin is viewing the app as a teammate. */
  viewAs: { email: string; name: string; role: string } | null;
  signIn: (token: string, user: ApiUser) => Promise<void>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [viewAs, setViewAsState] = useState<{ email: string; name: string; role: string } | null>(null);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setViewAsState(null);
    setStatus("signedOut");
    await prefRemove(SESSION_KEY);
    await prefRemove(VIEW_AS_KEY);
  }, []);

  // 401 anywhere → sign out (token expired or roster removal).
  useEffect(() => {
    setOnUnauthorized(() => { void clearSession(); });
    return () => setOnUnauthorized(null);
  }, [clearSession]);

  // Restore the session on launch, then re-validate with GET /me
  // (best-effort: network trouble keeps the stored session).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await prefGet(SESSION_KEY);
      if (cancelled) return;
      if (!raw) { setStatus("signedOut"); return; }
      try {
        const saved = JSON.parse(raw) as { token?: string; user?: ApiUser };
        if (!saved?.token || !saved?.user?.email) { setStatus("signedOut"); return; }
        setAuthToken(saved.token);
        setToken(saved.token);
        setUser(saved.user);
        setStatus("signedIn");
        const savedViewAs = await prefGet(VIEW_AS_KEY);
        if (savedViewAs && !cancelled) {
          try { setViewAsState(JSON.parse(savedViewAs)); } catch { /* noop */ }
        }
        // Confirm the token still works; refresh the user snapshot.
        try {
          const me = await fetchMe();
          if (!cancelled && me?.user?.email) {
            setUser(me.user);
            await prefSet(SESSION_KEY, JSON.stringify({ token: saved.token, user: me.user }));
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
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
    setStatus("signedIn");
    await prefSet(SESSION_KEY, JSON.stringify({ token: newToken, user: newUser }));
    // Native only; quietly no-ops on web and when permission is denied.
    void enablePushAfterSignIn();
  }, []);

  const signOut = useCallback(async () => { await clearSession(); }, [clearSession]);

  const setViewAs = useCallback((v: { email: string; name: string; role: string } | null) => {
    setViewAsState(v);
    if (v) void prefSet(VIEW_AS_KEY, JSON.stringify(v));
    else void prefRemove(VIEW_AS_KEY);
  }, []);

  const isAdmin = !!user && (user.admin === true || ADMIN_EMAILS.includes((user.email || "").toLowerCase()));

  const value = useMemo<AuthValue>(
    () => ({ status, token, user, isAdmin, viewAs: isAdmin ? viewAs : null, signIn, signOut, setViewAs }),
    [status, token, user, isAdmin, viewAs, signIn, signOut, setViewAs],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
