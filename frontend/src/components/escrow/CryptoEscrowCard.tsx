import { useEffect, useState } from "react";
import {
  blockchainEscrowService,
  EscrowApiError,
  EscrowStatus,
} from "@/services/blockchain/escrowService";
import { Button as StatefulButton } from "@/components/ui/stateful-button";
import {
  Coins,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Loader2,
} from "lucide-react";

interface CryptoEscrowCardProps {
  tradeId: string;
  onPaymentReleased?: () => void;
}

const CONDITION_LABELS: Record<string, string> = {
  docsVerified: "Trade Documents Cryptographically Registered",
  shipmentDelivered: "Cargo Discharge Verified",
  inspectionPassed: "Consignee Joint Quality & Weight Acceptance",
};

export const CryptoEscrowCard = ({ tradeId, onPaymentReleased }: CryptoEscrowCardProps) => {
  const [status, setStatus] = useState<EscrowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<EscrowApiError | Error | null>(null);
  const [releaseTx, setReleaseTx] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await blockchainEscrowService.getEscrowStatus(tradeId);
      setStatus(result);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load escrow status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId]);

  const handleRelease = async () => {
    setReleasing(true);
    setReleaseError(null);
    try {
      const result = await blockchainEscrowService.releaseEscrow(tradeId);
      setReleaseTx(result.transaction_hash ?? null);
      await loadStatus();
      if (onPaymentReleased) onPaymentReleased();
    } catch (err) {
      setReleaseError(err instanceof Error ? err : new Error("Release failed"));
    } finally {
      setReleasing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-center gap-2 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading escrow state...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 bg-white border border-rose-200 rounded-2xl text-rose-700 text-sm">
        Failed to load escrow: {loadError}
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-6 bg-white border border-slate-200/90 rounded-2xl text-slate-500 text-sm">
        No escrow exists yet for this trade.
      </div>
    );
  }

  const chain = status.chain;
  const dbStatus = String(status.db?.status ?? "UNKNOWN");
  const isReleased = dbStatus === "RELEASED";
  const isDisputed = dbStatus === "DISPUTED";

  const conditionList = chain
    ? Object.entries(CONDITION_LABELS).map(([key, label]) => ({
        key,
        label,
        met: Boolean((chain as unknown as Record<string, unknown>)[key]),
      }))
    : [];

  return (
    <div className="p-6 bg-white border border-slate-200/90 rounded-2xl space-y-6 select-none shadow-2xs">
      {/* Header & Lock State */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">Programmable USDC Escrow</h3>
              {status.drift && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                  DB/CHAIN DRIFT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Contract: {chain?.token ?? String(status.db?.token_address ?? "unknown")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isReleased ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-xs font-bold">
              <Unlock className="w-3.5 h-3.5" />
              <span>Funds Disbursed to Seller</span>
            </span>
          ) : isDisputed ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Disputed</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-mono text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>{dbStatus}</span>
            </span>
          )}
        </div>
      </div>

      {/* Condition Matrix */}
      {chain && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 uppercase">
            <span>Contract Release Conditions</span>
            <span>Status</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {conditionList.map((cond) => (
              <div
                key={cond.key}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  {cond.met ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className={cond.met ? "text-slate-800 font-medium font-sans" : "text-slate-500 font-sans"}>
                    {cond.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold">
                  {cond.met ? (
                    <span className="text-emerald-600">SATISFIED</span>
                  ) : (
                    <span className="text-slate-400">PENDING</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Release Transaction Evidence */}
      {releaseTx && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold font-mono">
            <CheckCircle2 className="w-4 h-4" />
            <span>Escrow Released On-Chain</span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 break-all">
            TxHash: {releaseTx}
          </div>
        </div>
      )}

      {/* Release refused — show the real reason */}
      {releaseError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
          <div className="flex items-center gap-2 text-rose-700 text-xs font-bold font-mono">
            <Lock className="w-4 h-4" />
            <span>
              LOCKED — {releaseError instanceof EscrowApiError ? releaseError.code : "RELEASE_FAILED"}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-600">{releaseError.message}</div>
        </div>
      )}

      {/* Release Action */}
      {!isReleased && dbStatus === "FUNDED" && (
        <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-sans">
            Release requires all contract conditions to be met.
          </div>
          <StatefulButton
            onClick={handleRelease}
            disabled={releasing}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{releasing ? "Releasing..." : "Attempt Release"}</span>
          </StatefulButton>
        </div>
      )}
    </div>
  );
};

export default CryptoEscrowCard;
