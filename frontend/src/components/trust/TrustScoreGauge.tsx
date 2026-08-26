import { useState } from "react";
import { ShieldCheck, Info, CheckCircle2, TrendingUp, FileText, AlertCircle } from "lucide-react";

interface TrustScoreGaugeProps {
  score: number; // 0 - 100
  title?: string;
  showBreakdown?: boolean;
  size?: "sm" | "md" | "lg";
}

export const TrustScoreGauge = ({
  score = 92,
  title = "Trade Trust Score",
  showBreakdown = true,
  size = "md",
}: TrustScoreGaugeProps) => {
  const [showInfo, setShowInfo] = useState(false);

  const subfactors = [
    { label: "Counterparty Trust", value: Math.min(100, score + 2), weight: "30%", icon: ShieldCheck },
    { label: "Transaction Behaviour", value: Math.min(100, score - 1), weight: "25%", icon: TrendingUp },
    { label: "Trade Consistency", value: Math.min(100, score + 4), weight: "20%", icon: CheckCircle2 },
    { label: "Document Integrity", value: Math.min(100, score - 3), weight: "15%", icon: FileText },
    { label: "Compliance History", value: Math.min(100, score + 1), weight: "10%", icon: AlertCircle },
  ];

  const strokeWidth = size === "lg" ? 9 : size === "md" ? 7 : 5;
  const radius = size === "lg" ? 52 : size === "md" ? 40 : 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (val: number) => {
    if (val >= 90) return "var(--emerald)";
    if (val >= 75) return "var(--accent)";
    if (val >= 60) return "var(--amber)";
    return "var(--red)";
  };

  const getScoreTier = (val: number) => {
    if (val >= 90) return { label: "INSTITUTIONAL GRADE", color: "text-[var(--emerald)]" };
    if (val >= 75) return { label: "HIGH TRUST", color: "text-[var(--accent)]" };
    if (val >= 60) return { label: "MODERATE TRUST", color: "text-[var(--text-secondary)]" };
    return { label: "REQUIRES COLLATERAL", color: "text-[var(--amber)]" };
  };

  const tier = getScoreTier(score);

  return (
    <div className="p-5 bg-[var(--panel)] border border-[var(--hairline)] rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
          <h4 className="text-xs font-sans uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
            {title}
          </h4>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          title="Explainability"
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Circular Gauge and Primary Metric */}
      <div className="flex items-center gap-5">
        <div className="relative flex items-center justify-center">
          <svg
            width={radius * 2 + strokeWidth * 2}
            height={radius * 2 + strokeWidth * 2}
            className="transform -rotate-90"
          >
            <circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke="var(--panel-raised)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke={getScoreColor(score)}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-display font-medium text-[var(--text-primary)] leading-none">{score}</span>
            <span className="text-[10px] font-sans text-[var(--text-tertiary)]">/100</span>
          </div>
        </div>

        <div className="space-y-1 font-sans">
          <div className={`text-xs font-semibold ${tier.color}`}>{tier.label}</div>
          <p className="text-xs text-[var(--text-secondary)] leading-tight">
            Verified across corporate KYC registries, trade milestone integrity, and smart escrow history.
          </p>
        </div>
      </div>

      {/* Subfactor Breakdown */}
      {showBreakdown && (
        <div className="pt-3 border-t border-[var(--hairline)] space-y-2.5">
          {subfactors.map((sub) => {
            const Icon = sub.icon;
            return (
              <div key={sub.label} className="space-y-1 font-sans text-xs">
                <div className="flex justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sub.label}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">({sub.weight})</span>
                  </span>
                  <span className="font-medium text-[var(--text-primary)] font-tabular">{sub.value}/100</span>
                </div>
                <div className="w-full h-1 bg-[var(--panel-raised)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${sub.value}%`,
                      backgroundColor: getScoreColor(sub.value),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Explainability Callout */}
      {showInfo && (
        <div className="p-3 bg-[var(--panel-raised)] rounded-lg text-xs space-y-1 font-sans border border-[var(--hairline)]">
          <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-[var(--accent)]" /> Explainability Note
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            The GLOBEX Trust Score interprets immutable blockchain-anchored evidence, verified KYC filings, and cross-document reconciliation results. It is an assistive risk mitigation model.
          </p>
        </div>
      )}
    </div>
  );
};

export default TrustScoreGauge;
