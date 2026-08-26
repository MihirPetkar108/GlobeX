import React from "react";
import { useNavigate } from "react-router-dom";
import { DestinationCountryInsight } from "@/services/api/aiService";
import { ISO3_FLAG_MAP } from "./CountryOpportunityCard";
import { DetailDrawer } from "@/components/common/DetailDrawer";
import { PrimaryAction } from "@/components/common/PrimaryAction";
import { 
  Globe2, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Ship, 
  Building2, 
  BarChart3, 
  Scale, 
  FileText, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: DestinationCountryInsight | null;
  userCommodity?: string;
  userQuantityKg?: number;
}

export const CountryDetailDrawer: React.FC<CountryDetailDrawerProps> = ({
  isOpen,
  onClose,
  data,
  userCommodity = "Basmati Rice",
  userQuantityKg = 1000,
}) => {
  const navigate = useNavigate();
  if (!data) return null;

  const { destination, forecast, scores, risk, pros, cons } = data;
  const flag = ISO3_FLAG_MAP[destination.iso3] || "🌐";
  const finalScore = scores.final_score || 80;

  const annualDemandMT = Math.round(forecast.annual_market_demand_kg / 1000).toLocaleString();
  const fobPrice = forecast.expected_fob_price_usd_per_kg.toFixed(2);
  const estRevenue = Math.round(userQuantityKg * forecast.expected_fob_price_usd_per_kg).toLocaleString();

  const handleSimulateTrade = () => {
    onClose();
    navigate(`/trade-analysis?commodity=${encodeURIComponent(userCommodity)}&origin=IND&dest=${destination.iso3}&qty=${userQuantityKg}`);
  };

  const handleViewCompanies = () => {
    onClose();
    navigate(
      `/companies?country=${destination.iso3}&countryName=${encodeURIComponent(destination.country_name)}&commodity=${encodeURIComponent(userCommodity)}`
    );
  };

  // Sub-scores list
  const subScoreItems = [
    { label: "Revealed Demand Fit", val: scores.score_revealed_demand },
    { label: "Forecast Momentum", val: scores.score_forecast_demand },
    { label: "Trade Access & Tariffs", val: scores.score_trade_access },
    { label: "Economic Capacity", val: scores.score_economic_capacity },
    { label: "Maritime Logistics & Ports", val: scores.score_logistics },
    { label: "Buyer Ecosystem Network", val: scores.score_buyer_ecosystem },
    { label: "Macro Market Stability", val: scores.score_stability },
  ];

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{flag}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
                {destination.country_name}
              </h2>
            </div>
            <span className="text-xs text-[var(--text-secondary)] font-sans">
              Global Destination Opportunity Dossier
            </span>
          </div>
        </div>
      }
      subtitle={`Opportunity Assessment for ${userQuantityKg.toLocaleString()} kg ${userCommodity} from India`}
      maxWidth="md"
    >
      <div className="space-y-6 select-none pb-6">
        {/* ── Top Executive Gist Strip ────────────────────────────────────── */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 via-blue-950/20 to-[#0C121D] border border-sky-500/20 relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-600 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Verdict</span>
              </div>
              <p className="text-sm text-[var(--text-primary)] font-sans leading-relaxed">
                <strong className="text-[var(--text-primary)]">{destination.country_name}</strong> is ranked with an overall score of{" "}
                <strong className="text-emerald-600">{finalScore.toFixed(1)} / 100</strong>. It presents a strong market absorption opportunity for Indian {userCommodity} with an expected FOB price of <strong className="text-sky-600">${fobPrice} / kg</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-1)]/80 border border-[var(--hairline)] text-center flex-shrink-0">
              <span className="text-2xl font-mono font-bold text-emerald-600 block">
                {finalScore.toFixed(1)}
              </span>
              <span className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">Total Score</span>
            </div>
          </div>
        </div>

        {/* ── Demand & Revenue Forecast Panel (XGBoost Forecaster) ──── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-sky-600" />
              <span>XGBoost Quantile Demand &amp; Revenue Forecast</span>
            </h4>
            <span className="text-[10px] font-mono text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 font-bold">
              XGB Residual Forecaster
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)]">
              <span className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block">Annual Demand</span>
              <span className="text-base font-mono font-bold text-[var(--text-primary)] mt-0.5 block">{annualDemandMT} MT</span>
              {forecast.demand_interval_80_lower_kg && forecast.demand_interval_80_upper_kg ? (
                <span className="text-[10px] font-mono text-sky-300 block mt-0.5">
                  80% P10–P90: {Math.round(forecast.demand_interval_80_lower_kg / 1000).toLocaleString()}–{Math.round(forecast.demand_interval_80_upper_kg / 1000).toLocaleString()} MT
                </span>
              ) : (
                <span className="text-[10px] font-sans text-[var(--text-secondary)]">Market absorption</span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)]">
              <span className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block">Expected FOB</span>
              <span className="text-base font-mono font-bold text-sky-600 mt-0.5 block">${fobPrice} / kg</span>
              <span className="text-[10px] font-sans text-[var(--text-secondary)]">3-yr median anchor</span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)]">
              <span className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] block">Est. Revenue</span>
              <span className="text-base font-mono font-bold text-emerald-600 mt-0.5 block">${estRevenue}</span>
              <span className="text-[10px] font-sans text-[var(--text-secondary)]">For {userQuantityKg.toLocaleString()} kg</span>
            </div>
          </div>
        </div>

        {/* ── Pros: Why You Should Export Here ─────────────────────────────── */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Pros & Strategic Advantages</span>
          </h4>

          <div className="space-y-2">
            {pros && pros.length > 0 ? (
              pros.map((pro, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[var(--status-verified-bg)] border border-emerald-500/20 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-emerald-200/90 font-sans leading-relaxed">
                    {pro}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-tertiary)] font-sans italic">No specific advantages calculated.</p>
            )}
          </div>
        </div>

        {/* ── Cons: Trade Barriers & Risks ────────────────────────────────── */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Cons & Trade Barriers</span>
          </h4>

          <div className="space-y-2">
            {cons && cons.length > 0 ? (
              cons.map((con, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[var(--status-review-bg)] border border-amber-500/20 flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-amber-200/90 font-sans leading-relaxed">
                    {con}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-tertiary)] font-sans italic">No trade barriers flagged.</p>
            )}
          </div>
        </div>

        {/* ── Trade Risk & Sanctions Engine Evaluation ───────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Compliance & Trade Risk Engine</span>
            </h4>
            <span className={cn(
              "text-[10px] font-mono px-2 py-0.5 rounded border font-bold",
              scores.risk_penalty > 0
                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
            )}>
              {risk.risk_level || "LOW"} RISK · {scores.risk_penalty || 0} pts Penalty
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)]">
              <span className="text-[10px] text-[var(--text-tertiary)] block uppercase">Active Sanctions Check</span>
              <span className={cn("font-bold text-xs mt-0.5 block", risk.sanctions_active ? "text-rose-600" : "text-emerald-600")}>
                {risk.sanctions_active ? "FLAGGED: Active Embargo" : "CLEARED: 0 Sanctions"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)]">
              <span className="text-[10px] text-[var(--text-tertiary)] block uppercase">OFAC SDN Exposure</span>
              <span className={cn("font-bold text-xs mt-0.5 block", risk.ofac_count > 0 ? "text-amber-600" : "text-emerald-600")}>
                {risk.ofac_count > 0 ? `${risk.ofac_count} Listed Entities` : "CLEARED: 0 Listed"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)]">
              <span className="text-[10px] text-[var(--text-tertiary)] block uppercase">SCOMET Strategic Controls</span>
              <span className={cn("font-bold text-xs mt-0.5 block", risk.scomet_controlled ? "text-rose-600" : "text-emerald-600")}>
                {risk.scomet_controlled ? "DGFT Special Permit Req." : "Standard Commercial (Clear)"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)]">
              <span className="text-[10px] text-[var(--text-tertiary)] block uppercase">Net Risk Deductions</span>
              <span className="font-bold text-xs text-sky-600 mt-0.5 block">
                -{scores.risk_penalty || 0} pts (Final: {scores.final_score.toFixed(1)})
              </span>
            </div>
          </div>
        </div>

        {/* ── Score Matrix Breakdown ──────────────────────────────────────── */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-[var(--text-secondary)]" />
            <span>Multi-Criteria Score Breakdown</span>
          </h4>

          <div className="space-y-2 p-3.5 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)]">
            {subScoreItems.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <span className="text-[var(--text-primary)] font-bold">{(item.val || 0).toFixed(1)} / 100</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, item.val || 0))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

<<<<<<< HEAD:frontend/src/components/marketplace/CountryDetailDrawer.tsx
        {/* ── Action Buttons: Simulate Corridor & Find Companies ───────────────── */}
=======
        {/* ── Action Button: Simulate Corridor & Generate Report ───────────────── */}
>>>>>>> origin/main:src/components/marketplace/CountryDetailDrawer.tsx
        <div className="pt-2 space-y-2.5">
          <PrimaryAction
            size="lg"
            onClick={handleSimulateTrade}
            className="w-full justify-center"
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Launch Full Corridor Analysis →
<<<<<<< HEAD:frontend/src/components/marketplace/CountryDetailDrawer.tsx
          </PrimaryAction>
          <PrimaryAction
            variant="outline"
            size="lg"
            onClick={handleViewCompanies}
            className="w-full justify-center"
            icon={<Building2 className="w-4 h-4" />}
            iconPosition="left"
          >
            View Top Companies to Contact in {destination.country_name}
=======
>>>>>>> origin/main:src/components/marketplace/CountryDetailDrawer.tsx
          </PrimaryAction>
        </div>
      </div>
    </DetailDrawer>
  );
};

export default CountryDetailDrawer;
