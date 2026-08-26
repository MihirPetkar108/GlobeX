import React from "react";
import { cn } from "@/lib/utils";
import { FlaskConical } from "lucide-react";

interface NotModelledStateProps {
  /** What model/dataset would be needed, e.g. "importer supplier-discovery model" */
  missingCapability: string;
  /** What would close the gap, e.g. "an importer-side counterparty dataset" */
  whatWouldClose: string;
  className?: string;
}

/**
 * The honest gap state. Used when a screen has no real model/dataset behind
 * it for the current direction (e.g. importer-side discovery/counterparty
 * ranking) — names the gap out loud instead of relabelling the other
 * direction's model output.
 */
export const NotModelledState: React.FC<NotModelledStateProps> = ({
  missingCapability,
  whatWouldClose,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center gap-3 py-12 px-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--hairline-strong)] bg-[var(--surface-2)]",
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-[var(--status-unavailable-bg)] flex items-center justify-center">
        <FlaskConical className="w-5 h-5" style={{ color: "var(--status-unavailable)" }} />
      </div>
      <div className="space-y-1 max-w-md">
        <div className="text-sm font-semibold text-[var(--text-primary)]">Not modelled yet</div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          There is no {missingCapability} today. This is a real gap, not a loading state — the result
          would need {whatWouldClose} before this screen can show real output here.
        </p>
      </div>
    </div>
  );
};

export default NotModelledState;
