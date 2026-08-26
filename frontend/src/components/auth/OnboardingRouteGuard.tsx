import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";

const AuthLoadingScreen: React.FC = () => (
  <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[var(--surface-0)]">
    <div className="w-8 h-8 rounded-full border-2 border-[var(--hairline-strong)] border-t-[var(--brand)] animate-spin" />
  </div>
);

/**
 * Inverse of ProtectedRoute, for the /onboarding route itself: needs a
 * session to write to, but must never be reachable once onboarding is
 * already complete for this org (that's a "never show onboarding again"
 * rule enforced server-side, not just skipped client-side).
 */
export const OnboardingRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { appState } = useAuthContext();

  if (appState === "AUTH_LOADING") return <AuthLoadingScreen />;
  if (appState === "NO_SESSION") return <Navigate to="/auth" replace />;
  if (appState === "DASHBOARD") return <Navigate to="/home" replace />;

  return <>{children}</>;
};

export default OnboardingRouteGuard;
