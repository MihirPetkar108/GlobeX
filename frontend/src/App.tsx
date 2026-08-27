import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { AuthProvider } from "@/context/AuthContext";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import PageTransition from "@/components/layout/PageTransition";
import OnboardingRouteGuard from "@/components/auth/OnboardingRouteGuard";

// Eager load core routes for instant navigation and robust Vite HMR
import LandingPage from "@/pages/LandingPage";
import HomePage from "@/pages/HomePage";
import DiscoverPage from "@/pages/DiscoverPage";

// Route-based code splitting for secondary pages
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const SuperAdminLoginPage = lazy(() => import("@/pages/SuperAdminLoginPage"));
const SuperAdminDashboardPage = lazy(() => import("@/pages/SuperAdminDashboardPage"));
const ListingDetailPage = lazy(() => import("@/pages/ListingDetailPage"));
const CatalogPage = lazy(() => import("@/pages/CatalogPage"));
const CatalogEditorPage = lazy(() => import("@/pages/CatalogEditorPage"));
const AssessPage = lazy(() => import("@/pages/AssessPage"));
const CounterpartiesIndexPage = lazy(() => import("@/pages/CounterpartiesIndexPage"));
const CountryCompaniesPage = lazy(() => import("@/pages/CountryCompaniesPage"));
const CompanyDetailPage = lazy(() => import("@/pages/CompanyDetailPage"));
const CounterpartyDetailPage = lazy(() => import("@/pages/CounterpartyDetailPage"));
const RequestsPage = lazy(() => import("@/pages/RequestsPage"));
const TradesIndexPage = lazy(() => import("@/pages/TradesIndexPage"));
const ExportTradesPage = lazy(() => import("@/pages/ExportTradesPage"));
const ExportListingsHubPage = lazy(() => import("@/pages/ExportListingsHubPage"));
const ExportDiscoverPage = lazy(() => import("@/pages/ExportDiscoverPage"));
const MyListingsPage = lazy(() => import("@/pages/MyListingsPage"));
const TradeWorkspacePage = lazy(() => import("@/pages/TradeWorkspacePage"));
const EscrowPage = lazy(() => import("@/pages/EscrowPage"));
const DisputesPage = lazy(() => import("@/pages/DisputesPage"));
const BlockchainLedgerPage = lazy(() => import("@/pages/BlockchainLedgerPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminSystemPage = lazy(() => import("@/pages/AdminSystemPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

import ProtectedRoute from "@/components/auth/ProtectedRoute";

const queryClient = new QueryClient();

// Smooth instant scroll reset on route changes
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Ultra-light, non-jarring fallback loader
const RouteFallback: React.FC = () => (
  <div className="min-h-[calc(100vh-3.5rem)] w-full flex items-center justify-center bg-app text-text-tertiary">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-xl border border-emerald/30 bg-emerald-dim flex items-center justify-center animate-pulse text-emerald">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald" />
      </div>
      <span className="text-xs font-mono tracking-wider text-text-tertiary uppercase">
        Loading workspace...
      </span>
    </div>
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    // No AnimatePresence here: it needs to intercept React's unmount of the
    // outgoing route to run an exit animation, which requires reliably
    // observing removal through the Suspense boundary every route is lazy
    // -loaded behind. In practice that combination (AnimatePresence +
    // React.lazy route components + React Router's keyed <Routes>) left the
    // outgoing page's DOM permanently stuck mounted underneath the new page
    // on a real, reproduced navigation bug (confirmed via Cypress: see
    // cypress/e2e/*-journey.cy.ts) -- not just a Chrome-automation artifact.
    // Each PageTransition below still gets a per-mount fade-in; there is no
    // exit fade, which is a real, deliberate trade-off for correctness over
    // polish until a Suspense-aware transition approach replaces this.
    <Suspense fallback={<RouteFallback />}>
        <Routes location={location}>
          {/* PUBLIC */}
          <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
          <Route path="/super-admin/login" element={<PageTransition><SuperAdminLoginPage /></PageTransition>} />
          <Route path="/super-admin/dashboard" element={<PageTransition><SuperAdminDashboardPage /></PageTransition>} />
          <Route
            path="/onboarding"
            element={<OnboardingRouteGuard><PageTransition><OnboardingPage /></PageTransition></OnboardingRouteGuard>}
          />

          {/* APP — ProtectedRoute + AppShell + direction-aware nav */}
          <Route path="/home" element={<ProtectedRoute><PageTransition><HomePage /></PageTransition></ProtectedRoute>} />

          {/* DISCOVER */}
          <Route path="/discover" element={<ProtectedRoute><PageTransition><DiscoverPage /></PageTransition></ProtectedRoute>} />
          <Route path="/discover/:listingId" element={<ProtectedRoute><PageTransition><ListingDetailPage /></PageTransition></ProtectedRoute>} />
          <Route path="/catalog" element={<ProtectedRoute><PageTransition><CatalogPage /></PageTransition></ProtectedRoute>} />
          <Route path="/catalog/new" element={<ProtectedRoute><PageTransition><CatalogEditorPage /></PageTransition></ProtectedRoute>} />

          {/* ASSESS */}
          <Route path="/assess/:tradeId?" element={<ProtectedRoute><PageTransition><AssessPage /></PageTransition></ProtectedRoute>} />
          <Route path="/counterparties" element={<ProtectedRoute><PageTransition><CounterpartiesIndexPage /></PageTransition></ProtectedRoute>} />
          <Route path="/counterparties/:id" element={<ProtectedRoute><PageTransition><CounterpartyDetailPage /></PageTransition></ProtectedRoute>} />
          <Route path="/companies" element={<ProtectedRoute><PageTransition><CountryCompaniesPage /></PageTransition></ProtectedRoute>} />
          <Route path="/companies/detail/:companyId" element={<ProtectedRoute><PageTransition><CompanyDetailPage /></PageTransition></ProtectedRoute>} />

          {/* DEAL */}
          <Route path="/requests" element={<ProtectedRoute><PageTransition><RequestsPage /></PageTransition></ProtectedRoute>} />
          <Route path="/trades" element={<ProtectedRoute><PageTransition><TradesIndexPage /></PageTransition></ProtectedRoute>} />
          <Route path="/export-trades" element={<ProtectedRoute><PageTransition><ExportTradesPage /></PageTransition></ProtectedRoute>} />
          <Route path="/export-listings" element={<ProtectedRoute><PageTransition><ExportListingsHubPage /></PageTransition></ProtectedRoute>} />
          <Route path="/my-listings" element={<ProtectedRoute><PageTransition><MyListingsPage /></PageTransition></ProtectedRoute>} />
          <Route path="/export-discover" element={<ProtectedRoute><PageTransition><ExportDiscoverPage /></PageTransition></ProtectedRoute>} />
          <Route path="/trades/:id" element={<ProtectedRoute><PageTransition><TradeWorkspacePage /></PageTransition></ProtectedRoute>} />

          {/* SETTLE */}
          <Route path="/escrow/:tradeId?" element={<ProtectedRoute><PageTransition><EscrowPage /></PageTransition></ProtectedRoute>} />
          <Route path="/disputes" element={<ProtectedRoute><PageTransition><DisputesPage /></PageTransition></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute><PageTransition><BlockchainLedgerPage /></PageTransition></ProtectedRoute>} />

          {/* SYSTEM */}
          <Route path="/settings" element={<ProtectedRoute><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><PageTransition><AdminSystemPage /></PageTransition></ProtectedRoute>} />

          {/* Legacy redirects — retired routes onto their canonical replacements (rebuild plan §1c) */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/role-select" element={<Navigate to="/onboarding" replace />} />
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="/workspace" element={<Navigate to="/home" replace />} />
          <Route path="/marketplace" element={<Navigate to="/discover" replace />} />
          <Route path="/marketplace/:id" element={<Navigate to="/discover" replace />} />
          <Route path="/market-intelligence" element={<Navigate to="/discover" replace />} />
          <Route path="/trade-analysis" element={<Navigate to="/assess" replace />} />
          <Route path="/export-catalog" element={<Navigate to="/catalog" replace />} />
          <Route path="/wishlist" element={<Navigate to="/catalog" replace />} />
          <Route path="/create-listing" element={<Navigate to="/catalog/new" replace />} />
          <Route path="/trade-requests" element={<Navigate to="/requests" replace />} />
          <Route path="/trade-intent" element={<Navigate to="/requests" replace />} />
          <Route path="/get-started" element={<Navigate to="/requests" replace />} />
          <Route path="/documents" element={<Navigate to="/trades" replace />} />
          <Route path="/shipments" element={<Navigate to="/trades" replace />} />
          <Route path="/blockchain" element={<Navigate to="/ledger" replace />} />
          <Route path="/arbitrator" element={<Navigate to="/disputes" replace />} />

          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
    </Suspense>
  );
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <ScrollToTop />
            <div className="flex flex-col min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] selection:bg-emerald-dim selection:text-emerald">
              <main className="flex-1">
                <ErrorBoundary>
                  <AnimatedRoutes />
                </ErrorBoundary>
              </main>
            </div>
          </BrowserRouter>
        </WorkspaceProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
