import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchAuthSnapshot,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  type AppUser,
  type OrgProfile,
  type RegistrationDocumentPayload,
} from "@/services/auth/authService";

export type AppState = "NO_SESSION" | "AUTH_LOADING" | "ONBOARDING" | "DASHBOARD";

export interface UseAuthResult {
  appState: AppState;
  session: Session | null;
  appUser: AppUser | null;
  organization: OrgProfile | null;
  error: string | null;
  signUp: (email: string, password: string, firstName: string, lastName: string, organizationName: string, document?: RegistrationDocumentPayload | null) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Owns the real session + onboarding-completion state machine. `appState` is
 * derived, not stored: it is recomputed from the current session/org snapshot
 * on every render so there is exactly one source of truth (the DB), never a
 * client flag that can drift from it.
 */
export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [organization, setOrganization] = useState<OrgProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (nextSession: Session | null) => {
    try {
      const snapshot = await fetchAuthSnapshot(nextSession);
      setSession(snapshot.session);
      setAppUser(snapshot.appUser);
      setOrganization(snapshot.organization);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data && data.session) {
          loadSnapshot(data.session).finally(() => {
            if (!cancelled) setInitializing(false);
          });
        } else {
          setInitializing(false);
        }
      })
      .catch((err) => {
        console.warn("Supabase auth session check fallback:", err);
        if (!cancelled) setInitializing(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) {
        loadSnapshot(nextSession);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadSnapshot]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadSnapshot(data.session);
  }, [loadSnapshot]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    organizationName: string,
    document?: RegistrationDocumentPayload | null
  ) => {
    setError(null);
    try {
      await authSignUp(email, password, firstName, lastName, organizationName, document);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      throw err;
    }
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const authData = await authSignIn(email, password);
      setSession(authData.session);
      await loadSnapshot(authData.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      throw err;
    }
  }, [refresh]);

  const signOut = useCallback(async () => {
    setError(null);
    if (!session) return;
    try {
      await authSignOut();
      setSession(null);
      setAppUser(null);
      setOrganization(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed.");
      throw err;
    }
  }, [session]);

  const appState: AppState = initializing
      ? "AUTH_LOADING"
      : !session
        ? "NO_SESSION"
        : !appUser
          ? "AUTH_LOADING"
          : !organization || !organization.onboardingCompleted
            ? "ONBOARDING"
            : "DASHBOARD";

  return {
    appState,
    session,
    appUser,
    organization,
    error,
    signUp,
    signIn,
    signOut,
    refresh,
  };
}
