import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, ShieldAlert, HelpCircle } from "lucide-react";

export type ComplianceState = "CLEAR" | "REVIEW_REQUIRED" | "BLOCKED" | "UNSUPPORTED";

interface ComplianceBannerProps {
  state: ComplianceState;
  message: string;
  detail?: string;
  className?: string;
}

const CONFIG: Record<
  ComplianceState,
  { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; fg: string; bg: string; canProceed: boolean }
> = {
  CLEAR: { label: "Clear", icon: CheckCircle2, fg: "var(--status-verified)", bg: "var(--status-verified-bg)", canProceed: true },
  REVIEW_REQUIRED: { label: "Review Required", icon: AlertTriangle, fg: "var(--status-review)", bg: "var(--status-review-bg)", canProceed: false },
  BLOCKED: { label: "Blocked", icon: ShieldAlert, fg: "var(--status-blocked)", bg: "var(--status-blocked-bg)", canProceed: false },
  UNSUPPORTED: { label: "Unsupported", icon: HelpCircle, fg: "var(--status-unavailable)", bg: "var(--status-unavailable-bg)", canProceed: false },
};

/**
 * Gating contract: callers must read `canProceed` off the config for `state`
 * rather than deciding for themselves whether an action (Create Trade,
 * Escrow, payment) is allowed.
 */
export function complianceCanProceed(state: ComplianceState): boolean {
  return CONFIG[state].canProceed;
}

export const ComplianceBanner: React.FC<ComplianceBannerProps> = ({ state, message, detail, className }) => {
  const { label, icon: Icon, fg, bg } = CONFIG[state];
  return (
    <div
      className={cn("flex items-start gap-3 p-3.5 rounded-[var(--radius-lg)] border", className)}
      style={{ backgroundColor: bg, borderColor: "var(--hairline-strong)" }}
    >
      <Icon className="w-4.5 h-4.5 shrink-0 mt-0.5" style={{ color: fg }} />
      <div className="min-w-0 space-y-0.5">
        <div className="text-sm font-semibold" style={{ color: fg }}>
          {label}
        </div>
        <div className="text-xs text-[var(--text-secondary)]">{message}</div>
        {detail && <div className="text-[11px] text-[var(--text-tertiary)]">{detail}</div>}
      </div>
    </div>
  );
};

export default ComplianceBanner;
