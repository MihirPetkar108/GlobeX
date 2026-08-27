import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Section } from "@/components/common/Section";
import { PrimaryAction } from "@/components/common/PrimaryAction";
import SpecularButton from "@/components/ui/SpecularButton";
import TradeGlobe from "@/components/TradeGlobe";
import { SAMPLE_DATA, aggregateByCountry } from "@/lib/tradeData";
import { Globe2, TrendingUp, AlertCircle, RefreshCw, Sparkles, BarChart3 } from "lucide-react";
import { aiService, MarketOpportunityResult, DestinationCountryInsight } from "@/services/api/aiService";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

export const MarketIntelligencePage: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<string>("United Arab Emirates");
  const [opportunities, setOpportunities] = useState<DestinationCountryInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState<string>("Basmati Rice");

  const aggregatedData = useMemo(() => aggregateByCountry(SAMPLE_DATA, null), []);

  // XGBoost 80% prediction band (Q10/Q90) per ranked corridor, in metric tons —
  // the demand forecaster only returns one forward point + interval per corridor
  // (no per-year history), so the chart compares ranked corridors' bands rather
  // than a single corridor's time series.
  const forecastChartData = useMemo(
    () =>
      opportunities
        .filter((o) => o.forecast.demand_interval_80_lower_kg != null && o.forecast.demand_interval_80_upper_kg != null)
        .map((o) => ({
          iso3: o.destination.iso3,
          country: o.destination.country_name,
          lowerMt: Math.round((o.forecast.demand_interval_80_lower_kg as number) / 1000),
          rangeMt: Math.round(
            ((o.forecast.demand_interval_80_upper_kg as number) - (o.forecast.demand_interval_80_lower_kg as number)) / 1000
          ),
          pointMt: Math.round(o.forecast.annual_market_demand_kg / 1000),
        })),
    [opportunities]
  );

  const fetchOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.discoverMarketOpportunities(productQuery, 1000, "balanced", 8);
      setOpportunities(res.top_recommendations || []);
      if (res.top_recommendations && res.top_recommendations.length > 0) {
        setSelectedCountry(res.top_recommendations[0].destination.country_name);
      }
    } catch (err: any) {
      setError(err?.message || "Market Opportunity Engine (XGBoost) unreachable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [productQuery]);

  const activeMarket = useMemo(() => {
    return (
      opportunities.find((c) => c.destination.country_name === selectedCountry) ||
      opportunities[0] ||
      null
    );
  }, [opportunities, selectedCountry]);

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-5 select-none">
        
        {/* Page Header */}
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/home" },
            { label: "Market Intelligence" },
          ]}
          title="Market Opportunity Radar"
          subtitle="Real-time econometric demand forecaster (XGBoost Quantile Q10/50/90 + TreeSHAP) evaluating 26-year trade histories."
          badge={<StatusBadge status="verified" label={`Corridor: India ➔ ${selectedCountry}`} size="md" />}
          action={
            <Link to={`/trade-analysis?commodity=${encodeURIComponent(productQuery)}`}>
              <PrimaryAction size="sm">
                Run Multi-Model Corridor Analysis →
              </PrimaryAction>
            </Link>
          }
        />

        {/* Error State Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-rose-300">XGBoost Forecast Service Offline</div>
              <p className="text-rose-200/80 font-mono">{error}</p>
              <button
                onClick={fetchOpportunities}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-800/40 text-rose-200 border border-rose-700/50 hover:bg-rose-800/60 font-mono text-[11px]"
              >
                <RefreshCw className="w-3 h-3" /> Retry Forecast Engine
              </button>
            </div>
          </div>
        )}

        {/* 3D Globe + Corridor Spec Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Globe Container */}
          <div className="lg:col-span-7 h-[380px] rounded-2xl border border-white/[0.07] bg-[#0C121D] relative overflow-hidden flex items-center justify-center">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.08] text-[11px] font-mono text-slate-400">
              <Globe2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Interactive 3D Corridor Radar</span>
            </div>

            <div className="w-full h-full">
              <TradeGlobe
                aggregatedData={aggregatedData}
                selectedCountry={selectedCountry}
                onCountrySelect={(name) => setSelectedCountry(name)}
                showArcs={true}
                autoRotate={false}
              />
            </div>
          </div>

          {/* Focused Corridor Card */}
          <div className="lg:col-span-5 p-5 rounded-2xl border border-white/[0.07] bg-[#0C121D] flex flex-col justify-between space-y-4">
            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-xs font-mono text-slate-400 space-y-2 py-12">
                <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
                <span>Running XGBoost demand predictions &amp; TreeSHAP attributions...</span>
              </div>
            )}

            {!loading && activeMarket && (
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-white/[0.06] pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400 font-bold">
                      {activeMarket.destination.iso3} CORRIDOR
                    </span>
                    <h3 className="text-xl font-display font-bold text-white mt-0.5">
                      {activeMarket.destination.country_name}
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-emerald-400">
                      {activeMarket.scores.final_score.toFixed(1)}/100
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">Opportunity Score</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.05]">
                    <span className="text-[10px] text-slate-500 uppercase block">Annual Demand</span>
                    <span className="text-emerald-400 font-bold">
                      {(activeMarket.forecast.annual_market_demand_kg / 1000).toLocaleString()} MT
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.05]">
                    <span className="text-[10px] text-slate-500 uppercase block">Expected FOB</span>
                    <span className="text-sky-400 font-bold">
                      ${activeMarket.forecast.expected_fob_price_usd_per_kg.toFixed(2)}/kg
                    </span>
                  </div>
                </div>

                {activeMarket.forecast.demand_interval_80_lower_kg != null && activeMarket.forecast.demand_interval_80_upper_kg != null && (
                  <div className="p-2.5 rounded-xl bg-sky-950/20 border border-sky-500/20 text-xs font-mono space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">XGBoost 80% Band (P10–P90):</span>
                      <span className="text-sky-300 font-bold">
                        {(activeMarket.forecast.demand_interval_80_lower_kg / 1000).toLocaleString()} – {(activeMarket.forecast.demand_interval_80_upper_kg / 1000).toLocaleString()} MT
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">TreeSHAP Economic Drivers</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeMarket.pros.slice(0, 3).map((pro, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-[#070A0E] border border-white/[0.06] text-[11px] font-sans text-slate-300"
                      >
                        {pro}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!loading && (
              <Link to={`/trade-analysis?commodity=${encodeURIComponent(productQuery)}&destination=${activeMarket?.iso3 || "ARE"}`} className="block w-full">
                <SpecularButton size="sm" radius={10} className="w-full justify-center">
                  Analyze Corridor in Detail →
                </SpecularButton>
              </Link>
            )}
          </div>
        </div>

        {/* XGBoost 80% Demand Prediction Band — Ranked Corridors */}
        {!loading && forecastChartData.length > 0 && (
          <div className="p-5 rounded-2xl border border-white/[0.07] bg-[#0C121D] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-400">
                <BarChart3 className="w-4 h-4 text-sky-400" />
                <span>Forecast Demand — 80% Prediction Band (P10–P90, Metric Tons)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">XGBoost Quantile Forecaster</span>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="iso3" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v.toLocaleString()}`}
                    label={{ value: "MT", angle: -90, position: "insideLeft", fill: "#64748B", fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ background: "#070A0E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 11 }}
                    labelStyle={{ color: "#E2E8F0" }}
                    formatter={(value: number, name: string, props: any) => {
                      if (name === "rangeMt") {
                        const lower = props.payload.lowerMt;
                        const upper = lower + value;
                        return [`${lower.toLocaleString()} – ${upper.toLocaleString()} MT`, "P10–P90 band"];
                      }
                      return [`${value.toLocaleString()} MT`, "Forecast"];
                    }}
                    labelFormatter={(_label: string, payload: any) => payload?.[0]?.payload?.country || _label}
                  />
                  {/* Invisible base bar to float the range bar at its lower bound */}
                  <Bar dataKey="lowerMt" stackId="band" fill="transparent" isAnimationActive={false} />
                  <Bar dataKey="rangeMt" stackId="band" fill="#0284C7" fillOpacity={0.35} radius={[4, 4, 4, 4]} isAnimationActive={false}>
                    {forecastChartData.map((entry) => (
                      <Cell key={entry.iso3} stroke="#0284C7" strokeWidth={1} />
                    ))}
                  </Bar>
                  <Bar dataKey="pointMt" stackId="point" fill="#0F9D6B" barSize={3} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Ranked Corridor Candidate List */}
        {!loading && opportunities.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Top-Ranked Sovereign Demand Corridors (XGBoost Residual Forecaster)</span>
              <span className="text-emerald-400">Model Version: partner_discovery_xgb_v1</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {opportunities.map((opp, idx) => (
                <div
                  key={opp.iso3}
                  onClick={() => setSelectedCountry(opp.destination.country_name)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer space-y-2",
                    selectedCountry === opp.destination.country_name
                      ? "bg-sky-500/10 border-sky-500/40"
                      : "bg-[#070A0E] border-white/[0.06] hover:border-white/[0.12]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-500 font-bold">#{idx + 1}</span>
                    <span className="font-mono text-xs text-emerald-400 font-bold">{opp.scores.final_score.toFixed(1)}/100</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{opp.destination.country_name}</h4>
                    <span className="text-[11px] font-mono text-slate-400">{(opp.forecast.annual_market_demand_kg / 1000).toLocaleString()} MT Forecast</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default MarketIntelligencePage;
