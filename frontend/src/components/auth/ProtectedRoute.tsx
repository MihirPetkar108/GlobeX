import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";

const AuthLoadingScreen: React.FC = () => (
  <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[var(--surface-0)]">
    <div className="w-8 h-8 rounded-full border-2 border-[var(--hairline-strong)] border-t-[var(--brand)] animate-spin" />
  </div>
);

/**
 * Real session + onboarding-completion gate, backed by useAuth()'s
 * appState (derived from a live Supabase session + the org's
 * onboarding_completed column — see src/hooks/useAuth.ts).
 *
 * NO_SESSION      -> /
 * ONBOARDING      -> /onboarding (org missing or onboarding_completed=false)
 * AUTH_LOADING    -> spinner (don't flash-redirect while the session resolves)
 * DASHBOARD       -> render children
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { appState } = useAuthContext();

  if (appState === "AUTH_LOADING") return <AuthLoadingScreen />;
  if (appState === "NO_SESSION") {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  if (appState === "ONBOARDING") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
