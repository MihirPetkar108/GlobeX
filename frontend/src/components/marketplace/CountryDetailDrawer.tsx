import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CounterpartyMatchResult,
  DestinationCountryInsight,
  PartnerGRUSignal,
  ProfitEstimateResult,
  TopCompaniesResult,
  TradeAnomalyResult,
} from "@/services/api/aiService";
import { ISO3_FLAG_MAP } from "./CountryOpportunityCard";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Building2,
  BarChart3,
  Scale,
  ArrowRight,
  Sparkles,
  Coins,
  Loader2,
  X,
  TrendingUp,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatUSD = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

interface CountryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: DestinationCountryInsight | null;
  userCommodity?: string;
  userQuantityKg?: number;
  companies?: TopCompaniesResult | null;
  companiesLoading?: boolean;
  companiesError?: string | null;
  profit?: ProfitEstimateResult | null;
  profitLoading?: boolean;
  profitError?: string | null;
  tradeRisk?: TradeAnomalyResult | null;
  tradeRiskLoading?: boolean;
  tradeRiskError?: string | null;
  partnerMatches?: CounterpartyMatchResult[];
  partnerMatchesLoading?: boolean;
  partnerMatchesError?: string | null;
  partnerGRUSignal?: PartnerGRUSignal | null;
}

