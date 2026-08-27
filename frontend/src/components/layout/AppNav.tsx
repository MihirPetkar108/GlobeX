import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Building2,
  Globe2,
  ChevronDown,
  Search,
  Menu,
  X,
  LogOut,
  ArrowLeftRight,
} from "lucide-react";
import CommandPalette from "@/components/common/CommandPalette";
import ImportSidebar from "@/components/layout/ImportSidebar";
import ExportSidebar from "@/components/layout/ExportSidebar";

/**
 * Renders only when businessType === "BOTH" (canSwitchDirection).
 * Import and Export are now fully separate, locked flows — this control no
 * longer flips activeDirection in place. Clicking it navigates back to the
 * Dashboard picker (/home) so the user explicitly re-chooses a flow; that's
 * the only way to switch once inside one.
 */
const DirectionControl: React.FC = () => {
  const { activeDirection, canSwitchDirection } = useWorkspace();
  const navigate = useNavigate();

  if (!canSwitchDirection) {
    return (
      <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--surface-2)] text-xs font-medium text-[var(--text-secondary)]">
        <span>{activeDirection === "Export" ? "Exporter" : "Importer"}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate("/home")}
      className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--surface-1)] hover:border-[var(--brand)]/40 hover:bg-[var(--brand-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors cursor-pointer"
      title="Switch flow"
    >
      <ArrowLeftRight className="w-3.5 h-3.5" />
      <span>{activeDirection === "Export" ? "Exporting" : "Importing"}</span>
    </button>
  );
};

export const AppNav: React.FC = () => {
  const { user, logout, hasUnreadTradeUpdates, isExporterView } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAccountMenuOpen(false);
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setAccountMenuOpen(false);
    await logout();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[var(--surface-1)]/95 backdrop-blur-md border-b border-[var(--hairline)] select-none">
        <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Hamburger + brand + org */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Hamburger button with notification dot for trade status updates */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen((v) => !v)}
              className="relative p-2 rounded-[var(--radius-md)] border border-[var(--hairline)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              
              {/* Notification dot when trade status is updated (counteroffer, accepted, declined) */}
              {hasUnreadTradeUpdates && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
                </span>
              )}
            </button>

            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-subtle)] border border-[var(--brand)]/25 flex items-center justify-center transition-colors group-hover:border-[var(--brand)]/50">
                <Globe2 className="w-4 h-4 text-[var(--brand)]" />
              </div>
              <span className="font-display font-bold text-base tracking-tight text-[var(--text-primary)]">
                GlobeX<span className="text-[var(--brand)]">AI</span>
              </span>
            </Link>

            <div className="hidden lg:block w-px h-6 bg-[var(--hairline)]" />

            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--hairline)] max-w-[200px] text-xs text-[var(--text-secondary)]">
              <Building2 className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
              <span className="truncate font-medium" title={user.companyName}>
                {user.companyName}
              </span>
            </div>
          </div>

          {/* Right: search, direction, account */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs text-[var(--text-tertiary)] transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
              <kbd className="ml-2 text-[10px] font-mono px-1 py-0.5 rounded border border-[var(--hairline)] text-[var(--text-muted)]">
                &#8984;K
              </kbd>
            </button>

            <DirectionControl />

            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs border transition-colors cursor-pointer",
                  accountMenuOpen
                    ? "bg-[var(--surface-3)] border-[var(--hairline-strong)] text-[var(--text-primary)]"
                    : "bg-[var(--surface-1)] border-[var(--hairline)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)]"
                )}
              >
                <div className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-[11px] font-bold text-white bg-[var(--brand)] shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="hidden sm:block text-left leading-none">
                  <div className="font-semibold text-[var(--text-primary)] text-xs truncate max-w-[90px]">
                    {user.name ? user.name.split(" ")[0] : "User"}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                    {user.roleTitle || "Admin"}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>

              <AnimatePresence>
                {accountMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-11 w-64 p-2.5 rounded-[var(--radius-lg)] bg-[var(--surface-1)] border border-[var(--hairline-strong)] shadow-xl z-50 space-y-2 text-xs"
                  >
                    <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--hairline)] space-y-1">
                      <div className="font-bold text-[var(--text-primary)] text-sm">{user.name}</div>
                      <div className="text-[var(--text-tertiary)] flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{user.companyName}</span>
                      </div>
                      <div className="text-[var(--text-muted)] font-mono text-[10px]">{user.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--hairline)] text-[var(--text-secondary)] hover:border-[var(--red)]/30 hover:bg-[var(--red-dim)] hover:text-[var(--red)] transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Full Viewport Mobile Navigation Sidebar Drawer (Slides Horizontally from Left to Right) */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-start">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-full max-w-xs h-screen bg-white border-r border-slate-200/90 p-5 overflow-y-auto shadow-2xl flex flex-col justify-between text-slate-900"
            >
              <div>
                {/* Top bar inside drawer */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200/80 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <Link to="/" onClick={() => setMobileDrawerOpen(false)} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                        <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <span className="font-display font-bold text-sm tracking-tight text-slate-900">
                        Globex<span className="text-emerald-600">AI</span>
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Company Badge */}
                <div className="mt-4 mb-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-xs text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate font-semibold">{user.companyName || "Demo Exports Pvt Ltd"}</span>
                </div>

                {isExporterView ? <ExportSidebar mobile /> : <ImportSidebar mobile />}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono text-[10px]">v2.4 Pro Platform</span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-slate-600 hover:text-rose-600 font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </>
  );
};

export default AppNav;
