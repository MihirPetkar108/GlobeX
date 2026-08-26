import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { ShieldCheck, Award, ArrowRight } from "lucide-react";
import TrustBreakdownDrawer, { TrustProfile } from "@/components/trust/TrustBreakdownDrawer";

interface TrustScoreProps {
  score?: number;
  totalTrades?: number;
  disputeRate?: string;
  verifiedStatus?: string;
  profile?: TrustProfile;
  compact?: boolean;
}

export function TrustScore({
  score = 94,
  totalTrades = 128,
  disputeRate = "0.0%",
  verifiedStatus = "Tier-1 Verified Exporter",
  profile,
  compact = false,
}: TrustScoreProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <div className={`p-4 rounded-2xl bg-[#0F1724] border border-white/[0.08] flex items-center justify-between font-sans select-none ${compact ? "p-3" : "p-5"}`}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-[var(--text-secondary)]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trust Score</span>
          </div>
          <div className="text-3xl font-display font-extrabold text-emerald-400">
            <NumberFlow value={score} /> <span className="text-xs font-sans font-normal text-[var(--text-tertiary)]">/ 100</span>
          </div>
          <span className="text-xs text-emerald-400/90 font-medium block">{verifiedStatus}</span>
        </div>

        <div className="text-right space-y-2">
          <div>
            <div className="text-xs font-mono text-white font-bold">{totalTrades} Completed Trades</div>
            <div className="text-[11px] font-mono text-[var(--text-secondary)]">Dispute Rate: <strong className="text-emerald-400">{disputeRate}</strong></div>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="text-xs font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1 ml-auto cursor-pointer"
          >
            <span>View Breakdown →</span>
          </button>
        </div>
      </div>

      <TrustBreakdownDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        profile={profile}
      />
    </>
  );
}

export default TrustScore;