export const CountryDetailDrawer: React.FC<CountryDetailDrawerProps> = ({
  isOpen,
  onClose,
  data,
  userCommodity = "Basmati Rice",
  userQuantityKg = 1000,
  companies = null,
  companiesLoading = false,
  companiesError = null,
  profit = null,
  profitLoading = false,
  profitError = null,
  tradeRisk = null,
  tradeRiskLoading = false,
  tradeRiskError = null,
  partnerMatches = [],
  partnerMatchesLoading = false,
  partnerMatchesError = null,
  partnerGRUSignal = null,
}) => {
  const navigate = useNavigate();

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!data) return null;

  const { destination, forecast, scores, pros, cons } = data;
  const flag = ISO3_FLAG_MAP[destination.iso3] || "🌐";
  const finalScore = scores.final_score;

  const annualDemandMT = Math.round(forecast.annual_market_demand_kg / 1000).toLocaleString();
  const fobPrice = forecast.expected_fob_price_usd_per_kg.toFixed(2);
  const estRevenue = Math.round(userQuantityKg * forecast.expected_fob_price_usd_per_kg).toLocaleString();

  const handleSimulateTrade = () => {
    onClose();
    navigate(`/assess?commodity=${encodeURIComponent(userCommodity)}&origin=IND&destination=${destination.iso3}&qty=${userQuantityKg}`);
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-md cursor-pointer"
          />

          {/* Centered Floating Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col z-10 select-none my-auto"
          >
            {/* ── Modal Header ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/80 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="text-3xl sm:text-4xl p-1 bg-white rounded-2xl shadow-sm border border-slate-200/60">
                  {flag}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 truncate">
                      {destination.country_name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200/80 text-slate-700">
                      {destination.iso3}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-sans font-medium bg-emerald-100/70 text-emerald-800 border border-emerald-200/60">
                      {userCommodity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-sans mt-0.5 truncate">
                    Corridor Opportunity Summary · India ➔ {destination.country_name} ({userQuantityKg.toLocaleString()} kg)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    {finalScore.toFixed(1)} <span className="text-xs font-normal text-emerald-600">/ 100</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* ── Scrollable Modal Body ───────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-slate-800">
              
              {/* ── Top Decision Strip ─────────────────────────────────────── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50/70 via-emerald-50/50 to-slate-50 border border-sky-200/70 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-700 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Executive Market Overview</span>
                    </div>
                    <p className="text-sm text-slate-800 font-sans leading-relaxed">
                      <strong>{destination.country_name}</strong> scores an overall opportunity rating of{" "}
                      <strong className="text-emerald-700 font-mono">{finalScore.toFixed(1)} / 100</strong> for{" "}
                      <strong>{userCommodity}</strong>. Expected benchmark FOB is{" "}
                      <strong className="text-sky-700 font-mono">${fobPrice} / kg</strong> with verified import counterparties.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                    <div className="px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
                      <span className="text-xl font-mono font-bold text-emerald-600 block">
                        {finalScore.toFixed(1)}
                      </span>
                      <span className="text-[10px] uppercase font-mono text-slate-400">Opportunity Score</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Hero KPI Metrics (3 Cards) ─────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-mono uppercase font-semibold">Annual Market Demand</span>
                    <BarChart3 className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-slate-900">
                    {annualDemandMT} <span className="text-sm font-normal text-slate-500">MT</span>
                  </div>
                  {forecast.demand_interval_80_lower_kg && forecast.demand_interval_80_upper_kg ? (
                    <span className="text-[11px] font-mono text-sky-700 block mt-1">
                      P10–P90: {Math.round(forecast.demand_interval_80_lower_kg / 1000).toLocaleString()}–{Math.round(forecast.demand_interval_80_upper_kg / 1000).toLocaleString()} MT
                    </span>
                  ) : (
                    <span className="text-[11px] font-sans text-slate-500 block mt-1">Sourced trade volume absorption</span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-mono uppercase font-semibold">Expected FOB Price</span>
                    <Coins className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-600">
                    ${fobPrice} <span className="text-sm font-normal text-slate-500">/ kg</span>
                  </div>
                  <span className="text-[11px] font-sans text-slate-500 block mt-1">3-year bilateral benchmark anchor</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-mono uppercase font-semibold">Estimated Deal Revenue</span>
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-slate-900">
                    ${estRevenue}
                  </div>
                  <span className="text-[11px] font-sans text-slate-500 block mt-1">For {userQuantityKg.toLocaleString()} kg shipment</span>
                </div>
              </div>

              {/* ── Top Companies Categorized by Sector, Valuation & TF-IDF ──── */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-600" />
                    <h3 className="font-display font-bold text-base text-slate-900">
                      Top Verified Companies in {destination.country_name}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 font-semibold flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Sector Categorized · Valuation &amp; TF-IDF Ranked
                  </span>
                </div>

                {companiesLoading ? (
                  <div className="p-8 rounded-2xl border border-slate-200/90 bg-slate-50/50 flex flex-col items-center justify-center gap-2 text-slate-500 font-mono text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                    <span>Ranking companies by sector relevance, valuation &amp; summary TF-IDF...</span>
                  </div>
                ) : companiesError ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {companiesError}
                  </div>
                ) : companies && companies.companies.length > 0 ? (
                  <div className="space-y-2.5">
                    {companies.companies.slice(0, 5).map((c, idx) => (
                      <div
                        key={c.companyId || idx}
                        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
                              {c.displayName || c.companyName}
                            </span>
                            {c.sector && (
                              <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 text-[10px] font-mono font-medium">
                                {c.sector}
                              </span>
                            )}
                            {c.industry && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono">
                                {c.industry}
                              </span>
                            )}
                          </div>
                          {c.businessSummary && (
                            <p className="text-xs text-slate-600 font-sans line-clamp-2 leading-relaxed">
                              {c.businessSummary}
                            </p>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {c.marketCapUSD != null && (
                            <span className="text-xs font-mono font-bold text-slate-800">
                              ${(c.marketCapUSD / 1e9).toFixed(1)}B <span className="text-[10px] font-normal text-slate-500">Valuation</span>
                            </span>
                          )}
                          {c.combinedScore != null && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-bold text-xs">
                              {(c.combinedScore * 100).toFixed(0)}% Relevance
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">
                    No sector-matched companies in the directory for this corridor yet.
                  </p>
                )}
              </div>

              {/* ── 2-Column Diagnostics Grid: Risk vs Profit ───────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Trade Risk Corridor Signal */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                        Corridor Risk Diagnostics
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                      Anomaly Engine
                    </span>
                  </div>

                  {tradeRiskLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono py-3 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      Evaluating anomaly risk...
                    </div>
                  ) : tradeRiskError ? (
                    <p className="text-xs text-rose-700">{tradeRiskError}</p>
                  ) : tradeRisk?.risk ? (
                    <div className="space-y-2 text-xs font-mono">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] text-slate-400 uppercase block">Risk Level</span>
                          <span className={cn("font-bold text-xs mt-0.5 block", tradeRisk.risk.is_anomaly ? "text-amber-700" : "text-emerald-700")}>
                            {tradeRisk.risk.risk_level || "LOW"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] text-slate-400 uppercase block">Anomaly Score</span>
                          <span className="font-bold text-xs text-slate-900 mt-0.5 block">
                            {tradeRisk.risk.anomaly_score != null ? (tradeRisk.risk.anomaly_score * 100).toFixed(1) : "0.0"} / 100
                          </span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase block">Observed Pattern</span>
                        <span className="font-bold text-slate-800 block mt-0.5">
                          {(tradeRisk.risk.anomaly_type || "NORMAL").replaceAll("_", " ")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No corridor anomalies detected.</p>
                  )}
                </div>

                {/* Profit & Sourced Cost Model */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                        Deal Profit Projection
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-bold">
                      Sourced Cost Model
                    </span>
                  </div>

                  {profitLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono py-3 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      Calculating net margins...
                    </div>
                  ) : profitError ? (
                    <p className="text-xs text-rose-700">{profitError}</p>
                  ) : profit ? (
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-emerald-700 uppercase font-mono block">Estimated Net Profit</span>
                          <strong className="text-emerald-800 text-xl font-mono">{formatUSD(profit.netProfitUSD)}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-700 uppercase font-mono block">Net Margin</span>
                          <strong className="text-emerald-800 text-base font-mono">{profit.netMarginPct}%</strong>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="p-2 rounded-lg bg-white border border-slate-200">
                          <span className="text-slate-400 block">Ocean Freight</span>
                          <span className="text-slate-800 font-bold">-{formatUSD(profit.costs.oceanFreightUSD)}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-slate-200">
                          <span className="text-slate-400 block">Total Est. Costs</span>
                          <span className="text-slate-800 font-bold">-{formatUSD(profit.costs.totalCostsUSD)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Profit estimate available upon corridor simulation.</p>
                  )}
                </div>
              </div>

              {/* ── Pros & Cons Comparison ─────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Key Strategic Advantages</span>
                  </h4>
                  <div className="space-y-2">
                    {pros && pros.length > 0 ? (
                      pros.map((pro, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{pro}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No specific advantages calculated.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Trade Barriers &amp; Watchouts</span>
                  </h4>
                  <div className="space-y-2">
                    {cons && cons.length > 0 ? (
                      cons.map((con, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{con}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No major trade barriers flagged.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Multi-Criteria Decision Breakdown ───────────────────────── */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-slate-600" />
                    <span>Multi-Criteria Decision Matrix</span>
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subScoreItems.map((item, idx) => (
                    <div key={idx} className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200/70">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="text-slate-900 font-bold">{item.val.toFixed(1)} / 100</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, item.val))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── Modal Footer Action Bar ─────────────────────────────────── */}
            <div className="p-4 sm:p-5 border-t border-slate-200/80 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleViewCompanies}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-sans font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Building2 className="w-4 h-4 text-slate-600" />
                Browse All Companies in {destination.country_name}
              </button>

              <button
                type="button"
                onClick={handleSimulateTrade}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-sans font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
              >
                <span>Launch Full Trade Simulation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CountryDetailDrawer;
