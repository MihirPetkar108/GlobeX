import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace, type TradeDirection } from "@/context/WorkspaceContext";
import { Ship, Building2, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DirectionChooserProps {
  /** Called after the transition overlay plays, once a direction is locked in. */
  onEnter: () => void;
}

/**
 * Deliberately chrome-free (no AppShell/AppNav/LifecycleRail). Choosing a
 * direction here is a visible, explicit moment, not a silent context flip: a
 * brand-colored transition overlay plays before the real workspace (with
 * full nav) is entered, so the shift into "you are now in Import/Export
 * mode" is unmistakable. Rendered by HomePage at /home.
 */
export const DirectionChooser: React.FC<DirectionChooserProps> = ({ onEnter }) => {
  const { user, canSwitchDirection, activeDirection, setActiveDirection } = useWorkspace();
  const [transitioning, setTransitioning] = useState<TradeDirection | null>(null);

  const allOptions: { direction: TradeDirection; label: string; icon: typeof Ship; blurb: string }[] = [
    { direction: "Export", label: "Export", icon: Ship, blurb: "Sell goods to global buyers." },
    { direction: "Import", label: "Import", icon: Building2, blurb: "Source goods from verified suppliers." },
  ];
  const options = allOptions.filter((opt) => (canSwitchDirection ? true : opt.direction === activeDirection));

  const handleChoose = (direction: TradeDirection) => {
    setActiveDirection(direction);
    setTransitioning(direction);
    window.setTimeout(onEnter, 420);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--surface-0)] flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--brand-subtle)] border border-[var(--brand)]/25 flex items-center justify-center">
          <Globe2 className="w-4.5 h-4.5 text-[var(--brand)]" />
        </div>
        <span className="font-display font-bold text-lg tracking-tight text-[var(--text-primary)]">
          GlobeX<span className="text-[var(--brand)]">AI</span>
        </span>
      </div>

      <h1 className="font-display font-bold text-2xl text-[var(--text-primary)] mb-1 text-center">
        Welcome back, {user.name.split(" ")[0]}
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-9 text-center">
        {canSwitchDirection ? "Choose how you'd like to work today." : "Continue to your workspace."}
      </p>

      <div className={cn("grid gap-4 w-full max-w-xl", options.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-sm")}>
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.direction}
              type="button"
              onClick={() => handleChoose(opt.direction)}
              className="group flex flex-col items-center gap-3 p-7 rounded-3xl border border-[var(--hairline)] bg-[var(--surface-1)] hover:border-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-colors cursor-pointer text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-3)] group-hover:bg-[var(--brand)]/15 flex items-center justify-center transition-colors">
                <Icon className="w-6 h-6 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] transition-colors" />
              </div>
              <div>
                <div className="font-display font-semibold text-base text-[var(--text-primary)]">{opt.label}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-1">{opt.blurb}</div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {transitioning && (
          <motion.div
            key="direction-transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--brand)]"
          >
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="text-white font-display font-bold text-xl tracking-tight"
            >
              Entering {transitioning === "Export" ? "Export" : "Import"} Workspace
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DirectionChooser;
