import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import type { EscrowStatus } from "@/services/blockchain/escrowService";
import StatusBadge from "@/components/common/StatusBadge";

interface EscrowStateCardProps {
  status: EscrowStatus;
  className?: string;
}

/** The real 6 DB-backed escrow states — not the fictional 7-condition EscrowContract shape. */
const DB_STATUS_TO_BADGE: Record<string, string> = {
  CREATED: "pending",
  FUNDED: "verified",
  RELEASED: "verified",
  DISPUTED: "blocked",
  RESOLVED: "verified",
  REFUNDED: "review",
};

const CONDITIONS: Array<{ key: keyof NonNullable<EscrowStatus["chain"]>; label: string }> = [
  { key: "docsVerified", label: "Documents Verified" },
  { key: "shipmentDelivered", label: "Shipment Delivered" },
  { key: "inspectionPassed", label: "Inspection Passed" },
];

/** Driven off escrowService.getEscrowStatus() — real DB state + live on-chain state, with drift surfaced. */
export const EscrowStateCard: React.FC<EscrowStateCardProps> = ({ status, className }) => {
  const dbStatus = String(status.db?.status ?? "UNKNOWN");
  const badgeVariant = DB_STATUS_TO_BADGE[dbStatus] || "unavailable";

  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] p-4 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-[var(--text-primary)]">Escrow State</div>
        <StatusBadge status={badgeVariant} label={dbStatus} size="md" />
      </div>

      {status.drift && (
        <div className="flex items-start gap-2 p-2.5 rounded-[var(--radius-md)] border" style={{ backgroundColor: "var(--status-review-bg)", borderColor: "var(--hairline-strong)" }}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--status-review)" }} />
          <div className="text-xs" style={{ color: "var(--status-review)" }}>
            <div className="font-semibold">Database and on-chain state disagree</div>
            {status.drift_details.length > 0 && (
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                {status.drift_details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {status.chain_error && (
        <div className="text-xs text-[var(--text-tertiary)]">
          Chain read failed: {status.chain_error.code} — {status.chain_error.message}
        </div>
      )}

      {status.chain && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Release Conditions
          </div>
          {CONDITIONS.map(({ key, label }) => {
            const met = Boolean(status.chain![key]);
            return (
              <div key={String(key)} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                {met ? (
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--status-verified)" }} />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                )}
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EscrowStateCard;
