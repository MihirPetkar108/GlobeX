import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";
import { Workflow, FilePlus2, TrendingUp } from "lucide-react";

interface RailStep {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefixes: string[];
}

/**
 * Export flow's own sidebar — exactly 3 tabs: Export Trades (landing),
 * Create Listing, Discover. Fully separate from the Import sidebar; the two
 * flows no longer share one direction-aware rail.
 */
interface ExportSidebarProps {
  /** Renders as an always-visible block instead of the desktop-only rail (used inside the mobile drawer). */
  mobile?: boolean;
  /** Renders in sleek dark mode (used in dark sidebar drawer). */
  dark?: boolean;
}

export const ExportSidebar: React.FC<ExportSidebarProps> = ({ mobile = false, dark = false }) => {
  const { hasUnreadTradeUpdates } = useWorkspace();
  const location = useLocation();

  const steps: RailStep[] = [
    {
      key: "export-trades",
      label: "Export Trades",
      href: "/export-trades",
      icon: Workflow,
      matchPrefixes: ["/export-trades"],
    },
    {
      key: "export-listings",
      label: "Create Listing",
      href: "/export-listings",
      icon: FilePlus2,
      matchPrefixes: ["/export-listings"],
    },
    {
      key: "export-discover",
      label: "Discover",
      href: "/export-discover",
      icon: TrendingUp,
      matchPrefixes: ["/export-discover"],
    },
  ];

  const activeIndex = steps.findIndex((step) => step.matchPrefixes.some((p) => location.pathname.startsWith(p)));

  return (
    <nav
      aria-label="Export navigation"
      className={cn(
        "flex-col gap-0.5 py-4 pr-3 select-none",
        mobile ? "flex w-full" : "hidden lg:flex w-60 shrink-0 border-r border-[var(--hairline)] pl-3 sm:pl-6"
      )}
    >
      <div className="relative">
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
                    "absolute left-[26px] top-9 w-px h-[calc(100%-4px)]",
                    isPast ? (dark ? "bg-emerald-500/50" : "bg-[var(--brand)]/40") : (dark ? "bg-slate-800" : "bg-[var(--hairline)]")
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

                {/* Notification dot for Export Trades item when a request/status is updated */}
                {step.key === "export-trades" && hasUnreadTradeUpdates && (
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

export default ExportSidebar;
