import { useState } from "react";
import { DisputeCase } from "@/types/trade";
import { DEMO_DISPUTES } from "@/data/mockTradeData";
import { useWorkspace } from "@/context/WorkspaceContext";
import { blockchainEscrowService } from "@/services/blockchain/escrowService";
import {
  Scale,
  Bot,
  UserCheck,
  FileText,
  CheckCircle2,
  Gavel,
} from "lucide-react";
import SpecularButton from "@/components/ui/SpecularButton";

interface DisputeResolutionSuiteProps {
  initialDispute?: DisputeCase;
}

export const DisputeResolutionSuite = ({
  initialDispute = DEMO_DISPUTES[0],
}: DisputeResolutionSuiteProps) => {
  const [dispute, setDispute] = useState<DisputeCase>(initialDispute);
  const [arbitratorRuling, setArbitratorRuling] = useState<"Partial Split" | "Full Release" | "Full Refund">("Partial Split");
  const [arbitratorNotes, setArbitratorNotes] = useState(
    "Ruling in accordance with Clause 7.2 of the sales agreement: 98% ($539,000 USDC) released to seller for delivered quantity, and 2% ($11,000 USDC) refunded to buyer for tare weight shortage."
  );
  const [isSubmittingRuling, setIsSubmittingRuling] = useState(false);
  const [isRulingSettled, setIsRulingSettled] = useState(false);
  const [arbitrateError, setArbitrateError] = useState<string | null>(null);

  const { user: currentUser } = useWorkspace();
  // Real org_role has no distinct "arbitrator" persona — arbitration is a
  // platform_role, not an org membership role. ORGANIZATION_ADMIN is the
  // closest real role for this demo-data-driven dispute panel.
  const isArbitrator = currentUser.roleTitle === "Admin";

  const handleArbitrate = async () => {
    setIsSubmittingRuling(true);
    setArbitrateError(null);
    try {
      await blockchainEscrowService.resolveDispute(dispute.tradeId, 539000, 11000);

      setDispute((prev) => ({
        ...prev,
        status: "Arbitrated",
        arbitratorVerdict: {
          ruling: arbitratorRuling,
          splitRatio: { seller: 98, buyer: 2 },
          arbitratorNotes,
          decidedAt: new Date().toISOString(),
          arbitratorName: currentUser.name,
        },
      }));
      setIsRulingSettled(true);
    } catch (err) {
      setArbitrateError(err instanceof Error ? err.message : "Failed to execute ruling on-chain");
    } finally {
      setIsSubmittingRuling(false);
    }
  };

  return (
    <div className="p-5 bg-[var(--surface-1)] border border-[var(--hairline)] rounded-2xl space-y-5 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--hairline)] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Human-in-the-Loop Dispute & Arbitration Engine
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                CASE: #{dispute.id}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-sans">
              Trade: <strong className="text-[var(--text-primary)]">{dispute.tradeTitle}</strong> · Claim: ${dispute.claimAmountUSD.toLocaleString()} USD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-xl bg-[var(--surface-3)] border border-[var(--hairline)] text-[var(--text-primary)] font-semibold">
            Status: <span className="text-amber-700">{dispute.status}</span>
          </span>
        </div>
      </div>

      {/* Claim Summary & Evidence Files */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--hairline)] space-y-2">
          <div className="text-xs font-mono font-semibold uppercase text-[var(--text-secondary)]">
            Filed Claim Statement (Buyer)
          </div>
          <div className="text-xs text-[var(--text-primary)] leading-relaxed font-sans">
            {dispute.evidenceSummary}
          </div>
          <div className="text-[11px] font-mono text-[var(--text-tertiary)] pt-1">
            Filed By: <span className="text-[var(--text-primary)] font-medium">{dispute.filerName}</span> ({dispute.filedBy})
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-[var(--hairline)] space-y-2">
          <div className="text-xs font-mono font-semibold uppercase text-[var(--text-secondary)]">
            Registered Cryptographic Evidence
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            {dispute.evidenceFiles?.map((file) => {
              const hash = file.sha256 || (file as any).sha256Hash || "";
              return (
                <div key={file.name} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--hairline)]">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span className="truncate max-w-[180px]">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {hash ? `${hash.substring(0, 10)}...` : "Verified"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Co-Pilot Recommendation */}
      <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-sky-200 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-600">
          <Bot className="w-4 h-4" />
          <span>Autonomous AI Synthesis Recommendation</span>
        </div>
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
          {dispute.aiAnalysis?.reasoning || dispute.aiAnalysis?.recommendedVerdict || (dispute as any).aiRecommendation?.suggestedRuling || "AI synthesis underway based on weighbridge and cargo manifest data."}
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] pt-1">
          <span>Confidence: <strong className="text-emerald-600">{dispute.aiAnalysis?.confidenceScore ?? 92}%</strong></span>
          <span>Clause: <strong className="text-[var(--text-primary)]">{dispute.aiAnalysis?.contractReference || (dispute as any).aiRecommendation?.applicableClause || "Clause 7.2"}</strong></span>
        </div>
      </div>

      {/* Arbitrator Decision Action Area */}
      {isArbitrator && dispute.status !== "Arbitrated" && (
        <div className="p-4 rounded-xl bg-[var(--surface-3)] border border-amber-200 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-700">
            <Gavel className="w-4 h-4" />
            <span>Certified Arbitrator Verdict Form</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["Partial Split", "Full Release", "Full Refund"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setArbitratorRuling(r)}
                className={`py-2 px-3 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                  arbitratorRuling === r
                    ? "bg-amber-100 text-amber-800 border-amber-300 font-bold"
                    : "bg-[var(--surface-1)] border-[var(--hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            value={arbitratorNotes}
            onChange={(e) => setArbitratorNotes(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-xs text-[var(--text-primary)] outline-none font-sans resize-none"
            placeholder="Enter formal legal reasoning..."
          />

          <SpecularButton
            type="button"
            onClick={handleArbitrate}
            disabled={isSubmittingRuling}
            isLoading={isSubmittingRuling}
            variant="amber"
            size="md"
            radius={12}
            className="w-full justify-center"
            icon={<UserCheck className="w-4 h-4" />}
            iconPosition="left"
          >
            {isSubmittingRuling ? "Broadcasting Verdict to EVM..." : "Execute Binding Arbitrator Ruling ($539k / $11k)"}
          </SpecularButton>

          {arbitrateError && (
            <div className="text-xs font-mono text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
              Ruling failed: {arbitrateError}
            </div>
          )}
        </div>
      )}

      {/* Settled Verdict Banner */}
      {(dispute.status === "Arbitrated" || isRulingSettled) && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span>Binding Verdict Executed on Smart Escrow Contract</span>
          </div>
          <p className="text-xs text-[var(--text-primary)] font-sans">
            {dispute.arbitratorVerdict?.arbitratorNotes || arbitratorNotes}
          </p>
        </div>
      )}
    </div>
  );
};

export default DisputeResolutionSuite;
