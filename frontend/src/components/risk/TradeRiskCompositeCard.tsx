import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

interface TradeRiskCompositeCardProps {
  score?: number; // 0 - 100 (Lower is safer)
  corridor?: string;
  contractValueUSD?: number;
}

export const TradeRiskCompositeCard = ({
  score = 18,
  corridor = "India ➔ United Arab Emirates",
  contractValueUSD = 550000,
}: TradeRiskCompositeCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const subscores = [
    { label: "Counterparty Risk", value: 12, level: "LOW", desc: "14-year clean operational history with 340+ verified exports." },
    { label: "Transaction Risk", value: 15, level: "LOW", desc: "100% collateralized in USDC smart contract escrow." },
    { label: "Regulatory & Tariff Risk", value: 14, level: "LOW", desc: "Eligible for 0% duty under India-UAE CEPA treaty." },
    { label: "Document Integrity Risk", value: 16, level: "LOW", desc: "All core trade documents cryptographically anchored on-chain." },
    { label: "Shipment Logistics Risk", value: 22, level: "LOW", desc: "Short 4-day maritime route via Arabian Sea corridor." },
  ];

  const getRiskCategory = (val: number) => {
    if (val <= 25) return { label: "LOW RISK", color: "text-[var(--emerald)]" };
    if (val <= 50) return { label: "MODERATE RISK", color: "text-[var(--accent)]" };
    if (val <= 75) return { label: "ELEVATED RISK", color: "text-[var(--amber)]" };
    return { label: "CRITICAL RISK", color: "text-[var(--red)]" };
  };

  const category = getRiskCategory(score);

  return (
    <div className="p-5 bg-[var(--panel)] border border-[var(--hairline)] rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${category.color}`} />
          <h4 className="text-xs font-sans uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
            Trade Risk Composite
          </h4>
        </div>
        <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold ${category.color} bg-[var(--panel-raised)] border border-[var(--hairline)]`}>
          {category.label}
        </div>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div>
          <div className="text-2xl font-display font-medium text-[var(--text-primary)] flex items-center gap-2">
            <span>{score}</span>
            <span className="text-xs text-[var(--text-tertiary)] font-sans font-normal">/ 100 Composite</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans">
            Corridor: <span className="text-[var(--text-primary)] font-medium">{corridor}</span>
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-sans text-[var(--accent)] hover:underline"
        >
          <span>{isExpanded ? "Hide Breakdown" : "Score Breakdown"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-[var(--panel-raised)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--emerald)] rounded-full transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Expanded Subfactors */}
      {isExpanded && (
        <div className="pt-3 border-t border-[var(--hairline)] space-y-3">
          <div className="space-y-2">
            {subscores.map((sub) => (
              <div key={sub.label} className="p-3 rounded-lg bg-[var(--panel-raised)] text-xs space-y-1 font-sans">
                <div className="flex justify-between font-sans">
                  <span className="font-medium text-[var(--text-primary)]">{sub.label}</span>
                  <span className="text-[var(--emerald)] font-medium font-tabular">{sub.value}/100 ({sub.level})</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{sub.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[var(--panel-raised)] rounded-lg text-xs space-y-1 font-sans border border-[var(--hairline)]">
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[var(--emerald)]" />
              <span>AI Recommendation</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Low risk rating qualifies for instant standard escrow deposit without mandatory third-party pre-inspection bonds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeRiskCompositeCard;
