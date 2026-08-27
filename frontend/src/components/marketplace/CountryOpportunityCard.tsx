import React from "react";
import { useNavigate } from "react-router-dom";
import { DestinationCountryInsight } from "@/services/api/aiService";
import { 
  Globe2, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Ship, 
  ChevronRight,
  Users,
  Gauge
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryOpportunityCardProps {
  rank: number;
  data: DestinationCountryInsight;
  onSelect: (data: DestinationCountryInsight) => void;
  userCommodity?: string;
  userQuantityKg?: number;
}

// Map ISO3 to Country Flag Emoji
export const ISO3_FLAG_MAP: Record<string, string> = {
  ARE: "🇦🇪",
  SAU: "🇸🇦",
  USA: "🇺🇸",
  GBR: "🇬🇧",
  SGP: "🇸🇬",
  DEU: "🇩🇪",
  JPN: "🇯🇵",
  ITA: "🇮🇹",
  NLD: "🇳🇱",
  BGD: "🇧🇩",
  IRN: "🇮🇷",
  EGY: "🇪🇬",
  MYS: "🇲🇾",
  IDN: "🇮🇩",
  VNM: "🇻🇳",
  FRA: "🇫🇷",
  ESP: "🇪🇸",
  CAN: "🇨🇦",
  AUS: "🇦🇺",
  IND: "🇮🇳",
};

export const CountryOpportunityCard: React.FC<CountryOpportunityCardProps> = ({
  rank,
  data,
  onSelect,
  userCommodity = "Commodity",
  userQuantityKg = 1000,
}) => {
  const navigate = useNavigate();
  const { destination, forecast, scores, risk, pros, cons } = data;
  const tradeRisk = data.tradeRiskAnalysis?.risk;
  const flag = ISO3_FLAG_MAP[destination.iso3] || "🌐";
  const finalScore = scores.final_score;
  
  // Format tonnage and currency
  const annualDemandMT = Math.round(forecast.annual_market_demand_kg / 1000).toLocaleString();
  const fobPrice = forecast.expected_fob_price_usd_per_kg.toFixed(2);
  const estRevenue = Math.round(userQuantityKg * forecast.expected_fob_price_usd_per_kg).toLocaleString();

  // Score color tiers
  const getScoreBadge = (score: number) => {
    if (score >= 85) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    if (score >= 70) return "bg-sky-500/10 text-sky-600 border-sky-500/30";
    if (score >= 50) return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    return "bg-rose-500/10 text-rose-600 border-rose-500/30";
  };

  return (
    <div
      onClick={() => onSelect(data)}
      className="group relative rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] hover:border-sky-500/40 p-5 transition-all duration-200 hover:shadow-xl hover:shadow-sky-500/5 cursor-pointer flex flex-col justify-between space-y-4"
    >
      {/* ── Top Header Strip ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Rank Badge */}
          <div className="w-8 h-8 rounded-xl bg-[var(--surface-3)] border border-[var(--hairline)] flex items-center justify-center font-mono font-bold text-xs text-[var(--text-secondary)]">
            #{String(rank).padStart(2, "0")}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{flag}</span>
              <h4 className="font-display font-bold text-base text-[var(--text-primary)] group-hover:text-sky-300 transition-colors">
                {destination.country_name}
              </h4>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-sans mt-0.5">
              {destination.region || "Global Corridor"} · {destination.currency || "USD"} Settlement
            </p>
          </div>
        </div>

        {/* Opportunity Score Pill */}
        <div className="text-right flex flex-col items-end">
          <div className={cn("px-2.5 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1", getScoreBadge(finalScore))}>
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{finalScore.toFixed(1)} / 100</span>
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] font-mono mt-1">Opportunity Score</span>
        </div>
      </div>

      {/* ── Key Forecast Metrics — three scannable numbers, no sub-captions ── */}
      <div className="grid grid-cols-3 gap-2.5 py-2 border-y border-[var(--hairline)] text-xs">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase text-[var(--text-tertiary)] font-mono block">Demand</span>
          <span className="font-mono font-bold text-[var(--text-primary)] text-sm">{annualDemandMT} MT</span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] uppercase text-[var(--text-tertiary)] font-mono block">FOB</span>
          <span className="font-mono font-bold text-sky-600 text-sm">${fobPrice}/kg</span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] uppercase text-[var(--text-tertiary)] font-mono block">Revenue</span>
          <span className="font-mono font-bold text-emerald-600 text-sm">${estRevenue}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Trade risk: {tradeRisk ? tradeRisk.risk_level : "Unavailable"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Users className="w-3.5 h-3.5 text-sky-600" />
          <span>Click for companies &amp; profit estimate</span>
        </div>
      </div>

      {/* ── Single top signal — whichever matters more, not both ─────── */}
      {(pros?.length || cons?.length) && (
        <div className="flex items-start gap-2 text-xs font-sans text-[var(--text-secondary)]">
          {cons && cons.length > 0 ? (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{cons[0]}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{pros![0]}</span>
            </>
          )}
        </div>
      )}

      {/* ── Card Footer CTA ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--hairline)] gap-2">
        <span className="flex items-center gap-1.5 text-xs font-mono">
          {scores.risk_penalty > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-amber-700 font-bold">{risk.risk_level} risk</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600 font-bold">{risk.risk_level} risk</span>
            </>
          )}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(
                `/assess?commodity=${encodeURIComponent(userCommodity)}&origin=IND&destination=${destination.iso3}&qty=${userQuantityKg}&value=${Math.round(userQuantityKg * forecast.expected_fob_price_usd_per_kg)}`
              );
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300/80 text-emerald-800 font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title={`Assess Corridor Trade Risk for ${destination.country_name}`}
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-700" />
            <span>Assess Corridor</span>
          </button>

          <span className="flex items-center gap-0.5 font-bold text-xs text-sky-600 group-hover:text-sky-700 py-1 pl-1">
            <span>Summary</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default CountryOpportunityCard;
