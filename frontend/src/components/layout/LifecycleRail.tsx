import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";
import { 
  LayoutGrid, 
  Compass, 
  Gauge, 
  ShieldCheck, 
  Handshake, 
  Landmark 
} from "lucide-react";

interface RailStep {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefixes: string[];
}

interface LifecycleRailProps {
  /** Renders as an always-visible block instead of the desktop-only rail (used inside the mobile drawer). */
  mobile?: boolean;
  /** Renders in sleek dark mode (used in dark sidebar drawer). */
  dark?: boolean;
}

export const LifecycleRail: React.FC<LifecycleRailProps> = ({ mobile = false, dark = false }) => {
  const { hasUnreadTradeUpdates, activeDirection } = useWorkspace();
  const location = useLocation();

  const isDashboardActive = location.pathname === "/home" || location.pathname === "/dashboard";
  const isExport = activeDirection === "Export";

  const steps: RailStep[] = [
    // Exporters land on the real country-matching + trade-risk engine
    // (/export-discover, ML-backed: /predict/market-opportunity + real
    // profit/company ranking). Importers keep the marketplace-listing
    // browser (/discover) — a different feature, not ML ranking.
    {
      key: "discover",
      label: isExport ? "Partner Discovery" : "Discover Markets",
      href: isExport ? "/export-discover" : "/discover",
      icon: Compass,
      matchPrefixes: ["/discover", "/catalog", "/export-discover"],
    },
    {
      key: "assess",
      label: "Assess Trade",
      href: "/assess",
      icon: Gauge,
      matchPrefixes: ["/assess", "/trade-analysis"],
    },
    {
      key: "verify",
      label: "Counterparties",
      href: "/counterparties",
      icon: ShieldCheck,
      matchPrefixes: ["/counterparties", "/companies"],
    },
    {
      key: "trades",
      label: "Trade Requests",
      href: "/trades",
      icon: Handshake,
      matchPrefixes: ["/trades", "/requests", "/export-trades"],
    },
    {
      key: "settle",
      label: "Settle",
      href: "/escrow",
      icon: Landmark,
      matchPrefixes: ["/escrow", "/disputes", "/ledger"],
    },
  ];

  const activeIndex = steps.findIndex((step) => step.matchPrefixes.some((p) => location.pathname.startsWith(p)));

  return (
    <nav
      aria-label="Trade OS Navigation"
      className={cn(
        "flex-col gap-2 py-4 pr-3 select-none",
        mobile ? "flex w-full" : "hidden lg:flex w-60 shrink-0 border-r border-[var(--hairline)] pl-3 sm:pl-6"
      )}
    >
      {/* Top Dashboard Item */}
      <Link
        to="/home"
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all w-full",
          isDashboardActive
            ? dark
              ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 shadow-sm"
              : "bg-emerald-50 text-emerald-900 border border-emerald-200/70 shadow-sm"
            : dark
              ? "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
        )}
      >
        <div className={cn(
          "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          isDashboardActive
            ? dark
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-emerald-600 text-white"
            : dark
              ? "bg-slate-800 text-slate-400"
              : "bg-[var(--surface-2)] text-[var(--text-tertiary)]"
        )}>
          <LayoutGrid className="w-4 h-4" />
        </div>
        <span className="truncate">Dashboard</span>
      </Link>

      {/* Divider */}
      <div className="w-full h-px bg-[var(--hairline)] my-1" />

      {/* 5-Step Connected Stepper Rail */}
      <div className="relative space-y-1">
        {steps.map((step, idx) => {
          const isActive = idx === activeIndex;
          const isPast = activeIndex >= 0 && idx < activeIndex;
          const isLast = idx === steps.length - 1;
          const Icon = step.icon;
          return (
            <div key={step.key} className="relative flex items-stretch">
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-[26px] top-9 w-px h-[calc(100%-2px)]",
                    isPast
                      ? dark
                        ? "bg-emerald-500/50"
                        : "bg-[var(--brand)]/40"
                      : dark
                        ? "bg-slate-800"
                        : "bg-[var(--hairline)]"
                  )}
                />
              )}
              <Link
                to={step.href}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm transition-colors w-full justify-between",
                  isActive
                    ? dark
                      ? "text-emerald-400 font-bold"
                      : "text-[var(--brand)] font-bold"
                    : dark
                      ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      "relative z-10 w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                      isActive
                        ? dark
                          ? "bg-emerald-500 border-emerald-400 text-slate-950 font-bold"
                          : "bg-[var(--brand)] border-[var(--brand)] text-white"
                        : isPast
                          ? dark
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                            : "bg-[var(--brand-subtle)] border-[var(--brand)]/40 text-[var(--brand)]"
                          : dark
                            ? "bg-slate-900 border-slate-800 text-slate-400"
                            : "bg-[var(--surface-1)] border-[var(--hairline-strong)] text-[var(--text-tertiary)]"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate py-0.5">{step.label}</span>
                </div>

                {/* Notification dot for Trade Requests item */}
                {step.key === "trades" && hasUnreadTradeUpdates && (
                  <span className="flex h-2 w-2 relative shrink-0 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default LifecycleRail;
