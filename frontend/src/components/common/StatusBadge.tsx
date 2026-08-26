import React from "react";
import { cn } from "@/lib/utils";

/**
 * The closed status vocabulary (docs/product IA rules): every status shown
 * anywhere in the app renders as one of these six terms. Legacy variant
 * strings (still passed by older call sites) are normalized onto this set
 * below rather than getting their own colors.
 */
export type StatusVariant =
  | "verified"
  | "pending"
  | "review"
  | "blocked"
  | "stale"
  | "unavailable";

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

const LABELS: Record<StatusVariant, string> = {
  verified: "Verified",
  pending: "Pending",
  review: "Review Required",
  blocked: "Blocked",
  stale: "Stale",
  unavailable: "Source Unavailable",
};

/** Maps legacy/free-form status strings from existing call sites onto the closed vocabulary. */
function normalize(status: string): StatusVariant {
  const s = (status || "").toLowerCase().replace(/[\s-]/g, "_");
  if (["verified", "completed", "settled", "operational", "success", "kyc_verified", "released", "resolved", "clear", "active", "in_transit", "in_progress", "live", "funded"].includes(s)) {
    return "verified";
  }
  if (["pending", "created", "processing"].includes(s)) {
    return "pending";
  }
  if (["review", "warning", "discrepancy", "attention", "review_required"].includes(s)) {
    return "review";
  }
  if (["rejected", "disputed", "failed", "critical", "blocked", "unsupported"].includes(s)) {
    return "blocked";
  }
  if (["stale"].includes(s)) {
    return "stale";
  }
  if (["unavailable", "unknown", "muted", "no_data"].includes(s)) {
    return "unavailable";
  }
  return "pending";
}

const TOKEN_VARS: Record<StatusVariant, { fg: string; bg: string }> = {
  verified: { fg: "var(--status-verified)", bg: "var(--status-verified-bg)" },
  pending: { fg: "var(--status-pending)", bg: "var(--status-pending-bg)" },
  review: { fg: "var(--status-review)", bg: "var(--status-review-bg)" },
  blocked: { fg: "var(--status-blocked)", bg: "var(--status-blocked-bg)" },
  stale: { fg: "var(--status-stale)", bg: "var(--status-stale-bg)" },
  unavailable: { fg: "var(--status-unavailable)", bg: "var(--status-unavailable-bg)" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = "sm",
  showDot = true,
  className,
}) => {
  const variant = normalize(String(status));
  const { fg, bg } = TOKEN_VARS[variant];
  const displayLabel = label || LABELS[variant];

  const sizeClasses =
    size === "md" ? "text-xs px-2.5 py-1 gap-1.5" : "text-[11px] px-2 py-0.5 gap-1.5";

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono font-medium rounded-[var(--radius-sm)] border tracking-wide whitespace-nowrap select-none",
        sizeClasses,
        className
      )}
      style={{ color: fg, backgroundColor: bg, borderColor: "var(--hairline-strong)" }}
    >
      {showDot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: fg }} />}
      <span>{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
