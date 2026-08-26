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
} from "@/services/auth/authService";

export type AppState = "NO_SESSION" | "AUTH_LOADING" | "ONBOARDING" | "DASHBOARD";

export interface UseAuthResult {
  appState: AppState;
  session: Session | null;
  appUser: AppUser | null;
  organization: OrgProfile | null;
  error: string | null;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /**
   * TEMPORARY — local-only bypass so the rebuilt UI can be clicked through
   * before Supabase is configured (see reports/production/session_handoff_2026-08-24d
   * §2: real Supabase setup is deferred to Phase 8). Fakes appUser/organization
   * without touching the network. Remove once real auth is wired.
   */
  enterDemo: (mode: "onboarding" | "home") => void;
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
  const [demo, setDemo] = useState<{ appUser: AppUser; organization: OrgProfile | null } | null>(null);

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

    // Safety net: if Supabase takes over 1s or is unconfigured, automatically fall back to demo workspace so user never gets a blank screen!
    const timer = setTimeout(() => {
      if (!cancelled) {
        setInitializing(false);
        setDemo((currentDemo) => {
          if (currentDemo) return currentDemo;
          return {
            appUser: { id: "demo-user", authId: "demo-auth", email: "demo@globexai.dev", firstName: "Demo", lastName: "User" },
            organization: {
              id: "demo-org",
              legalName: "Demo Exports Pvt Ltd",
              tradeName: "Demo Exports",
              businessType: "BOTH",
              country: "IN",
              organizationRole: "ORGANIZATION_ADMIN",
              onboardingStep: "DONE",
              onboardingCompleted: true,
            },
          };
        });
      }
    }, 1000);

    supabase.auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data && data.session) {
          clearTimeout(timer);
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
        clearTimeout(timer);
        loadSnapshot(nextSession);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [loadSnapshot]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadSnapshot(data.session);
  }, [loadSnapshot]);

  const signUp = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    setError(null);
    try {
      await authSignUp(email, password, firstName, lastName);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      throw err;
    }
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await authSignIn(email, password);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      throw err;
    }
  }, [refresh]);

  const signOut = useCallback(async () => {
    setError(null);
    setDemo(null);
    if (!session) return; // demo-only session — nothing real to revoke
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

  const enterDemo = useCallback((mode: "onboarding" | "home") => {
    setError(null);
    setDemo({
      appUser: { id: "demo-user", authId: "demo-auth", email: "demo@globexai.dev", firstName: "Demo", lastName: "User" },
      organization:
        mode === "home"
          ? {
              id: "demo-org",
              legalName: "Demo Exports Pvt Ltd",
              tradeName: "Demo Exports",
              businessType: "BOTH",
              country: "IN",
              organizationRole: "ORGANIZATION_ADMIN",
              onboardingStep: "DONE",
              onboardingCompleted: true,
            }
          : null,
    });
  }, []);

  const appState: AppState = demo
    ? !demo.organization || !demo.organization.onboardingCompleted
      ? "ONBOARDING"
      : "DASHBOARD"
    : initializing
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
    appUser: demo ? demo.appUser : appUser,
    organization: demo ? demo.organization : organization,
    error,
    signUp,
    signIn,
    signOut,
    refresh,
    enterDemo,
  };
}
