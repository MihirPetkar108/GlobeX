import React from "react";
import { motion } from "framer-motion";
import AppNav from "@/components/layout/AppNav";
import ImportSidebar from "@/components/layout/ImportSidebar";
import ExportSidebar from "@/components/layout/ExportSidebar";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  showHeader?: boolean;
  hideRail?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  maxWidth = "full",
  className,
  showHeader = true,
  hideRail = false,
}) => {
  const maxWidthClasses = {
    sm: "max-w-3xl",
    md: "max-w-4xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-full",
  }[maxWidth];

  const { activeDirection, isExporterView } = useWorkspace();

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] font-sans flex flex-col antialiased selection:bg-[var(--brand-subtle)] selection:text-[var(--brand)]">
      {showHeader && (
        <div className="relative h-[3px] w-full overflow-hidden">
          <motion.div
            key={activeDirection}
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className={cn(
              "absolute inset-0",
              activeDirection === "Export" ? "bg-[var(--brand)]" : "bg-[var(--brand-cyan)]"
            )}
          />
        </div>
      )}
      {showHeader && <AppNav />}

      {/* Sidebar pinned to the real viewport edge (only its own internal
          padding, not a shared max-width container) so it never floats in a
          dead gap on wide screens. The content column alone is capped and
          centered within whatever width remains to its right. */}
      <div className="flex-1 w-full flex items-start">
        {!hideRail && (isExporterView ? <ExportSidebar /> : <ImportSidebar />)}
        <div className="flex-1 min-w-0 px-3 sm:px-6">
          <motion.main
            key={activeDirection}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn("w-full min-w-0 space-y-6 py-4 mx-auto", maxWidthClasses, className)}
          >
            {children}
          </motion.main>
        </div>
      </div>

      {/* Clean minimal footer */}
      <footer className="border-t border-[var(--hairline)] py-5 px-4 text-center text-xs text-[var(--text-tertiary)] font-sans">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Globex — Verified Cross-Border Trade &amp; Programmable Escrow Settlement</span>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">Local Hardhat (31337) · CEPA Schedule Rules</span>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;
